-- TASK 002.5: read-only data access for the Platform Admin Console.
-- These functions do not grant direct table access and never mutate application data.

create or replace function public.has_platform_admin_console_access(requested_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.profile_roles pr
      on pr.profile_id = p.id
     and pr.scope_type = 'platform'
     and pr.scope_id is null
    join public.roles r
      on r.id = pr.role_id
     and r.code = 'platform_admin'
    join public.role_permissions rp
      on rp.role_id = r.id
     and rp.allowed = true
     and rp.approval_required = false
    join public.permissions permission
      on permission.id = rp.permission_id
     and permission.code = 'admin.access'
    where p.id = requested_profile_id
      and p.user_id = auth.uid()
      and p.status = 'active'
  );
$$;

revoke all on function public.has_platform_admin_console_access(uuid) from public, anon;
grant execute on function public.has_platform_admin_console_access(uuid) to authenticated;

create or replace function public.get_platform_admin_overview(requested_profile_id uuid)
returns table (
  active_profiles bigint,
  organizations bigint,
  roles bigint,
  permissions bigint,
  pending_approvals bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_platform_admin_console_access(requested_profile_id) then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  return query
  select
    (select count(*) from public.profiles where status = 'active'),
    (select count(*) from public.organizations),
    (select count(*) from public.roles),
    (select count(*) from public.permissions),
    (
      select count(*)
      from public.onboarding_requests
      where status in ('pending_email_confirmation', 'pending_organization_approval', 'pending_review')
    );
end;
$$;

revoke all on function public.get_platform_admin_overview(uuid) from public, anon;
grant execute on function public.get_platform_admin_overview(uuid) to authenticated;

create or replace function public.list_platform_admin_organizations(requested_profile_id uuid)
returns table (
  id uuid,
  name text,
  slug text,
  organization_type text,
  status text,
  website text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_platform_admin_console_access(requested_profile_id) then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  return query
  select o.id, o.name, o.slug, o.type, o.status, o.website, o.created_at
  from public.organizations o
  order by o.created_at desc, o.name asc;
end;
$$;

revoke all on function public.list_platform_admin_organizations(uuid) from public, anon;
grant execute on function public.list_platform_admin_organizations(uuid) to authenticated;

create or replace function public.list_platform_admin_profiles(requested_profile_id uuid)
returns table (
  id uuid,
  display_name text,
  profile_type text,
  status text,
  organization_name text,
  university_id uuid,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_platform_admin_console_access(requested_profile_id) then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  return query
  select p.id, p.display_name, p.profile_type, p.status, o.name, p.university_id, p.created_at
  from public.profiles p
  left join public.organizations o on o.id = p.organization_id
  order by p.created_at desc, p.display_name asc;
end;
$$;

revoke all on function public.list_platform_admin_profiles(uuid) from public, anon;
grant execute on function public.list_platform_admin_profiles(uuid) to authenticated;

create or replace function public.list_platform_admin_onboarding_requests(requested_profile_id uuid)
returns table (
  id uuid,
  flow text,
  organization_name text,
  organization_type text,
  status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.has_platform_admin_console_access(requested_profile_id) then
    raise exception 'Platform administrator access required' using errcode = '42501';
  end if;

  return query
  select request.id, request.flow, request.organization_name, request.organization_type, request.status, request.created_at
  from public.onboarding_requests request
  order by request.created_at desc;
end;
$$;

revoke all on function public.list_platform_admin_onboarding_requests(uuid) from public, anon;
grant execute on function public.list_platform_admin_onboarding_requests(uuid) to authenticated;
