# TASK 003 — Organizations, Universities and Academic Structure Foundation

## Purpose

TASK 003 adds the database and TypeScript foundation for university academic structure and non-university training periods. It follows the manager-validated baseline in `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md` and does not add management UI or runtime write operations.

## Business model

Universities use the following hierarchy:

`University → Faculty/unit → Program → Level → Academic year → Term/semester → Group`

- A faculty is an `organization_units` record with `unit_type = 'faculty'`. It is not a program level.
- Program levels are `bachelor`, `master`, `phd`, `postgraduate`, or `other`.
- The schema uses academic **groups**, never cohorts.
- Companies, training providers, and partner organizations do not receive the academic hierarchy. They use only `organization_training_periods`.
- Individual learners do not receive organization or academic context automatically. Future academic UI must require a real `academic_profile_contexts` record and must not infer context from `profile_type`.

## Migration

`supabase/migrations/004_organizations_academic_structure.sql` adds:

| Table | Responsibility |
|---|---|
| `organization_units` | Hierarchical university faculties, departments, schools, centers, campuses, and administrative units |
| `academic_programs` | University programs, optionally attached to an organization unit, with a distinct academic level |
| `academic_years` | Date-bounded academic years per university |
| `academic_terms` | Semesters, trimesters, modules, or other terms within an academic year |
| `academic_groups` | Groups attached to a university program and optionally to an academic year and term |
| `academic_profile_contexts` | Explicit profile links to real academic structure |
| `organization_training_periods` | Simple date-bounded periods for non-university training organizations |

The migration does not rename or replace `organizations`, `organization_members`, or `profiles`.

## Integrity rules

- All new records use UUID primary keys and timestamps.
- Organization-scoped codes are unique where appropriate.
- Composite foreign keys prevent relationships across different organizations.
- Parent organization units must belong to the same university, and hierarchy cycles are rejected.
- Terms require an academic year; a group term must belong to the selected group year.
- Academic profile context links are checked for program/unit and group/year/term alignment.
- Date ranges reject an end date before the start date.
- Only one active current academic year or training period can exist per organization.
- Only one active primary academic context can exist per profile.
- Academic records require an organization of type `university`.
- Training periods require `company`, `training_provider`, or `partner` organizations.
- Organization type changes are rejected when existing records would become incompatible.

## Security boundary

RLS is enabled on every new table. TASK 003 intentionally defines no public or broad authenticated policies and revokes direct table privileges from `anon` and `authenticated`. Consequently, the new records are not exposed through the application until a future task introduces narrowly scoped, reviewed policies and application workflows.

The migration exposes neither `auth.users` nor a service-role credential and creates no role-assignment or escalation path. No administrative write operation is added.

## TypeScript contract

`src/types/database.ts` contains row, insert, and update types for all seven new tables, together with unions for organization unit type, academic program level, and academic term type.

## Explicitly out of scope

TASK 003 adds no UI and no fake data. The following work is deferred:

- organization creation UI;
- university admin write workflows;
- faculty, program, year, semester, and group management UI;
- approval workflows;
- member invitations;
- course allocation;
- enrollments;
- bookings;
- grades;
- ECTS/credits automation;
- certificates;
- reporting;
- audited admin mutations.
