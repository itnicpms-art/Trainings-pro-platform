-- TASK 004.5: controlled academic group editing. All reads and writes remain
-- behind authenticated, scoped SECURITY DEFINER RPCs. Reuses
-- public.resolve_academic_units_editor_mode(...) from migration 007 for
-- actor/scope resolution; academic_groups itself (migration 004) is
-- unchanged — no column, enum value, or constraint is added or altered here.
--
-- Real schema used (verified against migration 004, not assumed):
--   academic_groups(organization_id not null, academic_program_id not null,
--     academic_year_id nullable, academic_term_id nullable, code, name,
--     description, status in ('active','inactive','suspended','archived')).
--   unique(organization_id, code) — code uniqueness is university-scoped,
--   like faculties/departments/programs, NOT year-scoped like academic_terms.
--   FKs guarantee: academic_program_id belongs to the same organization_id;
--   academic_year_id, if present, belongs to the same organization_id;
--   academic_term_id, if present, belongs to the same organization_id AND
--   the same academic_year_id (compound FK to academic_terms(id,
--   organization_id, academic_year_id)); and a term can never be set
--   without a year (academic_groups_term_requires_year_check). Only
--   academic_program_id is mandatory — a group is not required to have a
--   year or a term.
--
-- Existing membership relation discovered: public.academic_profile_contexts
-- (migration 004) already links a profile to academic_group_id (FK
-- academic_profile_contexts_group_same_program_fk, scoped to the same
-- organization_id and academic_program_id as the group). This is the real
-- profile-to-group relationship the schema already models. TASK 004.5 does
-- not read, write, or otherwise touch academic_profile_contexts — assigning
-- students to a group is TASK 004.6's scope. No new membership table is
-- created here.

create table if not exists public.academic_group_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_profile_id uuid not null references public.profiles(id),
  actor_role text not null check (actor_role in ('university_admin', 'platform_admin')),
  action text not null check (action in ('create', 'update', 'status_change')),
  resource_type text not null default 'academic_group' check (resource_type = 'academic_group'),
  resource_id uuid,
  organization_id uuid not null references public.organizations(id),
  before_snapshot jsonb,
  after_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists academic_group_audit_events_organization_created_idx
on public.academic_group_audit_events(organization_id, created_at desc);

create index if not exists academic_group_audit_events_actor_profile_idx
on public.academic_group_audit_events(actor_profile_id, created_at desc);

alter table public.academic_group_audit_events enable row level security;
revoke all on table public.academic_group_audit_events from public, anon, authenticated;

create or replace function public.get_academic_groups_editor_overview(
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
    'academic_programs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', program.id,
        'code', program.code,
        'name', program.name,
        'status', program.status
      ) order by program.name, program.id)
      from public.academic_programs program
      where program.organization_id = resolved_university_id
    ), '[]'::jsonb),
    'academic_years', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', year.id,
        'code', year.code,
        'name', year.name,
        'status', year.status
      ) order by year.start_date desc, year.name, year.id)
      from public.academic_years year
      where year.organization_id = resolved_university_id
    ), '[]'::jsonb),
    'academic_terms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', term.id,
        'academic_year_id', term.academic_year_id,
        'code', term.code,
        'name', term.name,
        'term_type', term.term_type,
        'status', term.status
      ) order by term.start_date desc, term.name, term.id)
      from public.academic_terms term
      where term.organization_id = resolved_university_id
    ), '[]'::jsonb),
    'academic_groups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id,
        'organization_id', item.organization_id,
        'academic_program_id', item.academic_program_id,
        'academic_year_id', item.academic_year_id,
        'academic_term_id', item.academic_term_id,
        'code', item.code,
        'name', item.name,
        'description', item.description,
        'status', item.status,
        'created_at', item.created_at,
        'updated_at', item.updated_at
      ) order by item.name, item.id)
      from public.academic_groups item
      where item.organization_id = resolved_university_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.create_academic_group(
  requested_profile_id uuid,
  target_university_id uuid,
  target_academic_program_id uuid,
  target_academic_year_id uuid,
  target_academic_term_id uuid,
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
  normalized_code text := upper(btrim(code));
  normalized_name text := btrim(name);
  normalized_description text := nullif(btrim(description), '');
  normalized_status text := lower(btrim(status));
  code_was_generated boolean := code is null or btrim(code) = '';
  code_base text;
  code_suffix integer := 2;
  suffix_text text;
  program_status text;
  year_status text;
  term_status text;
  created_group public.academic_groups%rowtype;
begin
  actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, target_university_id);

  if normalized_name is null or normalized_name = '' then
    raise exception 'Name is required' using errcode = '22023';
  end if;

  if normalized_status is null or normalized_status not in ('active', 'inactive', 'archived') then
    raise exception 'Invalid academic group status' using errcode = '22023';
  end if;

  if target_academic_term_id is not null and target_academic_year_id is null then
    raise exception 'Academic term requires an academic year' using errcode = '22023';
  end if;

  if target_academic_program_id is null then
    raise exception 'Academic group requires an academic program in the same university' using errcode = '22023';
  end if;

  select program.status
  into program_status
  from public.academic_programs program
  where program.id = target_academic_program_id
    and program.organization_id = target_university_id
  for update;

  if program_status is null then
    raise exception 'Academic group requires an academic program in the same university' using errcode = '22023';
  end if;

  if program_status = 'archived' then
    raise exception 'Academic group cannot be created under an archived academic program' using errcode = '22023';
  end if;

  if normalized_status = 'active' and program_status <> 'active' then
    raise exception 'Active academic group requires an active academic program' using errcode = '22023';
  end if;

  if target_academic_year_id is not null then
    select year.status
    into year_status
    from public.academic_years year
    where year.id = target_academic_year_id
      and year.organization_id = target_university_id
    for update;

    if year_status is null then
      raise exception 'Academic year must belong to the same university' using errcode = '22023';
    end if;

    if year_status = 'archived' then
      raise exception 'Academic group cannot be created for an archived academic year' using errcode = '22023';
    end if;

    if normalized_status = 'active' and year_status <> 'active' then
      raise exception 'Active academic group requires an active academic year' using errcode = '22023';
    end if;
  end if;

  if target_academic_term_id is not null then
    select term.status
    into term_status
    from public.academic_terms term
    where term.id = target_academic_term_id
      and term.organization_id = target_university_id
      and term.academic_year_id = target_academic_year_id
    for update;

    if term_status is null then
      raise exception 'Academic term must belong to the selected academic year' using errcode = '22023';
    end if;

    if term_status = 'archived' then
      raise exception 'Academic group cannot be created for an archived academic term' using errcode = '22023';
    end if;

    if normalized_status = 'active' and term_status <> 'active' then
      raise exception 'Active academic group requires an active academic term' using errcode = '22023';
    end if;
  end if;

  if code_was_generated then
    normalized_code := upper(btrim(regexp_replace(
      translate(normalized_name, 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaissttAAISSTT'),
      '[^A-Za-z0-9]+', '-', 'g'
    ), '-'));
    normalized_code := left(coalesce(nullif(normalized_code, ''), 'GROUP'), 100);
    code_base := normalized_code;

    while exists (
      select 1
      from public.academic_groups existing
      where existing.organization_id = target_university_id
        and lower(btrim(existing.code)) = lower(normalized_code)
    ) loop
      suffix_text := '-' || code_suffix::text;
      normalized_code := left(code_base, greatest(1, 100 - char_length(suffix_text))) || suffix_text;
      code_suffix := code_suffix + 1;
    end loop;
  else
    if char_length(normalized_code) > 100 then
      raise exception 'Academic group code must not exceed 100 characters' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.academic_groups existing
      where existing.organization_id = target_university_id
        and lower(btrim(existing.code)) = lower(normalized_code)
    ) then
      raise exception 'Academic group code already exists in this university' using errcode = '23505';
    end if;
  end if;

  insert into public.academic_groups (
    organization_id, academic_program_id, academic_year_id, academic_term_id,
    code, name, description, status
  ) values (
    target_university_id, target_academic_program_id, target_academic_year_id, target_academic_term_id,
    normalized_code, normalized_name, normalized_description, normalized_status
  )
  returning * into created_group;

  insert into public.academic_group_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_id,
    organization_id, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, 'create', created_group.id,
    created_group.organization_id, to_jsonb(created_group)
  );

  return to_jsonb(created_group);
end;
$$;

create or replace function public.update_academic_group(
  requested_profile_id uuid,
  group_id uuid,
  target_academic_program_id uuid,
  target_academic_year_id uuid,
  target_academic_term_id uuid,
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
  year_ids_to_lock uuid[];
  term_ids_to_lock uuid[];
  program_status text;
  year_status text;
  term_status text;
  existing_group public.academic_groups%rowtype;
  updated_group public.academic_groups%rowtype;
  audit_action text;
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  select item.*
  into existing_group
  from public.academic_groups item
  where item.id = group_id;

  if existing_group.id is null then
    raise exception 'Academic group not found' using errcode = '22023';
  end if;

  actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, existing_group.organization_id);

  if target_academic_term_id is not null and target_academic_year_id is null then
    raise exception 'Academic term requires an academic year' using errcode = '22023';
  end if;

  if target_academic_program_id is null then
    raise exception 'Academic group requires an academic program in the same university' using errcode = '22023';
  end if;

  -- Lock the current and target program/year/term rows so a concurrent
  -- status/date change cannot race the hierarchy checks below.
  perform 1
  from public.academic_programs program
  where program.organization_id = existing_group.organization_id
    and program.id in (existing_group.academic_program_id, target_academic_program_id)
  order by program.id
  for update;

  year_ids_to_lock := array_remove(array[existing_group.academic_year_id, target_academic_year_id], null);
  if array_length(year_ids_to_lock, 1) > 0 then
    perform 1
    from public.academic_years year
    where year.organization_id = existing_group.organization_id
      and year.id = any(year_ids_to_lock)
    order by year.id
    for update;
  end if;

  term_ids_to_lock := array_remove(array[existing_group.academic_term_id, target_academic_term_id], null);
  if array_length(term_ids_to_lock, 1) > 0 then
    perform 1
    from public.academic_terms term
    where term.organization_id = existing_group.organization_id
      and term.id = any(term_ids_to_lock)
    order by term.id
    for update;
  end if;

  select item.*
  into existing_group
  from public.academic_groups item
  where item.id = group_id
  for update;

  if existing_group.id is null then
    raise exception 'Academic group changed during update' using errcode = '40001';
  end if;

  if normalized_name is null or normalized_name = '' then
    raise exception 'Name is required' using errcode = '22023';
  end if;

  if normalized_status is null or normalized_status not in ('active', 'inactive', 'archived') then
    raise exception 'Invalid academic group status' using errcode = '22023';
  end if;

  select program.status
  into program_status
  from public.academic_programs program
  where program.id = target_academic_program_id
    and program.organization_id = existing_group.organization_id;

  if program_status is null then
    raise exception 'Academic group requires an academic program in the same university' using errcode = '22023';
  end if;

  if program_status = 'archived'
    and (target_academic_program_id is distinct from existing_group.academic_program_id or normalized_status <> 'archived') then
    raise exception 'Academic group cannot be moved under or reactivated within an archived academic program'
      using errcode = '22023';
  end if;

  if normalized_status = 'active' and program_status <> 'active' then
    raise exception 'Active academic group requires an active academic program' using errcode = '22023';
  end if;

  if target_academic_year_id is not null then
    select year.status
    into year_status
    from public.academic_years year
    where year.id = target_academic_year_id
      and year.organization_id = existing_group.organization_id;

    if year_status is null then
      raise exception 'Academic year must belong to the same university' using errcode = '22023';
    end if;

    if year_status = 'archived'
      and (target_academic_year_id is distinct from existing_group.academic_year_id or normalized_status <> 'archived') then
      raise exception 'Academic group cannot be moved under or reactivated within an archived academic year'
        using errcode = '22023';
    end if;

    if normalized_status = 'active' and year_status <> 'active' then
      raise exception 'Active academic group requires an active academic year' using errcode = '22023';
    end if;
  end if;

  if target_academic_term_id is not null then
    select term.status
    into term_status
    from public.academic_terms term
    where term.id = target_academic_term_id
      and term.organization_id = existing_group.organization_id
      and term.academic_year_id = target_academic_year_id;

    if term_status is null then
      raise exception 'Academic term must belong to the selected academic year' using errcode = '22023';
    end if;

    if term_status = 'archived'
      and (target_academic_term_id is distinct from existing_group.academic_term_id or normalized_status <> 'archived') then
      raise exception 'Academic group cannot be moved under or reactivated within an archived academic term'
        using errcode = '22023';
    end if;

    if normalized_status = 'active' and term_status <> 'active' then
      raise exception 'Active academic group requires an active academic term' using errcode = '22023';
    end if;
  end if;

  if code_was_generated then
    normalized_code := upper(btrim(regexp_replace(
      translate(normalized_name, 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaissttAAISSTT'),
      '[^A-Za-z0-9]+', '-', 'g'
    ), '-'));
    normalized_code := left(coalesce(nullif(normalized_code, ''), 'GROUP'), 100);
    code_base := normalized_code;

    while exists (
      select 1
      from public.academic_groups duplicate
      where duplicate.organization_id = existing_group.organization_id
        and duplicate.id <> existing_group.id
        and lower(btrim(duplicate.code)) = lower(normalized_code)
    ) loop
      suffix_text := '-' || code_suffix::text;
      normalized_code := left(code_base, greatest(1, 100 - char_length(suffix_text))) || suffix_text;
      code_suffix := code_suffix + 1;
    end loop;
  else
    if char_length(normalized_code) > 100 then
      raise exception 'Academic group code must not exceed 100 characters' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.academic_groups duplicate
      where duplicate.organization_id = existing_group.organization_id
        and duplicate.id <> existing_group.id
        and lower(btrim(duplicate.code)) = lower(normalized_code)
    ) then
      raise exception 'Academic group code already exists in this university' using errcode = '23505';
    end if;
  end if;

  update public.academic_groups item
  set academic_program_id = target_academic_program_id,
      academic_year_id = target_academic_year_id,
      academic_term_id = target_academic_term_id,
      code = normalized_code,
      name = normalized_name,
      description = normalized_description,
      status = normalized_status
  where item.id = existing_group.id
  returning item.* into updated_group;

  audit_action := case
    when existing_group.status is distinct from updated_group.status then 'status_change'
    else 'update'
  end;

  insert into public.academic_group_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_id,
    organization_id, before_snapshot, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, audit_action, updated_group.id,
    updated_group.organization_id, to_jsonb(existing_group), to_jsonb(updated_group)
  );

  return to_jsonb(updated_group);
end;
$$;

revoke all on function public.get_academic_groups_editor_overview(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_academic_group(uuid, uuid, uuid, uuid, uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function public.update_academic_group(uuid, uuid, uuid, uuid, uuid, text, text, text, text) from public, anon, authenticated;

grant execute on function public.get_academic_groups_editor_overview(uuid, uuid) to authenticated;
grant execute on function public.create_academic_group(uuid, uuid, uuid, uuid, uuid, text, text, text, text) to authenticated;
grant execute on function public.update_academic_group(uuid, uuid, uuid, uuid, uuid, text, text, text, text) to authenticated;

comment on table public.academic_group_audit_events is
  'Immutable audit trail for TASK 004.5 academic group mutations.';
comment on function public.get_academic_groups_editor_overview(uuid, uuid) is
  'Returns scoped academic groups and their eligible program/year/term options for a University Admin or Platform Admin editor.';
comment on function public.create_academic_group(uuid, uuid, uuid, uuid, uuid, text, text, text, text) is
  'Creates a scoped academic group under an eligible program (and optional year/term) in the same university and records the mutation in the audit trail.';
comment on function public.update_academic_group(uuid, uuid, uuid, uuid, uuid, text, text, text, text) is
  'Updates a scoped academic group without changing its university and records the mutation.';
