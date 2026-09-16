-- TASK 004.6.1: Academic Staff Program Assignments & Program-Scoped Group
-- Management. Forward-only: migrations 001-014 are unmodified. Migration
-- 015 belongs to TASK 004.8 (Codex, courses/curriculum) and is untouched.
--
-- PROGRAM ASSIGNMENT CONTROLS AUTHORIZATION. GROUP ASSIGNMENT CONTROLS
-- RESPONSIBILITY, NOT ACCESS -- nominal staff-to-group assignment ("My
-- groups", professor self-request, coordinator approval) is TASK 004.6.2,
-- not implemented here. Student self-service join requests remain TASK
-- 004.7, not implemented here.
--
-- A professor or program_coordinator authorized for an academic program may
-- manage every group and student membership inside that program, regardless
-- of any nominal group-level assignment (which does not exist as an access
-- concept in this task at all). Authorization is derived exclusively from
-- public.profile_roles(scope_type='program', scope_id=<academic_program_id>,
-- role in (professor, program_coordinator)) -- the same real relation
-- migration 006 already reads for staff READ visibility, now also driving
-- WRITE authorization for the first time. A profile may hold several such
-- rows simultaneously (different programs, or professor in one and
-- program_coordinator in another) -- nothing here limits it to one.
--
-- profile_roles ITSELF IS UNCHANGED as a table: it keeps representing only
-- currently-active assignments, exactly as it does for every other role in
-- this platform. No revoked_at/status/soft-delete column is added to it and
-- no unique constraint is added to it, per explicit product correction.
-- Grant = insert the exact row; revoke = delete that exact row; full history
-- lives in the new academic_program_staff_assignment_audit_events table
-- below instead. Because there is no unique constraint, race-safety for
-- grants is provided by a transaction-scoped advisory lock (see
-- grant_academic_program_staff_role), not by the schema.
--
-- One active profile operates within one university (profiles.university_id,
-- already the platform's existing mechanism -- confirmed load-bearing
-- elsewhere: add_student_to_group's own student-eligibility check already
-- reads it). A program assignment is only ever valid when the target
-- profile's university_id matches the assigned program's own organization_id
-- -- enforced both when granting (grant_academic_program_staff_role) and
-- when authorizing (resolve_academic_program_editor_mode). No new
-- cross-university schema is introduced.

-- ============================================================
-- A. Widen the two existing audit tables' actor_role CHECK constraints.
-- ============================================================
-- academic_group_audit_events.actor_role and
-- student_group_membership_audit_events.actor_role currently accept only
-- ('university_admin', 'platform_admin') (migrations 011, 012). Extending
-- write authorization to professor/program_coordinator without this change
-- would let the state-changing UPDATE/INSERT succeed and then fail the
-- audit INSERT's own CHECK constraint (SQLSTATE 23514) -- which, under this
-- codebase's mandatory atomic-audit rule, rolls back the whole mutation.
-- That is the exact failure shape already diagnosed once this task cycle;
-- this migration exists in part specifically to not reintroduce it.
--
-- The constraint names are not hardcoded: both were originally declared as
-- inline, unnamed CHECK constraints, so relying on a guessed
-- Postgres-default name without confirming it against the live schema would
-- violate the instruction to verify real constraint names first. Instead,
-- each block looks up the actual constraint by inspecting pg_constraint for
-- a CHECK on the right table whose definition mentions actor_role, drops it
-- by its real (discovered) name, and adds it back under an explicit,
-- deterministic name. action and resource_type constraints on both tables
-- are untouched.
do $$
declare
  found_constraint_name text;
begin
  select con.conname
  into found_constraint_name
  from pg_constraint con
  where con.conrelid = 'public.academic_group_audit_events'::regclass
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%actor_role%';

  if found_constraint_name is not null then
    execute format('alter table public.academic_group_audit_events drop constraint %I', found_constraint_name);
  end if;
end;
$$;

alter table public.academic_group_audit_events
  add constraint academic_group_audit_events_actor_role_check
  check (actor_role in ('university_admin', 'platform_admin', 'professor', 'program_coordinator'));

do $$
declare
  found_constraint_name text;
begin
  select con.conname
  into found_constraint_name
  from pg_constraint con
  where con.conrelid = 'public.student_group_membership_audit_events'::regclass
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%actor_role%';

  if found_constraint_name is not null then
    execute format('alter table public.student_group_membership_audit_events drop constraint %I', found_constraint_name);
  end if;
end;
$$;

alter table public.student_group_membership_audit_events
  add constraint student_group_membership_audit_events_actor_role_check
  check (actor_role in ('university_admin', 'platform_admin', 'professor', 'program_coordinator'));

-- ============================================================
-- B. New immutable audit table for program-level staff assignments.
-- ============================================================
-- assignment_id intentionally has no foreign key to profile_roles: a
-- revoke deletes the live profile_roles row, and this table must still
-- carry the assignment's identity afterward. actor_role only ever allows
-- university_admin/platform_admin, since program_coordinator cannot grant
-- or revoke program-level authorization in this task.
create table if not exists public.academic_program_staff_assignment_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_profile_id uuid not null references public.profiles(id),
  actor_role text not null check (actor_role in ('university_admin', 'platform_admin')),
  action text not null check (action in ('grant', 'revoke')),
  resource_type text not null default 'academic_program_staff_assignment'
    check (resource_type = 'academic_program_staff_assignment'),
  assignment_id uuid not null,
  target_profile_id uuid not null references public.profiles(id),
  academic_program_id uuid not null references public.academic_programs(id),
  organization_id uuid not null references public.organizations(id),
  assigned_role_code text not null check (assigned_role_code in ('professor', 'program_coordinator')),
  before_snapshot jsonb,
  after_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists academic_program_staff_assignment_audit_events_organization_idx
on public.academic_program_staff_assignment_audit_events(organization_id, created_at desc);

create index if not exists academic_program_staff_assignment_audit_events_program_idx
on public.academic_program_staff_assignment_audit_events(academic_program_id, created_at desc);

create index if not exists academic_program_staff_assignment_audit_events_target_profile_idx
on public.academic_program_staff_assignment_audit_events(target_profile_id, created_at desc);

alter table public.academic_program_staff_assignment_audit_events enable row level security;
revoke all on table public.academic_program_staff_assignment_audit_events from public, anon, authenticated;

-- ============================================================
-- C. New authorization resolver: program-scoped, additive to the
-- existing university-scoped resolver (which stays completely unchanged).
-- ============================================================
-- Deliberately does NOT call resolve_academic_units_editor_mode(...) and
-- catch its exception as control flow -- that function's own university
-- admin/platform admin checks are inlined here instead, so a
-- professor/program_coordinator falling through to the program-scoped
-- branch never depends on catching another function's raised exception.
-- resolve_academic_units_editor_mode itself is unchanged and still used
-- as-is everywhere it already was (faculties/departments, organizations,
-- programs, years/terms).
create or replace function public.resolve_academic_program_editor_mode(
  requested_profile_id uuid,
  target_academic_program_id uuid
)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  requester_university_id uuid;
  program_organization_id uuid;
  matched_role_code text;
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

  select profile.university_id
  into requester_university_id
  from public.profiles profile
  where profile.id = requested_profile_id;

  select program.organization_id
  into program_organization_id
  from public.academic_programs program
  where program.id = target_academic_program_id;

  if program_organization_id is null then
    raise exception 'Valid academic program required' using errcode = '42501';
  end if;

  if public.has_platform_admin_console_access(requested_profile_id) then
    return 'platform_admin';
  end if;

  if exists (
    select 1
    from public.profile_roles profile_role
    join public.roles role
      on role.id = profile_role.role_id
     and role.code = 'university_admin'
    where profile_role.profile_id = requested_profile_id
      and profile_role.scope_type = 'university'
      and profile_role.scope_id = program_organization_id
  ) then
    return 'university_admin';
  end if;

  -- Program-scoped staff must also belong to the program's own university
  -- (profiles.university_id, the platform's existing one-profile-one-
  -- university mechanism) -- defense-in-depth on top of the scope_id match,
  -- independent of how the assignment was created.
  select role.code
  into matched_role_code
  from public.profile_roles profile_role
  join public.roles role
    on role.id = profile_role.role_id
   and role.code in ('program_coordinator', 'professor')
  where profile_role.profile_id = requested_profile_id
    and profile_role.scope_type = 'program'
    and profile_role.scope_id = target_academic_program_id
    and requester_university_id is not distinct from program_organization_id
  order by case role.code
    when 'program_coordinator' then 1
    when 'professor' then 2
  end
  limit 1;

  if matched_role_code is not null then
    return matched_role_code;
  end if;

  raise exception 'Academic program editor access denied' using errcode = '42501';
end;
$$;

-- ============================================================
-- D. Program assignment provisioning: grant / revoke.
-- ============================================================
-- Only University Admin (own university) / Platform Admin (selected
-- university) may grant or revoke -- authorized via the existing,
-- unmodified resolve_academic_units_editor_mode against the target
-- program's own university. program_coordinator cannot call these
-- successfully: it has no matching branch in that resolver.
create or replace function public.grant_academic_program_staff_role(
  requested_profile_id uuid,
  target_profile_id uuid,
  target_academic_program_id uuid,
  role_code text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_mode text;
  authorized_organization_id uuid;
  program_organization_id uuid;
  target_role_id uuid;
  target_profile_status text;
  target_profile_university_id uuid;
  target_profile_type text;
  existing_assignment_id uuid;
  new_assignment public.profile_roles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  if role_code not in ('professor', 'program_coordinator') then
    raise exception 'Invalid academic staff role' using errcode = '22023';
  end if;

  -- Non-locking lookup to resolve the program's university for
  -- authorization purposes only -- no FOR UPDATE lock is acquired on the
  -- program row before the actor is known to be authorized for it, so an
  -- unauthorized caller can never force an avoidable lock on a program
  -- outside their own scope.
  select program.organization_id
  into authorized_organization_id
  from public.academic_programs program
  where program.id = target_academic_program_id;

  if authorized_organization_id is null then
    raise exception 'Valid academic program required' using errcode = '22023';
  end if;

  actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, authorized_organization_id);

  -- Re-select with a row lock now that the actor is authorized, and
  -- revalidate organization_id specifically against what was just
  -- authorized (no existing RPC updates academic_programs.organization_id
  -- today, so this cannot fire in practice, but the actor's authorization
  -- must never be trusted against stale, pre-lock data if that ever
  -- changes).
  select program.organization_id
  into program_organization_id
  from public.academic_programs program
  where program.id = target_academic_program_id
  for update;

  if program_organization_id is distinct from authorized_organization_id then
    raise exception 'Academic program changed during update' using errcode = '40001';
  end if;

  select profile.status, profile.university_id, profile.profile_type
  into target_profile_status, target_profile_university_id, target_profile_type
  from public.profiles profile
  where profile.id = target_profile_id
  for update;

  if target_profile_status is null or target_profile_status <> 'active' then
    raise exception 'Target profile not found or inactive' using errcode = '22023';
  end if;

  -- No cross-university assignment: the target profile's own university
  -- must match the program's university exactly.
  if target_profile_university_id is distinct from program_organization_id then
    raise exception 'Target profile does not belong to the program''s university' using errcode = '22023';
  end if;

  if target_profile_type not in ('professor', 'coordinator') then
    raise exception 'Target profile is not an eligible academic staff profile' using errcode = '22023';
  end if;

  select role.id
  into target_role_id
  from public.roles role
  where role.code = role_code;

  if target_role_id is null then
    raise exception 'Invalid academic staff role' using errcode = '22023';
  end if;

  -- profile_roles intentionally has no unique constraint (it stays the
  -- plain, global RBAC table used by every other role in the platform), so
  -- a transaction-scoped advisory lock keyed on (target profile, program,
  -- role) is what makes this race-safe: a concurrent grant for the exact
  -- same assignment waits here instead of racing the exists-check below,
  -- and the lock is released automatically at transaction end either way.
  perform pg_advisory_xact_lock(
    hashtext(target_profile_id::text || ':' || target_academic_program_id::text),
    hashtext(role_code)
  );

  select profile_role.id
  into existing_assignment_id
  from public.profile_roles profile_role
  where profile_role.profile_id = target_profile_id
    and profile_role.role_id = target_role_id
    and profile_role.scope_type = 'program'
    and profile_role.scope_id = target_academic_program_id;

  if existing_assignment_id is not null then
    -- Idempotent: granting an assignment that already exists is a no-op
    -- success rather than an error -- the friendlier behavior for an admin
    -- retrying after a network blip, and avoids ever needing a unique
    -- constraint to "reject cleanly" instead.
    select profile_role.*
    into new_assignment
    from public.profile_roles profile_role
    where profile_role.id = existing_assignment_id;

    return jsonb_build_object(
      'id', new_assignment.id,
      'target_profile_id', new_assignment.profile_id,
      'academic_program_id', new_assignment.scope_id,
      'role_code', role_code,
      'created_at', new_assignment.created_at,
      'already_existed', true
    );
  end if;

  insert into public.profile_roles (profile_id, role_id, scope_type, scope_id)
  values (target_profile_id, target_role_id, 'program', target_academic_program_id)
  returning * into new_assignment;

  insert into public.academic_program_staff_assignment_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, assignment_id,
    target_profile_id, academic_program_id, organization_id, assigned_role_code, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, 'grant', new_assignment.id,
    target_profile_id, target_academic_program_id, program_organization_id, role_code, to_jsonb(new_assignment)
  );

  return jsonb_build_object(
    'id', new_assignment.id,
    'target_profile_id', new_assignment.profile_id,
    'academic_program_id', new_assignment.scope_id,
    'role_code', role_code,
    'created_at', new_assignment.created_at,
    'already_existed', false
  );
end;
$$;

create or replace function public.revoke_academic_program_staff_role(
  requested_profile_id uuid,
  assignment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_mode text;
  existing_assignment public.profile_roles%rowtype;
  assignment_role_code text;
  program_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  -- Non-locking lookup to resolve the assignment's program/university for
  -- authorization purposes only -- no FOR UPDATE lock is acquired before
  -- the actor is known to be authorized for it, so an unauthorized caller
  -- can never force an avoidable lock on an assignment outside their own
  -- scope by passing an arbitrary assignment_id.
  select profile_role.*
  into existing_assignment
  from public.profile_roles profile_role
  where profile_role.id = assignment_id
    and profile_role.scope_type = 'program';

  if existing_assignment.id is null then
    raise exception 'Academic program staff assignment not found' using errcode = '22023';
  end if;

  select role.code
  into assignment_role_code
  from public.roles role
  where role.id = existing_assignment.role_id
    and role.code in ('professor', 'program_coordinator');

  if assignment_role_code is null then
    raise exception 'Academic program staff assignment not found' using errcode = '22023';
  end if;

  select program.organization_id
  into program_organization_id
  from public.academic_programs program
  where program.id = existing_assignment.scope_id;

  if program_organization_id is null then
    raise exception 'Valid academic program required' using errcode = '22023';
  end if;

  actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, program_organization_id);

  -- Re-select with a row lock now that the actor is authorized, and
  -- revalidate the row still exists -- nothing ever UPDATEs profile_roles
  -- (only INSERT via grant, DELETE via revoke), so this only guards against
  -- a concurrent revoke of the exact same row, not a changed-field race.
  -- Never a bulk delete: this locks and removes exactly one profile_roles
  -- row, identified by its own id.
  select profile_role.*
  into existing_assignment
  from public.profile_roles profile_role
  where profile_role.id = assignment_id
    and profile_role.scope_type = 'program'
  for update;

  if existing_assignment.id is null then
    raise exception 'Academic program staff assignment not found' using errcode = '22023';
  end if;

  delete from public.profile_roles
  where id = existing_assignment.id;

  insert into public.academic_program_staff_assignment_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, assignment_id,
    target_profile_id, academic_program_id, organization_id, assigned_role_code, before_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, 'revoke', existing_assignment.id,
    existing_assignment.profile_id, existing_assignment.scope_id, program_organization_id,
    assignment_role_code, to_jsonb(existing_assignment)
  );

  return jsonb_build_object('id', existing_assignment.id, 'revoked', true);
end;
$$;

-- ============================================================
-- E. Admin read RPC for the grant/revoke UI.
-- ============================================================
create or replace function public.get_academic_program_staff_assignments_editor_overview(
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
      select jsonb_build_object('id', organization.id, 'name', organization.name, 'status', organization.status)
      from public.organizations organization
      where organization.id = resolved_university_id
        and organization.type = 'university'
    ),
    'universities', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', organization.id, 'name', organization.name, 'status', organization.status
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
        'status', program.status,
        'organization_unit_id', program.organization_unit_id,
        'organization_unit_name', unit.name
      ) order by program.name, program.id)
      from public.academic_programs program
      left join public.organization_units unit on unit.id = program.organization_unit_id
      where program.organization_id = resolved_university_id
    ), '[]'::jsonb),
    'eligible_staff_profiles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', staff.id, 'display_name', staff.display_name, 'profile_type', staff.profile_type
      ) order by staff.display_name, staff.id)
      from public.profiles staff
      where staff.profile_type in ('professor', 'coordinator')
        and staff.university_id = resolved_university_id
        and staff.status = 'active'
    ), '[]'::jsonb),
    'assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', profile_role.id,
        'target_profile_id', staff.id,
        'target_profile_display_name', staff.display_name,
        'academic_program_id', profile_role.scope_id,
        'role_code', role.code,
        'created_at', profile_role.created_at
      ) order by staff.display_name, profile_role.created_at)
      from public.profile_roles profile_role
      join public.roles role
        on role.id = profile_role.role_id
       and role.code in ('professor', 'program_coordinator')
      join public.academic_programs program
        on program.id = profile_role.scope_id
       and program.organization_id = resolved_university_id
      join public.profiles staff on staff.id = profile_role.profile_id
      where profile_role.scope_type = 'program'
    ), '[]'::jsonb)
  );
end;
$$;

-- ============================================================
-- F. Staff multi-program read model. Neither function uses LIMIT 1 --
-- migration 006's read model (which does) is not reused here on purpose,
-- since it resolves at most one program per call and cannot represent a
-- staff profile with several simultaneous assignments.
-- ============================================================
create or replace function public.get_assigned_academic_programs(
  requested_profile_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
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

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'academic_program_id', program.id,
        'code', program.code,
        'name', program.name,
        'status', program.status,
        'organization_id', program.organization_id,
        'organization_name', organization.name,
        'organization_unit_id', program.organization_unit_id,
        'organization_unit_name', unit.name,
        'role_codes', jsonb_agg(distinct role.code)
      )
      order by program.name, program.id
    )
    from public.profile_roles profile_role
    join public.roles role
      on role.id = profile_role.role_id
     and role.code in ('professor', 'program_coordinator')
    join public.academic_programs program
      on program.id = profile_role.scope_id
    join public.organizations organization
      on organization.id = program.organization_id
    left join public.organization_units unit
      on unit.id = program.organization_unit_id
    where profile_role.profile_id = requested_profile_id
      and profile_role.scope_type = 'program'
    group by program.id, program.code, program.name, program.status,
      program.organization_id, organization.name, program.organization_unit_id, unit.name
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_program_staff_academic_overview(
  requested_profile_id uuid,
  target_academic_program_id uuid
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
  if target_academic_program_id is null then
    raise exception 'Target academic program required' using errcode = '22023';
  end if;

  -- No inferred "current program": the caller must always pass an explicit
  -- target, and this is the sole authorization gate for everything below.
  actor_mode := public.resolve_academic_program_editor_mode(requested_profile_id, target_academic_program_id);

  select program.organization_id
  into resolved_university_id
  from public.academic_programs program
  where program.id = target_academic_program_id;

  return jsonb_build_object(
    'actor_profile_id', requested_profile_id,
    'actor_mode', actor_mode,
    'selected_program', (
      select jsonb_build_object(
        'id', program.id,
        'code', program.code,
        'name', program.name,
        'status', program.status,
        'organization_id', program.organization_id,
        'organization_unit_id', program.organization_unit_id
      )
      from public.academic_programs program
      where program.id = target_academic_program_id
    ),
    'selected_university', (
      select jsonb_build_object('id', organization.id, 'name', organization.name, 'status', organization.status)
      from public.organizations organization
      where organization.id = resolved_university_id
    ),
    'organization_unit', (
      select jsonb_build_object('id', unit.id, 'name', unit.name, 'unit_type', unit.unit_type, 'status', unit.status)
      from public.academic_programs program
      join public.organization_units unit on unit.id = program.organization_unit_id
      where program.id = target_academic_program_id
    ),
    'academic_years', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', year.id, 'code', year.code, 'name', year.name, 'status', year.status
      ) order by year.start_date desc, year.name, year.id)
      from public.academic_years year
      where year.organization_id = resolved_university_id
    ), '[]'::jsonb),
    'academic_terms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', term.id, 'academic_year_id', term.academic_year_id, 'code', term.code,
        'name', term.name, 'term_type', term.term_type, 'status', term.status
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
      where item.academic_program_id = target_academic_program_id
    ), '[]'::jsonb),
    -- Association test deliberately does not filter on status: TASK 004.6
    -- allows a student to have zero active memberships after an "end" and
    -- remain eligible for later re-addition, so any real
    -- academic_profile_contexts row (active or historical) for this exact
    -- program counts. This is what keeps staff from taking an arbitrary
    -- university student and creating their first association with a new
    -- program -- that association must already exist.
    'eligible_students', coalesce((
      select jsonb_agg(jsonb_build_object('id', student.id, 'display_name', student.display_name) order by student.display_name, student.id)
      from public.profiles student
      where student.profile_type = 'student'
        and student.status = 'active'
        and exists (
          select 1
          from public.academic_profile_contexts context
          where context.profile_id = student.id
            and context.academic_program_id = target_academic_program_id
        )
    ), '[]'::jsonb),
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', context.id,
        'student_profile_id', context.profile_id,
        'student_display_name', student.display_name,
        'academic_group_id', context.academic_group_id,
        'academic_program_id', context.academic_program_id,
        'status', context.status,
        'is_primary', context.is_primary,
        'started_at', context.started_at,
        'ended_at', context.ended_at
      ) order by context.started_at desc nulls last, context.created_at desc)
      from public.academic_profile_contexts context
      join public.profiles student on student.id = context.profile_id
      where context.academic_program_id = target_academic_program_id
        and context.academic_group_id is not null
    ), '[]'::jsonb)
  );
end;
$$;

-- ============================================================
-- G. Write RPC extensions. University Admin/Platform Admin behavior is
-- unchanged in every function below; only a new professor/program_coordinator
-- branch is added, gated by resolve_academic_program_editor_mode. No
-- unrelated business rule is rewritten.
-- ============================================================

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
  -- The program-required check moves ahead of authorization here (unlike
  -- the original, where resolve_academic_units_editor_mode ran first using
  -- target_university_id directly) because the new resolver needs a
  -- non-null program id to authorize against at all. This preserves the
  -- exact original error for a missing program instead of a generic
  -- "invalid program" from the resolver.
  if target_academic_program_id is null then
    raise exception 'Academic group requires an academic program in the same university' using errcode = '22023';
  end if;

  actor_mode := public.resolve_academic_program_editor_mode(requested_profile_id, target_academic_program_id);

  if actor_mode in ('professor', 'program_coordinator') and not exists (
    select 1 from public.academic_programs program
    where program.id = target_academic_program_id and program.status = 'active'
  ) then
    raise exception 'Academic program is not active for staff mutation' using errcode = '22023';
  end if;

  if normalized_name is null or normalized_name = '' then
    raise exception 'Name is required' using errcode = '22023';
  end if;

  if normalized_status is null or normalized_status not in ('active', 'inactive', 'archived') then
    raise exception 'Invalid academic group status' using errcode = '22023';
  end if;

  if target_academic_term_id is not null and target_academic_year_id is null then
    raise exception 'Academic term requires an academic year' using errcode = '22023';
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

  actor_mode := public.resolve_academic_program_editor_mode(requested_profile_id, existing_group.academic_program_id);

  if target_academic_term_id is not null and target_academic_year_id is null then
    raise exception 'Academic term requires an academic year' using errcode = '22023';
  end if;

  if target_academic_program_id is null then
    raise exception 'Academic group requires an academic program in the same university' using errcode = '22023';
  end if;

  if actor_mode in ('professor', 'program_coordinator') then
    if not exists (
      select 1 from public.academic_programs program
      where program.id = existing_group.academic_program_id and program.status = 'active'
    ) then
      raise exception 'Academic program is not active for staff mutation' using errcode = '22023';
    end if;

    -- CRITICAL cross-program rule: this function can move a group between
    -- programs (target_academic_program_id may differ from the group's
    -- current academic_program_id). A professor/program_coordinator
    -- authorized only for the source program must not be able to move a
    -- group into a program they are not also authorized for. University
    -- Admin/Platform Admin already cover both by construction (university-
    -- wide authority, and both programs are locked into the same
    -- university by the checks below) -- this only ever runs an extra
    -- check for the staff path.
    if target_academic_program_id is distinct from existing_group.academic_program_id then
      perform public.resolve_academic_program_editor_mode(requested_profile_id, target_academic_program_id);

      if not exists (
        select 1 from public.academic_programs program
        where program.id = target_academic_program_id and program.status = 'active'
      ) then
        raise exception 'Academic program is not active for staff mutation' using errcode = '22023';
      end if;
    end if;
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

create or replace function public.add_student_to_group(
  requested_profile_id uuid,
  target_university_id uuid,
  target_group_id uuid,
  student_profile_id uuid,
  is_primary boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_mode text;
  authorized_program_id uuid;
  group_status text;
  group_program_id uuid;
  group_year_id uuid;
  group_term_id uuid;
  student_status text;
  student_university_id uuid;
  student_profile_type text;
  existing_primary_id uuid;
  existing_primary_program_id uuid;
  existing_primary_group_id uuid;
  result_row public.academic_profile_contexts%rowtype;
  audit_action text;
begin
  -- Non-locking lookup to resolve the group's program for authorization
  -- purposes only -- no FOR UPDATE lock is acquired before the actor is
  -- known to be authorized, so an unauthorized caller can never force an
  -- avoidable lock on a group outside their own scope. If the group does
  -- not resolve, authorized_program_id stays null and the new resolver
  -- raises its own generic access-denied rather than leaking group
  -- existence ahead of authorization.
  select group_item.academic_program_id
  into authorized_program_id
  from public.academic_groups group_item
  where group_item.id = target_group_id
    and group_item.organization_id = target_university_id;

  actor_mode := public.resolve_academic_program_editor_mode(requested_profile_id, authorized_program_id);

  if actor_mode in ('professor', 'program_coordinator') and not exists (
    select 1 from public.academic_programs program
    where program.id = authorized_program_id and program.status = 'active'
  ) then
    raise exception 'Academic program is not active for staff mutation' using errcode = '22023';
  end if;

  -- Re-select with a row lock now that the actor is authorized, and
  -- revalidate academic_program_id specifically against what was just
  -- authorized: unlike every other id this function checks,
  -- academic_groups.academic_program_id is NOT immutable --
  -- update_academic_group can move a group to a different program between
  -- the unlocked lookup above and this lock, and a mutation must never
  -- proceed using authorization for a program the group is no longer in.
  select group_item.status, group_item.academic_program_id, group_item.academic_year_id, group_item.academic_term_id
  into group_status, group_program_id, group_year_id, group_term_id
  from public.academic_groups group_item
  where group_item.id = target_group_id
    and group_item.organization_id = target_university_id
  for update;

  if group_status is null then
    raise exception 'Academic group not found in this university' using errcode = '22023';
  end if;

  if group_program_id is distinct from authorized_program_id then
    raise exception 'Academic group changed during update' using errcode = '40001';
  end if;

  if group_status = 'archived' then
    raise exception 'Cannot add a student to an archived academic group' using errcode = '22023';
  end if;

  if group_status <> 'active' then
    raise exception 'Cannot add a student to an inactive academic group' using errcode = '22023';
  end if;

  select student.status, student.university_id, student.profile_type
  into student_status, student_university_id, student_profile_type
  from public.profiles student
  where student.id = student_profile_id;

  if student_status is null
    or student_profile_type <> 'student'
    or student_university_id is distinct from target_university_id
    or student_status <> 'active' then
    raise exception 'Student profile not found in this university' using errcode = '22023';
  end if;

  -- Staff (professor/program_coordinator) may only add a student who
  -- already has a real academic association with this exact program --
  -- active or historical (TASK 004.6 explicitly allows a student to have
  -- zero active memberships and remain eligible for later re-addition), so
  -- this deliberately does not filter on status. University Admin/Platform
  -- Admin keep their existing, broader university-wide eligibility as-is:
  -- this check only ever runs for the staff path, so staff can never
  -- create a student's first association with an unrelated program.
  if actor_mode in ('professor', 'program_coordinator') and not exists (
    select 1
    from public.academic_profile_contexts context
    where context.profile_id = student_profile_id
      and context.academic_program_id = group_program_id
  ) then
    raise exception 'Student is not associated with this academic program' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.academic_profile_contexts existing
    where existing.profile_id = student_profile_id
      and existing.academic_group_id = target_group_id
      and existing.status = 'active'
  ) then
    raise exception 'Student already has an active membership in this group' using errcode = '23505';
  end if;

  if is_primary then
    select context.id, context.academic_program_id, context.academic_group_id
    into existing_primary_id, existing_primary_program_id, existing_primary_group_id
    from public.academic_profile_contexts context
    where context.profile_id = student_profile_id
      and context.is_primary
      and context.status = 'active'
    for update;

    if existing_primary_id is not null and existing_primary_group_id is not null then
      raise exception 'Student already has an active primary membership in another group' using errcode = '22023';
    end if;

    if existing_primary_id is not null
      and existing_primary_program_id is not null
      and existing_primary_program_id <> group_program_id then
      raise exception 'Student is enrolled in a different academic program' using errcode = '22023';
    end if;

    if existing_primary_id is not null then
      update public.academic_profile_contexts context
      set academic_program_id = group_program_id,
          academic_year_id = group_year_id,
          academic_term_id = group_term_id,
          academic_group_id = target_group_id,
          started_at = coalesce(context.started_at, current_date)
      where context.id = existing_primary_id
      returning context.* into result_row;
    else
      insert into public.academic_profile_contexts (
        profile_id, organization_id, academic_program_id, academic_year_id, academic_term_id,
        academic_group_id, status, is_primary, started_at
      ) values (
        student_profile_id, target_university_id, group_program_id, group_year_id, group_term_id,
        target_group_id, 'active', true, current_date
      )
      returning * into result_row;
    end if;
  else
    insert into public.academic_profile_contexts (
      profile_id, organization_id, academic_program_id, academic_year_id, academic_term_id,
      academic_group_id, status, is_primary, started_at
    ) values (
      student_profile_id, target_university_id, group_program_id, group_year_id, group_term_id,
      target_group_id, 'active', false, current_date
    )
    returning * into result_row;
  end if;

  audit_action := 'create';

  insert into public.student_group_membership_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_id,
    student_profile_id, organization_id, old_academic_group_id, new_academic_group_id, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, audit_action, result_row.id,
    student_profile_id, target_university_id, null, target_group_id, to_jsonb(result_row)
  );

  return to_jsonb(result_row);
end;
$$;

create or replace function public.move_student_group_membership(
  requested_profile_id uuid,
  membership_id uuid,
  target_group_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_mode text;
  existing_membership public.academic_profile_contexts%rowtype;
  ended_row public.academic_profile_contexts%rowtype;
  new_row public.academic_profile_contexts%rowtype;
  group_status text;
  group_program_id uuid;
  group_year_id uuid;
  group_term_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  select context.*
  into existing_membership
  from public.academic_profile_contexts context
  where context.id = membership_id;

  if existing_membership.id is null or existing_membership.academic_group_id is null then
    raise exception 'Group membership not found' using errcode = '22023';
  end if;

  actor_mode := public.resolve_academic_program_editor_mode(requested_profile_id, existing_membership.academic_program_id);

  -- The target group is required (by the existing program-match check
  -- below) to be in the same program as the source membership, so
  -- authorizing the source program alone is sufficient here -- no separate
  -- target-program check is needed, unlike update_academic_group.
  if actor_mode in ('professor', 'program_coordinator') and not exists (
    select 1 from public.academic_programs program
    where program.id = existing_membership.academic_program_id and program.status = 'active'
  ) then
    raise exception 'Academic program is not active for staff mutation' using errcode = '22023';
  end if;

  select context.*
  into existing_membership
  from public.academic_profile_contexts context
  where context.id = membership_id
  for update;

  if existing_membership.id is null then
    raise exception 'Group membership changed during update' using errcode = '40001';
  end if;

  if existing_membership.status <> 'active' then
    raise exception 'Only an active membership can be moved' using errcode = '22023';
  end if;

  if target_group_id = existing_membership.academic_group_id then
    raise exception 'Student is already a member of this group' using errcode = '22023';
  end if;

  select group_item.status, group_item.academic_program_id, group_item.academic_year_id, group_item.academic_term_id
  into group_status, group_program_id, group_year_id, group_term_id
  from public.academic_groups group_item
  where group_item.id = target_group_id
    and group_item.organization_id = existing_membership.organization_id
  for update;

  if group_status is null then
    raise exception 'Academic group not found in this university' using errcode = '22023';
  end if;

  if group_status = 'archived' then
    raise exception 'Cannot move a student into an archived academic group' using errcode = '22023';
  end if;

  if group_status <> 'active' then
    raise exception 'Cannot move a student into an inactive academic group' using errcode = '22023';
  end if;

  if group_program_id <> existing_membership.academic_program_id then
    raise exception 'Cannot move a student to a group in a different academic program' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.academic_profile_contexts existing
    where existing.profile_id = existing_membership.profile_id
      and existing.academic_group_id = target_group_id
      and existing.status = 'active'
  ) then
    raise exception 'Student already has an active membership in this group' using errcode = '23505';
  end if;

  -- greatest(...) protects against a future-dated started_at (migration
  -- 013's fix, preserved unmodified).
  update public.academic_profile_contexts context
  set status = 'inactive',
      ended_at = greatest(current_date, existing_membership.started_at),
      is_primary = false
  where context.id = existing_membership.id
  returning context.* into ended_row;

  insert into public.academic_profile_contexts (
    profile_id, organization_id, academic_program_id, academic_year_id, academic_term_id,
    academic_group_id, status, is_primary, started_at
  ) values (
    existing_membership.profile_id, existing_membership.organization_id, group_program_id, group_year_id, group_term_id,
    target_group_id, 'active', existing_membership.is_primary, current_date
  )
  returning * into new_row;

  -- before_snapshot uses existing_membership, not ended_row (migration
  -- 014's fix, preserved unmodified) -- existing_membership was captured
  -- before the UPDATE above, so it reflects the source row's true state
  -- prior to this move.
  insert into public.student_group_membership_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_id,
    student_profile_id, organization_id, old_academic_group_id, new_academic_group_id, before_snapshot, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, 'move', new_row.id,
    existing_membership.profile_id, existing_membership.organization_id,
    existing_membership.academic_group_id, target_group_id, to_jsonb(existing_membership), to_jsonb(new_row)
  );

  return to_jsonb(new_row);
end;
$$;

create or replace function public.end_student_group_membership(
  requested_profile_id uuid,
  membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_mode text;
  existing_membership public.academic_profile_contexts%rowtype;
  updated_row public.academic_profile_contexts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  select context.*
  into existing_membership
  from public.academic_profile_contexts context
  where context.id = membership_id;

  if existing_membership.id is null or existing_membership.academic_group_id is null then
    raise exception 'Group membership not found' using errcode = '22023';
  end if;

  actor_mode := public.resolve_academic_program_editor_mode(requested_profile_id, existing_membership.academic_program_id);

  if actor_mode in ('professor', 'program_coordinator') and not exists (
    select 1 from public.academic_programs program
    where program.id = existing_membership.academic_program_id and program.status = 'active'
  ) then
    raise exception 'Academic program is not active for staff mutation' using errcode = '22023';
  end if;

  -- greatest(...) protects against a future-dated started_at (migration
  -- 013's fix, preserved unmodified).
  update public.academic_profile_contexts context
  set status = 'inactive',
      ended_at = greatest(current_date, existing_membership.started_at),
      is_primary = false
  where context.id = existing_membership.id
    and context.status = 'active'
  returning context.* into updated_row;

  if updated_row.id is null then
    raise exception 'Only an active membership can be ended' using errcode = '22023';
  end if;

  insert into public.student_group_membership_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_id,
    student_profile_id, organization_id, old_academic_group_id, new_academic_group_id, before_snapshot, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, 'end', updated_row.id,
    existing_membership.profile_id, existing_membership.organization_id,
    existing_membership.academic_group_id, null, to_jsonb(existing_membership), to_jsonb(updated_row)
  );

  return to_jsonb(updated_row);
end;
$$;

create or replace function public.set_primary_group_membership(
  requested_profile_id uuid,
  membership_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_mode text;
  target_membership public.academic_profile_contexts%rowtype;
  other_primary public.academic_profile_contexts%rowtype;
  demoted_row public.academic_profile_contexts%rowtype;
  promoted_row public.academic_profile_contexts%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  select context.*
  into target_membership
  from public.academic_profile_contexts context
  where context.id = membership_id;

  if target_membership.id is null or target_membership.academic_group_id is null then
    raise exception 'Group membership not found' using errcode = '22023';
  end if;

  actor_mode := public.resolve_academic_program_editor_mode(requested_profile_id, target_membership.academic_program_id);

  if actor_mode in ('professor', 'program_coordinator') and not exists (
    select 1 from public.academic_programs program
    where program.id = target_membership.academic_program_id and program.status = 'active'
  ) then
    raise exception 'Academic program is not active for staff mutation' using errcode = '22023';
  end if;

  select context.*
  into target_membership
  from public.academic_profile_contexts context
  where context.id = membership_id
  for update;

  if target_membership.status <> 'active' then
    raise exception 'Only an active membership can become primary' using errcode = '22023';
  end if;

  if target_membership.is_primary then
    return to_jsonb(target_membership);
  end if;

  -- The one-primary-per-profile rule is global (academic_profile_contexts_one_primary_per_profile_idx
  -- has no organization_id in its key), so the search below intentionally
  -- matches that same scope rather than filtering by university.
  select context.*
  into other_primary
  from public.academic_profile_contexts context
  where context.profile_id = target_membership.profile_id
    and context.is_primary
    and context.status = 'active'
    and context.id <> target_membership.id
  for update;

  -- CRITICAL: promoting a membership in one program must not silently
  -- demote a primary membership that sits in a DIFFERENT program the
  -- staff actor has no authority over. The whole operation is denied here
  -- (by letting this raise propagate before either UPDATE below runs)
  -- rather than silently skipping the demotion, which would violate the
  -- global one-primary invariant, or allowing it unchecked, which would be
  -- a privilege escalation. University Admin/Platform Admin keep their
  -- existing unconditional behavior; this only runs for the staff path.
  if other_primary.id is not null
    and actor_mode in ('professor', 'program_coordinator')
    and other_primary.academic_program_id is distinct from target_membership.academic_program_id
  then
    perform public.resolve_academic_program_editor_mode(requested_profile_id, other_primary.academic_program_id);
  end if;

  if other_primary.id is not null then
    update public.academic_profile_contexts context
    set is_primary = false
    where context.id = other_primary.id
    returning context.* into demoted_row;

    insert into public.student_group_membership_audit_events (
      actor_user_id, actor_profile_id, actor_role, action, resource_id,
      student_profile_id, organization_id, old_academic_group_id, new_academic_group_id, before_snapshot, after_snapshot
    ) values (
      auth.uid(), requested_profile_id, actor_mode, 'primary_change', demoted_row.id,
      demoted_row.profile_id, demoted_row.organization_id,
      demoted_row.academic_group_id, demoted_row.academic_group_id, to_jsonb(other_primary), to_jsonb(demoted_row)
    );
  end if;

  update public.academic_profile_contexts context
  set is_primary = true
  where context.id = target_membership.id
  returning context.* into promoted_row;

  insert into public.student_group_membership_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_id,
    student_profile_id, organization_id, old_academic_group_id, new_academic_group_id, before_snapshot, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, 'primary_change', promoted_row.id,
    promoted_row.profile_id, promoted_row.organization_id,
    promoted_row.academic_group_id, promoted_row.academic_group_id, to_jsonb(target_membership), to_jsonb(promoted_row)
  );

  return to_jsonb(promoted_row);
end;
$$;

-- ============================================================
-- H. Grants. resolve_academic_program_editor_mode is never granted execute
-- directly (matching resolve_academic_units_editor_mode's own precedent in
-- migration 007) -- it is only ever called internally from other
-- SECURITY DEFINER functions. The six write/overview RPCs above keep their
-- existing signatures, so their existing grants (set in migrations 011 and
-- 012) already stand and are not re-issued here.
-- ============================================================
revoke all on function public.resolve_academic_program_editor_mode(uuid, uuid) from public, anon, authenticated;

revoke all on function public.grant_academic_program_staff_role(uuid, uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.revoke_academic_program_staff_role(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_academic_program_staff_assignments_editor_overview(uuid, uuid) from public, anon, authenticated;
revoke all on function public.get_assigned_academic_programs(uuid) from public, anon, authenticated;
revoke all on function public.get_program_staff_academic_overview(uuid, uuid) from public, anon, authenticated;

grant execute on function public.grant_academic_program_staff_role(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.revoke_academic_program_staff_role(uuid, uuid) to authenticated;
grant execute on function public.get_academic_program_staff_assignments_editor_overview(uuid, uuid) to authenticated;
grant execute on function public.get_assigned_academic_programs(uuid) to authenticated;
grant execute on function public.get_program_staff_academic_overview(uuid, uuid) to authenticated;

comment on table public.academic_program_staff_assignment_audit_events is
  'Immutable audit trail for TASK 004.6.1 professor/program_coordinator program-assignment grant/revoke events.';
comment on function public.resolve_academic_program_editor_mode(uuid, uuid) is
  'Resolves platform_admin/university_admin/program_coordinator/professor authorization for a specific academic program; complements, and does not replace, resolve_academic_units_editor_mode.';
comment on function public.grant_academic_program_staff_role(uuid, uuid, uuid, text) is
  'Grants a professor or program_coordinator program-scoped assignment (profile_roles); University Admin/Platform Admin only.';
comment on function public.revoke_academic_program_staff_role(uuid, uuid) is
  'Revokes exactly one professor/program_coordinator program-scoped assignment by its profile_roles id; University Admin/Platform Admin only.';
comment on function public.get_academic_program_staff_assignments_editor_overview(uuid, uuid) is
  'Returns scoped academic programs, eligible staff profiles, and current program assignments for the assignment-management editor.';
comment on function public.get_assigned_academic_programs(uuid) is
  'Returns the full set of academic programs a professor/program_coordinator profile is currently assigned to, with no LIMIT 1.';
comment on function public.get_program_staff_academic_overview(uuid, uuid) is
  'Returns all groups, memberships, and program-associated eligible students for one explicit academic program, for an authorized professor/program_coordinator/university_admin/platform_admin.';
