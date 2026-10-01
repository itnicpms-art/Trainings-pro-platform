-- TASK 004.7: Student Academic Group Join Requests & Approval Workflow.
-- Forward-only: migrations 001-018 are unmodified. Migrations 016/017/018
-- are already applied to production and are immutable; every function
-- below that already exists is changed via `create or replace function`
-- with an unchanged signature, so its existing grants are preserved
-- automatically.
--
-- PROGRAM ASSIGNMENT = AUTHORIZATION. GROUP ASSIGNMENT/RESPONSIBILITY DOES
-- NOT GRANT AUTHORIZATION (TASK 004.6.1/004.6.2, unchanged). This task adds
-- a student-initiated request/approval layer on top of the existing
-- membership RPCs (migration 012, extended in 016) -- it introduces no new
-- authorization concept of its own. Approval authorization is the exact
-- same `resolve_academic_program_editor_mode` (migration 016, unchanged)
-- every membership-write RPC already uses: whoever can already call
-- add_student_to_group for a program can already, today, approve a request
-- for that same program -- this task does not widen who can mutate
-- membership, it only adds a request/review step in front of a student's
-- own join, and reuses add_student_to_group itself for the actual mutation
-- so no membership business rule is duplicated.
--
-- PRODUCT RULES (final, as approved):
--   1. Only a student can create a request, only for their own profile.
--      Staff/Admin never create a request on a student's behalf -- they
--      keep using add_student_to_group directly, unchanged.
--   2. A student may request only an active group in a program where they
--      currently hold an ACTIVE academic_profile_contexts association.
--      Historical-only association is not sufficient. There is no
--      cross-program request: the group's own program is the only program
--      ever considered, and a request never creates or changes program
--      enrollment by itself.
--   3. Approvers are exactly the actors resolve_academic_program_editor_mode
--      already authorizes for the request's program: professor (their
--      authorized program), program_coordinator (their coordinated
--      program), university_admin (their own university), platform_admin
--      (the selected university). No parallel permission system.
--   4. Lifecycle: pending -> approved | rejected | cancelled. All three are
--      terminal. No expired/TTL/cron in this task.
--   5. Only the requesting student can cancel, and only while pending.
--      Staff/Admin use reject, never cancel.
--   6. is_primary is never exposed to the student. On approval: primary if
--      the student currently has no active primary membership at all,
--      otherwise secondary. Approval never demotes or moves an existing
--      primary -- that remains exclusively TASK 004.6's own RPCs
--      (set_primary_group_membership / move_student_group_membership).
--   7. Duplicate/current membership: request creation denies cleanly if
--      already an active member of the exact group, and treats an
--      already-pending request for the same student+group as a clean
--      "already_pending" success, not an error. Historical ended
--      membership never blocks a new request. Approval is idempotent if an
--      active membership for the exact student+group already exists by the
--      time it runs: no second membership is created, the request is still
--      marked approved and linked to the existing membership, and no false
--      membership-create audit event is written.
--   8. Approval independently revalidates, under its own lock, the
--      invariants specific to this workflow (request still pending,
--      student profile active, student still has an ACTIVE association
--      with the request's program, group/program still active, the
--      group/program/organization tuple unchanged since the request was
--      filed, approver still authorized) -- it does not rely solely on
--      add_student_to_group's own (differently scoped) checks for these.
--   9. A stale request (program/group gone inactive/archived, or the
--      student's program association ended) makes approval fail with a
--      clear reason; the request itself stays pending (no auto-reject, no
--      auto-expire) until the student cancels it or an approver rejects it.
--
-- CONCURRENCY (approve_academic_group_join_request specifically -- see the
-- inline CONCURRENCY NOTE/FIX comments at each check inside that function
-- for the full reasoning):
--   - The request row itself is locked (FOR UPDATE) before PRODUCT RULE 8's
--     revalidation runs, exactly like every other lock-then-revalidate RPC
--     in this schema.
--   - The academic_programs row is also locked (FOR UPDATE), held for the
--     rest of the transaction, before add_student_to_group is ever called
--     -- this is a genuine fix: a plain read left a window where a
--     concurrent update_academic_program could deactivate the program
--     after this function's own check but before the membership mutation,
--     which add_student_to_group does not independently close for every
--     actor_mode. Locking programs before groups matches this schema's one
--     established relative order between the two (update_academic_group
--     already locks academic_programs before academic_groups), so this
--     cannot introduce a deadlock against it, against
--     update_academic_program, or against add_student_to_group itself.
--   - The academic_groups row is deliberately NOT separately locked here:
--     add_student_to_group already locks it (FOR UPDATE) and holds that
--     lock for the rest of this same transaction, which is the real
--     closure for group status/program_id/organization_id drift. This
--     function's own group read stays unlocked and exists only to produce
--     this workflow's own, more specific error message.
--   - The student's "active program association" is intentionally never
--     locked: there is no single row to usefully pre-lock (zero, one, or
--     many rows can qualify), and approval's own effect (the membership it
--     creates or links) always re-establishes an active association with
--     the program for that student, so the invariant this check protects
--     cannot end up violated in the final committed state.
--   - True concurrent-session races (a second, truly simultaneous database
--     session, as opposed to an earlier transaction that already committed
--     before this one starts) cannot be exercised against a single
--     in-process PGlite connection; validation below runs the sequential
--     approximation instead (arrange the conflicting state, then approve)
--     and the locking argument above is what closes the true-concurrency
--     case, not an executed test of it. This is the same disclosed
--     limitation as TASK 004.6.2's own validation notes.
--
-- ============================================================
-- A. Current requests. One row per join request; a decided request is
-- never mutated again except by this migration's own RPCs transitioning
-- it exactly once to a terminal state. No requested_by_profile_id column:
-- per product rule 1, the creator is always student_profile_id.
-- ============================================================
create table if not exists public.academic_group_join_requests (
  id uuid primary key default gen_random_uuid(),
  student_profile_id uuid not null references public.profiles(id),
  academic_group_id uuid not null,
  academic_program_id uuid not null,
  organization_id uuid not null references public.organizations(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by_profile_id uuid references public.profiles(id),
  reviewed_at timestamptz,
  resulting_membership_id uuid references public.academic_profile_contexts(id),
  student_note text,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_group_join_requests_group_same_program_fk
    foreign key (academic_group_id, organization_id, academic_program_id)
    references public.academic_groups(id, organization_id, academic_program_id)
    on delete restrict
);

-- Exactly one pending request per (student, group) -- a partial unique
-- index, the same technique academic_profile_contexts_one_primary_per_
-- profile_idx (migration 004) already uses, so a student may have any
-- number of historical (decided) requests for the same group without
-- blocking a new one, while two simultaneous pending requests for the
-- exact same pair can never coexist. request_academic_group_join below
-- targets this index directly with ON CONFLICT instead of a pre-check, so
-- the race is closed at the database level, not just in application code.
create unique index if not exists academic_group_join_requests_one_pending_per_student_group_idx
on public.academic_group_join_requests(student_profile_id, academic_group_id)
where status = 'pending';

create index if not exists academic_group_join_requests_student_idx
on public.academic_group_join_requests(student_profile_id, created_at desc);

create index if not exists academic_group_join_requests_program_status_idx
on public.academic_group_join_requests(academic_program_id, status, created_at desc);

create index if not exists academic_group_join_requests_organization_status_idx
on public.academic_group_join_requests(organization_id, status, created_at desc);

drop trigger if exists academic_group_join_requests_set_updated_at on public.academic_group_join_requests;
create trigger academic_group_join_requests_set_updated_at
before update on public.academic_group_join_requests
for each row execute function public.set_updated_at();

alter table public.academic_group_join_requests enable row level security;
revoke all on table public.academic_group_join_requests from public, anon, authenticated;

comment on table public.academic_group_join_requests is
  'TASK 004.7: student-initiated Academic Group join requests. Current request state only -- full history lives in academic_group_join_request_audit_events.';

-- ============================================================
-- B. New immutable audit table, matching the established shape exactly
-- (student_group_membership_audit_events / academic_group_staff_
-- assignment_audit_events). actor_role includes 'student' -- a new value,
-- never used by a prior audit table -- because a student is a valid actor
-- for request/cancel; professor/program_coordinator/university_admin/
-- platform_admin are valid actors for approve/reject, the same set
-- resolve_academic_program_editor_mode already returns.
-- ============================================================
create table if not exists public.academic_group_join_request_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_profile_id uuid not null references public.profiles(id),
  actor_role text not null check (actor_role in (
    'student', 'professor', 'program_coordinator', 'university_admin', 'platform_admin'
  )),
  action text not null check (action in ('request', 'approve', 'reject', 'cancel')),
  resource_type text not null default 'academic_group_join_request'
    check (resource_type = 'academic_group_join_request'),
  request_id uuid not null,
  student_profile_id uuid not null references public.profiles(id),
  academic_group_id uuid not null,
  academic_program_id uuid not null references public.academic_programs(id),
  organization_id uuid not null references public.organizations(id),
  before_snapshot jsonb,
  after_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists academic_group_join_request_audit_events_request_idx
on public.academic_group_join_request_audit_events(request_id, created_at desc);

create index if not exists academic_group_join_request_audit_events_student_idx
on public.academic_group_join_request_audit_events(student_profile_id, created_at desc);

create index if not exists academic_group_join_request_audit_events_program_idx
on public.academic_group_join_request_audit_events(academic_program_id, created_at desc);

alter table public.academic_group_join_request_audit_events enable row level security;
revoke all on table public.academic_group_join_request_audit_events from public, anon, authenticated;

comment on table public.academic_group_join_request_audit_events is
  'TASK 004.7: immutable audit trail for academic_group_join_requests (request/approve/reject/cancel). No update or delete path exists anywhere in this schema.';

-- ============================================================
-- C. Student creates a request for themselves. SECURITY DEFINER.
-- ============================================================
create or replace function public.request_academic_group_join(
  requested_profile_id uuid,
  target_academic_group_id uuid,
  student_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  student_status text;
  student_university_id uuid;
  student_profile_type text;
  group_status text;
  group_program_id uuid;
  group_organization_id uuid;
  program_status text;
  has_active_program_association boolean;
  new_request public.academic_group_join_requests%rowtype;
begin
  -- PRODUCT RULE 1: only the student themselves, never staff/admin on their
  -- behalf -- there is no separate "target student" parameter at all.
  if auth.uid() is null or not exists (
    select 1
    from public.profiles profile
    where profile.id = requested_profile_id
      and profile.user_id = auth.uid()
      and profile.status = 'active'
  ) then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  select profile.status, profile.university_id, profile.profile_type
  into student_status, student_university_id, student_profile_type
  from public.profiles profile
  where profile.id = requested_profile_id;

  if student_profile_type <> 'student' then
    raise exception 'Only a student profile can request a group join' using errcode = '42501';
  end if;

  select item.status, item.academic_program_id, item.organization_id
  into group_status, group_program_id, group_organization_id
  from public.academic_groups item
  where item.id = target_academic_group_id;

  if group_status is null then
    raise exception 'Academic group not found' using errcode = '22023';
  end if;

  if group_organization_id is distinct from student_university_id then
    raise exception 'Academic group does not belong to the student''s university' using errcode = '22023';
  end if;

  if group_status = 'archived' then
    raise exception 'Cannot request an archived academic group' using errcode = '22023';
  end if;

  if group_status <> 'active' then
    raise exception 'Cannot request an inactive academic group' using errcode = '22023';
  end if;

  select program.status
  into program_status
  from public.academic_programs program
  where program.id = group_program_id;

  if program_status is distinct from 'active' then
    raise exception 'Cannot request a group in an inactive academic program' using errcode = '22023';
  end if;

  -- PRODUCT RULE 2: program boundary. The group's own program is the only
  -- program ever considered -- there is no separate "target program"
  -- parameter, so a cross-program request is structurally impossible, not
  -- just rejected by validation. A historical-only (ended) association
  -- does not satisfy this -- it must be currently active.
  select exists (
    select 1
    from public.academic_profile_contexts context
    where context.profile_id = requested_profile_id
      and context.academic_program_id = group_program_id
      and context.status = 'active'
  )
  into has_active_program_association;

  if not has_active_program_association then
    raise exception 'Student does not have an active academic association with this program' using errcode = '22023';
  end if;

  -- PRODUCT RULE 7: already an active member of this exact group -> deny
  -- cleanly. A historical (ended) membership in this same group does not
  -- block a new request.
  if exists (
    select 1
    from public.academic_profile_contexts existing
    where existing.profile_id = requested_profile_id
      and existing.academic_group_id = target_academic_group_id
      and existing.status = 'active'
  ) then
    raise exception 'Student already has an active membership in this group' using errcode = '23505';
  end if;

  -- PRODUCT RULE 7 + concurrency: ON CONFLICT targets the partial unique
  -- index directly, so two simultaneous requests for the same (student,
  -- group) can never both insert -- the loser falls through to the
  -- already_pending branch below instead of raising a raw constraint
  -- error.
  insert into public.academic_group_join_requests (
    student_profile_id, academic_group_id, academic_program_id, organization_id, status, student_note
  ) values (
    requested_profile_id, target_academic_group_id, group_program_id, group_organization_id, 'pending', nullif(btrim(student_note), '')
  )
  on conflict (student_profile_id, academic_group_id) where status = 'pending'
  do nothing
  returning * into new_request;

  if new_request.id is null then
    select item.*
    into new_request
    from public.academic_group_join_requests item
    where item.student_profile_id = requested_profile_id
      and item.academic_group_id = target_academic_group_id
      and item.status = 'pending';

    return jsonb_build_object('id', new_request.id, 'status', new_request.status, 'already_pending', true);
  end if;

  insert into public.academic_group_join_request_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, request_id,
    student_profile_id, academic_group_id, academic_program_id, organization_id, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, 'student', 'request', new_request.id,
    requested_profile_id, target_academic_group_id, group_program_id, group_organization_id, to_jsonb(new_request)
  );

  return jsonb_build_object('id', new_request.id, 'status', new_request.status, 'already_pending', false);
end;
$$;

-- ============================================================
-- D. Student cancels their own pending request. SECURITY DEFINER.
-- PRODUCT RULE 5: only the requesting student, only while pending.
-- ============================================================
create or replace function public.cancel_academic_group_join_request(
  requested_profile_id uuid,
  request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_request public.academic_group_join_requests%rowtype;
  updated_request public.academic_group_join_requests%rowtype;
  authorized_request_id uuid;
  authorized_student_id uuid;
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

  -- Non-locking lookup for authorization only -- no FOR UPDATE lock before
  -- ownership of the request is confirmed.
  select item.*
  into existing_request
  from public.academic_group_join_requests item
  where item.id = request_id;

  if existing_request.id is null then
    raise exception 'Academic group join request not found' using errcode = '22023';
  end if;

  if existing_request.student_profile_id is distinct from requested_profile_id then
    raise exception 'Only the requesting student can cancel this request' using errcode = '42501';
  end if;

  authorized_request_id := existing_request.id;
  authorized_student_id := existing_request.student_profile_id;

  select item.*
  into existing_request
  from public.academic_group_join_requests item
  where item.id = request_id
  for update;

  if existing_request.id is null
    or existing_request.id is distinct from authorized_request_id
    or existing_request.student_profile_id is distinct from authorized_student_id
  then
    raise exception 'Academic group join request not found' using errcode = '22023';
  end if;

  if existing_request.status <> 'pending' then
    raise exception 'Only a pending request can be cancelled' using errcode = '22023';
  end if;

  update public.academic_group_join_requests
  set status = 'cancelled'
  where id = existing_request.id
  returning * into updated_request;

  insert into public.academic_group_join_request_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, request_id,
    student_profile_id, academic_group_id, academic_program_id, organization_id, before_snapshot, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, 'student', 'cancel', updated_request.id,
    updated_request.student_profile_id, updated_request.academic_group_id, updated_request.academic_program_id, updated_request.organization_id,
    to_jsonb(existing_request), to_jsonb(updated_request)
  );

  return jsonb_build_object('id', updated_request.id, 'status', updated_request.status);
end;
$$;

-- ============================================================
-- E. Approve. SECURITY DEFINER. Authorization is exactly
-- resolve_academic_program_editor_mode (PRODUCT RULE 3, no parallel
-- permission system). The actual membership mutation delegates to
-- add_student_to_group unchanged (PRODUCT RULE 6 + no duplicated business
-- logic); this function's own job is the request-specific revalidation
-- (PRODUCT RULE 8), the idempotency rule for an already-existing exact
-- membership (PRODUCT RULE 7), and the request's own state transition.
-- ============================================================
create or replace function public.approve_academic_group_join_request(
  requested_profile_id uuid,
  request_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_mode text;
  request_row public.academic_group_join_requests%rowtype;
  updated_request public.academic_group_join_requests%rowtype;
  authorized_request_id uuid;
  authorized_program_id uuid;
  authorized_organization_id uuid;
  authorized_group_id uuid;
  current_group_status text;
  current_group_program_id uuid;
  current_group_organization_id uuid;
  current_program_status text;
  student_status text;
  has_active_program_association boolean;
  should_be_primary boolean;
  existing_membership_id uuid;
  resulting_id uuid;
  add_result jsonb;
  caught_duplicate boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  -- Non-locking lookup to resolve the request's program for authorization
  -- only -- no FOR UPDATE lock before the actor is known to be authorized.
  select item.*
  into request_row
  from public.academic_group_join_requests item
  where item.id = request_id;

  if request_row.id is null then
    raise exception 'Academic group join request not found' using errcode = '22023';
  end if;

  -- PRODUCT RULE 3: the exact same resolver every membership-write RPC
  -- already uses. Raises its own 42501 if the actor is not
  -- professor/program_coordinator for this program, university_admin for
  -- its university, or platform_admin.
  actor_mode := public.resolve_academic_program_editor_mode(requested_profile_id, request_row.academic_program_id);

  authorized_request_id := request_row.id;
  authorized_program_id := request_row.academic_program_id;
  authorized_organization_id := request_row.organization_id;
  authorized_group_id := request_row.academic_group_id;

  select item.*
  into request_row
  from public.academic_group_join_requests item
  where item.id = request_id
  for update;

  if request_row.id is null
    or request_row.id is distinct from authorized_request_id
    or request_row.academic_program_id is distinct from authorized_program_id
    or request_row.organization_id is distinct from authorized_organization_id
    or request_row.academic_group_id is distinct from authorized_group_id
  then
    raise exception 'Academic group join request not found' using errcode = '22023';
  end if;

  if request_row.status <> 'pending' then
    raise exception 'Only a pending request can be approved' using errcode = '22023';
  end if;

  -- PRODUCT RULE 8: request-specific revalidation, under the lock just
  -- acquired above. These are invariants of the request workflow itself --
  -- add_student_to_group's own (differently scoped) checks are not relied
  -- on for them.
  select profile.status
  into student_status
  from public.profiles profile
  where profile.id = request_row.student_profile_id;

  if student_status is distinct from 'active' then
    raise exception 'Student profile is not active' using errcode = '22023';
  end if;

  -- CONCURRENCY NOTE (no lock, by design): this exists-check has no row to
  -- usefully pre-lock -- the qualifying row for "active association with
  -- this program" need not be the membership being approved, there can be
  -- zero/one/many of them, and a currently-unlocked row offers nothing a
  -- lock would improve here. If the one qualifying row is instead a GROUP
  -- membership in a *different* group of the same program and it is ended
  -- by a concurrent end_student_group_membership/move_student_group_
  -- membership call right after this check, the approval below still
  -- creates (or links) an active membership for this exact program, so the
  -- student ends this transaction with an active association with the
  -- program regardless -- the invariant this check protects (the student
  -- is never left associated with a program they have no real tie to) is
  -- re-established by approval's own effect, not violated by it. A
  -- group-less (academic_group_id is null) qualifying row cannot be ended
  -- by any RPC in this schema at all: end_student_group_membership and
  -- move_student_group_membership both require academic_group_id is not
  -- null (see migration 016), so that sub-case is not reachable today.
  select exists (
    select 1
    from public.academic_profile_contexts context
    where context.profile_id = request_row.student_profile_id
      and context.academic_program_id = request_row.academic_program_id
      and context.status = 'active'
  )
  into has_active_program_association;

  if not has_active_program_association then
    raise exception 'Student no longer has an active academic association with this program' using errcode = '22023';
  end if;

  -- CONCURRENCY NOTE (no lock here either, deliberately): this read is only
  -- the friendly early error message ("archived" vs "inactive" vs "changed
  -- since the request was created"), kept so this workflow's own error
  -- text (matched by name in mutate-academic-group-join-request.ts) does
  -- not change. The actual race-closer is add_student_to_group's own
  -- SELECT ... FOR UPDATE on this exact academic_groups row (migration
  -- 016), acquired moments later and held for the rest of THIS same
  -- transaction (a SECURITY DEFINER call does not open a new transaction),
  -- which re-verifies status/academic_program_id/organization_id fresh and
  -- aborts the whole approval if any of them changed. Duplicating a second
  -- lock here would only ever re-lock the same row this transaction
  -- already owns, for no additional protection.
  select item.status, item.academic_program_id, item.organization_id
  into current_group_status, current_group_program_id, current_group_organization_id
  from public.academic_groups item
  where item.id = request_row.academic_group_id;

  if current_group_status is null
    or current_group_program_id is distinct from request_row.academic_program_id
    or current_group_organization_id is distinct from request_row.organization_id
  then
    raise exception 'Academic group changed since the request was created' using errcode = '22023';
  end if;

  if current_group_status <> 'active' then
    raise exception 'Cannot approve a request for an inactive or archived academic group' using errcode = '22023';
  end if;

  -- CONCURRENCY FIX: locked, not merely read -- a plain SELECT here left a
  -- real window where a concurrent update_academic_program call could
  -- deactivate the program after this check passed but before the
  -- membership mutation below, because (unlike the group, above)
  -- add_student_to_group never re-verifies program status at all for
  -- university_admin/platform_admin actor_mode, and only via its own
  -- unlocked read for professor/program_coordinator. Locking it here closes
  -- the window for every actor_mode: the lock is held for the rest of this
  -- transaction, so update_academic_program (which locks organization_units
  -- then academic_programs, migration 009) cannot change this row again
  -- until this transaction commits or rolls back. Programs are always
  -- locked before groups in this schema (see update_academic_group,
  -- migration 018, which locks academic_programs before academic_groups),
  -- and this lock is acquired here, before add_student_to_group locks the
  -- group just below -- so this cannot deadlock against it or against
  -- update_academic_program/update_academic_group.
  select program.status
  into current_program_status
  from public.academic_programs program
  where program.id = request_row.academic_program_id
  for update;

  if current_program_status is distinct from 'active' then
    raise exception 'Cannot approve a request for an inactive academic program' using errcode = '22023';
  end if;

  -- PRODUCT RULE 7 (idempotency): an active membership for this exact
  -- student+group may already exist (e.g. staff added the student directly
  -- via add_student_to_group after the request was filed). Do not mutate
  -- academic_profile_contexts again, do not write a false membership-create
  -- audit event -- just link the request to the existing membership.
  select context.id
  into existing_membership_id
  from public.academic_profile_contexts context
  where context.profile_id = request_row.student_profile_id
    and context.academic_group_id = request_row.academic_group_id
    and context.status = 'active';

  if existing_membership_id is not null then
    resulting_id := existing_membership_id;
  else
    -- PRODUCT RULE 6: is_primary is never a student input. Primary only
    -- when no active primary exists at all; approval never demotes or
    -- moves an existing primary.
    select not exists (
      select 1
      from public.academic_profile_contexts context
      where context.profile_id = request_row.student_profile_id
        and context.is_primary
        and context.status = 'active'
    )
    into should_be_primary;

    begin
      add_result := public.add_student_to_group(
        requested_profile_id, request_row.organization_id, request_row.academic_group_id,
        request_row.student_profile_id, should_be_primary
      );
      resulting_id := (add_result ->> 'id')::uuid;
    exception
      when unique_violation then
        -- PRODUCT RULE 16: approval racing a concurrent direct
        -- add_student_to_group call for the exact same student+group.
        -- add_student_to_group's only unique_violation is "already has an
        -- active membership in this group" -- the race just lost is the
        -- same idempotent case as above, handled identically rather than
        -- surfacing a raw constraint error.
        caught_duplicate := true;
    end;

    if caught_duplicate then
      select context.id
      into resulting_id
      from public.academic_profile_contexts context
      where context.profile_id = request_row.student_profile_id
        and context.academic_group_id = request_row.academic_group_id
        and context.status = 'active';

      if resulting_id is null then
        raise exception 'Academic group membership could not be resolved after a concurrent conflict' using errcode = '55000';
      end if;
    end if;
  end if;

  update public.academic_group_join_requests
  set status = 'approved',
      reviewed_by_profile_id = requested_profile_id,
      reviewed_at = now(),
      resulting_membership_id = resulting_id
  where id = request_row.id
  returning * into updated_request;

  insert into public.academic_group_join_request_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, request_id,
    student_profile_id, academic_group_id, academic_program_id, organization_id, before_snapshot, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, 'approve', updated_request.id,
    updated_request.student_profile_id, updated_request.academic_group_id, updated_request.academic_program_id, updated_request.organization_id,
    to_jsonb(request_row), to_jsonb(updated_request)
  );

  return jsonb_build_object(
    'id', updated_request.id,
    'status', updated_request.status,
    'resulting_membership_id', updated_request.resulting_membership_id
  );
end;
$$;

-- ============================================================
-- F. Reject. SECURITY DEFINER. Same authorization as approve. Always
-- allowed on a pending request regardless of group/program/student status
-- drift (PRODUCT RULE 9: a stale request can still be rejected) -- no
-- membership mutation happens here at all, so none of approve's
-- request-specific revalidation applies.
-- ============================================================
create or replace function public.reject_academic_group_join_request(
  requested_profile_id uuid,
  request_id uuid,
  decision_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_mode text;
  request_row public.academic_group_join_requests%rowtype;
  updated_request public.academic_group_join_requests%rowtype;
  authorized_request_id uuid;
  authorized_program_id uuid;
  -- This parameter must be named decision_note, matching src/types/
  -- database.ts and the Supabase client call in mutate-academic-group-
  -- join-request.ts exactly: Supabase/PostgREST resolves RPC arguments by
  -- name, not position, so a renamed parameter silently breaks every call
  -- from the application even though PGlite's positional test harness
  -- cannot detect it. A same-named local variable, normalized once here,
  -- is used below instead of the bare parameter so plpgsql's default
  -- variable_conflict = error setting never has to choose between the
  -- parameter and the identically-named column inside UPDATE ... SET --
  -- that exact ambiguity (42702) is why this function once needed a
  -- differently-named parameter in the first place.
  normalized_decision_note text;
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  select item.*
  into request_row
  from public.academic_group_join_requests item
  where item.id = request_id;

  if request_row.id is null then
    raise exception 'Academic group join request not found' using errcode = '22023';
  end if;

  actor_mode := public.resolve_academic_program_editor_mode(requested_profile_id, request_row.academic_program_id);

  authorized_request_id := request_row.id;
  authorized_program_id := request_row.academic_program_id;

  select item.*
  into request_row
  from public.academic_group_join_requests item
  where item.id = request_id
  for update;

  if request_row.id is null
    or request_row.id is distinct from authorized_request_id
    or request_row.academic_program_id is distinct from authorized_program_id
  then
    raise exception 'Academic group join request not found' using errcode = '22023';
  end if;

  if request_row.status <> 'pending' then
    raise exception 'Only a pending request can be rejected' using errcode = '22023';
  end if;

  normalized_decision_note := nullif(btrim(decision_note), '');

  update public.academic_group_join_requests
  set status = 'rejected',
      reviewed_by_profile_id = requested_profile_id,
      reviewed_at = now(),
      decision_note = normalized_decision_note
  where id = request_row.id
  returning * into updated_request;

  insert into public.academic_group_join_request_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, request_id,
    student_profile_id, academic_group_id, academic_program_id, organization_id, before_snapshot, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, 'reject', updated_request.id,
    updated_request.student_profile_id, updated_request.academic_group_id, updated_request.academic_program_id, updated_request.organization_id,
    to_jsonb(request_row), to_jsonb(updated_request)
  );

  return jsonb_build_object('id', updated_request.id, 'status', updated_request.status);
end;
$$;

-- ============================================================
-- G. Student-facing read model. Nothing like this exists today -- a
-- student has no overview RPC at all (only the single-row Home readout,
-- migration 005). Returns every one of the student's own
-- academic_profile_contexts rows (not just the primary), every active
-- group in a program they currently hold an active association with
-- (excluding groups they are already an active member of, or already have
-- a pending request for), and every one of their own requests
-- (pending + history).
-- ============================================================
create or replace function public.get_student_academic_group_join_overview(
  requested_profile_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  student_profile_type text;
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

  select profile.profile_type
  into student_profile_type
  from public.profiles profile
  where profile.id = requested_profile_id;

  if student_profile_type <> 'student' then
    raise exception 'Only a student profile can access this overview' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'actor_profile_id', requested_profile_id,
    'memberships', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', context.id,
        'academic_group_id', context.academic_group_id,
        'academic_group_name', group_item.name,
        'academic_group_code', group_item.code,
        'academic_program_id', context.academic_program_id,
        'academic_program_name', program.name,
        'status', context.status,
        'is_primary', context.is_primary,
        'started_at', context.started_at,
        'ended_at', context.ended_at
      ) order by context.started_at desc nulls last, context.created_at desc)
      from public.academic_profile_contexts context
      join public.academic_programs program on program.id = context.academic_program_id
      left join public.academic_groups group_item on group_item.id = context.academic_group_id
      where context.profile_id = requested_profile_id
        and context.academic_group_id is not null
    ), '[]'::jsonb),
    'eligible_groups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', group_item.id,
        'code', group_item.code,
        'name', group_item.name,
        'academic_program_id', group_item.academic_program_id,
        'academic_program_name', program.name
      ) order by program.name, group_item.name, group_item.id)
      from public.academic_groups group_item
      join public.academic_programs program on program.id = group_item.academic_program_id
      where group_item.status = 'active'
        and program.status = 'active'
        and exists (
          select 1
          from public.academic_profile_contexts context
          where context.profile_id = requested_profile_id
            and context.academic_program_id = group_item.academic_program_id
            and context.status = 'active'
        )
        and not exists (
          select 1
          from public.academic_profile_contexts context
          where context.profile_id = requested_profile_id
            and context.academic_group_id = group_item.id
            and context.status = 'active'
        )
        and not exists (
          select 1
          from public.academic_group_join_requests pending_request
          where pending_request.student_profile_id = requested_profile_id
            and pending_request.academic_group_id = group_item.id
            and pending_request.status = 'pending'
        )
    ), '[]'::jsonb),
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id,
        'academic_group_id', item.academic_group_id,
        'academic_group_name', group_item.name,
        'academic_program_id', item.academic_program_id,
        'academic_program_name', program.name,
        'status', item.status,
        'student_note', item.student_note,
        'decision_note', item.decision_note,
        'reviewed_at', item.reviewed_at,
        'resulting_membership_id', item.resulting_membership_id,
        'created_at', item.created_at
      ) order by item.created_at desc)
      from public.academic_group_join_requests item
      join public.academic_programs program on program.id = item.academic_program_id
      left join public.academic_groups group_item on group_item.id = item.academic_group_id
      where item.student_profile_id = requested_profile_id
    ), '[]'::jsonb)
  );
end;
$$;

-- ============================================================
-- H. get_program_staff_academic_overview -- create or replace, same
-- signature, migrations 016/018 untouched otherwise. Adds
-- pending_join_requests, scoped to this program, for professor/program_
-- coordinator/university_admin/platform_admin alike -- unlike 018's
-- eligible_professors, there is no privacy reason to hide this from a
-- plain professor: PRODUCT RULE 3 explicitly authorizes a professor to
-- approve/reject requests in their own authorized program, so they must be
-- able to see them.
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
    ), '[]'::jsonb) end,
    -- TASK 004.7: pending join requests for this program, visible to every
    -- actor_mode this function authorizes -- all four are valid approvers
    -- for their own program (PRODUCT RULE 3).
    'pending_join_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id,
        'student_profile_id', item.student_profile_id,
        'student_display_name', student.display_name,
        'academic_group_id', item.academic_group_id,
        'academic_group_name', group_item.name,
        'academic_program_id', item.academic_program_id,
        'student_note', item.student_note,
        'created_at', item.created_at
      ) order by item.created_at, item.id)
      from public.academic_group_join_requests item
      join public.profiles student on student.id = item.student_profile_id
      left join public.academic_groups group_item on group_item.id = item.academic_group_id
      where item.academic_program_id = target_academic_program_id
        and item.status = 'pending'
    ), '[]'::jsonb)
  );
end;
$$;

-- ============================================================
-- I. get_student_group_membership_editor_overview -- create or replace,
-- same signature, migration 012 untouched otherwise (this function was
-- never modified by 016 or 018 -- professor/program_coordinator read
-- through the separate get_program_staff_academic_overview instead). Adds
-- pending_join_requests, scoped to the resolved university, for
-- university_admin/platform_admin.
-- ============================================================
create or replace function public.get_student_group_membership_editor_overview(
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
    'groups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id,
        'code', item.code,
        'name', item.name,
        'status', item.status,
        'academic_program_id', item.academic_program_id
      ) order by item.name, item.id)
      from public.academic_groups item
      where item.organization_id = resolved_university_id
    ), '[]'::jsonb),
    'eligible_students', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', student.id,
        'display_name', student.display_name
      ) order by student.display_name, student.id)
      from public.profiles student
      where student.profile_type = 'student'
        and student.university_id = resolved_university_id
        and student.status = 'active'
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
      where context.organization_id = resolved_university_id
        and context.academic_group_id is not null
    ), '[]'::jsonb),
    -- TASK 004.7: pending join requests across the whole resolved
    -- university, for university_admin (own university) / platform_admin
    -- (selected university).
    'pending_join_requests', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', item.id,
        'student_profile_id', item.student_profile_id,
        'student_display_name', student.display_name,
        'academic_group_id', item.academic_group_id,
        'academic_group_name', group_item.name,
        'academic_program_id', item.academic_program_id,
        'student_note', item.student_note,
        'created_at', item.created_at
      ) order by item.created_at, item.id)
      from public.academic_group_join_requests item
      join public.profiles student on student.id = item.student_profile_id
      left join public.academic_groups group_item on group_item.id = item.academic_group_id
      where item.organization_id = resolved_university_id
        and item.status = 'pending'
    ), '[]'::jsonb)
  );
end;
$$;

-- ============================================================
-- J. Grants. The two create-or-replace'd functions
-- (get_program_staff_academic_overview, get_student_group_membership_
-- editor_overview) keep their existing grants automatically -- neither
-- signature changed. Only the five new functions need explicit
-- revoke/grant.
-- ============================================================
revoke all on function public.request_academic_group_join(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.cancel_academic_group_join_request(uuid, uuid) from public, anon, authenticated;
revoke all on function public.approve_academic_group_join_request(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reject_academic_group_join_request(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.get_student_academic_group_join_overview(uuid) from public, anon, authenticated;

grant execute on function public.request_academic_group_join(uuid, uuid, text) to authenticated;
grant execute on function public.cancel_academic_group_join_request(uuid, uuid) to authenticated;
grant execute on function public.approve_academic_group_join_request(uuid, uuid) to authenticated;
grant execute on function public.reject_academic_group_join_request(uuid, uuid, text) to authenticated;
grant execute on function public.get_student_academic_group_join_overview(uuid) to authenticated;

comment on function public.request_academic_group_join(uuid, uuid, text) is
  'TASK 004.7: a student requests to join an active academic group in a program they are actively associated with. Idempotent (already_pending) on a duplicate pending request via ON CONFLICT on the partial unique index.';
comment on function public.cancel_academic_group_join_request(uuid, uuid) is
  'TASK 004.7: the requesting student withdraws their own pending request. Staff/Admin use reject instead.';
comment on function public.approve_academic_group_join_request(uuid, uuid) is
  'TASK 004.7: approver (professor/program_coordinator/university_admin/platform_admin, authorized via resolve_academic_program_editor_mode) approves a pending request. Delegates the actual membership mutation to add_student_to_group unchanged; idempotent if the exact membership already exists.';
comment on function public.reject_academic_group_join_request(uuid, uuid, text) is
  'TASK 004.7: approver rejects a pending request. No membership mutation; always allowed on a pending request regardless of group/program/student status drift.';
comment on function public.get_student_academic_group_join_overview(uuid) is
  'TASK 004.7: a student''s own academic_profile_contexts rows, eligible groups to request in their active program(s), and their own join requests (pending + history).';
