-- Trainings PRO / NICPMS Academy
-- TASK 004.8 — Course and course offering schema foundation
--
-- This migration defines storage and write-time integrity boundaries only.
-- It intentionally exposes no read or mutation RPCs and grants no direct
-- table access to application roles.

-- Required by the same-organization compound foreign key from course
-- offerings. The primary key on id alone does not provide the compound
-- candidate key used by that relationship.
alter table public.organization_training_periods
  add constraint organization_training_periods_id_organization_id_key
  unique (id, organization_id);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  code text not null,
  name text not null,
  description text,
  status text not null default 'active',
  publication_status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_organization_fk
    foreign key (organization_id)
    references public.organizations(id)
    on delete restrict,
  constraint courses_id_organization_id_key
    unique (id, organization_id),
  constraint courses_code_trimmed_check
    check (code = btrim(code)),
  constraint courses_code_not_empty_check
    check (code <> ''),
  constraint courses_name_trimmed_check
    check (name = btrim(name)),
  constraint courses_name_not_empty_check
    check (name <> ''),
  constraint courses_status_check
    check (status in ('active', 'inactive', 'archived')),
  constraint courses_publication_status_check
    check (publication_status in ('draft', 'published')),
  constraint courses_published_requires_active_check
    check (publication_status <> 'published' or status = 'active')
);

create unique index courses_organization_code_ci_key
on public.courses(organization_id, lower(code));

create index courses_organization_status_idx
on public.courses(organization_id, status);

create index courses_organization_publication_status_status_idx
on public.courses(organization_id, publication_status, status);

create table public.course_offerings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  course_id uuid not null,
  code text not null,
  academic_program_id uuid,
  academic_year_id uuid,
  academic_term_id uuid,
  training_period_id uuid,
  start_date date,
  end_date date,
  status text not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_offerings_organization_fk
    foreign key (organization_id)
    references public.organizations(id)
    on delete restrict,
  constraint course_offerings_course_same_organization_fk
    foreign key (course_id, organization_id)
    references public.courses(id, organization_id)
    on delete restrict,
  constraint course_offerings_program_same_organization_fk
    foreign key (academic_program_id, organization_id)
    references public.academic_programs(id, organization_id)
    on delete restrict,
  constraint course_offerings_year_same_organization_fk
    foreign key (academic_year_id, organization_id)
    references public.academic_years(id, organization_id)
    on delete restrict,
  constraint course_offerings_term_same_year_fk
    foreign key (academic_term_id, organization_id, academic_year_id)
    references public.academic_terms(id, organization_id, academic_year_id)
    on delete restrict,
  constraint course_offerings_training_period_same_organization_fk
    foreign key (training_period_id, organization_id)
    references public.organization_training_periods(id, organization_id)
    on delete restrict,
  constraint course_offerings_id_organization_id_key
    unique (id, organization_id),
  constraint course_offerings_code_trimmed_check
    check (code = btrim(code)),
  constraint course_offerings_code_not_empty_check
    check (code <> ''),
  constraint course_offerings_status_check
    check (status in ('planned', 'active', 'completed', 'cancelled', 'archived')),
  constraint course_offerings_term_requires_year_check
    check (academic_term_id is null or academic_year_id is not null),
  constraint course_offerings_date_order_check
    check (
      end_date is null
      or (start_date is not null and end_date >= start_date)
    )
);

create unique index course_offerings_organization_code_ci_key
on public.course_offerings(organization_id, lower(code));

create index course_offerings_course_status_idx
on public.course_offerings(course_id, status);

create index course_offerings_organization_academic_year_idx
on public.course_offerings(organization_id, academic_year_id);

create index course_offerings_academic_program_idx
on public.course_offerings(academic_program_id);

create index course_offerings_academic_term_idx
on public.course_offerings(academic_term_id);

create index course_offerings_training_period_idx
on public.course_offerings(training_period_id);

create table public.course_offering_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  course_offering_id uuid not null,
  academic_group_id uuid not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_offering_groups_offering_same_organization_fk
    foreign key (course_offering_id, organization_id)
    references public.course_offerings(id, organization_id)
    on delete restrict,
  constraint course_offering_groups_group_same_organization_fk
    foreign key (academic_group_id, organization_id)
    references public.academic_groups(id, organization_id)
    on delete restrict,
  constraint course_offering_groups_id_organization_id_key
    unique (id, organization_id),
  constraint course_offering_groups_offering_group_key
    unique (course_offering_id, academic_group_id),
  constraint course_offering_groups_status_check
    check (status in ('active', 'inactive', 'archived'))
);

create index course_offering_groups_academic_group_status_idx
on public.course_offering_groups(academic_group_id, status);

create index course_offering_groups_course_offering_status_idx
on public.course_offering_groups(course_offering_id, status);

create index course_offering_groups_organization_idx
on public.course_offering_groups(organization_id);

-- Preserve course lifecycle integrity without mutating historical offerings.
create or replace function public.validate_course_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'active'
    and new.status = 'inactive'
    and exists (
      select 1
      from public.course_offerings offering
      where offering.course_id = old.id
        and offering.status = 'active'
    ) then
    raise exception 'A course with active offerings cannot be made inactive'
      using errcode = '23514';
  end if;

  if old.status in ('active', 'inactive')
    and new.status = 'archived'
    and exists (
      select 1
      from public.course_offerings offering
      where offering.course_id = old.id
        and offering.status in ('planned', 'active')
    ) then
    raise exception 'A course with planned or active offerings cannot be archived'
      using errcode = '23514';
  end if;

  if old.publication_status = 'published'
    and new.publication_status = 'draft'
    and exists (
      select 1
      from public.course_offerings offering
      where offering.course_id = old.id
        and offering.status = 'active'
    ) then
    raise exception 'A course with active offerings cannot be unpublished'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function public.validate_course_lifecycle() is
  'Internal trigger function that blocks course lifecycle changes which conflict with planned or active offerings; it never cascades offering status changes.';

revoke all on function public.validate_course_lifecycle() from public, anon, authenticated;

-- Validate offering structure on every write. Planned offerings may be
-- prepared against inactive parents, but cannot reference an archived course.
-- Parent statuses become strict when an offering is created or changed as
-- active. Existing academic management flows may later change parent statuses;
-- effective read/participation logic must therefore continue to evaluate the
-- current parent state.
create or replace function public.validate_course_offering_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_type text;
  course_status text;
  course_publication_status text;
  validate_parent_state boolean;
begin
  select organization.type
  into organization_type
  from public.organizations organization
  where organization.id = new.organization_id;

  if organization_type is null then
    raise exception 'Course offering organization does not exist'
      using errcode = '23503';
  end if;

  if organization_type = 'university' then
    if new.academic_year_id is null or new.training_period_id is not null then
      raise exception 'University offerings require an academic year and cannot use a training period'
        using errcode = '23514';
    end if;
  elsif organization_type in ('company', 'training_provider', 'partner') then
    if new.academic_program_id is not null
      or new.academic_year_id is not null
      or new.academic_term_id is not null then
      raise exception 'Non-university offerings cannot use academic context'
        using errcode = '23514';
    end if;
  else
    raise exception 'Unsupported organization type for course offering'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    validate_parent_state := true;
  else
    validate_parent_state := new.organization_id is distinct from old.organization_id
      or new.course_id is distinct from old.course_id
      or new.academic_program_id is distinct from old.academic_program_id
      or new.academic_year_id is distinct from old.academic_year_id
      or new.academic_term_id is distinct from old.academic_term_id
      or new.training_period_id is distinct from old.training_period_id
      or (new.status = 'planned' and old.status is distinct from 'planned')
      or (new.status = 'active' and old.status is distinct from 'active');
  end if;

  if validate_parent_state then
    select course.status, course.publication_status
    into course_status, course_publication_status
    from public.courses course
    where course.id = new.course_id
      and course.organization_id = new.organization_id;

    if course_status is null then
      raise exception 'Course offering course does not exist in the organization'
        using errcode = '23503';
    end if;

    if new.status = 'planned' and course_status = 'archived' then
      raise exception 'A planned course offering cannot reference an archived course'
        using errcode = '23514';
    end if;

    if new.status = 'active' then
      if course_status <> 'active'
        or course_publication_status <> 'published' then
        raise exception 'An active course offering requires an active, published course'
          using errcode = '23514';
      end if;

      if new.academic_program_id is not null and not exists (
        select 1
        from public.academic_programs program
        where program.id = new.academic_program_id
          and program.organization_id = new.organization_id
          and program.status = 'active'
      ) then
        raise exception 'An active course offering requires an active academic program'
          using errcode = '23514';
      end if;

      if new.academic_year_id is not null and not exists (
        select 1
        from public.academic_years academic_year
        where academic_year.id = new.academic_year_id
          and academic_year.organization_id = new.organization_id
          and academic_year.status = 'active'
      ) then
        raise exception 'An active course offering requires an active academic year'
          using errcode = '23514';
      end if;

      if new.academic_term_id is not null and not exists (
        select 1
        from public.academic_terms academic_term
        where academic_term.id = new.academic_term_id
          and academic_term.organization_id = new.organization_id
          and academic_term.academic_year_id = new.academic_year_id
          and academic_term.status = 'active'
      ) then
        raise exception 'An active course offering requires an active academic term in the selected year'
          using errcode = '23514';
      end if;

      if new.training_period_id is not null and not exists (
        select 1
        from public.organization_training_periods training_period
        where training_period.id = new.training_period_id
          and training_period.organization_id = new.organization_id
          and training_period.status = 'active'
      ) then
        raise exception 'An active course offering requires an active training period'
          using errcode = '23514';
      end if;
    end if;
  end if;

  return new;
end;
$$;

comment on function public.validate_course_offering_write() is
  'Internal write-time validator for offering structure, planned-course archival, and active parent states. It does not create a perpetual invariant when existing academic parents change later.';

revoke all on function public.validate_course_offering_write() from public, anon, authenticated;

-- Validate mappings only on creation, movement, or reactivation. Historical
-- mappings remain attached when an offering or academic parent later changes.
create or replace function public.validate_course_offering_group_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_type text;
  offering_status text;
  offering_program_id uuid;
  offering_year_id uuid;
  offering_term_id uuid;
  group_status text;
  group_program_id uuid;
  group_year_id uuid;
  group_term_id uuid;
  validate_mapping boolean;
begin
  if tg_op = 'INSERT' then
    validate_mapping := true;
  else
    validate_mapping := new.organization_id is distinct from old.organization_id
      or new.course_offering_id is distinct from old.course_offering_id
      or new.academic_group_id is distinct from old.academic_group_id
      or (new.status = 'active' and old.status is distinct from 'active');
  end if;

  if not validate_mapping then
    return new;
  end if;

  select organization.type
  into organization_type
  from public.organizations organization
  where organization.id = new.organization_id;

  if organization_type is distinct from 'university' then
    raise exception 'Course offering groups require a university organization'
      using errcode = '23514';
  end if;

  select
    offering.status,
    offering.academic_program_id,
    offering.academic_year_id,
    offering.academic_term_id
  into
    offering_status,
    offering_program_id,
    offering_year_id,
    offering_term_id
  from public.course_offerings offering
  where offering.id = new.course_offering_id
    and offering.organization_id = new.organization_id;

  if offering_status is null then
    raise exception 'Course offering does not exist in the organization'
      using errcode = '23503';
  end if;

  if offering_status not in ('planned', 'active') then
    raise exception 'Academic groups can only be attached to planned or active offerings'
      using errcode = '23514';
  end if;

  select
    academic_group.status,
    academic_group.academic_program_id,
    academic_group.academic_year_id,
    academic_group.academic_term_id
  into
    group_status,
    group_program_id,
    group_year_id,
    group_term_id
  from public.academic_groups academic_group
  where academic_group.id = new.academic_group_id
    and academic_group.organization_id = new.organization_id;

  if group_status is null then
    raise exception 'Academic group does not exist in the organization'
      using errcode = '23503';
  end if;

  if new.status = 'active' and group_status <> 'active' then
    raise exception 'An active offering-group mapping requires an active academic group'
      using errcode = '23514';
  end if;

  if offering_program_id is not null
    and group_program_id <> offering_program_id then
    raise exception 'Academic group must belong to the offering academic program'
      using errcode = '23514';
  end if;

  if group_year_id is not null and group_year_id <> offering_year_id then
    raise exception 'Academic group year must match the offering academic year'
      using errcode = '23514';
  end if;

  if group_term_id is not null
    and offering_term_id is not null
    and group_term_id <> offering_term_id then
    raise exception 'Academic group term must match the offering academic term when both are set'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function public.validate_course_offering_group_write() is
  'Internal write-time validator for offering-to-group mappings. Parent changes made by other management flows do not cascade or remove historical mappings.';

revoke all on function public.validate_course_offering_group_write() from public, anon, authenticated;

create trigger courses_set_updated_at
before update on public.courses
for each row execute function public.set_updated_at();

create trigger courses_validate_lifecycle
before update of status, publication_status on public.courses
for each row execute function public.validate_course_lifecycle();

create trigger course_offerings_set_updated_at
before update on public.course_offerings
for each row execute function public.set_updated_at();

create trigger course_offerings_validate_write
before insert or update on public.course_offerings
for each row execute function public.validate_course_offering_write();

create trigger course_offering_groups_set_updated_at
before update on public.course_offering_groups
for each row execute function public.set_updated_at();

create trigger course_offering_groups_validate_write
before insert or update on public.course_offering_groups
for each row execute function public.validate_course_offering_group_write();

comment on table public.courses is
  'Organization-owned reusable course definitions. Academic delivery context belongs to course offerings.';

comment on table public.course_offerings is
  'Concrete course runs. University runs use academic context; non-university runs may use an organization training period.';

comment on table public.course_offering_groups is
  'Many-to-many mapping between university course offerings and academic groups, retaining inactive or archived history.';

alter table public.courses enable row level security;
alter table public.course_offerings enable row level security;
alter table public.course_offering_groups enable row level security;

revoke all on table public.courses from public, anon, authenticated;
revoke all on table public.course_offerings from public, anon, authenticated;
revoke all on table public.course_offering_groups from public, anon, authenticated;
