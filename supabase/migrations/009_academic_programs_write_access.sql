-- TASK 004.3: controlled academic program editing.
-- All reads and writes remain behind authenticated, scoped SECURITY DEFINER RPCs.
-- Reuses public.resolve_academic_units_editor_mode(...) from migration 007 for
-- actor/scope resolution; academic_programs itself is unchanged from migration 004.

create table if not exists public.academic_program_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_profile_id uuid not null references public.profiles(id),
  actor_role text not null check (actor_role in ('university_admin', 'platform_admin')),
  action text not null check (action in ('create', 'update', 'status_change')),
  resource_type text not null default 'academic_program'
    check (resource_type = 'academic_program'),
  resource_id uuid,
  organization_id uuid not null references public.organizations(id),
  before_snapshot jsonb,
  after_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists academic_program_audit_events_organization_created_idx
on public.academic_program_audit_events(organization_id, created_at desc);

create index if not exists academic_program_audit_events_actor_profile_idx
on public.academic_program_audit_events(actor_profile_id, created_at desc);

alter table public.academic_program_audit_events enable row level security;
revoke all on table public.academic_program_audit_events from public, anon, authenticated;

create or replace function public.get_academic_programs_editor_overview(
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
        'parent_unit_id', unit.parent_unit_id,
        'unit_type', unit.unit_type,
        'code', unit.code,
        'name', unit.name,
        'status', unit.status
      ) order by
        case unit.unit_type when 'faculty' then 1 else 2 end,
        unit.name,
        unit.id)
      from public.organization_units unit
      where unit.organization_id = resolved_university_id
        and unit.unit_type in ('faculty', 'department')
    ), '[]'::jsonb),
    'programs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', program.id,
        'organization_id', program.organization_id,
        'organization_unit_id', program.organization_unit_id,
        'code', program.code,
        'name', program.name,
        'description', program.description,
        'program_level', program.program_level,
        'standard_duration_years', program.standard_duration_years,
        'status', program.status,
        'created_at', program.created_at,
        'updated_at', program.updated_at
      ) order by program.name, program.id)
      from public.academic_programs program
      where program.organization_id = resolved_university_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.create_academic_program(
  requested_profile_id uuid,
  target_university_id uuid,
  target_organization_unit_id uuid,
  code text,
  name text,
  description text,
  program_level text,
  status text default 'active'
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
  normalized_level text := lower(btrim(program_level));
  normalized_status text := lower(btrim(status));
  code_was_generated boolean := code is null or btrim(code) = '';
  code_base text;
  code_suffix integer := 2;
  suffix_text text;
  unit_status text;
  unit_type text;
  created_program public.academic_programs%rowtype;
begin
  actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, target_university_id);

  if normalized_name is null or normalized_name = '' then
    raise exception 'Name is required' using errcode = '22023';
  end if;

  if normalized_level is null or normalized_level not in ('bachelor', 'master', 'phd', 'postgraduate', 'other') then
    raise exception 'Invalid academic program level' using errcode = '22023';
  end if;

  if normalized_status is null or normalized_status not in ('active', 'inactive', 'archived') then
    raise exception 'Invalid academic program status' using errcode = '22023';
  end if;

  if target_organization_unit_id is null then
    raise exception 'Academic unit is required' using errcode = '22023';
  end if;

  select unit.status, unit.unit_type
  into unit_status, unit_type
  from public.organization_units unit
  where unit.id = target_organization_unit_id
    and unit.organization_id = target_university_id
  for update;

  if unit_status is null or unit_type not in ('faculty', 'department') then
    raise exception 'Academic program requires a faculty or department in the same university' using errcode = '22023';
  end if;

  if unit_status = 'archived' then
    raise exception 'Academic program cannot be created under an archived academic unit' using errcode = '22023';
  end if;

  if normalized_status = 'active' and unit_status <> 'active' then
    raise exception 'Active academic program requires an active academic unit' using errcode = '22023';
  end if;

  if code_was_generated then
    normalized_code := upper(btrim(regexp_replace(
      translate(normalized_name, 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaissttAAISSTT'),
      '[^A-Za-z0-9]+', '-', 'g'
    ), '-'));
    normalized_code := left(coalesce(nullif(normalized_code, ''), 'PROGRAM'), 100);
    code_base := normalized_code;

    while exists (
      select 1
      from public.academic_programs existing
      where existing.organization_id = target_university_id
        and lower(btrim(existing.code)) = lower(normalized_code)
    ) loop
      suffix_text := '-' || code_suffix::text;
      normalized_code := left(code_base, greatest(1, 100 - char_length(suffix_text))) || suffix_text;
      code_suffix := code_suffix + 1;
    end loop;
  else
    if char_length(normalized_code) > 100 then
      raise exception 'Academic program code must not exceed 100 characters' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.academic_programs existing
      where existing.organization_id = target_university_id
        and lower(btrim(existing.code)) = lower(normalized_code)
    ) then
      raise exception 'Academic program code already exists in this university' using errcode = '23505';
    end if;
  end if;

  insert into public.academic_programs (
    organization_id, organization_unit_id, code, name, description, program_level, status
  ) values (
    target_university_id, target_organization_unit_id, normalized_code, normalized_name,
    normalized_description, normalized_level, normalized_status
  )
  returning * into created_program;

  insert into public.academic_program_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_id,
    organization_id, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, 'create', created_program.id,
    created_program.organization_id, to_jsonb(created_program)
  );

  return to_jsonb(created_program);
end;
$$;

create or replace function public.update_academic_program(
  requested_profile_id uuid,
  program_id uuid,
  target_organization_unit_id uuid,
  code text,
  name text,
  description text,
  program_level text,
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
  normalized_level text := lower(btrim(program_level));
  normalized_status text := lower(btrim(status));
  code_was_generated boolean := code is null or btrim(code) = '';
  code_base text;
  code_suffix integer := 2;
  suffix_text text;
  unit_status text;
  unit_type text;
  existing_program public.academic_programs%rowtype;
  updated_program public.academic_programs%rowtype;
  audit_action text;
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  select program.*
  into existing_program
  from public.academic_programs program
  where program.id = program_id;

  if existing_program.id is null then
    raise exception 'Academic program not found' using errcode = '22023';
  end if;

  actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, existing_program.organization_id);

  if target_organization_unit_id is null then
    raise exception 'Academic unit is required' using errcode = '22023';
  end if;

  -- Lock the current and target unit rows so a concurrent unit status change
  -- cannot race the hierarchy checks below.
  perform 1
  from public.organization_units unit
  where unit.organization_id = existing_program.organization_id
    and unit.id in (existing_program.organization_unit_id, target_organization_unit_id)
  order by unit.id
  for update;

  select program.*
  into existing_program
  from public.academic_programs program
  where program.id = program_id
  for update;

  if existing_program.id is null then
    raise exception 'Academic program changed during update' using errcode = '40001';
  end if;

  if normalized_name is null or normalized_name = '' then
    raise exception 'Name is required' using errcode = '22023';
  end if;

  if normalized_level is null or normalized_level not in ('bachelor', 'master', 'phd', 'postgraduate', 'other') then
    raise exception 'Invalid academic program level' using errcode = '22023';
  end if;

  if normalized_status is null or normalized_status not in ('active', 'inactive', 'archived') then
    raise exception 'Invalid academic program status' using errcode = '22023';
  end if;

  select unit.status, unit.unit_type
  into unit_status, unit_type
  from public.organization_units unit
  where unit.id = target_organization_unit_id
    and unit.organization_id = existing_program.organization_id;

  if unit_status is null or unit_type not in ('faculty', 'department') then
    raise exception 'Academic program requires a faculty or department in the same university' using errcode = '22023';
  end if;

  if unit_status = 'archived'
    and (target_organization_unit_id is distinct from existing_program.organization_unit_id or normalized_status <> 'archived') then
    raise exception 'Academic program cannot be moved under or reactivated within an archived academic unit'
      using errcode = '22023';
  end if;

  if normalized_status = 'active' and unit_status <> 'active' then
    raise exception 'Active academic program requires an active academic unit' using errcode = '22023';
  end if;

  if code_was_generated then
    normalized_code := upper(btrim(regexp_replace(
      translate(normalized_name, 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaissttAAISSTT'),
      '[^A-Za-z0-9]+', '-', 'g'
    ), '-'));
    normalized_code := left(coalesce(nullif(normalized_code, ''), 'PROGRAM'), 100);
    code_base := normalized_code;

    while exists (
      select 1
      from public.academic_programs duplicate
      where duplicate.organization_id = existing_program.organization_id
        and duplicate.id <> existing_program.id
        and lower(btrim(duplicate.code)) = lower(normalized_code)
    ) loop
      suffix_text := '-' || code_suffix::text;
      normalized_code := left(code_base, greatest(1, 100 - char_length(suffix_text))) || suffix_text;
      code_suffix := code_suffix + 1;
    end loop;
  else
    if char_length(normalized_code) > 100 then
      raise exception 'Academic program code must not exceed 100 characters' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.academic_programs duplicate
      where duplicate.organization_id = existing_program.organization_id
        and duplicate.id <> existing_program.id
        and lower(btrim(duplicate.code)) = lower(normalized_code)
    ) then
      raise exception 'Academic program code already exists in this university' using errcode = '23505';
    end if;
  end if;

  update public.academic_programs program
  set organization_unit_id = target_organization_unit_id,
      code = normalized_code,
      name = normalized_name,
      description = normalized_description,
      program_level = normalized_level,
      status = normalized_status
  where program.id = existing_program.id
  returning program.* into updated_program;

  audit_action := case
    when existing_program.status is distinct from updated_program.status then 'status_change'
    else 'update'
  end;

  insert into public.academic_program_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_id,
    organization_id, before_snapshot, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, audit_action, updated_program.id,
    updated_program.organization_id, to_jsonb(existing_program), to_jsonb(updated_program)
  );

  return to_jsonb(updated_program);
end;
$$;

revoke all on function public.get_academic_programs_editor_overview(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_academic_program(uuid, uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.update_academic_program(uuid, uuid, uuid, text, text, text, text, text) from public, anon, authenticated;

grant execute on function public.get_academic_programs_editor_overview(uuid, uuid) to authenticated;
grant execute on function public.create_academic_program(uuid, uuid, uuid, text, text, text, text, text) to authenticated;
grant execute on function public.update_academic_program(uuid, uuid, uuid, text, text, text, text, text) to authenticated;

comment on table public.academic_program_audit_events is
  'Immutable audit trail for TASK 004.3 academic program mutations.';
comment on function public.get_academic_programs_editor_overview(uuid, uuid) is
  'Returns scoped academic programs and eligible faculties/departments for a University Admin or Platform Admin editor.';
comment on function public.create_academic_program(uuid, uuid, uuid, text, text, text, text, text) is
  'Creates a scoped academic program under an eligible faculty/department and records the mutation in the audit trail.';
comment on function public.update_academic_program(uuid, uuid, uuid, text, text, text, text, text) is
  'Updates a scoped academic program without changing its university and records the mutation.';
