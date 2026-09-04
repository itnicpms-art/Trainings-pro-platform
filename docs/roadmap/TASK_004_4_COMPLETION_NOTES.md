# TASK 004.4 Completion Notes

## Completed scope

- Added migration `010_academic_years_semesters_write_access.sql` without modifying migrations 001–009.
- Added a scoped academic calendar editor overview RPC and audited create/update RPCs for both academic years and academic terms, all `SECURITY DEFINER` with `SET search_path = public`, reusing `resolve_academic_units_editor_mode(...)` from migration 007 for actor/scope resolution.
- Added `academic_calendar_audit_events` with mandatory before/after snapshots for every academic year and academic term mutation.
- Enhanced `/{locale}/app/manage/academic` (University Admin) and `/{locale}/admin/academic-structure` (Platform Admin) with Academic Years and Semesters editors, alongside the existing Faculties/Departments and Academic Programs editors.
- Kept Academic Groups strictly read-only; no group create/edit/status control was added anywhere.
- Left `/admin/organizations` untouched.

## Real database tables used

- `public.academic_years` — the real, unmodified table from migration 004.
- `public.academic_terms` — the real, unmodified table from migration 004. There is **no separate "semesters" table**; `academic_terms` is the shared table for semesters, trimesters, modules, and other period kinds via its `term_type` column.

## Exact relationship between university, academic year, and semester/term

`academic_years.organization_id` references `organizations.id` directly (the university is the year's direct parent). `academic_terms.academic_year_id` references `academic_years.id`, and the compound foreign key `academic_terms_year_same_organization_fk` — `foreign key (academic_year_id, organization_id) references academic_years(id, organization_id)` — guarantees a term's `organization_id` always matches its parent year's `organization_id`. Neither table references `organization_units` (faculty/department) or `academic_programs`.

## Exact status values used

Both tables' real check constraint allows `active`, `inactive`, `suspended`, `archived`. This task's RPCs restrict writes to `active`, `inactive`, `archived` — the same three-state restriction TASK 004.1 (faculty/department) and TASK 004.3 (academic program) already apply — so all four editable-hierarchy editors stay consistent with each other. `suspended` remains a valid database value but is not exposed by any of these editors, matching precedent rather than inventing new UI scope.

## Exact date columns used

`academic_years.start_date` / `academic_years.end_date` and `academic_terms.start_date` / `academic_terms.end_date` — both `date` columns, both already governed by the unmodified DB check `end_date >= start_date`. The RPCs additionally enforce a stricter `start_date < end_date` (see below) and term-within-year containment before ever reaching the database.

## Overlap rule implemented, and why none was added for sibling terms

No overlap-rejection rule was added between sibling `academic_terms` rows in the same academic year. The schema has no exclusion constraint or unique index preventing overlapping date ranges, and `term_type` already models heterogeneous period kinds (`semester`, `trimester`, `module`, `term`, `other`) that can legitimately coexist in real academic calendars (e.g. an intensive `module` running inside a `semester`). No product document states an overlap restriction. Adding one would have invented a business rule the real schema and documentation do not express. Full reasoning is in `docs/tasks/TASK-004-4-academic-years-semesters-editable-management.md`.

What **is** enforced: a term's own `start_date < end_date` (strict), and containment within its parent year's `[start_date, end_date]` — both real hierarchy/data-integrity rules, not invented restrictions.

## Hierarchy/status behavior implemented

- A term cannot be created under an archived academic year.
- An existing term may keep an archived parent year only if it is not moved to a different year and its own status is also set to `archived`; it can never be freshly created or moved into an archived year.
- An active term always requires an active parent year.
- Changing a year's status never touches its existing child terms directly — there is no cascade in either direction. Existing term data is preserved exactly as-is when its parent year becomes inactive/archived; only *future* writes to that term (or the year, via the child-containment date check) are constrained.
- Updating an academic year's dates is rejected if any existing child term would fall outside the new interval — data is never silently orphaned.
- `update_academic_year` and `update_academic_term` have no university parameter at all; the university is always derived from the existing row, so cross-university moves are structurally impossible, not just validated.
- No parent is ever silently reactivated, and no child is ever automatically reactivated, by any of these RPCs.

## Audit implementation

`academic_calendar_audit_events` (RLS enabled, all direct privileges revoked from `public`/`anon`/`authenticated`) records every create and update for both academic years and academic terms, with `resource_type` set to `academic_year` or `academic_term`. An update that changes `status` is recorded as a distinct `status_change` action (matching the TASK 004.3 precedent); any other successful update is recorded as `update`. Every audit row carries `before_snapshot`/`after_snapshot` (create rows carry `after_snapshot` only). Writes happen only inside the same RPC transaction as the mutation itself — there is no separate, bypassable audit path.

## Security confirmation

- The active profile is derived server-side; the browser does not choose an arbitrary actor profile.
- Every RPC independently validates authentication, active profile ownership, role, scope, target university, and hierarchy — the same defense-in-depth pattern as TASK 004.1/004.3.
- University Admin is limited to its scoped university; Platform Admin requires the existing platform role plus `admin.access` permission.
- No direct table write is performed by runtime application code.
- No broad RLS policy or table grant was added, and RLS was not weakened.
- `auth.users` is never queried or returned by any of these RPCs.
- No service-role key, secret, environment file, fake year/term, or fake metric was added.
- No DELETE RPC or hard-delete UI exists.
- An empty code is generated server-side from the name; manually provided duplicate codes still fail explicitly (organization-scoped for years, year-scoped for terms — matching each table's real unique constraint).

## Validation

- `npx pnpm@11.19.0 lint`: passed, no warnings or errors.
- `npx pnpm@11.19.0 build`: passed; Next.js compiled, type-checked, and generated both localized `/app/manage/academic` and `/admin/academic-structure` routes.
- `git diff --check`: passed, no whitespace errors.
- Static security review: RPC-only runtime access, scoped authorization, hierarchy/date validation, no broad grants, and mandatory audit inserts confirmed.

## Manual QA status

Authenticated browser QA was not executed in this implementation environment because a privileged University Admin / Platform Admin QA session with migration 010 already applied was not part of the local validation run. **Migration 010 must be applied manually in Supabase before any authenticated runtime QA** — the same manual-apply flow already used for migrations 007–009 per the task context. No password or secret was entered or exposed.

After migration 010 is applied, verify:

- University Admin can create and edit an academic year and a semester in its own university;
- University Admin cannot target another university (no university selector exists on `/app/manage/academic`; the RPC independently rejects any mismatched university even if attempted directly);
- an equal start/end date is rejected on both years and terms with a safe error, even though the DB constraint alone would allow it;
- a semester's dates outside its academic year's interval are rejected;
- generated codes are uppercase, diacritic-free, and receive `-2`, `-3`, … on collisions (organization-scoped for years, year-scoped for terms);
- manually edited codes remain unchanged by later name edits, and duplicate manual codes are rejected;
- a semester cannot be created under an archived academic year, and an existing semester under a year that becomes archived can only be saved by also setting the semester itself to `archived`;
- an active semester cannot be created or kept under a non-active academic year;
- editing an academic year's dates to exclude an existing semester is rejected;
- overlapping semester periods within the same year are **accepted** (by design — see the overlap decision above);
- Platform Admin can select any real university and create/edit its academic years and semesters, with the same cross-university and hierarchy restrictions;
- each successful create/update/status change produces an audit row in `academic_calendar_audit_events` with the correct `resource_type`;
- Academic Student has no write controls and no successful write access to these RPCs;
- Professor and Coordinator have no new write controls (unchanged from before this task);
- organization roles and Individual Learner have no access to this editor;
- Academic Groups remain fully read-only in both `/app/manage/academic` and `/admin/academic-structure` — no add/edit/status control appears anywhere for groups;
- `/ro/app/manage/academic`, `/en/app/manage/academic`, `/ro/admin/academic-structure`, and `/en/admin/academic-structure` are localized, including the new Academic Years and Semesters sections;
- `/admin/organizations` behavior is unchanged;
- homepage, auth/login/register/logout, onboarding, active-profile switching, Home/Acasă behavior, and the QA seed are all unaffected.

## Deferred work

Academic Groups (TASK 004.5), hard delete, current-year management, an explicit semester overlap rule (if ever required by product), people/membership management, course allocation, educational records, reporting, and a general-purpose audit viewer remain deferred to dedicated tasks.
