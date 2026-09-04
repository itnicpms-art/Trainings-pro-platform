-- TASK 004.6: controlled student <-> academic group membership management.
-- All reads and writes remain behind authenticated, scoped SECURITY DEFINER
-- RPCs. Reuses public.resolve_academic_units_editor_mode(...) from
-- migration 007 for actor/scope resolution, so write access is limited to
-- University Admin (own university) and Platform Admin (selected
-- university) exactly like every prior TASK 004.x write RPC.
--
-- MODEL DECISION (see docs/tasks/TASK-004-6-student-group-membership-management.md
-- for the full write-up): public.academic_profile_contexts (migration 004)
-- already models everything a membership needs and is reused as-is here.
-- No new membership table is added. Verified before writing any RPC:
--   - profile_id, organization_id, academic_program_id, academic_year_id,
--     academic_group_id, status, is_primary, started_at, ended_at already
--     exist on the table.
--   - academic_profile_contexts_group_same_program_fk (academic_group_id,
--     organization_id, academic_program_id) -> academic_groups(id,
--     organization_id, academic_program_id) already guarantees a group
--     assignment is consistent with the student's own program and
--     university at the database level.
--   - academic_profile_contexts_one_primary_per_profile_idx (a partial
--     unique index on profile_id where is_primary and status = 'active')
--     already enforces at most one active primary context per profile,
--     globally across organizations -- exactly the primary-membership rule
--     this task needs, with no new constraint required. Every RPC below
--     that resolves "the other primary row" queries by profile_id alone
--     (no organization_id filter) to match this index's real scope.
--   - Nothing is deleted: a "move" ends the old row (status='inactive',
--     ended_at=current_date) and inserts a new one; an "end" only changes
--     status/ended_at on the existing row. History is preserved as
--     multiple rows per profile, never overwritten or removed.
--
-- Professor/Coordinator access: profile_roles(scope_type='program') is a
-- real relation already enforced by migration 006 for READ visibility, but
-- no prior TASK 004.x write RPC has ever granted program-scoped write
-- access to professor/program_coordinator/coordinator -- every one of them
-- (007, 009, 010, 011) restricts writes to university_admin/platform_admin
-- only. This migration keeps that unbroken precedent: professor and
-- coordinator roles get no new read or write access here. See the task doc
-- for the full reasoning; this is a documented, deliberate scope boundary,
-- not an oversight.

create table if not exists public.student_group_membership_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  actor_profile_id uuid not null references public.profiles(id),
  actor_role text not null check (actor_role in ('university_admin', 'platform_admin')),
  action text not null check (action in ('create', 'move', 'end', 'primary_change')),
  resource_type text not null default 'academic_profile_context' check (resource_type = 'academic_profile_context'),
  resource_id uuid,
  student_profile_id uuid not null references public.profiles(id),
  organization_id uuid not null references public.organizations(id),
  old_academic_group_id uuid,
  new_academic_group_id uuid,
  before_snapshot jsonb,
  after_snapshot jsonb,
  created_at timestamptz not null default now()
);

create index if not exists student_group_membership_audit_events_organization_created_idx
on public.student_group_membership_audit_events(organization_id, created_at desc);

create index if not exists student_group_membership_audit_events_student_profile_idx
on public.student_group_membership_audit_events(student_profile_id, created_at desc);

alter table public.student_group_membership_audit_events enable row level security;
revoke all on table public.student_group_membership_audit_events from public, anon, authenticated;

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
    ), '[]'::jsonb)
  );
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
  actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, target_university_id);

  select group_item.status, group_item.academic_program_id, group_item.academic_year_id, group_item.academic_term_id
  into group_status, group_program_id, group_year_id, group_term_id
  from public.academic_groups group_item
  where group_item.id = target_group_id
    and group_item.organization_id = target_university_id
  for update;

  if group_status is null then
    raise exception 'Academic group not found in this university' using errcode = '22023';
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

  actor_mode := public.resolve_academic_units_editor_mode(requested_profile_id, target_membership.organization_id);

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

revoke all on function public.get_student_group_membership_editor_overview(uuid, uuid) from public, anon, authenticated;
revoke all on function public.add_student_to_group(uuid, uuid, uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.move_student_group_membership(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.end_student_group_membership(uuid, uuid) from public, anon, authenticated;
revoke all on function public.set_primary_group_membership(uuid, uuid) from public, anon, authenticated;

grant execute on function public.get_student_group_membership_editor_overview(uuid, uuid) to authenticated;
grant execute on function public.add_student_to_group(uuid, uuid, uuid, uuid, boolean) to authenticated;
grant execute on function public.move_student_group_membership(uuid, uuid, uuid) to authenticated;
grant execute on function public.end_student_group_membership(uuid, uuid) to authenticated;
grant execute on function public.set_primary_group_membership(uuid, uuid) to authenticated;

comment on table public.student_group_membership_audit_events is
  'Immutable audit trail for TASK 004.6 student group membership create/move/end/primary-change events.';
comment on function public.get_student_group_membership_editor_overview(uuid, uuid) is
  'Returns scoped groups, eligible students, and current memberships for a University Admin or Platform Admin editor.';
comment on function public.add_student_to_group(uuid, uuid, uuid, uuid, boolean) is
  'Adds a student to a group by creating or updating their academic_profile_contexts row; records the mutation in the audit trail.';
comment on function public.move_student_group_membership(uuid, uuid, uuid) is
  'Ends an existing active membership and creates a replacement in a new group within the same program, preserving history and the primary flag.';
comment on function public.end_student_group_membership(uuid, uuid) is
  'Ends an active membership without deleting it and records the mutation in the audit trail.';
comment on function public.set_primary_group_membership(uuid, uuid) is
  'Promotes an active membership to primary, demoting any other active primary membership for the same student.';
