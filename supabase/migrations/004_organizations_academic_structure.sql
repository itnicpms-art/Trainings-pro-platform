-- Trainings PRO / NICPMS Academy
-- TASK 003 — Organizations, universities, and academic structure foundation

-- Academic records are valid only for organizations explicitly classified as
-- universities. The trigger is an integrity boundary, not an authorization API.
create or replace function public.require_university_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.organizations organization
    where organization.id = new.organization_id
      and organization.type = 'university'
  ) then
    raise exception 'Academic structure requires a university organization'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.require_university_organization() from public, anon, authenticated;

-- Non-university organizations use simple training periods instead of the
-- university academic hierarchy.
create or replace function public.require_training_organization()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.organizations organization
    where organization.id = new.organization_id
      and organization.type in ('company', 'training_provider', 'partner')
  ) then
    raise exception 'Training periods require a non-university organization'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.require_training_organization() from public, anon, authenticated;

create table if not exists public.organization_units (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  parent_unit_id uuid,
  unit_type text not null check (unit_type in (
    'faculty', 'department', 'school', 'center', 'campus',
    'administrative_unit', 'other'
  )),
  code text not null check (btrim(code) <> ''),
  name text not null check (btrim(name) <> ''),
  description text,
  status text not null default 'active' check (status in (
    'active', 'inactive', 'suspended', 'archived'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  constraint organization_units_parent_not_self
    check (parent_unit_id is null or parent_unit_id <> id),
  constraint organization_units_parent_same_organization_fk
    foreign key (parent_unit_id, organization_id)
    references public.organization_units(id, organization_id)
    on delete restrict
);

create table if not exists public.academic_programs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_unit_id uuid,
  code text not null check (btrim(code) <> ''),
  name text not null check (btrim(name) <> ''),
  description text,
  program_level text not null check (program_level in (
    'bachelor', 'master', 'phd', 'postgraduate', 'other'
  )),
  standard_duration_years numeric(4,1) check (
    standard_duration_years is null
    or (standard_duration_years > 0 and standard_duration_years <= 20)
  ),
  status text not null default 'active' check (status in (
    'active', 'inactive', 'suspended', 'archived'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  constraint academic_programs_unit_same_organization_fk
    foreign key (organization_unit_id, organization_id)
    references public.organization_units(id, organization_id)
    on delete restrict
);

create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null check (btrim(code) <> ''),
  name text not null check (btrim(name) <> ''),
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  status text not null default 'active' check (status in (
    'active', 'inactive', 'suspended', 'archived'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  constraint academic_years_date_order_check check (end_date >= start_date)
);

create unique index if not exists academic_years_one_current_per_organization_idx
on public.academic_years(organization_id)
where is_current and status = 'active';

create table if not exists public.academic_terms (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  academic_year_id uuid not null,
  code text not null check (btrim(code) <> ''),
  name text not null check (btrim(name) <> ''),
  term_type text not null check (term_type in (
    'semester', 'trimester', 'module', 'term', 'other'
  )),
  term_number smallint check (term_number is null or term_number > 0),
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in (
    'active', 'inactive', 'suspended', 'archived'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year_id, code),
  unique (id, organization_id),
  unique (id, organization_id, academic_year_id),
  constraint academic_terms_year_same_organization_fk
    foreign key (academic_year_id, organization_id)
    references public.academic_years(id, organization_id)
    on delete restrict,
  constraint academic_terms_date_order_check check (end_date >= start_date)
);

create table if not exists public.academic_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  academic_program_id uuid not null,
  academic_year_id uuid,
  academic_term_id uuid,
  code text not null check (btrim(code) <> ''),
  name text not null check (btrim(name) <> ''),
  description text,
  status text not null default 'active' check (status in (
    'active', 'inactive', 'suspended', 'archived'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  unique (id, organization_id),
  unique (id, organization_id, academic_program_id),
  constraint academic_groups_program_same_organization_fk
    foreign key (academic_program_id, organization_id)
    references public.academic_programs(id, organization_id)
    on delete restrict,
  constraint academic_groups_year_same_organization_fk
    foreign key (academic_year_id, organization_id)
    references public.academic_years(id, organization_id)
    on delete restrict,
  constraint academic_groups_term_same_year_fk
    foreign key (academic_term_id, organization_id, academic_year_id)
    references public.academic_terms(id, organization_id, academic_year_id)
    on delete restrict,
  constraint academic_groups_term_requires_year_check
    check (academic_term_id is null or academic_year_id is not null)
);

create table if not exists public.academic_profile_contexts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  organization_unit_id uuid,
  academic_program_id uuid,
  academic_year_id uuid,
  academic_term_id uuid,
  academic_group_id uuid,
  status text not null default 'active' check (status in (
    'active', 'inactive', 'suspended', 'archived'
  )),
  is_primary boolean not null default false,
  started_at date,
  ended_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_profile_contexts_unit_same_organization_fk
    foreign key (organization_unit_id, organization_id)
    references public.organization_units(id, organization_id)
    on delete restrict,
  constraint academic_profile_contexts_program_same_organization_fk
    foreign key (academic_program_id, organization_id)
    references public.academic_programs(id, organization_id)
    on delete restrict,
  constraint academic_profile_contexts_year_same_organization_fk
    foreign key (academic_year_id, organization_id)
    references public.academic_years(id, organization_id)
    on delete restrict,
  constraint academic_profile_contexts_term_same_year_fk
    foreign key (academic_term_id, organization_id, academic_year_id)
    references public.academic_terms(id, organization_id, academic_year_id)
    on delete restrict,
  constraint academic_profile_contexts_group_same_program_fk
    foreign key (academic_group_id, organization_id, academic_program_id)
    references public.academic_groups(id, organization_id, academic_program_id)
    on delete restrict,
  constraint academic_profile_contexts_term_requires_year_check
    check (academic_term_id is null or academic_year_id is not null),
  constraint academic_profile_contexts_group_requires_program_check
    check (academic_group_id is null or academic_program_id is not null),
  constraint academic_profile_contexts_date_order_check
    check (ended_at is null or started_at is null or ended_at >= started_at)
);

create unique index if not exists academic_profile_contexts_one_primary_per_profile_idx
on public.academic_profile_contexts(profile_id)
where is_primary and status = 'active';

create table if not exists public.organization_training_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null check (btrim(code) <> ''),
  name text not null check (btrim(name) <> ''),
  start_date date not null,
  end_date date not null,
  is_current boolean not null default false,
  status text not null default 'active' check (status in (
    'active', 'inactive', 'suspended', 'archived'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code),
  constraint organization_training_periods_date_order_check
    check (end_date >= start_date)
);

create unique index if not exists organization_training_periods_one_current_idx
on public.organization_training_periods(organization_id)
where is_current and status = 'active';

-- Keep the organization classification consistent when its type changes after
-- TASK 003 records already exist.
create or replace function public.prevent_incompatible_organization_type_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type = old.type then
    return new;
  end if;

  if new.type = 'university' and exists (
    select 1
    from public.organization_training_periods training_period
    where training_period.organization_id = new.id
  ) then
    raise exception 'A training organization with training periods cannot become a university'
      using errcode = '23514';
  end if;

  if new.type <> 'university' and (
    exists (select 1 from public.organization_units item where item.organization_id = new.id)
    or exists (select 1 from public.academic_programs item where item.organization_id = new.id)
    or exists (select 1 from public.academic_years item where item.organization_id = new.id)
    or exists (select 1 from public.academic_terms item where item.organization_id = new.id)
    or exists (select 1 from public.academic_groups item where item.organization_id = new.id)
    or exists (select 1 from public.academic_profile_contexts item where item.organization_id = new.id)
  ) then
    raise exception 'A university with academic records cannot become a training organization'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_incompatible_organization_type_change() from public, anon, authenticated;

-- Prevent cycles in the organization-unit hierarchy.
create or replace function public.prevent_organization_unit_cycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.parent_unit_id is null then
    return new;
  end if;

  if new.parent_unit_id = new.id then
    raise exception 'An organization unit cannot be its own parent'
      using errcode = '23514';
  end if;

  if exists (
    with recursive ancestors as (
      select unit.id, unit.parent_unit_id
      from public.organization_units unit
      where unit.id = new.parent_unit_id

      union all

      select unit.id, unit.parent_unit_id
      from public.organization_units unit
      join ancestors ancestor on unit.id = ancestor.parent_unit_id
    )
    select 1 from ancestors where id = new.id
  ) then
    raise exception 'Organization unit hierarchy cannot contain cycles'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_organization_unit_cycle() from public, anon, authenticated;

-- If a context supplies a faculty/unit together with a program, or a group
-- together with year/term details, those values must describe the same path.
create or replace function public.validate_academic_profile_context_alignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  program_unit_id uuid;
  group_year_id uuid;
  group_term_id uuid;
begin
  if new.academic_program_id is not null and new.organization_unit_id is not null then
    select program.organization_unit_id
    into program_unit_id
    from public.academic_programs program
    where program.id = new.academic_program_id;

    if program_unit_id is not null and program_unit_id <> new.organization_unit_id then
      raise exception 'Academic program and organization unit do not align'
        using errcode = '23514';
    end if;
  end if;

  if new.academic_group_id is not null then
    select academic_group.academic_year_id, academic_group.academic_term_id
    into group_year_id, group_term_id
    from public.academic_groups academic_group
    where academic_group.id = new.academic_group_id;

    if group_year_id is not null and new.academic_year_id is distinct from group_year_id then
      raise exception 'Academic group and academic year do not align'
        using errcode = '23514';
    end if;

    if group_term_id is not null and new.academic_term_id is distinct from group_term_id then
      raise exception 'Academic group and academic term do not align'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.validate_academic_profile_context_alignment() from public, anon, authenticated;

-- Reuse the foundation updated_at helper for every mutable TASK 003 record.
drop trigger if exists organization_units_set_updated_at on public.organization_units;
create trigger organization_units_set_updated_at
before update on public.organization_units
for each row execute function public.set_updated_at();

drop trigger if exists academic_programs_set_updated_at on public.academic_programs;
create trigger academic_programs_set_updated_at
before update on public.academic_programs
for each row execute function public.set_updated_at();

drop trigger if exists academic_years_set_updated_at on public.academic_years;
create trigger academic_years_set_updated_at
before update on public.academic_years
for each row execute function public.set_updated_at();

drop trigger if exists academic_terms_set_updated_at on public.academic_terms;
create trigger academic_terms_set_updated_at
before update on public.academic_terms
for each row execute function public.set_updated_at();

drop trigger if exists academic_groups_set_updated_at on public.academic_groups;
create trigger academic_groups_set_updated_at
before update on public.academic_groups
for each row execute function public.set_updated_at();

drop trigger if exists academic_profile_contexts_set_updated_at on public.academic_profile_contexts;
create trigger academic_profile_contexts_set_updated_at
before update on public.academic_profile_contexts
for each row execute function public.set_updated_at();

drop trigger if exists organization_training_periods_set_updated_at on public.organization_training_periods;
create trigger organization_training_periods_set_updated_at
before update on public.organization_training_periods
for each row execute function public.set_updated_at();

-- University-only integrity triggers.
drop trigger if exists organization_units_require_university on public.organization_units;
create trigger organization_units_require_university
before insert or update of organization_id on public.organization_units
for each row execute function public.require_university_organization();

drop trigger if exists academic_programs_require_university on public.academic_programs;
create trigger academic_programs_require_university
before insert or update of organization_id on public.academic_programs
for each row execute function public.require_university_organization();

drop trigger if exists academic_years_require_university on public.academic_years;
create trigger academic_years_require_university
before insert or update of organization_id on public.academic_years
for each row execute function public.require_university_organization();

drop trigger if exists academic_terms_require_university on public.academic_terms;
create trigger academic_terms_require_university
before insert or update of organization_id on public.academic_terms
for each row execute function public.require_university_organization();

drop trigger if exists academic_groups_require_university on public.academic_groups;
create trigger academic_groups_require_university
before insert or update of organization_id on public.academic_groups
for each row execute function public.require_university_organization();

drop trigger if exists academic_profile_contexts_require_university on public.academic_profile_contexts;
create trigger academic_profile_contexts_require_university
before insert or update of organization_id on public.academic_profile_contexts
for each row execute function public.require_university_organization();

drop trigger if exists organization_training_periods_require_training_organization on public.organization_training_periods;
create trigger organization_training_periods_require_training_organization
before insert or update of organization_id on public.organization_training_periods
for each row execute function public.require_training_organization();

drop trigger if exists organization_units_prevent_cycle on public.organization_units;
create trigger organization_units_prevent_cycle
before insert or update of parent_unit_id on public.organization_units
for each row execute function public.prevent_organization_unit_cycle();

drop trigger if exists academic_profile_contexts_validate_alignment on public.academic_profile_contexts;
create trigger academic_profile_contexts_validate_alignment
before insert or update of organization_unit_id, academic_program_id, academic_year_id, academic_term_id, academic_group_id
on public.academic_profile_contexts
for each row execute function public.validate_academic_profile_context_alignment();

drop trigger if exists organizations_prevent_incompatible_type_change on public.organizations;
create trigger organizations_prevent_incompatible_type_change
before update of type on public.organizations
for each row execute function public.prevent_incompatible_organization_type_change();

-- Foreign-key lookup indexes not already covered by a unique constraint.
create index if not exists organization_units_parent_unit_id_idx
on public.organization_units(parent_unit_id);

create index if not exists academic_programs_organization_unit_id_idx
on public.academic_programs(organization_unit_id);

create index if not exists academic_terms_academic_year_id_idx
on public.academic_terms(academic_year_id);

create index if not exists academic_groups_program_id_idx
on public.academic_groups(academic_program_id);

create index if not exists academic_groups_year_id_idx
on public.academic_groups(academic_year_id);

create index if not exists academic_groups_term_id_idx
on public.academic_groups(academic_term_id);

create index if not exists academic_profile_contexts_profile_id_idx
on public.academic_profile_contexts(profile_id);

create index if not exists academic_profile_contexts_organization_id_idx
on public.academic_profile_contexts(organization_id);

create index if not exists academic_profile_contexts_program_id_idx
on public.academic_profile_contexts(academic_program_id);

create index if not exists academic_profile_contexts_group_id_idx
on public.academic_profile_contexts(academic_group_id);

-- Secure by default: no policy means RLS denies direct access. Privileges are
-- also revoked so future exposure requires both an explicit grant and policy.
alter table public.organization_units enable row level security;
alter table public.academic_programs enable row level security;
alter table public.academic_years enable row level security;
alter table public.academic_terms enable row level security;
alter table public.academic_groups enable row level security;
alter table public.academic_profile_contexts enable row level security;
alter table public.organization_training_periods enable row level security;

revoke all privileges on table
  public.organization_units,
  public.academic_programs,
  public.academic_years,
  public.academic_terms,
  public.academic_groups,
  public.academic_profile_contexts,
  public.organization_training_periods
from anon, authenticated;

comment on table public.organization_units is 'University units such as faculties, departments, schools, centers, and campuses.';
comment on table public.academic_programs is 'University academic programs; faculty is represented by organization_units, not program_level.';
comment on table public.academic_groups is 'University academic groups. TASK 003 deliberately uses groups, not cohorts.';
comment on table public.academic_profile_contexts is 'Explicit profile-to-academic-context links; academic context must never be inferred from profile type alone.';
comment on table public.organization_training_periods is 'Simple non-university training periods without academic hierarchy.';
