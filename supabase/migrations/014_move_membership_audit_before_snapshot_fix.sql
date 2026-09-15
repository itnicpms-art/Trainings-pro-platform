-- TASK 004.6 forward-only fix.
--
-- Migrations 012 and 013 are treated as already committed and are not
-- modified here (see AGENTS.md section 3: "Never modify an existing
-- committed migration. Every schema change must use a new migration
-- file."). This migration replaces only move_student_group_membership in
-- place via `create or replace function`, which preserves its existing
-- owner and grants since its signature does not change.
--
-- Confirmed issue (runtime QA): move_student_group_membership's audit
-- INSERT recorded before_snapshot = to_jsonb(ended_row). ended_row is
-- populated by `returning context.* into ended_row` on the UPDATE that
-- already set status = 'inactive' and is_primary = false on the source
-- row -- so before_snapshot captured the POST-mutation state of the old
-- row, not its actual pre-mutation state. QA observed this directly: a
-- move from an active, primary membership recorded before_status =
-- 'inactive' / before_is_primary = false, when the real prior state was
-- active/true.
--
-- Fix: use existing_membership for before_snapshot instead of ended_row.
-- existing_membership is populated by the `for update` select earlier in
-- the function, before the UPDATE runs, so it still holds the row's true
-- pre-mutation state. after_snapshot (to_jsonb(new_row)) and
-- old_academic_group_id/new_academic_group_id are unchanged -- only the
-- before_snapshot expression changes.
--
-- Everything else about this function is carried forward unchanged from
-- migration 013, including ended_at = greatest(current_date,
-- existing_membership.started_at) and the lack of any exception handler
-- around the UPDATE/INSERT pair: an uncaught error in either statement
-- still aborts the whole call and rolls back everything before it.

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

  -- before_snapshot uses existing_membership (captured before the UPDATE
  -- above) rather than ended_row (captured by that UPDATE's RETURNING),
  -- so it reflects the source row's true state prior to this move.
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
