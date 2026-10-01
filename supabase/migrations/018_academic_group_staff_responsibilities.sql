-- TASK 004.6.2: Professor <-> Academic Group Responsibilities. Forward-only:
-- migrations 001-017 are unmodified. Migrations 016/017 are already applied
-- to production and are immutable; every function below that already
-- exists is changed via `create or replace function` with an unchanged
-- signature, so their existing grants are preserved automatically.
--
-- PROGRAM ASSIGNMENT = AUTHORIZATION. GROUP ASSIGNMENT = RESPONSIBILITY,
-- NOT ACCESS. This task adds nominal Professor <-> Academic Group
-- responsibility bookkeeping only. It never becomes a permission boundary:
-- a professor with a valid program-scoped professor role and zero group
-- responsibilities retains every program/group/student capability TASK
-- 004.6.1 already grants. Authorization for every RPC below is still
-- derived exclusively from resolve_academic_program_editor_mode
-- (migration 016, unchanged) against the group's own academic_program_id.
--
-- Migration 016's own header comment describes an older idea for this task
-- ("My groups", professor self-request, coordinator approval). That
-- comment is stale relative to the current product decision and is left
-- untouched because 016 is immutable -- the current, authoritative model
-- is: Program Coordinator / University Admin / Platform Admin assign or
-- unassign a Professor directly; there is no professor self-request and
-- no approval workflow of any kind in this task.
--
-- Role model:
--   - Program Coordinator: primary operational authority at PROGRAM level
--     (profile_roles role=program_coordinator, scope_type=program,
--     unchanged from TASK 004.6.1); may assign/unassign professors to
--     groups only in programs they coordinate. No group-level coordinator
--     concept is introduced.
--   - Professor: secondary operational staff; may manage program/group/
--     student data per TASK 004.6.1; may never assign/unassign group
--     responsibility, including their own -- resolve_academic_program_
--     editor_mode returning 'professor' is an explicit deny in every
--     mutation RPC below.
--   - University Admin / Platform Admin: may assign/unassign within their
--     own / selected university, exactly as they already grant/revoke
--     program roles in migration 016.
--
-- Self-target: a Program Coordinator/University Admin/Platform Admin MAY
-- name their own profile as the assigned professor, provided that same
-- profile independently holds a real current professor program role for
-- the target program. No special-case code exists for this -- the
-- eligibility check below never compares target_profile_id to the actor,
-- so it is allowed or denied by the exact same rule as any other target.
-- This is administrative/coordinator authority, not professor self-
-- service, and the audit trail records the actor's real mode
-- (program_coordinator/university_admin/platform_admin), never
-- 'professor'.
--
-- Eligibility is always a real, current profile_roles row
-- (role.code='professor', scope_type='program', scope_id=<the group's
-- academic_program_id>) -- never profile_type alone. A program_coordinator
-- role alone does not make a profile eligible; if the same profile holds
-- both program_coordinator and professor for the same program, the
-- explicit professor row is what makes it eligible.
--
-- Cardinality: a professor may be responsible for zero, one, or many
-- groups, across one or several programs (if authorized professor in
-- each); a group may have zero, one, or many responsible professors. No
-- lead/assistant distinction exists or is introduced.
--
-- Two independent existing read paths both need this data -- sharing the
-- AcademicGroupsEditor UI component does not mean they share a backend
-- RPC. Professor/Program Coordinator read through
-- get_program_staff_academic_overview; University Admin (via
-- getAcademicGroupsEditor) and Platform Admin (via
-- getAdminAcademicGroupsEditor, which delegates to the same wrapper) both
-- read through get_academic_groups_editor_overview. Both are extended
-- below with the same two logical fields (group_staff_assignments,
-- eligible_professors); the professor-only privacy filter is enforced in
-- SQL inside get_program_staff_academic_overview, not left to the UI to
-- hide -- get_academic_groups_editor_overview never actually authorizes a
-- 'professor' actor_mode today, so no equivalent filter exists there.
--
-- eligible_professors in both read RPCs is a read-model mirror of the
-- assign RPC's own eligibility rules (real professor profile_roles row for
-- the program, active profile, profile's university = the program's
-- university -- never profile_type) and is deduplicated to at most one row
-- per (academic_program_id, profile_id): profile_roles has no unique
-- constraint, so duplicate professor rows for the same profile+program are
-- supported and must never surface as duplicate dropdown entries. The
-- assign RPC re-enforces the same rules independently and stays
-- authoritative.
--
-- Course / Course Offering staff assignment (TASK 004.8.1, future) and
-- student join requests (TASK 004.7) are explicitly out of scope and
-- untouched here.

-- ============================================================
-- A. Current responsibilities. Active-row + audit-history, mirroring
-- profile_roles/academic_program_staff_assignment_audit_events -- no
-- status/revoked_at/ended_at column, since this relationship has no
-- temporal semantics of its own (unlike academic_profile_contexts'
-- started_at/ended_at, which track a real membership timeline). Unlike
-- profile_roles, a real UNIQUE constraint is used here: this is a new,
-- single-purpose table (not a generic multi-shape RBAC table shared by
-- every role on the platform), so a DB-enforced uniqueness is simpler and
-- safer than an advisory-lock-only discipline for the "duplicate assign"
-- race specifically (the professor-lifecycle advisory lock below is still
-- needed for the cross-table races -- see the RPCs).
-- ============================================================
create table if not exists public.academic_group_staff_assignments (
  id uuid primary key default gen_random_uuid(),
  academic_group_id uuid not null,
  academic_program_id uuid not null,
  organization_id uuid not null references public.organizations(id),
  staff_profile_id uuid not null references public.profiles(id),
  assigned_by_profile_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (academic_group_id, staff_profile_id),
  constraint academic_group_staff_assignments_group_same_program_fk
    foreign key (academic_group_id, organization_id, academic_program_id)
    references public.academic_groups(id, organization_id, academic_program_id)
    on delete restrict
);

-- "My groups" (a professor's own responsibility list, most recent first).
create index if not exists academic_group_staff_assignments_staff_profile_idx
on public.academic_group_staff_assignments(staff_profile_id, created_at desc);

-- Program-scoped responsibility lookup, and the exact shape the
-- program-role-revoke cleanup below scans by (staff_profile_id +
-- academic_program_id together).
create index if not exists academic_group_staff_assignments_program_staff_idx
on public.academic_group_staff_assignments(academic_program_id, staff_profile_id);

alter table public.academic_group_staff_assignments enable row level security;
revoke all on table public.academic_group_staff_assignments from public, anon, authenticated;

comment on table public.academic_group_staff_assignments is
  'TASK 004.6.2: current Professor <-> Academic Group responsibility rows. Nominal responsibility only -- never an authorization source. Full history lives in academic_group_staff_assignment_audit_events.';

-- ============================================================
-- B. New immutable audit table, matching the established shape exactly
-- (academic_group_audit_events / academic_program_staff_assignment_audit_
-- events). assignment_id intentionally has no foreign key: unassign and
-- program-role-revoke cleanup both delete the live row, and this table
-- must still carry the assignment's identity afterward. actor_role
-- excludes 'professor' -- a plain professor can never be the actor of an
-- assign/unassign/cleanup event -- but includes 'program_coordinator',
-- unlike academic_program_staff_assignment_audit_events (which only
-- allows university_admin/platform_admin, since only they grant/revoke
-- PROGRAM-level roles); a Program Coordinator is a legitimate actor for
-- GROUP-level responsibility.
-- ============================================================
create table if not exists public.academic_group_staff_assignment_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_profile_id uuid not null references public.profiles(id),
  actor_role text not null check (actor_role in ('university_admin', 'platform_admin', 'program_coordinator')),
  action text not null check (action in ('assign', 'unassign', 'cleanup_on_program_role_revoke')),
  resource_type text not null default 'academic_group_staff_assignment'
    check (resource_type = 'academic_group_staff_assignment'),
  assignment_id uuid not null,
  academic_group_id uuid not null,
  academic_program_id uuid not null references public.academic_programs(id),
  organization_id uuid not null references public.organizations(id),
  target_profile_id uuid not null references public.profiles(id),
  before_snapshot jsonb,
  after_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists academic_group_staff_assignment_audit_events_group_idx
on public.academic_group_staff_assignment_audit_events(academic_group_id, created_at desc);

create index if not exists academic_group_staff_assignment_audit_events_program_idx
on public.academic_group_staff_assignment_audit_events(academic_program_id, created_at desc);

create index if not exists academic_group_staff_assignment_audit_events_target_profile_idx
on public.academic_group_staff_assignment_audit_events(target_profile_id, created_at desc);

alter table public.academic_group_staff_assignment_audit_events enable row level security;
revoke all on table public.academic_group_staff_assignment_audit_events from public, anon, authenticated;

comment on table public.academic_group_staff_assignment_audit_events is
  'TASK 004.6.2: immutable audit trail for academic_group_staff_assignments (assign/unassign/cleanup_on_program_role_revoke). No update or delete path exists anywhere in this schema.';

-- ============================================================
-- C. Assign. SECURITY DEFINER. Lock order: non-locking group lookup ->
-- authorize actor -> professor-lifecycle advisory lock -> lock group row
-- FOR UPDATE -> revalidate -> status checks -> target eligibility (fresh,
-- under the advisory lock) -> insert (ON CONFLICT DO NOTHING, no
-- exception-based idempotency) -> audit iff a row was actually inserted.
-- ============================================================
create or replace function public.assign_professor_to_academic_group(
  requested_profile_id uuid,
  target_academic_group_id uuid,
  target_profile_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_mode text;
  authorized_program_id uuid;
  authorized_organization_id uuid;
  existing_group public.academic_groups%rowtype;
  program_status text;
  target_profile_status text;
  target_profile_university_id uuid;
  is_eligible_professor boolean;
  new_assignment public.academic_group_staff_assignments%rowtype;
  did_insert boolean;
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

  -- Non-locking lookup to resolve the group's program/organization for
  -- authorization only -- no FOR UPDATE lock is acquired before the actor
  -- is known to be authorized for it.
  select item.academic_program_id, item.organization_id
  into authorized_program_id, authorized_organization_id
  from public.academic_groups item
  where item.id = target_academic_group_id;

  if authorized_program_id is null then
    raise exception 'Academic group not found' using errcode = '22023';
  end if;

  actor_mode := public.resolve_academic_program_editor_mode(requested_profile_id, authorized_program_id);

  -- Plain professor mode can never assign, including to themselves -- this
  -- is the sole gate that prevents self-assignment/self-service; a
  -- program_coordinator/university_admin/platform_admin targeting their
  -- own profile is a different, allowed case (see target eligibility
  -- below, which never compares target_profile_id to the actor).
  if actor_mode = 'professor' then
    raise exception 'Academic program editor access denied' using errcode = '42501';
  end if;

  -- Professor lifecycle advisory lock: the same (profile, program,
  -- 'professor') key grant_academic_program_staff_role and
  -- revoke_academic_program_staff_role already use (and
  -- unassign_professor_from_academic_group uses below), so a concurrent
  -- grant/revoke of the target's own professor authorization for this
  -- exact program cannot interleave with this assignment. Held for the
  -- rest of this transaction, which is also what makes the ON CONFLICT
  -- fallback read below race-free against a concurrent unassign.
  perform pg_advisory_xact_lock(
    hashtext(target_profile_id::text || ':' || authorized_program_id::text),
    hashtext('professor')
  );

  select item.*
  into existing_group
  from public.academic_groups item
  where item.id = target_academic_group_id
  for update;

  if existing_group.id is null
    or existing_group.academic_program_id is distinct from authorized_program_id
    or existing_group.organization_id is distinct from authorized_organization_id then
    raise exception 'Academic group changed during update' using errcode = '40001';
  end if;

  if existing_group.status <> 'active' then
    raise exception 'Cannot assign professor responsibility for an inactive academic group' using errcode = '22023';
  end if;

  select program.status
  into program_status
  from public.academic_programs program
  where program.id = authorized_program_id;

  if program_status is distinct from 'active' then
    raise exception 'Cannot assign professor responsibility for an inactive academic program' using errcode = '22023';
  end if;

  select profile.status, profile.university_id
  into target_profile_status, target_profile_university_id
  from public.profiles profile
  where profile.id = target_profile_id;

  if target_profile_status is null or target_profile_status <> 'active' then
    raise exception 'Target profile not found or inactive' using errcode = '22023';
  end if;

  if target_profile_university_id is distinct from authorized_organization_id then
    raise exception 'Target profile does not belong to the group''s university' using errcode = '22023';
  end if;

  -- Eligibility is a real, current professor program role -- never
  -- profile_type -- read fresh, under the advisory lock above, so a
  -- concurrent revoke of this exact authorization cannot race past this
  -- check. A program_coordinator role alone does not satisfy this; if the
  -- same profile also independently holds professor for this program, it
  -- does.
  select exists (
    select 1
    from public.profile_roles profile_role
    join public.roles role
      on role.id = profile_role.role_id
     and role.code = 'professor'
    where profile_role.profile_id = target_profile_id
      and profile_role.scope_type = 'program'
      and profile_role.scope_id = authorized_program_id
  )
  into is_eligible_professor;

  if not is_eligible_professor then
    raise exception 'Target profile is not an eligible professor for this academic program' using errcode = '22023';
  end if;

  insert into public.academic_group_staff_assignments (
    academic_group_id, academic_program_id, organization_id, staff_profile_id, assigned_by_profile_id
  ) values (
    target_academic_group_id, authorized_program_id, authorized_organization_id, target_profile_id, requested_profile_id
  )
  on conflict (academic_group_id, staff_profile_id) do nothing
  returning * into new_assignment;

  did_insert := new_assignment.id is not null;

  if not did_insert then
    -- Conflict: an assignment already exists. The advisory lock above is
    -- held for the rest of this transaction, and
    -- unassign_professor_from_academic_group takes the identical key
    -- before deleting a row, so the existing row cannot be concurrently
    -- removed between the failed insert and this fallback read.
    select item.*
    into new_assignment
    from public.academic_group_staff_assignments item
    where item.academic_group_id = target_academic_group_id
      and item.staff_profile_id = target_profile_id;
  else
    insert into public.academic_group_staff_assignment_audit_events (
      actor_user_id, actor_profile_id, actor_role, action, assignment_id,
      academic_group_id, academic_program_id, organization_id, target_profile_id, after_snapshot
    ) values (
      auth.uid(), requested_profile_id, actor_mode, 'assign', new_assignment.id,
      target_academic_group_id, authorized_program_id, authorized_organization_id, target_profile_id, to_jsonb(new_assignment)
    );
  end if;

  return jsonb_build_object(
    'id', new_assignment.id,
    'academic_group_id', new_assignment.academic_group_id,
    'staff_profile_id', new_assignment.staff_profile_id,
    'created_at', new_assignment.created_at,
    'already_existed', not did_insert
  );
end;
$$;

-- ============================================================
-- D. Unassign. SECURITY DEFINER. Same actor authorization, same advisory
-- lock key. Always allowed regardless of group/program status (cleanup
-- must remain possible). No target-eligibility re-check -- removal, not
-- grant.
-- ============================================================
create or replace function public.unassign_professor_from_academic_group(
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
  existing_assignment public.academic_group_staff_assignments%rowtype;
  authorized_assignment_id uuid;
  authorized_group_id uuid;
  authorized_program_id uuid;
  authorized_staff_profile_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  -- Non-locking lookup to resolve the assignment's program for
  -- authorization only -- no FOR UPDATE lock before the actor is known to
  -- be authorized for it.
  select item.*
  into existing_assignment
  from public.academic_group_staff_assignments item
  where item.id = assignment_id;

  if existing_assignment.id is null then
    raise exception 'Academic group staff assignment not found' using errcode = '22023';
  end if;

  actor_mode := public.resolve_academic_program_editor_mode(requested_profile_id, existing_assignment.academic_program_id);

  if actor_mode = 'professor' then
    raise exception 'Academic program editor access denied' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtext(existing_assignment.staff_profile_id::text || ':' || existing_assignment.academic_program_id::text),
    hashtext('professor')
  );

  authorized_assignment_id := existing_assignment.id;
  authorized_group_id := existing_assignment.academic_group_id;
  authorized_program_id := existing_assignment.academic_program_id;
  authorized_staff_profile_id := existing_assignment.staff_profile_id;

  select item.*
  into existing_assignment
  from public.academic_group_staff_assignments item
  where item.id = assignment_id
  for update;

  if existing_assignment.id is null
    or existing_assignment.id is distinct from authorized_assignment_id
    or existing_assignment.academic_group_id is distinct from authorized_group_id
    or existing_assignment.academic_program_id is distinct from authorized_program_id
    or existing_assignment.staff_profile_id is distinct from authorized_staff_profile_id
  then
    raise exception 'Academic group staff assignment not found' using errcode = '22023';
  end if;

  delete from public.academic_group_staff_assignments
  where id = existing_assignment.id;

  insert into public.academic_group_staff_assignment_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, assignment_id,
    academic_group_id, academic_program_id, organization_id, target_profile_id, before_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, 'unassign', existing_assignment.id,
    existing_assignment.academic_group_id, existing_assignment.academic_program_id, existing_assignment.organization_id,
    existing_assignment.staff_profile_id, to_jsonb(existing_assignment)
  );

  return jsonb_build_object('id', existing_assignment.id, 'unassigned', true);
end;
$$;

-- ============================================================
-- E. revoke_academic_program_staff_role -- create or replace, same
-- signature, migration 016 untouched. Adds professor-role-revoke cleanup
-- only; program_coordinator revokes are entirely unaffected. The
-- professor-lifecycle advisory lock is now acquired BEFORE the exact
-- profile_roles row is locked (steps 1-3 unchanged from 016; the lock is
-- new step 4, inserted ahead of the pre-existing FOR UPDATE in step 5) --
-- this avoids ever holding that row lock while waiting on the advisory
-- lock, keeping this function's lock order symmetric with
-- assign_professor_to_academic_group's (which takes the advisory lock
-- before touching any row at all).
-- ============================================================
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
  authorized_assignment_id uuid;
  authorized_scope_id uuid;
  authorized_role_id uuid;
  authorized_profile_id uuid;
  no_professor_role_remains boolean;
  affected_group_staff public.academic_group_staff_assignments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  -- [1] Non-locking lookup -- unchanged from migration 016.
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

  -- [2] Authorize actor -- unchanged from migration 016. Only
  -- university_admin/platform_admin can ever succeed here.
  actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, program_organization_id);

  -- [3] Capture exactly what authorization was granted against --
  -- unchanged from migration 016.
  authorized_assignment_id := existing_assignment.id;
  authorized_scope_id := existing_assignment.scope_id;
  authorized_role_id := existing_assignment.role_id;
  authorized_profile_id := existing_assignment.profile_id;

  -- [4] NEW -- if the role being revoked is professor, acquire the shared
  -- professor lifecycle advisory lock before locking the exact
  -- profile_roles row (not after, per the corrected design): this keeps
  -- lock order identical to assign_professor_to_academic_group (advisory
  -- lock first, row lock second) and never holds a row lock while waiting
  -- on the advisory lock. program_coordinator revokes take no such lock
  -- and perform no cleanup at all.
  if assignment_role_code = 'professor' then
    perform pg_advisory_xact_lock(
      hashtext(authorized_profile_id::text || ':' || authorized_scope_id::text),
      hashtext('professor')
    );
  end if;

  -- [5] FOR UPDATE exact row -- unchanged from migration 016.
  select profile_role.*
  into existing_assignment
  from public.profile_roles profile_role
  where profile_role.id = assignment_id
    and profile_role.scope_type = 'program'
  for update;

  -- [6] Revalidate captured values -- unchanged from migration 016.
  if existing_assignment.id is null
    or existing_assignment.id is distinct from authorized_assignment_id
    or existing_assignment.scope_type is distinct from 'program'
    or existing_assignment.scope_id is distinct from authorized_scope_id
    or existing_assignment.role_id is distinct from authorized_role_id
  then
    raise exception 'Academic program staff assignment not found' using errcode = '22023';
  end if;

  -- [7] Delete exact row -- unchanged from migration 016.
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

  -- [8-9] NEW -- clean up group responsibilities only if this was the
  -- LAST remaining professor authorization for this exact profile+
  -- program. profile_roles intentionally has no unique constraint (TASK
  -- 004.6.1), so a second professor row for the same profile+program is
  -- not schema-impossible -- this check runs after the delete above (so
  -- it never sees the just-removed row) and under the advisory lock
  -- acquired in step 4, so a concurrent grant of a new professor row, or a
  -- concurrent group assignment, cannot race past it.
  if assignment_role_code = 'professor' then
    select not exists (
      select 1
      from public.profile_roles profile_role
      join public.roles role
        on role.id = profile_role.role_id
       and role.code = 'professor'
      where profile_role.profile_id = authorized_profile_id
        and profile_role.scope_type = 'program'
        and profile_role.scope_id = authorized_scope_id
    )
    into no_professor_role_remains;

    if no_professor_role_remains then
      for affected_group_staff in
        select item.*
        from public.academic_group_staff_assignments item
        where item.staff_profile_id = authorized_profile_id
          and item.academic_program_id = authorized_scope_id
        order by item.id
        for update
      loop
        delete from public.academic_group_staff_assignments
        where id = affected_group_staff.id;

        insert into public.academic_group_staff_assignment_audit_events (
          actor_user_id, actor_profile_id, actor_role, action, assignment_id,
          academic_group_id, academic_program_id, organization_id, target_profile_id, before_snapshot
        ) values (
          auth.uid(), requested_profile_id, actor_mode, 'cleanup_on_program_role_revoke', affected_group_staff.id,
          affected_group_staff.academic_group_id, affected_group_staff.academic_program_id, affected_group_staff.organization_id,
          affected_group_staff.staff_profile_id, to_jsonb(affected_group_staff)
        );
      end loop;
    end if;
  end if;

  -- [11] Return. No exception handler exists anywhere above: a failure in
  -- any statement, including any audit insert, aborts this entire
  -- transaction -- the program-role revoke, the profile_roles delete, and
  -- every cleanup delete/audit pair all succeed together or not at all.
  return jsonb_build_object('id', existing_assignment.id, 'revoked', true);
end;
$$;

-- ============================================================
-- F. update_academic_group -- create or replace, same signature, migration
-- 016 untouched. Every TASK 004.5/004.6.1 invariant and lock-order fix
-- already in 016 is preserved verbatim; the only addition is the
-- cross-program-move guard below.
-- ============================================================
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
  authorized_source_program_id uuid;
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

  authorized_source_program_id := existing_group.academic_program_id;
  actor_mode := public.resolve_academic_program_editor_mode(requested_profile_id, authorized_source_program_id);

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

  if existing_group.academic_program_id is distinct from authorized_source_program_id then
    raise exception 'Academic group changed during update' using errcode = '40001';
  end if;

  -- NEW (TASK 004.6.2): block a cross-program move while the group still
  -- has active professor responsibilities. The group row is already
  -- locked above, so this is naturally serialized against a concurrent
  -- assign_professor_to_academic_group call for this same group (which
  -- also locks this exact row before inserting). No responsibility is
  -- ever auto-deleted, silently migrated, or re-evaluated against the
  -- target program's eligibility -- the operator must explicitly unassign
  -- every professor first, then move the group.
  if target_academic_program_id is distinct from existing_group.academic_program_id
    and exists (
      select 1 from public.academic_group_staff_assignments item
      where item.academic_group_id = existing_group.id
    ) then
    raise exception 'Cannot move an academic group with active professor responsibilities' using errcode = '22023';
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

-- ============================================================
-- G. get_program_staff_academic_overview -- create or replace, same
-- signature, migration 016 untouched. Adds group_staff_assignments and
-- eligible_professors. When actor_mode = 'professor', eligible_professors
-- is the literal empty array without running its query at all (the CASE's
-- ELSE branch, containing the subquery, never evaluates), and
-- group_staff_assignments is filtered to the professor's own rows in SQL
-- -- both enforced server-side, not left to the UI to hide.
-- ============================================================
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
    ), '[]'::jsonb),
    -- TASK 004.6.2: nominal Professor <-> Academic Group responsibility.
    -- A plain professor only ever sees their own rows here; a
    -- program_coordinator/university_admin/platform_admin sees every
    -- responsibility in this program.
    'group_staff_assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id,
        'academic_group_id', item.academic_group_id,
        'academic_program_id', item.academic_program_id,
        'staff_profile_id', item.staff_profile_id,
        'staff_display_name', staff.display_name,
        'assigned_by_profile_id', item.assigned_by_profile_id,
        'created_at', item.created_at
      ) order by staff.display_name, item.created_at, item.id)
      from public.academic_group_staff_assignments item
      join public.profiles staff on staff.id = item.staff_profile_id
      where item.academic_program_id = target_academic_program_id
        and (actor_mode <> 'professor' or item.staff_profile_id = requested_profile_id)
    ), '[]'::jsonb),
    -- A plain professor never receives the eligible-professor roster --
    -- the subquery in the else branch below does not run for that actor
    -- mode at all, it is not merely filtered out afterward.
    --
    -- A profile is listed only if ALL of: a real profile_roles row with
    -- role.code = 'professor', scope_type = 'program' and scope_id = this
    -- program; profiles.status = 'active'; and profiles.university_id =
    -- the program's organization_id -- never profile_type.
    -- assign_professor_to_academic_group independently re-enforces these
    -- same rules and remains the authority; this is only their read-model
    -- mirror. profile_roles intentionally has no unique constraint, so one
    -- profile+program pair can legitimately hold several professor rows;
    -- the inner select distinct collapses them to at most one row per
    -- (academic_program_id, profile_id), so a duplicate role row can never
    -- produce a duplicate dropdown entry. The distinct lives in the inner
    -- subquery and the aggregate in the outer query, so no aggregate call
    -- is nested inside another aggregate's arguments.
    'eligible_professors', case when actor_mode = 'professor' then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'academic_program_id', eligible.academic_program_id,
        'profile_id', eligible.profile_id,
        'display_name', eligible.display_name
      ) order by eligible.display_name, eligible.profile_id)
      from (
        select distinct
          profile_role.scope_id as academic_program_id,
          staff.id as profile_id,
          staff.display_name
        from public.profile_roles profile_role
        join public.roles role
          on role.id = profile_role.role_id
         and role.code = 'professor'
        join public.academic_programs program
          on program.id = profile_role.scope_id
        join public.profiles staff
          on staff.id = profile_role.profile_id
         and staff.status = 'active'
         and staff.university_id = program.organization_id
        where profile_role.scope_type = 'program'
          and profile_role.scope_id = target_academic_program_id
      ) eligible
    ), '[]'::jsonb) end
  );
end;
$$;

-- ============================================================
-- H. get_academic_groups_editor_overview -- create or replace, same
-- signature, migration 011 untouched otherwise. This function's
-- actor_mode is always platform_admin/university_admin in practice (no
-- professor/program_coordinator branch exists in its authorization), so
-- the two new fields are always returned in full, unfiltered, for the
-- whole resolved university scope -- matching the ADMIN READ RULE
-- exactly.
-- ============================================================
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
    ), '[]'::jsonb),
    -- TASK 004.6.2: university-wide responsibility data. actor_mode here
    -- is always platform_admin/university_admin, never professor, so this
    -- is always the full, unfiltered scope.
    'group_staff_assignments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id,
        'academic_group_id', item.academic_group_id,
        'academic_program_id', item.academic_program_id,
        'staff_profile_id', item.staff_profile_id,
        'staff_display_name', staff.display_name,
        'assigned_by_profile_id', item.assigned_by_profile_id,
        'created_at', item.created_at
      ) order by staff.display_name, item.created_at, item.id)
      from public.academic_group_staff_assignments item
      join public.profiles staff on staff.id = item.staff_profile_id
      where item.organization_id = resolved_university_id
    ), '[]'::jsonb),
    -- Same eligibility rules and the same deduplication as
    -- get_program_staff_academic_overview's eligible_professors (see the
    -- comment there): real professor profile_roles row for the program,
    -- profiles.status = 'active', profiles.university_id = the program's
    -- organization_id, never profile_type -- but scoped to every program in
    -- the resolved university. Each row carries its academic_program_id so
    -- the UI can filter candidates per group; a professor eligible for
    -- several programs appears once per program, and never more than once
    -- per (academic_program_id, profile_id) even when duplicate
    -- profile_roles rows exist. assign_professor_to_academic_group
    -- independently re-enforces the same rules and remains the authority.
    'eligible_professors', coalesce((
      select jsonb_agg(jsonb_build_object(
        'academic_program_id', eligible.academic_program_id,
        'profile_id', eligible.profile_id,
        'display_name', eligible.display_name
      ) order by eligible.display_name, eligible.profile_id, eligible.academic_program_id)
      from (
        select distinct
          profile_role.scope_id as academic_program_id,
          staff.id as profile_id,
          staff.display_name
        from public.profile_roles profile_role
        join public.roles role
          on role.id = profile_role.role_id
         and role.code = 'professor'
        join public.academic_programs program
          on program.id = profile_role.scope_id
         and program.organization_id = resolved_university_id
        join public.profiles staff
          on staff.id = profile_role.profile_id
         and staff.status = 'active'
         and staff.university_id = program.organization_id
        where profile_role.scope_type = 'program'
      ) eligible
    ), '[]'::jsonb)
  );
end;
$$;

-- ============================================================
-- I. Grants. The four create-or-replace'd functions (revoke_academic_
-- program_staff_role, update_academic_group, get_program_staff_academic_
-- overview, get_academic_groups_editor_overview) keep their existing
-- grants automatically -- none of their signatures changed. Only the two
-- new functions need explicit revoke/grant.
-- ============================================================
revoke all on function public.assign_professor_to_academic_group(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.unassign_professor_from_academic_group(uuid, uuid) from public, anon, authenticated;

grant execute on function public.assign_professor_to_academic_group(uuid, uuid, uuid) to authenticated;
grant execute on function public.unassign_professor_from_academic_group(uuid, uuid) to authenticated;

comment on function public.assign_professor_to_academic_group(uuid, uuid, uuid) is
  'TASK 004.6.2: assigns nominal professor responsibility for an academic group. Actor must be program_coordinator/university_admin/platform_admin for the group''s program; target must hold a real current professor program role (never profile_type alone). Idempotent via ON CONFLICT DO NOTHING -- no exception-based duplicate handling.';

comment on function public.unassign_professor_from_academic_group(uuid, uuid) is
  'TASK 004.6.2: removes an exact academic_group_staff_assignments row by id. Same actor authorization as assign; always allowed regardless of group/program active/inactive/archived status, so cleanup remains possible.';
