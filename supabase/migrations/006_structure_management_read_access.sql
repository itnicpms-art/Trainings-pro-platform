-- TASK 004: scoped, read-only structure management overviews.
-- Direct table access remains denied; authenticated callers use these RPCs only.

create or replace function public.get_academic_structure_management_overview(requested_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  requested_profile public.profiles%rowtype;
  selected_context public.academic_profile_contexts%rowtype;
  selected_role_code text;
  selected_scope_type text;
  selected_scope_id uuid;
  profile_university_id uuid;
  target_university_id uuid;
  active_context_payload jsonb;
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  select profile.*
  into requested_profile
  from public.profiles profile
  where profile.id = requested_profile_id
    and profile.user_id = auth.uid()
    and profile.status = 'active';

  if requested_profile.id is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  select role.code, profile_role.scope_type, profile_role.scope_id
  into selected_role_code, selected_scope_type, selected_scope_id
  from public.profile_roles profile_role
  join public.roles role on role.id = profile_role.role_id
  where profile_role.profile_id = requested_profile_id
    and role.code in ('university_admin', 'professor', 'program_coordinator', 'coordinator')
  order by case role.code
    when 'university_admin' then 1
    when 'professor' then 2
    when 'program_coordinator' then 3
    else 4
  end
  limit 1;

  if selected_role_code is null then
    raise exception 'Academic structure management access denied' using errcode = '42501';
  end if;

  select academic_context.*
  into selected_context
  from public.academic_profile_contexts academic_context
  where academic_context.profile_id = requested_profile_id
    and academic_context.status = 'active'
  order by academic_context.is_primary desc,
    academic_context.started_at desc nulls last,
    academic_context.created_at desc
  limit 1;

  select organization.id
  into profile_university_id
  from public.organizations organization
  where organization.id = requested_profile.organization_id
    and organization.type = 'university';

  target_university_id := coalesce(
    selected_context.organization_id,
    requested_profile.university_id,
    profile_university_id
  );

  if target_university_id is null or not exists (
    select 1 from public.organizations organization
    where organization.id = target_university_id
      and organization.type = 'university'
  ) then
    raise exception 'Active academic context required' using errcode = '42501';
  end if;

  if selected_role_code = 'university_admin' then
    if selected_scope_type <> 'university'
      or (selected_scope_id is not null and selected_scope_id <> target_university_id) then
      raise exception 'Academic role scope mismatch' using errcode = '42501';
    end if;
  else
    if selected_context.id is null
      or selected_scope_type <> 'program'
      or (selected_scope_id is not null and selected_scope_id is distinct from selected_context.academic_program_id) then
      raise exception 'Active scoped academic context required' using errcode = '42501';
    end if;
  end if;

  select jsonb_build_object(
    'university_id', university.id,
    'university_name', university.name,
    'organization_unit_id', unit.id,
    'organization_unit_name', unit.name,
    'academic_program_id', program.id,
    'academic_program_name', program.name,
    'program_level', program.program_level,
    'academic_year_id', academic_year.id,
    'academic_year_name', academic_year.name,
    'academic_year_code', academic_year.code,
    'academic_term_id', academic_term.id,
    'academic_term_name', academic_term.name,
    'academic_group_id', academic_group.id,
    'academic_group_name', academic_group.name,
    'academic_group_code', academic_group.code
  )
  into active_context_payload
  from public.organizations university
  left join public.organization_units unit
    on unit.id = selected_context.organization_unit_id
   and unit.organization_id = target_university_id
  left join public.academic_programs program
    on program.id = selected_context.academic_program_id
   and program.organization_id = target_university_id
  left join public.academic_years academic_year
    on academic_year.id = selected_context.academic_year_id
   and academic_year.organization_id = target_university_id
  left join public.academic_terms academic_term
    on academic_term.id = selected_context.academic_term_id
   and academic_term.organization_id = target_university_id
  left join public.academic_groups academic_group
    on academic_group.id = selected_context.academic_group_id
   and academic_group.organization_id = target_university_id
  where university.id = target_university_id;

  return jsonb_build_object(
    'profile_id', requested_profile_id,
    'organization_id', target_university_id,
    'university_name', active_context_payload ->> 'university_name',
    'active_context', active_context_payload,
    'organization_units', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', unit.id, 'parent_unit_id', unit.parent_unit_id, 'unit_type', unit.unit_type,
        'code', unit.code, 'name', unit.name, 'status', unit.status
      ) order by unit.name, unit.id)
      from public.organization_units unit
      where unit.organization_id = target_university_id
        and (selected_role_code = 'university_admin' or unit.id = selected_context.organization_unit_id)
    ), '[]'::jsonb),
    'academic_programs', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', program.id, 'organization_unit_id', program.organization_unit_id,
        'code', program.code, 'name', program.name, 'program_level', program.program_level,
        'standard_duration_years', program.standard_duration_years, 'status', program.status
      ) order by program.name, program.id)
      from public.academic_programs program
      where program.organization_id = target_university_id
        and (selected_role_code = 'university_admin' or program.id = selected_context.academic_program_id)
    ), '[]'::jsonb),
    'academic_years', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', academic_year.id, 'code', academic_year.code, 'name', academic_year.name,
        'start_date', academic_year.start_date, 'end_date', academic_year.end_date,
        'is_current', academic_year.is_current, 'status', academic_year.status
      ) order by academic_year.start_date desc, academic_year.id)
      from public.academic_years academic_year
      where academic_year.organization_id = target_university_id
        and (selected_role_code = 'university_admin' or academic_year.id = selected_context.academic_year_id)
    ), '[]'::jsonb),
    'academic_terms', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', academic_term.id, 'academic_year_id', academic_term.academic_year_id,
        'code', academic_term.code, 'name', academic_term.name, 'term_type', academic_term.term_type,
        'term_number', academic_term.term_number, 'start_date', academic_term.start_date,
        'end_date', academic_term.end_date, 'status', academic_term.status
      ) order by academic_term.start_date desc, academic_term.id)
      from public.academic_terms academic_term
      where academic_term.organization_id = target_university_id
        and (selected_role_code = 'university_admin' or academic_term.id = selected_context.academic_term_id)
    ), '[]'::jsonb),
    'academic_groups', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', academic_group.id, 'academic_program_id', academic_group.academic_program_id,
        'academic_year_id', academic_group.academic_year_id, 'academic_term_id', academic_group.academic_term_id,
        'code', academic_group.code, 'name', academic_group.name, 'status', academic_group.status
      ) order by academic_group.name, academic_group.id)
      from public.academic_groups academic_group
      where academic_group.organization_id = target_university_id
        and (selected_role_code = 'university_admin' or academic_group.id = selected_context.academic_group_id)
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.get_organization_structure_management_overview(requested_profile_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  requested_profile public.profiles%rowtype;
  selected_role_code text;
  selected_scope_type text;
  selected_scope_id uuid;
  target_organization_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  select profile.*
  into requested_profile
  from public.profiles profile
  where profile.id = requested_profile_id
    and profile.user_id = auth.uid()
    and profile.status = 'active';

  if requested_profile.id is null then
    raise exception 'Active profile ownership required' using errcode = '42501';
  end if;

  select role.code, profile_role.scope_type, profile_role.scope_id
  into selected_role_code, selected_scope_type, selected_scope_id
  from public.profile_roles profile_role
  join public.roles role on role.id = profile_role.role_id
  where profile_role.profile_id = requested_profile_id
    and role.code in ('organization_admin', 'organization_representative')
  order by case role.code when 'organization_admin' then 1 else 2 end
  limit 1;

  target_organization_id := requested_profile.organization_id;

  if selected_role_code is null
    or selected_scope_type <> 'organization'
    or target_organization_id is null
    or (selected_scope_id is not null and selected_scope_id <> target_organization_id)
    or not exists (
      select 1 from public.organizations organization
      where organization.id = target_organization_id
        and organization.type <> 'university'
    ) then
    raise exception 'Organization structure management access denied' using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
      'profile_id', requested_profile_id,
      'organization_id', organization.id,
      'organization_name', organization.name,
      'organization_type', organization.type,
      'organization_status', organization.status,
      'training_periods', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', period.id, 'code', period.code, 'name', period.name,
          'start_date', period.start_date, 'end_date', period.end_date,
          'is_current', period.is_current, 'status', period.status
        ) order by period.is_current desc, period.start_date desc, period.id)
        from public.organization_training_periods period
        where period.organization_id = organization.id
      ), '[]'::jsonb)
    )
    from public.organizations organization
    where organization.id = target_organization_id
  );
end;
$$;

revoke all on function public.get_academic_structure_management_overview(uuid) from public, anon, authenticated;
revoke all on function public.get_organization_structure_management_overview(uuid) from public, anon, authenticated;
grant execute on function public.get_academic_structure_management_overview(uuid) to authenticated;
grant execute on function public.get_organization_structure_management_overview(uuid) to authenticated;

comment on function public.get_academic_structure_management_overview(uuid) is
  'Returns read-only academic structure scoped to an authenticated user-owned eligible active profile.';
comment on function public.get_organization_structure_management_overview(uuid) is
  'Returns read-only organization training structure scoped to an authenticated user-owned eligible active profile.';
