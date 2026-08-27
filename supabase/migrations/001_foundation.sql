-- Trainings PRO / NICPMS Academy
-- TASK 001 — Foundation migration

create extension if not exists pgcrypto;

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Organizations
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  type text not null check (type in ('university','company','training_provider','partner')),
  description text,
  logo_url text,
  website text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

-- Profiles: contextual identities for one auth user
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_type text not null check (profile_type in (
    'individual','student','instructor','professor','consultant','coordinator',
    'organization_admin','university_admin','platform_admin'
  )),
  display_name text not null,
  label text,
  organization_id uuid null references public.organizations(id) on delete set null,
  university_id uuid null,
  academic_program_id uuid null,
  group_id uuid null,
  is_default boolean not null default false,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists profiles_organization_id_idx on public.profiles(organization_id);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Organization members
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (organization_id, profile_id)
);

-- Roles
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  scope text not null check (scope in ('platform','organization','university','program','course','own')),
  description text,
  created_at timestamptz not null default now()
);

-- Permissions
create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  resource text not null,
  action text not null,
  description text,
  created_at timestamptz not null default now()
);

-- Role permissions
create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  allowed boolean not null default true,
  approval_required boolean not null default false,
  created_at timestamptz not null default now(),
  unique(role_id, permission_id)
);

-- Profile roles with scope
create table if not exists public.profile_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  scope_type text not null check (scope_type in ('platform','organization','university','program','course','own')),
  scope_id uuid null,
  created_at timestamptz not null default now()
);

create index if not exists profile_roles_profile_id_idx on public.profile_roles(profile_id);
create index if not exists role_permissions_role_id_idx on public.role_permissions(role_id);

-- Seed roles
insert into public.roles (code, name, scope, description) values
('individual_member','Individual Member','own','Membru individual al platformei'),
('student','Student','own','Student/cursant în cursuri individuale'),
('university_student','University Student','program','Student universitar alocat unui program/group'),
('instructor','Instructor','course','Instructor pentru cursuri'),
('professor','Professor','program','Profesor universitar'),
('consultant','Consultant','own','Consultant live sau asincron'),
('program_coordinator','Program Coordinator','program','Coordonator program academic'),
('organization_admin','Organization Admin','organization','Administrator organizație'),
('university_admin','University Admin','university','Administrator universitate'),
('platform_admin','Platform Admin','platform','Administrator platformă')
on conflict (code) do nothing;

-- Seed permissions
insert into public.permissions (code, resource, action, description) values
('profile.view','profile','view','Vezi profile'),
('profile.update','profile','update','Actualizează profil'),
('organization.view','organization','view','Vezi organizații'),
('organization.create','organization','create','Creează organizații'),
('organization.update','organization','update','Actualizează organizații'),
('organization.delete','organization','delete','Șterge/arhivează organizații'),
('course.view','course','view','Vezi cursuri'),
('course.create','course','create','Creează cursuri'),
('course.update','course','update','Actualizează cursuri'),
('course.publish','course','publish','Publică cursuri'),
('course.archive','course','archive','Arhivează cursuri'),
('course.delete','course','delete','Șterge cursuri'),
('curriculum.view','curriculum','view','Vezi curriculum'),
('curriculum.create','curriculum','create','Creează curriculum'),
('curriculum.update','curriculum','update','Actualizează curriculum'),
('curriculum.delete','curriculum','delete','Șterge curriculum'),
('assessment.view','assessment','view','Vezi evaluări'),
('assessment.create','assessment','create','Creează evaluări'),
('assessment.update','assessment','update','Actualizează evaluări'),
('assessment.delete','assessment','delete','Șterge evaluări'),
('member.view','member','view','Vezi membri'),
('member.approve','member','approve','Aprobă membri'),
('member.suspend','member','suspend','Suspendă membri'),
('role.view','role','view','Vezi roluri'),
('role.assign','role','assign','Atribuie roluri'),
('permission.manage','permission','manage','Gestionează permisiuni'),
('admin.access','admin','access','Acces admin'),
('platform.manage','platform','manage','Gestionează platforma')
on conflict (code) do nothing;

-- Give platform_admin all permissions by default
insert into public.role_permissions (role_id, permission_id, allowed, approval_required)
select r.id, p.id, true, false
from public.roles r
cross join public.permissions p
where r.code = 'platform_admin'
on conflict (role_id, permission_id) do nothing;

-- Initial sensible role permissions
insert into public.role_permissions (role_id, permission_id, allowed, approval_required)
select r.id, p.id, true, false
from public.roles r
join public.permissions p on p.code in ('profile.view','profile.update','course.view','curriculum.view','assessment.view')
where r.code in ('individual_member','student','university_student')
on conflict (role_id, permission_id) do nothing;

insert into public.role_permissions (role_id, permission_id, allowed, approval_required)
select r.id, p.id, true, case when p.code in ('course.publish','course.delete','curriculum.delete','assessment.delete') then true else false end
from public.roles r
join public.permissions p on p.code in (
  'profile.view','profile.update','course.view','course.create','course.update','course.publish','course.archive','course.delete',
  'curriculum.view','curriculum.create','curriculum.update','curriculum.delete',
  'assessment.view','assessment.create','assessment.update','assessment.delete'
)
where r.code in ('instructor','professor','program_coordinator')
on conflict (role_id, permission_id) do nothing;

-- Create default profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display text;
begin
  display := coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email);

  insert into public.profiles (user_id, profile_type, display_name, label, is_default, status)
  values (new.id, 'individual', display, 'Individual Member', true, 'active')
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profile_roles enable row level security;

-- Profiles policies
create policy "Users can view own profiles"
on public.profiles for select
to authenticated
using (auth.uid() = user_id);

create policy "Users can insert own profiles"
on public.profiles for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own profiles"
on public.profiles for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Organizations policies
create policy "Authenticated users can view active organizations"
on public.organizations for select
to authenticated
using (status = 'active');

-- Organization members policies
create policy "Users can view own organization memberships"
on public.organization_members for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = organization_members.profile_id
    and p.user_id = auth.uid()
  )
);

-- Roles and permissions read policies
create policy "Authenticated users can view roles"
on public.roles for select
to authenticated
using (true);

create policy "Authenticated users can view permissions"
on public.permissions for select
to authenticated
using (true);

create policy "Authenticated users can view role permissions"
on public.role_permissions for select
to authenticated
using (true);

-- Profile roles policies
create policy "Users can view own profile roles"
on public.profile_roles for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = profile_roles.profile_id
    and p.user_id = auth.uid()
  )
);
