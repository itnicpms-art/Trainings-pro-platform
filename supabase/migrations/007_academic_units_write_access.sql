-- TASK 004.1: controlled faculty and department editing.
-- All reads and writes remain behind authenticated, scoped SECURITY DEFINER RPCs.

create table if not exists public.academic_structure_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_profile_id uuid not null references public.profiles(id),
  actor_role text not null check (actor_role in ('university_admin', 'platform_admin')),
  action text not null check (action in ('create', 'update', 'status_change')),
  resource_type text not null default 'organization_unit'
    check (resource_type = 'organization_unit'),
  resource_id uuid,
  organization_id uuid not null references public.organizations(id),
  before_snapshot jsonb,
  after_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists academic_structure_audit_events_organization_created_idx
on public.academic_structure_audit_events(organization_id, created_at desc);

create index if not exists academic_structure_audit_events_actor_profile_idx
on public.academic_structure_audit_events(actor_profile_id, created_at desc);

alter table public.academic_structure_audit_events enable row level security;
revoke all on table public.academic_structure_audit_events from public, anon, authenticated;

create or replace function public.resolve_academic_units_editor_mode(
  requested_profile_id uuid,
  target_university_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  if target_university_id is null or not exists (
    select 1
    from public.organizations organization
    where organization.id = target_university_id
      and organization.type = 'university'
  ) then
    raise exception 'Valid university required' using errcode = '42501';
  end if;

  if public.has_platform_admin_console_access(requested_profile_id) then
    return 'platform_admin';
  end if;

  if exists (
    select 1
    from public.profiles profile
    join public.profile_roles profile_role
      on profile_role.profile_id = profile.id
     and profile_role.scope_type = 'university'
     and profile_role.scope_id = target_university_id
    join public.roles role
      on role.id = profile_role.role_id
     and role.code = 'university_admin'
    where profile.id = requested_profile_id
      and profile.user_id = auth.uid()
      and profile.status = 'active'
  ) then
    return 'university_admin';
  end if;

  raise exception 'Academic unit editor access denied' using errcode = '42501';
end;
$$;

create or replace function public.get_academic_units_editor_overview(
  requested_profile_id uuid,
  target_university_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_mode text;
  resolved_university_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles profile
    where profile.id = requested_profile_id
      and profile.user_id = auth.uid()
      and profile.status = 'active'
  ) then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  if public.has_platform_admin_console_access(requested_profile_id) then
    actor_mode := 'platform_admin';
    resolved_university_id := target_university_id;

    if resolved_university_id is not null then
      perform public.resolve_academic_units_editor_mode(requested_profile_id, resolved_university_id);
    end if;
  else
    select profile_role.scope_id
    into resolved_university_id
    from public.profile_roles profile_role
    join public.roles role
      on role.id = profile_role.role_id
     and role.code = 'university_admin'
    join public.organizations organization
      on organization.id = profile_role.scope_id
     and organization.type = 'university'
    where profile_role.profile_id = requested_profile_id
      and profile_role.scope_type = 'university'
      and (target_university_id is null or profile_role.scope_id = target_university_id)
    order by profile_role.created_at, profile_role.id
    limit 1;

    if resolved_university_id is null
      or (target_university_id is not null and target_university_id <> resolved_university_id) then
      raise exception 'University administrator scope mismatch' using errcode = '42501';
    end if;

    actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, resolved_university_id);
  end if;

  return jsonb_build_object(
    'actor_profile_id', requested_profile_id,
    'actor_mode', actor_mode,
    'selected_university', (
      select jsonb_build_object(
        'id', organization.id,
        'name', organization.name,
        'status', organization.status
      )
      from public.organizations organization
      where organization.id = resolved_university_id
        and organization.type = 'university'
    ),
    'universities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', organization.id,
        'name', organization.name,
        'status', organization.status
      ) order by organization.name, organization.id)
      from public.organizations organization
      where organization.type = 'university'
        and (actor_mode = 'platform_admin' or organization.id = resolved_university_id)
    ), '[]'::jsonb),
    'units', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', unit.id,
        'organization_id', unit.organization_id,
        'parent_unit_id', unit.parent_unit_id,
        'unit_type', unit.unit_type,
        'code', unit.code,
        'name', unit.name,
        'description', unit.description,
        'status', unit.status,
        'created_at', unit.created_at,
        'updated_at', unit.updated_at
      ) order by
        case unit.unit_type when 'faculty' then 1 else 2 end,
        unit.name,
        unit.id)
      from public.organization_units unit
      where unit.organization_id = resolved_university_id
        and unit.unit_type in ('faculty', 'department')
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.create_academic_unit(
  requested_profile_id uuid,
  target_university_id uuid,
  parent_unit_id uuid,
  unit_type text,
  code text,
  name text,
  description text,
  status text default 'active'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_mode text;
  normalized_type text := lower(btrim(unit_type));
  normalized_code text := upper(btrim(code));
  normalized_name text := btrim(name);
  normalized_description text := nullif(btrim(description), '');
  normalized_status text := lower(btrim(status));
  code_was_generated boolean := code is null or btrim(code) = '';
  code_base text;
  code_suffix integer := 2;
  suffix_text text;
  created_unit public.organization_units%rowtype;
begin
  actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, target_university_id);

  if normalized_type is null or normalized_type not in ('faculty', 'department') then
    raise exception 'Only faculty or department units are editable' using errcode = '22023';
  end if;

  if normalized_name is null or normalized_name = '' then
    raise exception 'Name is required' using errcode = '22023';
  end if;

  if normalized_status is null or normalized_status not in ('active', 'inactive', 'archived') then
    raise exception 'Invalid academic unit status' using errcode = '22023';
  end if;

  if normalized_type = 'faculty' and $3 is not null then
    raise exception 'Faculty cannot have a parent unit' using errcode = '22023';
  end if;

  if normalized_type = 'department' and (
    $3 is null or not exists (
      select 1
      from public.organization_units parent
      where parent.id = $3
        and parent.organization_id = target_university_id
        and parent.unit_type = 'faculty'
        and parent.status in ('active', 'inactive')
    )
  ) then
    raise exception 'Department requires an active or inactive faculty in the same university'
      using errcode = '22023';
  end if;

  if code_was_generated then
    normalized_code := upper(btrim(regexp_replace(
      translate(normalized_name, 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaissttAAISSTT'),
      '[^A-Za-z0-9]+', '-', 'g'
    ), '-'));
    normalized_code := left(coalesce(nullif(normalized_code, ''), 'UNIT'), 100);
    code_base := normalized_code;

    while exists (
      select 1
      from public.organization_units existing
      where existing.organization_id = target_university_id
        and lower(btrim(existing.code)) = lower(normalized_code)
    ) loop
      suffix_text := '-' || code_suffix::text;
      normalized_code := left(code_base, greatest(1, 100 - char_length(suffix_text))) || suffix_text;
      code_suffix := code_suffix + 1;
    end loop;
  else
    if char_length(normalized_code) > 100 then
      raise exception 'Academic unit code must not exceed 100 characters' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.organization_units existing
      where existing.organization_id = target_university_id
        and lower(btrim(existing.code)) = lower(normalized_code)
    ) then
      raise exception 'Academic unit code already exists in this university' using errcode = '23505';
    end if;
  end if;

  insert into public.organization_units (
    organization_id, parent_unit_id, unit_type, code, name, description, status
  ) values (
    target_university_id, $3, normalized_type, normalized_code,
    normalized_name, normalized_description, normalized_status
  )
  returning * into created_unit;

  insert into public.academic_structure_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_id,
    organization_id, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, 'create', created_unit.id,
    created_unit.organization_id, to_jsonb(created_unit)
  );

  return to_jsonb(created_unit);
end;
$$;

create or replace function public.update_academic_unit(
  requested_profile_id uuid,
  unit_id uuid,
  parent_unit_id uuid,
  code text,
  name text,
  description text,
  status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_mode text;
  normalized_code text := upper(btrim(code));
  normalized_name text := btrim(name);
  normalized_description text := nullif(btrim(description), '');
  normalized_status text := lower(btrim(status));
  code_was_generated boolean := code is null or btrim(code) = '';
  code_base text;
  code_suffix integer := 2;
  suffix_text text;
  existing_unit public.organization_units%rowtype;
  updated_unit public.organization_units%rowtype;
  audit_action text;
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  select unit.*
  into existing_unit
  from public.organization_units unit
  where unit.id = unit_id
    and unit.unit_type in ('faculty', 'department')
  for update;

  if existing_unit.id is null then
    raise exception 'Editable academic unit not found' using errcode = '22023';
  end if;

  actor_mode := public.resolve_academic_units_editor_mode(
    requested_profile_id,
    existing_unit.organization_id
  );

  if normalized_name is null or normalized_name = '' then
    raise exception 'Name is required' using errcode = '22023';
  end if;

  if normalized_status is null or normalized_status not in ('active', 'inactive', 'archived') then
    raise exception 'Invalid academic unit status' using errcode = '22023';
  end if;

  if existing_unit.unit_type = 'faculty' and $3 is not null then
    raise exception 'Faculty cannot have a parent unit' using errcode = '22023';
  end if;

  if existing_unit.unit_type = 'department' and (
    $3 is null or not exists (
      select 1
      from public.organization_units parent
      where parent.id = $3
        and parent.organization_id = existing_unit.organization_id
        and parent.unit_type = 'faculty'
        and parent.status in ('active', 'inactive')
    )
  ) then
    raise exception 'Department requires an active or inactive faculty in the same university'
      using errcode = '22023';
  end if;

  if code_was_generated then
    normalized_code := upper(btrim(regexp_replace(
      translate(normalized_name, 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaissttAAISSTT'),
      '[^A-Za-z0-9]+', '-', 'g'
    ), '-'));
    normalized_code := left(coalesce(nullif(normalized_code, ''), 'UNIT'), 100);
    code_base := normalized_code;

    while exists (
      select 1
      from public.organization_units duplicate
      where duplicate.organization_id = existing_unit.organization_id
        and duplicate.id <> existing_unit.id
        and lower(btrim(duplicate.code)) = lower(normalized_code)
    ) loop
      suffix_text := '-' || code_suffix::text;
      normalized_code := left(code_base, greatest(1, 100 - char_length(suffix_text))) || suffix_text;
      code_suffix := code_suffix + 1;
    end loop;
  else
    if char_length(normalized_code) > 100 then
      raise exception 'Academic unit code must not exceed 100 characters' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.organization_units duplicate
      where duplicate.organization_id = existing_unit.organization_id
        and duplicate.id <> existing_unit.id
        and lower(btrim(duplicate.code)) = lower(normalized_code)
    ) then
      raise exception 'Academic unit code already exists in this university' using errcode = '23505';
    end if;
  end if;

  update public.organization_units unit
  set parent_unit_id = $3,
      code = normalized_code,
      name = normalized_name,
      description = normalized_description,
      status = normalized_status
  where unit.id = existing_unit.id
  returning unit.* into updated_unit;

  audit_action := case
    when existing_unit.status is distinct from updated_unit.status then 'status_change'
    else 'update'
  end;

  insert into public.academic_structure_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_id,
    organization_id, before_snapshot, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, audit_action, updated_unit.id,
    updated_unit.organization_id, to_jsonb(existing_unit), to_jsonb(updated_unit)
  );

  return to_jsonb(updated_unit);
end;
$$;

revoke all on function public.resolve_academic_units_editor_mode(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_academic_units_editor_overview(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_academic_unit(uuid, uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.update_academic_unit(uuid, uuid, uuid, text, text, text, text) from public, anon, authenticated;

grant execute on function public.get_academic_units_editor_overview(uuid, uuid) to authenticated;
grant execute on function public.create_academic_unit(uuid, uuid, uuid, text, text, text, text, text) to authenticated;
grant execute on function public.update_academic_unit(uuid, uuid, uuid, text, text, text, text) to authenticated;

comment on table public.academic_structure_audit_events is
  'Immutable audit trail for TASK 004.1 faculty and department mutations.';
comment on function public.get_academic_units_editor_overview(uuid, uuid) is
  'Returns scoped faculties and departments for a University Admin or Platform Admin editor.';
comment on function public.create_academic_unit(uuid, uuid, uuid, text, text, text, text, text) is
  'Creates a scoped faculty or department and records the mutation in the audit trail.';
comment on function public.update_academic_unit(uuid, uuid, uuid, text, text, text, text) is
  'Updates a scoped faculty or department without changing its university or type and records the mutation.';
