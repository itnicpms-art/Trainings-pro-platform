-- TASK 004.2: controlled organization and university editing for Platform Admin.
-- All reads and writes remain behind authenticated, scoped SECURITY DEFINER RPCs.

-- Formalize the organization status domain used everywhere else in the schema.
-- The foundation column had no explicit check; existing rows already use 'active'.
alter table public.organizations
  drop constraint if exists organizations_status_check;
alter table public.organizations
  add constraint organizations_status_check check (status in (
    'active', 'inactive', 'suspended', 'archived'
  ));

create table if not exists public.platform_admin_organization_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_profile_id uuid not null references public.profiles(id),
  actor_role text not null default 'platform_admin' check (actor_role = 'platform_admin'),
  action text not null check (action in ('create', 'update', 'status_change')),
  resource_type text not null default 'organization' check (resource_type = 'organization'),
  resource_id uuid not null references public.organizations(id),
  before_snapshot jsonb,
  after_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_admin_organization_audit_events_resource_created_idx
on public.platform_admin_organization_audit_events(resource_id, created_at desc);

create index if not exists platform_admin_organization_audit_events_actor_profile_idx
on public.platform_admin_organization_audit_events(actor_profile_id, created_at desc);

alter table public.platform_admin_organization_audit_events enable row level security;
revoke all on table public.platform_admin_organization_audit_events from public, anon, authenticated;

create or replace function public.get_platform_admin_organizations_editor(
  requested_profile_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_platform_admin_console_access(requested_profile_id) then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'actor_profile_id', requested_profile_id,
    'organizations', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', organization.id,
        'name', organization.name,
        'slug', organization.slug,
        'type', organization.type,
        'description', organization.description,
        'logo_url', organization.logo_url,
        'website', organization.website,
        'status', organization.status,
        'created_at', organization.created_at,
        'updated_at', organization.updated_at
      ) order by organization.name, organization.id)
      from public.organizations organization
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.create_platform_admin_organization(
  requested_profile_id uuid,
  name text,
  slug text,
  org_type text,
  description text,
  logo_url text,
  website text,
  status text default 'active'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text := btrim(name);
  normalized_type text := lower(btrim(org_type));
  normalized_description text := nullif(btrim(description), '');
  normalized_logo_url text := nullif(btrim(logo_url), '');
  normalized_website text := nullif(btrim(website), '');
  normalized_status text := lower(btrim(status));
  slug_was_generated boolean := slug is null or btrim(slug) = '';
  slug_source text := case when slug_was_generated then name else slug end;
  normalized_slug text;
  slug_base text;
  slug_suffix integer := 2;
  suffix_text text;
  created_organization public.organizations%rowtype;
begin
  if not public.has_platform_admin_console_access(requested_profile_id) then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  if normalized_name is null or normalized_name = '' then
    raise exception 'Name is required' using errcode = '22023';
  end if;

  if normalized_type is null or normalized_type not in ('university', 'company', 'training_provider', 'partner') then
    raise exception 'Invalid organization type' using errcode = '22023';
  end if;

  if normalized_status is null or normalized_status not in ('active', 'inactive', 'suspended', 'archived') then
    raise exception 'Invalid organization status' using errcode = '22023';
  end if;

  normalized_slug := lower(regexp_replace(
    translate(coalesce(slug_source, ''), 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaissttAAISSTT'),
    '[^A-Za-z0-9]+', '-', 'g'
  ));
  normalized_slug := btrim(normalized_slug, '-');

  if slug_was_generated then
    normalized_slug := left(coalesce(nullif(normalized_slug, ''), 'organization'), 160);
    slug_base := normalized_slug;

    while exists (
      select 1
      from public.organizations existing
      where lower(existing.slug) = lower(normalized_slug)
    ) loop
      suffix_text := '-' || slug_suffix::text;
      normalized_slug := left(slug_base, greatest(1, 160 - char_length(suffix_text))) || suffix_text;
      slug_suffix := slug_suffix + 1;
    end loop;
  else
    if normalized_slug is null or normalized_slug = '' then
      raise exception 'Slug is required' using errcode = '22023';
    end if;

    if char_length(normalized_slug) > 160 then
      raise exception 'Organization slug must not exceed 160 characters' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.organizations existing
      where lower(existing.slug) = lower(normalized_slug)
    ) then
      raise exception 'Organization slug already exists' using errcode = '23505';
    end if;
  end if;

  insert into public.organizations (
    name, slug, type, description, logo_url, website, status
  ) values (
    normalized_name, normalized_slug, normalized_type, normalized_description,
    normalized_logo_url, normalized_website, normalized_status
  )
  returning * into created_organization;

  insert into public.platform_admin_organization_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_id, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, 'platform_admin', 'create', created_organization.id,
    to_jsonb(created_organization)
  );

  return to_jsonb(created_organization);
end;
$$;

create or replace function public.update_platform_admin_organization(
  requested_profile_id uuid,
  organization_id uuid,
  name text,
  slug text,
  org_type text,
  description text,
  logo_url text,
  website text,
  status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_name text := btrim(name);
  normalized_type text := lower(btrim(org_type));
  normalized_description text := nullif(btrim(description), '');
  normalized_logo_url text := nullif(btrim(logo_url), '');
  normalized_website text := nullif(btrim(website), '');
  normalized_status text := lower(btrim(status));
  slug_was_generated boolean := slug is null or btrim(slug) = '';
  slug_source text := case when slug_was_generated then name else slug end;
  normalized_slug text;
  slug_base text;
  slug_suffix integer := 2;
  suffix_text text;
  existing_organization public.organizations%rowtype;
  updated_organization public.organizations%rowtype;
  audit_action text;
begin
  if not public.has_platform_admin_console_access(requested_profile_id) then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  select organization.*
  into existing_organization
  from public.organizations organization
  where organization.id = organization_id
  for update;

  if existing_organization.id is null then
    raise exception 'Organization not found' using errcode = '22023';
  end if;

  if normalized_name is null or normalized_name = '' then
    raise exception 'Name is required' using errcode = '22023';
  end if;

  if normalized_type is null or normalized_type not in ('university', 'company', 'training_provider', 'partner') then
    raise exception 'Invalid organization type' using errcode = '22023';
  end if;

  if normalized_status is null or normalized_status not in ('active', 'inactive', 'suspended', 'archived') then
    raise exception 'Invalid organization status' using errcode = '22023';
  end if;

  normalized_slug := lower(regexp_replace(
    translate(coalesce(slug_source, ''), 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaissttAAISSTT'),
    '[^A-Za-z0-9]+', '-', 'g'
  ));
  normalized_slug := btrim(normalized_slug, '-');

  if slug_was_generated then
    normalized_slug := left(coalesce(nullif(normalized_slug, ''), 'organization'), 160);
    slug_base := normalized_slug;

    while exists (
      select 1
      from public.organizations existing
      where existing.id <> existing_organization.id
        and lower(existing.slug) = lower(normalized_slug)
    ) loop
      suffix_text := '-' || slug_suffix::text;
      normalized_slug := left(slug_base, greatest(1, 160 - char_length(suffix_text))) || suffix_text;
      slug_suffix := slug_suffix + 1;
    end loop;
  else
    if normalized_slug is null or normalized_slug = '' then
      raise exception 'Slug is required' using errcode = '22023';
    end if;

    if char_length(normalized_slug) > 160 then
      raise exception 'Organization slug must not exceed 160 characters' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.organizations existing
      where existing.id <> existing_organization.id
        and lower(existing.slug) = lower(normalized_slug)
    ) then
      raise exception 'Organization slug already exists' using errcode = '23505';
    end if;
  end if;

  update public.organizations organization
  set name = normalized_name,
      slug = normalized_slug,
      type = normalized_type,
      description = normalized_description,
      logo_url = normalized_logo_url,
      website = normalized_website,
      status = normalized_status
  where organization.id = existing_organization.id
  returning organization.* into updated_organization;

  audit_action := case
    when existing_organization.status is distinct from updated_organization.status then 'status_change'
    else 'update'
  end;

  insert into public.platform_admin_organization_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_id, before_snapshot, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, 'platform_admin', audit_action, updated_organization.id,
    to_jsonb(existing_organization), to_jsonb(updated_organization)
  );

  return to_jsonb(updated_organization);
end;
$$;

revoke all on function public.get_platform_admin_organizations_editor(uuid) from public, anon, authenticated;
revoke all on function public.create_platform_admin_organization(uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.update_platform_admin_organization(uuid, uuid, text, text, text, text, text, text, text) from public, anon, authenticated;

grant execute on function public.get_platform_admin_organizations_editor(uuid) to authenticated;
grant execute on function public.create_platform_admin_organization(uuid, text, text, text, text, text, text, text) to authenticated;
grant execute on function public.update_platform_admin_organization(uuid, uuid, text, text, text, text, text, text, text) to authenticated;

comment on table public.platform_admin_organization_audit_events is
  'Immutable audit trail for TASK 004.2 Platform Admin organization and university mutations.';
comment on function public.get_platform_admin_organizations_editor(uuid) is
  'Returns every organization and university for the Platform Admin organizations editor.';
comment on function public.create_platform_admin_organization(uuid, text, text, text, text, text, text, text) is
  'Creates an organization or university for Platform Admin and records the mutation in the audit trail.';
comment on function public.update_platform_admin_organization(uuid, uuid, text, text, text, text, text, text, text) is
  'Updates an organization or university for Platform Admin without deleting it and records the mutation.';
