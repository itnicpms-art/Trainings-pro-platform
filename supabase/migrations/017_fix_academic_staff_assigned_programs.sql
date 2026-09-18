-- TASK 004.6.1 forward-only fix.
--
-- Migration 016 has been applied to the production Supabase database and
-- is therefore treated as immutable and is not modified here (see
-- AGENTS.md section 3: "Never modify an existing committed migration.
-- Every schema change must use a new migration file."). This migration
-- replaces only get_assigned_academic_programs in place via `create or
-- replace function`, which preserves its existing owner and grants since
-- its signature (public.get_assigned_academic_programs(uuid)) does not
-- change -- the revoke/grant statements from migration 016 remain in
-- effect and are intentionally not repeated here.
--
-- Confirmed root cause (remote QA against the deployed production
-- database): the migration 016 body called
--   jsonb_agg(jsonb_build_object(..., 'role_codes', jsonb_agg(distinct role.code)))
-- in a single SELECT's target list. PostgreSQL rejects nested aggregate
-- function calls at the same SELECT level unconditionally (SQLSTATE
-- 42803, "aggregate function calls cannot be nested"), regardless of the
-- two aggregates' conceptual grouping granularity. Every call to this
-- RPC therefore failed with a database error. The application wrapper
-- (src/lib/manage/get-assigned-academic-programs.ts) collapsed that
-- error into an empty array, which the page rendered as the legitimate
-- "zero assigned programs" empty state -- masking the real failure and
-- making an academic staff member's genuine program assignments (e.g. a
-- professor assigned to two programs) appear as no assignments at all.
--
-- Fix: split the single illegal-nested-aggregate query into two levels.
-- The inner subquery (assigned) keeps the original join shape and the
-- original `group by program.id, ...`, so role_codes is still computed
-- there as a single, non-nested jsonb_agg(distinct role.code) -- exactly
-- as before, just evaluated one level down. The outer query then calls
-- jsonb_agg(jsonb_build_object(...)) over the already-grouped, flat rows
-- produced by that subquery, where role_codes is a plain column, not an
-- aggregate call -- so no aggregate call is ever nested inside another
-- aggregate call's arguments in the same SELECT. The ordering
-- (assigned.name, assigned.academic_program_id), the join conditions,
-- the professor/program_coordinator role filter, the
-- scope_type = 'program' filter, the active-profile-ownership check, and
-- the returned JSON key set/shape are all unchanged from migration 016,
-- so this remains a pure SQL-correctness fix with no behavioral,
-- authorization, or contract change.
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
        'academic_program_id', assigned.academic_program_id,
        'code', assigned.code,
        'name', assigned.name,
        'status', assigned.status,
        'organization_id', assigned.organization_id,
        'organization_name', assigned.organization_name,
        'organization_unit_id', assigned.organization_unit_id,
        'organization_unit_name', assigned.organization_unit_name,
        'role_codes', assigned.role_codes
      )
      order by assigned.name, assigned.academic_program_id
    )
    from (
      select
        program.id as academic_program_id,
        program.code,
        program.name,
        program.status,
        program.organization_id,
        organization.name as organization_name,
        program.organization_unit_id,
        unit.name as organization_unit_name,
        jsonb_agg(distinct role.code) as role_codes
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
    ) assigned
  ), '[]'::jsonb);
end;
$$;
