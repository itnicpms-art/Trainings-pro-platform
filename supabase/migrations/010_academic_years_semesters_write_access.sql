-- TASK 004.4: controlled academic year and academic term (semester/trimester/
-- module) editing. All reads and writes remain behind authenticated, scoped
-- SECURITY DEFINER RPCs. Reuses public.resolve_academic_units_editor_mode(...)
-- from migration 007 for actor/scope resolution; academic_years and
-- academic_terms themselves (migration 004) are unchanged — no column, enum
-- value, or constraint is added or altered by this migration.
--
-- Real schema used (verified against migration 004, not assumed):
--   academic_years(organization_id, code, name, start_date, end_date,
--     is_current, status) — status in ('active','inactive','suspended','archived'),
--     unique(organization_id, code), check(end_date >= start_date).
--   academic_terms(organization_id, academic_year_id, code, name, term_type,
--     term_number, start_date, end_date, status) — term_type in ('semester',
--     'trimester','module','term','other'), status in ('active','inactive',
--     'suspended','archived'), unique(academic_year_id, code) [year-scoped,
--     not organization-scoped], FK (academic_year_id, organization_id) ->
--     academic_years(id, organization_id), check(end_date >= start_date).
--     There is no separate "semesters" table — academic_terms is the real,
--     shared table for semesters/trimesters/modules/other periods.
--
-- Groups (academic_groups) are intentionally not touched by this migration;
-- they remain read-only until TASK 004.5.
--
-- Overlap decision: the schema has no exclusion constraint or unique index
-- preventing two academic_terms rows in the same academic_year from having
-- overlapping date ranges, and term_type already models heterogeneous,
-- potentially co-occurring period kinds (e.g. a 'module' or exam 'term' can
-- legitimately run inside a 'semester'). No overlap-rejection rule is added
-- here; this preserves the existing, intentionally permissive model instead
-- of inventing a restriction the schema does not express. Containment within
-- the parent academic year's own [start_date, end_date] interval is enforced
-- instead, since that is a real hierarchy relationship (FK + shared
-- organization_id), not an invented one.
--
-- is_current is intentionally not settable through these RPCs: it stays at
-- its column default (false) on create and is never included in the update
-- SET list, so existing values are preserved untouched. Deciding which year
-- is "current" is out of this task's scope; the existing partial unique index
-- (one current+active year per organization) is therefore never at risk of
-- being violated by these RPCs.

create table if not exists public.academic_calendar_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_profile_id uuid not null references public.profiles(id),
  actor_role text not null check (actor_role in ('university_admin', 'platform_admin')),
  action text not null check (action in ('create', 'update', 'status_change')),
  resource_type text not null check (resource_type in ('academic_year', 'academic_term')),
  resource_id uuid,
  organization_id uuid not null references public.organizations(id),
  before_snapshot jsonb,
  after_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists academic_calendar_audit_events_organization_created_idx
on public.academic_calendar_audit_events(organization_id, created_at desc);

create index if not exists academic_calendar_audit_events_actor_profile_idx
on public.academic_calendar_audit_events(actor_profile_id, created_at desc);

alter table public.academic_calendar_audit_events enable row level security;
revoke all on table public.academic_calendar_audit_events from public, anon, authenticated;

create or replace function public.get_academic_calendar_editor_overview(
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
    'academic_years', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', year.id,
        'organization_id', year.organization_id,
        'code', year.code,
        'name', year.name,
        'start_date', year.start_date,
        'end_date', year.end_date,
        'is_current', year.is_current,
        'status', year.status,
        'created_at', year.created_at,
        'updated_at', year.updated_at
      ) order by year.start_date desc, year.name, year.id)
      from public.academic_years year
      where year.organization_id = resolved_university_id
    ), '[]'::jsonb),
    'academic_terms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', term.id,
        'organization_id', term.organization_id,
        'academic_year_id', term.academic_year_id,
        'code', term.code,
        'name', term.name,
        'term_type', term.term_type,
        'term_number', term.term_number,
        'start_date', term.start_date,
        'end_date', term.end_date,
        'status', term.status,
        'created_at', term.created_at,
        'updated_at', term.updated_at
      ) order by term.start_date desc, term.name, term.id)
      from public.academic_terms term
      where term.organization_id = resolved_university_id
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.create_academic_year(
  requested_profile_id uuid,
  target_university_id uuid,
  code text,
  name text,
  start_date date,
  end_date date,
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
  normalized_status text := lower(btrim(status));
  code_was_generated boolean := code is null or btrim(code) = '';
  code_base text;
  code_suffix integer := 2;
  suffix_text text;
  created_year public.academic_years%rowtype;
begin
  actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, target_university_id);

  if normalized_name is null or normalized_name = '' then
    raise exception 'Name is required' using errcode = '22023';
  end if;

  if normalized_status is null or normalized_status not in ('active', 'inactive', 'archived') then
    raise exception 'Invalid academic year status' using errcode = '22023';
  end if;

  if start_date is null or end_date is null then
    raise exception 'Start and end dates are required' using errcode = '22023';
  end if;

  if start_date >= end_date then
    raise exception 'Academic year start date must be earlier than the end date' using errcode = '22023';
  end if;

  if code_was_generated then
    normalized_code := upper(btrim(regexp_replace(
      translate(normalized_name, 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaissttAAISSTT'),
      '[^A-Za-z0-9]+', '-', 'g'
    ), '-'));
    normalized_code := left(coalesce(nullif(normalized_code, ''), 'YEAR'), 100);
    code_base := normalized_code;

    while exists (
      select 1
      from public.academic_years existing
      where existing.organization_id = target_university_id
        and lower(btrim(existing.code)) = lower(normalized_code)
    ) loop
      suffix_text := '-' || code_suffix::text;
      normalized_code := left(code_base, greatest(1, 100 - char_length(suffix_text))) || suffix_text;
      code_suffix := code_suffix + 1;
    end loop;
  else
    if char_length(normalized_code) > 100 then
      raise exception 'Academic year code must not exceed 100 characters' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.academic_years existing
      where existing.organization_id = target_university_id
        and lower(btrim(existing.code)) = lower(normalized_code)
    ) then
      raise exception 'Academic year code already exists in this university' using errcode = '23505';
    end if;
  end if;

  insert into public.academic_years (
    organization_id, code, name, start_date, end_date, status
  ) values (
    target_university_id, normalized_code, normalized_name, start_date, end_date, normalized_status
  )
  returning * into created_year;

  insert into public.academic_calendar_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_type, resource_id,
    organization_id, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, 'create', 'academic_year', created_year.id,
    created_year.organization_id, to_jsonb(created_year)
  );

  return to_jsonb(created_year);
end;
$$;

create or replace function public.update_academic_year(
  requested_profile_id uuid,
  year_id uuid,
  code text,
  name text,
  start_date date,
  end_date date,
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
  normalized_status text := lower(btrim(status));
  code_was_generated boolean := code is null or btrim(code) = '';
  code_base text;
  code_suffix integer := 2;
  suffix_text text;
  existing_year public.academic_years%rowtype;
  updated_year public.academic_years%rowtype;
  audit_action text;
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  select year.*
  into existing_year
  from public.academic_years year
  where year.id = year_id;

  if existing_year.id is null then
    raise exception 'Academic year not found' using errcode = '22023';
  end if;

  actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, existing_year.organization_id);

  select year.*
  into existing_year
  from public.academic_years year
  where year.id = year_id
  for update;

  if existing_year.id is null then
    raise exception 'Academic year changed during update' using errcode = '40001';
  end if;

  if normalized_name is null or normalized_name = '' then
    raise exception 'Name is required' using errcode = '22023';
  end if;

  if normalized_status is null or normalized_status not in ('active', 'inactive', 'archived') then
    raise exception 'Invalid academic year status' using errcode = '22023';
  end if;

  if start_date is null or end_date is null then
    raise exception 'Start and end dates are required' using errcode = '22023';
  end if;

  if start_date >= end_date then
    raise exception 'Academic year start date must be earlier than the end date' using errcode = '22023';
  end if;

  -- A child academic term must never fall outside its year's own interval.
  if exists (
    select 1
    from public.academic_terms term
    where term.academic_year_id = existing_year.id
      and (term.start_date < start_date or term.end_date > end_date)
  ) then
    raise exception 'Academic year dates cannot exclude an existing semester or term' using errcode = '22023';
  end if;

  if code_was_generated then
    normalized_code := upper(btrim(regexp_replace(
      translate(normalized_name, 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaissttAAISSTT'),
      '[^A-Za-z0-9]+', '-', 'g'
    ), '-'));
    normalized_code := left(coalesce(nullif(normalized_code, ''), 'YEAR'), 100);
    code_base := normalized_code;

    while exists (
      select 1
      from public.academic_years duplicate
      where duplicate.organization_id = existing_year.organization_id
        and duplicate.id <> existing_year.id
        and lower(btrim(duplicate.code)) = lower(normalized_code)
    ) loop
      suffix_text := '-' || code_suffix::text;
      normalized_code := left(code_base, greatest(1, 100 - char_length(suffix_text))) || suffix_text;
      code_suffix := code_suffix + 1;
    end loop;
  else
    if char_length(normalized_code) > 100 then
      raise exception 'Academic year code must not exceed 100 characters' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.academic_years duplicate
      where duplicate.organization_id = existing_year.organization_id
        and duplicate.id <> existing_year.id
        and lower(btrim(duplicate.code)) = lower(normalized_code)
    ) then
      raise exception 'Academic year code already exists in this university' using errcode = '23505';
    end if;
  end if;

  update public.academic_years year
  set code = normalized_code,
      name = normalized_name,
      start_date = update_academic_year.start_date,
      end_date = update_academic_year.end_date,
      status = normalized_status
  where year.id = existing_year.id
  returning year.* into updated_year;

  audit_action := case
    when existing_year.status is distinct from updated_year.status then 'status_change'
    else 'update'
  end;

  insert into public.academic_calendar_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_type, resource_id,
    organization_id, before_snapshot, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, audit_action, 'academic_year', updated_year.id,
    updated_year.organization_id, to_jsonb(existing_year), to_jsonb(updated_year)
  );

  return to_jsonb(updated_year);
end;
$$;

create or replace function public.create_academic_term(
  requested_profile_id uuid,
  target_university_id uuid,
  target_academic_year_id uuid,
  code text,
  name text,
  term_type text,
  start_date date,
  end_date date,
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
  normalized_term_type text := lower(btrim(term_type));
  normalized_status text := lower(btrim(status));
  code_was_generated boolean := code is null or btrim(code) = '';
  code_base text;
  code_suffix integer := 2;
  suffix_text text;
  year_status text;
  year_start date;
  year_end date;
  created_term public.academic_terms%rowtype;
begin
  actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, target_university_id);

  if normalized_name is null or normalized_name = '' then
    raise exception 'Name is required' using errcode = '22023';
  end if;

  if normalized_term_type is null or normalized_term_type not in ('semester', 'trimester', 'module', 'term', 'other') then
    raise exception 'Invalid academic term type' using errcode = '22023';
  end if;

  if normalized_status is null or normalized_status not in ('active', 'inactive', 'archived') then
    raise exception 'Invalid academic term status' using errcode = '22023';
  end if;

  if start_date is null or end_date is null then
    raise exception 'Start and end dates are required' using errcode = '22023';
  end if;

  if start_date >= end_date then
    raise exception 'Academic term start date must be earlier than the end date' using errcode = '22023';
  end if;

  if target_academic_year_id is null then
    raise exception 'Academic year is required' using errcode = '22023';
  end if;

  select year.status, year.start_date, year.end_date
  into year_status, year_start, year_end
  from public.academic_years year
  where year.id = target_academic_year_id
    and year.organization_id = target_university_id
  for update;

  if year_status is null then
    raise exception 'Academic term requires an academic year in the same university' using errcode = '22023';
  end if;

  if year_status = 'archived' then
    raise exception 'Academic term cannot be created under an archived academic year' using errcode = '22023';
  end if;

  if normalized_status = 'active' and year_status <> 'active' then
    raise exception 'Active academic term requires an active academic year' using errcode = '22023';
  end if;

  if start_date < year_start or end_date > year_end then
    raise exception 'Academic term dates must stay within the academic year period' using errcode = '22023';
  end if;

  if code_was_generated then
    normalized_code := upper(btrim(regexp_replace(
      translate(normalized_name, 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaissttAAISSTT'),
      '[^A-Za-z0-9]+', '-', 'g'
    ), '-'));
    normalized_code := left(coalesce(nullif(normalized_code, ''), 'TERM'), 100);
    code_base := normalized_code;

    while exists (
      select 1
      from public.academic_terms existing
      where existing.academic_year_id = target_academic_year_id
        and lower(btrim(existing.code)) = lower(normalized_code)
    ) loop
      suffix_text := '-' || code_suffix::text;
      normalized_code := left(code_base, greatest(1, 100 - char_length(suffix_text))) || suffix_text;
      code_suffix := code_suffix + 1;
    end loop;
  else
    if char_length(normalized_code) > 100 then
      raise exception 'Academic term code must not exceed 100 characters' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.academic_terms existing
      where existing.academic_year_id = target_academic_year_id
        and lower(btrim(existing.code)) = lower(normalized_code)
    ) then
      raise exception 'Academic term code already exists in this academic year' using errcode = '23505';
    end if;
  end if;

  insert into public.academic_terms (
    organization_id, academic_year_id, code, name, term_type, start_date, end_date, status
  ) values (
    target_university_id, target_academic_year_id, normalized_code, normalized_name,
    normalized_term_type, start_date, end_date, normalized_status
  )
  returning * into created_term;

  insert into public.academic_calendar_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_type, resource_id,
    organization_id, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, 'create', 'academic_term', created_term.id,
    created_term.organization_id, to_jsonb(created_term)
  );

  return to_jsonb(created_term);
end;
$$;

create or replace function public.update_academic_term(
  requested_profile_id uuid,
  term_id uuid,
  target_academic_year_id uuid,
  code text,
  name text,
  term_type text,
  start_date date,
  end_date date,
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
  normalized_term_type text := lower(btrim(term_type));
  normalized_status text := lower(btrim(status));
  code_was_generated boolean := code is null or btrim(code) = '';
  code_base text;
  code_suffix integer := 2;
  suffix_text text;
  year_status text;
  year_start date;
  year_end date;
  existing_term public.academic_terms%rowtype;
  updated_term public.academic_terms%rowtype;
  audit_action text;
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  select term.*
  into existing_term
  from public.academic_terms term
  where term.id = term_id;

  if existing_term.id is null then
    raise exception 'Academic term not found' using errcode = '22023';
  end if;

  actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, existing_term.organization_id);

  if target_academic_year_id is null then
    raise exception 'Academic year is required' using errcode = '22023';
  end if;

  -- Lock the current and target academic year rows so a concurrent year
  -- status/date change cannot race the hierarchy checks below.
  perform 1
  from public.academic_years year
  where year.organization_id = existing_term.organization_id
    and year.id in (existing_term.academic_year_id, target_academic_year_id)
  order by year.id
  for update;

  select term.*
  into existing_term
  from public.academic_terms term
  where term.id = term_id
  for update;

  if existing_term.id is null then
    raise exception 'Academic term changed during update' using errcode = '40001';
  end if;

  if normalized_name is null or normalized_name = '' then
    raise exception 'Name is required' using errcode = '22023';
  end if;

  if normalized_term_type is null or normalized_term_type not in ('semester', 'trimester', 'module', 'term', 'other') then
    raise exception 'Invalid academic term type' using errcode = '22023';
  end if;

  if normalized_status is null or normalized_status not in ('active', 'inactive', 'archived') then
    raise exception 'Invalid academic term status' using errcode = '22023';
  end if;

  if start_date is null or end_date is null then
    raise exception 'Start and end dates are required' using errcode = '22023';
  end if;

  if start_date >= end_date then
    raise exception 'Academic term start date must be earlier than the end date' using errcode = '22023';
  end if;

  select year.status, year.start_date, year.end_date
  into year_status, year_start, year_end
  from public.academic_years year
  where year.id = target_academic_year_id
    and year.organization_id = existing_term.organization_id;

  if year_status is null then
    raise exception 'Academic term requires an academic year in the same university' using errcode = '22023';
  end if;

  if year_status = 'archived'
    and (target_academic_year_id is distinct from existing_term.academic_year_id or normalized_status <> 'archived') then
    raise exception 'Academic term cannot be moved under or reactivated within an archived academic year'
      using errcode = '22023';
  end if;

  if normalized_status = 'active' and year_status <> 'active' then
    raise exception 'Active academic term requires an active academic year' using errcode = '22023';
  end if;

  if start_date < year_start or end_date > year_end then
    raise exception 'Academic term dates must stay within the academic year period' using errcode = '22023';
  end if;

  if code_was_generated then
    normalized_code := upper(btrim(regexp_replace(
      translate(normalized_name, 'ăâîșşțţĂÂÎȘŞȚŢ', 'aaissttAAISSTT'),
      '[^A-Za-z0-9]+', '-', 'g'
    ), '-'));
    normalized_code := left(coalesce(nullif(normalized_code, ''), 'TERM'), 100);
    code_base := normalized_code;

    while exists (
      select 1
      from public.academic_terms duplicate
      where duplicate.academic_year_id = target_academic_year_id
        and duplicate.id <> existing_term.id
        and lower(btrim(duplicate.code)) = lower(normalized_code)
    ) loop
      suffix_text := '-' || code_suffix::text;
      normalized_code := left(code_base, greatest(1, 100 - char_length(suffix_text))) || suffix_text;
      code_suffix := code_suffix + 1;
    end loop;
  else
    if char_length(normalized_code) > 100 then
      raise exception 'Academic term code must not exceed 100 characters' using errcode = '22023';
    end if;

    if exists (
      select 1
      from public.academic_terms duplicate
      where duplicate.academic_year_id = target_academic_year_id
        and duplicate.id <> existing_term.id
        and lower(btrim(duplicate.code)) = lower(normalized_code)
    ) then
      raise exception 'Academic term code already exists in this academic year' using errcode = '23505';
    end if;
  end if;

  update public.academic_terms term
  set academic_year_id = target_academic_year_id,
      code = normalized_code,
      name = normalized_name,
      term_type = normalized_term_type,
      start_date = update_academic_term.start_date,
      end_date = update_academic_term.end_date,
      status = normalized_status
  where term.id = existing_term.id
  returning term.* into updated_term;

  audit_action := case
    when existing_term.status is distinct from updated_term.status then 'status_change'
    else 'update'
  end;

  insert into public.academic_calendar_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_type, resource_id,
    organization_id, before_snapshot, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, audit_action, 'academic_term', updated_term.id,
    updated_term.organization_id, to_jsonb(existing_term), to_jsonb(updated_term)
  );

  return to_jsonb(updated_term);
end;
$$;

revoke all on function public.get_academic_calendar_editor_overview(uuid, uuid) from public, anon, authenticated;
revoke all on function public.create_academic_year(uuid, uuid, text, text, date, date, text) from public, anon, authenticated;
revoke all on function public.update_academic_year(uuid, uuid, text, text, date, date, text) from public, anon, authenticated;
revoke all on function public.create_academic_term(uuid, uuid, uuid, text, text, text, date, date, text) from public, anon, authenticated;
revoke all on function public.update_academic_term(uuid, uuid, uuid, text, text, text, date, date, text) from public, anon, authenticated;

grant execute on function public.get_academic_calendar_editor_overview(uuid, uuid) to authenticated;
grant execute on function public.create_academic_year(uuid, uuid, text, text, date, date, text) to authenticated;
grant execute on function public.update_academic_year(uuid, uuid, text, text, date, date, text) to authenticated;
grant execute on function public.create_academic_term(uuid, uuid, uuid, text, text, text, date, date, text) to authenticated;
grant execute on function public.update_academic_term(uuid, uuid, uuid, text, text, text, date, date, text) to authenticated;

comment on table public.academic_calendar_audit_events is
  'Immutable audit trail for TASK 004.4 academic year and academic term mutations.';
comment on function public.get_academic_calendar_editor_overview(uuid, uuid) is
  'Returns scoped academic years and academic terms for a University Admin or Platform Admin editor.';
comment on function public.create_academic_year(uuid, uuid, text, text, date, date, text) is
  'Creates a scoped academic year and records the mutation in the audit trail.';
comment on function public.update_academic_year(uuid, uuid, text, text, date, date, text) is
  'Updates a scoped academic year without changing its university, rejecting dates that would exclude an existing child term, and records the mutation.';
comment on function public.create_academic_term(uuid, uuid, uuid, text, text, text, date, date, text) is
  'Creates a scoped academic term under an eligible academic year in the same university and records the mutation.';
comment on function public.update_academic_term(uuid, uuid, uuid, text, text, text, date, date, text) is
  'Updates a scoped academic term without changing its university and records the mutation.';
