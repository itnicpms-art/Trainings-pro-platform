-- TASK 003.1: scoped, read-only Home context access.
-- These RPCs do not grant direct SELECT access to TASK 003 tables.

create or replace function public.get_home_academic_context(requested_profile_id uuid)
returns table (
  profile_id uuid,
  university_id uuid,
  university_name text,
  faculty_id uuid,
  faculty_name text,
  academic_program_id uuid,
  academic_program_name text,
  program_level text,
  academic_year_id uuid,
  academic_year_name text,
  academic_year_code text,
  academic_term_id uuid,
  academic_term_name text,
  academic_term_number smallint,
  academic_group_id uuid,
  academic_group_name text,
  academic_group_code text,
  context_status text,
  is_primary boolean
)
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

  return query
  with requested_profile as (
    select profile.id, profile.organization_id, profile.university_id
    from public.profiles profile
    where profile.id = requested_profile_id
      and profile.user_id = auth.uid()
      and profile.status = 'active'
  ),
  selected_context as (
    select academic_context.*
    from public.academic_profile_contexts academic_context
    where academic_context.profile_id = requested_profile_id
      and academic_context.status = 'active'
    order by
      academic_context.is_primary desc,
      academic_context.started_at desc nulls last,
      academic_context.created_at desc
    limit 1
  )
  select
    requested.id,
    university.id,
    university.name,
    faculty.id,
    faculty.name,
    program.id,
    program.name,
    program.program_level,
    academic_year.id,
    academic_year.name,
    academic_year.code,
    academic_term.id,
    academic_term.name,
    academic_term.term_number,
    academic_group.id,
    academic_group.name,
    academic_group.code,
    academic_context.status,
    academic_context.is_primary
  from requested_profile requested
  left join selected_context academic_context on true
  left join public.organizations profile_organization
    on profile_organization.id = requested.organization_id
  left join public.organizations university
    on university.id = coalesce(
      academic_context.organization_id,
      requested.university_id,
      case
        when profile_organization.type = 'university' then requested.organization_id
        else null
      end
    )
   and university.type = 'university'
  left join public.organization_units faculty
    on faculty.id = academic_context.organization_unit_id
   and faculty.organization_id = academic_context.organization_id
  left join public.academic_programs program
    on program.id = academic_context.academic_program_id
   and program.organization_id = academic_context.organization_id
  left join public.academic_years academic_year
    on academic_year.id = academic_context.academic_year_id
   and academic_year.organization_id = academic_context.organization_id
  left join public.academic_terms academic_term
    on academic_term.id = academic_context.academic_term_id
   and academic_term.organization_id = academic_context.organization_id
  left join public.academic_groups academic_group
    on academic_group.id = academic_context.academic_group_id
   and academic_group.organization_id = academic_context.organization_id;
end;
$$;

revoke all on function public.get_home_academic_context(uuid) from public, anon, authenticated;
grant execute on function public.get_home_academic_context(uuid) to authenticated;

create or replace function public.get_home_training_context(requested_profile_id uuid)
returns table (
  profile_id uuid,
  organization_id uuid,
  organization_name text,
  organization_type text,
  training_period_id uuid,
  training_period_name text,
  training_period_code text,
  training_period_start_date date,
  training_period_end_date date,
  is_current boolean
)
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

  return query
  with requested_profile as (
    select profile.id, profile.organization_id
    from public.profiles profile
    where profile.id = requested_profile_id
      and profile.user_id = auth.uid()
      and profile.status = 'active'
  )
  select
    requested.id,
    organization.id,
    organization.name,
    organization.type,
    training_period.id,
    training_period.name,
    training_period.code,
    training_period.start_date,
    training_period.end_date,
    training_period.is_current
  from requested_profile requested
  left join public.organizations organization
    on organization.id = requested.organization_id
   and organization.type in ('company', 'training_provider', 'partner')
  left join lateral (
    select period.*
    from public.organization_training_periods period
    where period.organization_id = organization.id
      and period.status = 'active'
      and period.is_current = true
    order by period.start_date desc, period.created_at desc
    limit 1
  ) training_period on true;
end;
$$;

revoke all on function public.get_home_training_context(uuid) from public, anon, authenticated;
grant execute on function public.get_home_training_context(uuid) to authenticated;

comment on function public.get_home_academic_context(uuid) is
  'Returns one authenticated user-owned active profile academic readout without granting direct table access.';

comment on function public.get_home_training_context(uuid) is
  'Returns one authenticated user-owned active profile organization/training readout without granting direct table access.';
