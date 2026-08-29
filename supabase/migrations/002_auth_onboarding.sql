-- Trainings PRO / NICPMS Academy
-- TASK 002 — Auth, onboarding, profiles, roles, and RLS hardening

-- Keep the foundation values valid while making the manager-approved learner
-- terminology canonical for newly created and existing individual profiles.
alter table public.profiles
  drop constraint if exists profiles_profile_type_check;

alter table public.profiles
  add constraint profiles_profile_type_check check (profile_type in (
    'individual', 'individual_learner', 'organization_learner', 'student',
    'instructor', 'professor', 'consultant', 'coordinator',
    'organization_representative', 'organization_admin', 'university_admin',
    'platform_admin'
  ));

update public.profiles
set profile_type = 'individual_learner'
where profile_type = 'individual';

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists preferred_locale text not null default 'ro',
  add column if not exists onboarding_flow text not null default 'individual',
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists terms_version text;

alter table public.profiles
  drop constraint if exists profiles_preferred_locale_check;
alter table public.profiles
  add constraint profiles_preferred_locale_check
  check (preferred_locale in ('ro', 'en'));

alter table public.profiles
  drop constraint if exists profiles_onboarding_flow_check;
alter table public.profiles
  add constraint profiles_onboarding_flow_check
  check (onboarding_flow in ('individual', 'invitation', 'representative'));

alter table public.profiles
  drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check check (status in (
    'active', 'pending_email_confirmation', 'pending_organization_approval',
    'pending_review', 'inactive', 'suspended', 'archived'
  ));

with ranked_defaults as (
  select id, row_number() over (partition by user_id order by created_at, id) as position
  from public.profiles
  where is_default
)
update public.profiles p
set is_default = false
from ranked_defaults ranked
where p.id = ranked.id
  and ranked.position > 1;

create unique index if not exists profiles_one_default_per_user_idx
on public.profiles(user_id)
where is_default;

insert into public.roles (code, name, scope, description) values
  ('individual_learner', 'Individual Learner', 'own', 'Profil individual pentru învățare'),
  ('organization_learner', 'Organization Learner', 'organization', 'Cursant validat într-o organizație'),
  ('organization_representative', 'Organization Representative', 'organization', 'Reprezentant aprobat al unei organizații')
on conflict (code) do nothing;

insert into public.role_permissions (role_id, permission_id, allowed, approval_required)
select r.id, p.id, true, false
from public.roles r
join public.permissions p on p.code in (
  'profile.view', 'profile.update', 'course.view', 'curriculum.view', 'assessment.view'
)
where r.code in ('individual_learner', 'organization_learner')
on conflict (role_id, permission_id) do nothing;

insert into public.profile_roles (profile_id, role_id, scope_type, scope_id)
select p.id, r.id, 'own', null
from public.profiles p
join public.roles r on r.code = 'individual_learner'
where p.profile_type = 'individual_learner'
  and not exists (
    select 1
    from public.profile_roles pr
    where pr.profile_id = p.id
      and pr.role_id = r.id
      and pr.scope_type = 'own'
  );

create table if not exists public.onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  flow text not null check (flow in ('invitation', 'representative')),
  invitation_code_hash text,
  organization_name text,
  organization_type text check (organization_type is null or organization_type in (
    'university', 'company', 'public_institution', 'ngo', 'training_provider',
    'educational_partner', 'other'
  )),
  website text,
  reason text,
  status text not null check (status in (
    'pending_email_confirmation', 'pending_organization_approval',
    'pending_review', 'approved', 'rejected'
  )),
  reviewed_by_profile_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, flow)
);

create index if not exists onboarding_requests_profile_id_idx
on public.onboarding_requests(profile_id);

create index if not exists onboarding_requests_status_idx
on public.onboarding_requests(status);

drop trigger if exists onboarding_requests_set_updated_at on public.onboarding_requests;
create trigger onboarding_requests_set_updated_at
before update on public.onboarding_requests
for each row execute function public.set_updated_at();

alter table public.onboarding_requests enable row level security;

drop policy if exists "Users can view own onboarding requests" on public.onboarding_requests;
create policy "Users can view own onboarding requests"
on public.onboarding_requests for select
to authenticated
using (auth.uid() = user_id);

-- Public clients may read their own rows, but cannot create or mutate requests.
-- Signup requests are created only by the auth trigger below.
revoke insert, update, delete on public.onboarding_requests from anon, authenticated;
grant select on public.onboarding_requests to authenticated;

-- Replace the permissive foundation profile policies. Users can no longer insert
-- profiles directly, and column grants prevent self-service changes to sensitive
-- fields even when the own-row update policy matches.
drop policy if exists "Users can insert own profiles" on public.profiles;
drop policy if exists "Users can update own profiles" on public.profiles;

create policy "Users can update safe own profile fields"
on public.profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

revoke insert, delete on public.profiles from anon, authenticated;
revoke update on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name, first_name, last_name, preferred_locale)
on public.profiles to authenticated;

-- Role and membership mutations remain unavailable to public clients.
revoke insert, update, delete on public.profile_roles from anon, authenticated;
revoke insert, update, delete on public.organization_members from anon, authenticated;
revoke insert, update, delete on public.roles from anon, authenticated;
revoke insert, update, delete on public.permissions from anon, authenticated;
revoke insert, update, delete on public.role_permissions from anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  flow_name text;
  first_name_value text;
  last_name_value text;
  display_name_value text;
  preferred_locale_value text;
  profile_status_value text;
  profile_id_value uuid;
  learner_role_id uuid;
  organization_type_value text;
begin
  flow_name := coalesce(new.raw_user_meta_data ->> 'onboarding_flow', 'individual');
  if flow_name not in ('individual', 'invitation', 'representative') then
    flow_name := 'individual';
  end if;

  if coalesce(new.raw_user_meta_data ->> 'terms_accepted', 'false') <> 'true' then
    raise exception 'Terms acceptance is required';
  end if;

  first_name_value := nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'first_name', '')), 120), '');
  last_name_value := nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'last_name', '')), 120), '');
  display_name_value := nullif(trim(concat_ws(' ', first_name_value, last_name_value)), '');
  display_name_value := coalesce(
    display_name_value,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 240), ''),
    new.email,
    'Trainings PRO member'
  );

  preferred_locale_value := coalesce(new.raw_user_meta_data ->> 'preferred_locale', 'ro');
  if preferred_locale_value not in ('ro', 'en') then
    preferred_locale_value := 'ro';
  end if;

  profile_status_value := case
    when new.email_confirmed_at is null then 'pending_email_confirmation'
    when flow_name = 'representative' then 'pending_organization_approval'
    when flow_name = 'invitation' then 'pending_review'
    else 'active'
  end;

  insert into public.profiles (
    user_id,
    profile_type,
    display_name,
    first_name,
    last_name,
    label,
    preferred_locale,
    onboarding_flow,
    terms_accepted_at,
    terms_version,
    is_default,
    status
  ) values (
    new.id,
    'individual_learner',
    display_name_value,
    first_name_value,
    last_name_value,
    'Individual Learner',
    preferred_locale_value,
    flow_name,
    now(),
    '2026-08-29',
    true,
    profile_status_value
  )
  returning id into profile_id_value;

  select id into learner_role_id
  from public.roles
  where code = 'individual_learner';

  if learner_role_id is not null then
    insert into public.profile_roles (profile_id, role_id, scope_type, scope_id)
    values (profile_id_value, learner_role_id, 'own', null);
  end if;

  if flow_name = 'invitation' then
    insert into public.onboarding_requests (
      user_id,
      profile_id,
      flow,
      invitation_code_hash,
      status
    ) values (
      new.id,
      profile_id_value,
      flow_name,
      encode(digest(coalesce(new.raw_user_meta_data ->> 'invitation_code', ''), 'sha256'), 'hex'),
      profile_status_value
    );
  elsif flow_name = 'representative' then
    organization_type_value := new.raw_user_meta_data ->> 'organization_type';
    if organization_type_value is null or organization_type_value not in (
      'university', 'company', 'public_institution', 'ngo', 'training_provider',
      'educational_partner', 'other'
    ) then
      organization_type_value := 'other';
    end if;

    insert into public.onboarding_requests (
      user_id,
      profile_id,
      flow,
      organization_name,
      organization_type,
      website,
      reason,
      status
    ) values (
      new.id,
      profile_id_value,
      flow_name,
      nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'organization_name', '')), 240), ''),
      organization_type_value,
      nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'website', '')), 500), ''),
      nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'request_reason', '')), 2000), ''),
      profile_status_value
    );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.complete_email_onboarding()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  request_flow text;
  next_status text;
begin
  current_user_id := auth.uid();
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = current_user_id
      and email_confirmed_at is not null
  ) then
    raise exception 'Email confirmation required';
  end if;

  select flow into request_flow
  from public.onboarding_requests
  where user_id = current_user_id
  order by created_at
  limit 1;

  next_status := case
    when request_flow = 'representative' then 'pending_organization_approval'
    when request_flow = 'invitation' then 'pending_review'
    else 'active'
  end;

  update public.profiles
  set status = next_status
  where user_id = current_user_id
    and status = 'pending_email_confirmation';

  update public.onboarding_requests
  set status = next_status
  where user_id = current_user_id
    and status = 'pending_email_confirmation';

  return next_status;
end;
$$;

revoke all on function public.complete_email_onboarding() from public, anon;
grant execute on function public.complete_email_onboarding() to authenticated;
