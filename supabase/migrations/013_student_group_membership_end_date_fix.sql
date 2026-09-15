-- TASK 004.6 forward-only fix.
--
-- Migration 012 is treated as already committed and is not modified here
-- (see AGENTS.md section 3: "Never modify an existing committed
-- migration. Every schema change must use a new migration file."). This
-- migration replaces two of its functions in place via `create or replace
-- function`, which preserves each function's existing owner and grants
-- since neither signature changes.
--
-- Confirmed root cause (from live Supabase inspection, not static review):
-- the deployed `end_student_group_membership` still computed
-- `ended_at = current_date` unconditionally. For a membership whose
-- `started_at` is in the future (e.g. started_at = 2026-10-01, observed
-- while current_date = 2026-09-14), this produces ended_at < started_at,
-- which violates academic_profile_contexts_date_order_check (migration
-- 004, unmodified: `ended_at is null or started_at is null or
-- ended_at >= started_at`). The UPDATE itself fails with SQLSTATE 23514
-- before the audit INSERT ever runs, so the audit INSERT is not, and was
-- never, the cause of this failure.
--
-- Fix: clamp ended_at with greatest(current_date, started_at), exactly as
-- already validated for this task. move_student_group_membership has the
-- identical old-row-ending step and the identical exposure, so it is
-- fixed here too -- restoring migration 012 to its original committed
-- content would otherwise silently reintroduce this same, already-fixed
-- bug in the move path.
--
-- Atomicity: neither function wraps its UPDATE/INSERT pair in any
-- exception handler. An uncaught error in either statement aborts the
-- whole function call and rolls back everything before it -- this is
-- plpgsql's plain default behavior, with nothing added to catch, log, or
-- swallow a failure. The temporary GET STACKED DIAGNOSTICS/RAISE LOG
-- instrumentation and the END_MEMBERSHIP_UPDATE_FAILED/
-- END_MEMBERSHIP_AUDIT_FAILED stage codes from the prior diagnostic pass
-- are intentionally not carried forward: the root cause is now confirmed
-- from live data, so they are no longer needed.

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

  actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, existing_membership.organization_id);

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

  -- greatest(...) protects against a future-dated started_at (e.g. a
  -- membership scheduled to start next term): ending it today must never
  -- produce ended_at < started_at, which academic_profile_contexts_date_
  -- order_check (migration 004, unmodified) would reject. NULL start dates
  -- are ignored by greatest(), so this still resolves to current_date in
  -- the common case.
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

  insert into public.student_group_membership_audit_events (
    actor_user_id, actor_profile_id, actor_role, action, resource_id,
    student_profile_id, organization_id, old_academic_group_id, new_academic_group_id, before_snapshot, after_snapshot
  ) values (
    auth.uid(), requested_profile_id, actor_mode, 'move', new_row.id,
    existing_membership.profile_id, existing_membership.organization_id,
    existing_membership.academic_group_id, target_group_id, to_jsonb(ended_row), to_jsonb(new_row)
  );

  return to_jsonb(new_row);
end;
$$;

-- Business rule, confirmed by inspection (see TASK 004.6 docs): a student
-- MAY have zero active group memberships. Ending never requires or creates
-- a destination membership -- this function's own signature has no group
-- parameter, so a forced reassignment is structurally impossible, not just
-- unimplemented. The row is only marked inactive (status/ended_at/
-- is_primary); its organization_id/academic_program_id/academic_year_id/
-- academic_term_id values are left untouched on the row, so the group
-- membership's history remains fully intact and queryable -- only the
-- group placement itself ends. add_student_to_group's own primary-conflict
-- check only fires when an active primary row still has a group
-- (existing_primary_group_id is not null), so a student left without an
-- active row here is freely eligible to be added to a new compatible group
-- afterward, with no leftover blocker from the ended membership.
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

  actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, existing_membership.organization_id);

  -- greatest(...) protects against a future-dated started_at (e.g. a
  -- membership scheduled to start next term): ending it today must never
  -- produce ended_at < started_at, which academic_profile_contexts_date_
  -- order_check (migration 004, unmodified) would reject. NULL start dates
  -- are ignored by greatest(), so this still resolves to current_date in
  -- the common case.
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
