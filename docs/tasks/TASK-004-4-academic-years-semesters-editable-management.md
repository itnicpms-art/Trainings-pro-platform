# TASK 004.4 — Academic Years & Semesters Editable Management

## Scope

TASK 004.4 adds controlled editing for academic years and academic terms (semesters/trimesters/modules). The hierarchy remains:

`University → Faculty → Department → Academic Program → Academic Year → Term / Semester → Group`

Academic groups remain read-only in this task and stay deferred to TASK 004.5. No group create, edit, or status control exists anywhere in this change.

## Real schema used

Before writing migration 010, the actual tables from `supabase/migrations/004_organizations_academic_structure.sql` were inspected and used as-is — no column, enum value, or relationship was invented:

- **`public.academic_years`**: `organization_id` (→ `organizations.id`), `code`, `name`, `start_date`, `end_date`, `is_current`, `status` (`active`/`inactive`/`suspended`/`archived`). `unique(organization_id, code)`; `check(end_date >= start_date)`.
- **`public.academic_terms`**: there is no separate "semesters" table. `academic_terms` is the real, shared table for semesters, trimesters, modules, and other period kinds, discriminated by `term_type` (`semester`/`trimester`/`module`/`term`/`other`). Columns: `organization_id`, `academic_year_id`, `code`, `name`, `term_type`, `term_number` (nullable), `start_date`, `end_date`, `status` (same four values as years). `unique(academic_year_id, code)` — **code uniqueness is scoped to the parent academic year, not the university** — and `foreign key (academic_year_id, organization_id) references academic_years(id, organization_id)`, which guarantees a term's year always belongs to the same university as the term itself.

Both relationships attach directly to `organization_id` (the university); neither table references `organization_units` (faculty/department), so a "Faculty/Department" selector does not apply to years or terms.

## Access model

University Admin uses `/{locale}/app/manage/academic`. The active profile must be owned by the authenticated user, active, assigned the `university_admin` role with `scope_type = university`, and scoped to the target university. It can create and update academic years and academic terms only inside that university.

Platform Admin uses `/{locale}/admin/academic-structure`. The existing admin layout still requires both the scoped `platform_admin` role and the `admin.access` permission. Once a university is selected, the Academic Years and Semesters sections sit below the existing Faculties/Departments and Academic Programs editors.

`/admin/organizations` is untouched; organizations and universities are still managed there exclusively (TASK 004.2).

## Editable fields

Years: name, code (auto-generated from the name, editable, uppercase, diacritics removed), start date, end date, status. Terms: academic year, name, code (same generation rules, scoped to the parent year), type, start date, end date, status.

`is_current` is intentionally **not** exposed by this editor. It stays at its column default (`false`) on create and is never included in the `update_academic_year` `SET` list, so any existing value is preserved untouched. Deciding which year is "current" is out of this task's scope; the existing partial unique index (`academic_years_one_current_per_organization_idx`, one current+active year per university) is therefore never at risk from these RPCs. `term_number` is left `NULL` for the same reason — it is optional at the schema level and was not part of the requested field set.

`term_type` was added to the term form even though the task's suggested label list did not name it, because `academic_terms.term_type` is `NOT NULL` with no default — a value is required on every insert. The five real enum values are reused with new bilingual labels (`Semestru/Trimestru/Modul/Perioadă/Alt tip` — `Semester/Trimester/Module/Term/Other`).

## Date validation

`academic_years` and `academic_terms` both keep the existing, unmodified DB check `end_date >= start_date` (equal dates technically pass at the database level). This task's RPCs enforce the stricter rule requested — **`start_date` must be strictly earlier than `end_date`** — before ever reaching the database, so both create and update reject an equal-date period with a clean application error. The DB constraint remains the final backstop; it is not weakened or removed.

A term's dates must also stay within its parent year's own `[start_date, end_date]` interval (`start_date >= year.start_date and end_date <= year.end_date`). This is a real hierarchy relationship (shared `organization_id`, `academic_year_id` FK) enforced at the RPC layer, matching the precedent set by TASK 004.1/004.3 (hierarchy checks live in the RPC, not in a new trigger).

Updating an academic year additionally checks every existing child `academic_terms` row before applying new dates: if any child term would fall outside the proposed `[start_date, end_date]`, the update is rejected with a safe error instead of silently orphaning the term's dates.

## Overlap decision

**No overlap-rejection rule was added for academic terms sharing the same academic year.** This was a deliberate decision, not an omission:

- The schema has no exclusion constraint, unique index, or trigger preventing two `academic_terms` rows in the same `academic_year_id` from having overlapping `[start_date, end_date]` ranges.
- `term_type` already models heterogeneous, potentially co-occurring period kinds in one table — a `module` (e.g. an intensive course) or an exam `term` can legitimately run inside a `semester`'s date range in real academic calendars.
- No product document (`PROJECT_BRIEF.md`, `DATABASE_SCHEMA_V1.md`, the TASK 003 doc) states an overlap restriction.

Inventing an overlap rule here would have added a restriction the schema does not express and the product docs do not require. If a future task establishes an explicit non-overlap rule for a specific `term_type` (e.g. semesters must not overlap each other, while modules may), it should be added as its own scoped task with its own migration.

## Hierarchy and status rules

Rules mirror the precedent set by TASK 004.1 (faculty/department) and TASK 004.3 (academic program) exactly:

- A term cannot be created under an archived academic year.
- An existing term may remain under a year that becomes archived only if the term stays under that same year **and** its own status also becomes/stays `archived`; it cannot be freshly moved into an archived year.
- An active term always requires an active parent year.
- These RPCs never write to `academic_years` from a term mutation, and never write to `organization_units`/`academic_programs` at all — there is no cascade from year status to term status in either direction beyond the create/update-time eligibility checks above. A year changing to `inactive`/`archived` does not touch its existing child terms; their data is preserved exactly as-is, and only *future* writes to those terms (or the year) are constrained by the rules above.
- Status is restricted to `active`/`inactive`/`archived` at the RPC layer for both years and terms, even though the underlying columns also allow `suspended` — the same restriction TASK 004.1 and TASK 004.3 already apply to their respective entities, kept for consistency across the whole editable-hierarchy surface.
- `update_academic_year` and `update_academic_term` never accept a university parameter; the university is always derived from the existing row. Moving either entity to a different university is therefore structurally impossible, not just rejected by validation.

## Database and security boundary

Migration `010_academic_years_semesters_write_access.sql` adds:

- `get_academic_calendar_editor_overview(requested_profile_id, target_university_id)`;
- `create_academic_year(...)` / `update_academic_year(...)`;
- `create_academic_term(...)` / `update_academic_term(...)`;
- `academic_calendar_audit_events` for immutable create, update, and status-change evidence covering both entity types.

No column, constraint, or enum value was added to `academic_years` or `academic_terms`; migration 010 is purely additive (new audit table + new RPCs), exactly like migrations 007 and 009. All five RPCs reuse `public.resolve_academic_units_editor_mode(requested_profile_id, target_university_id)` from migration 007 for actor/scope resolution, so university_admin scope enforcement and platform_admin console access checks are not duplicated.

The RPCs are `SECURITY DEFINER` with `SET search_path = public`. No broad `SELECT`, `INSERT`, `UPDATE`, or `DELETE` policy is added. Direct audit-table privileges are revoked from `public`, `anon`, and `authenticated`; writes occur only inside the scoped RPC transaction. No service-role credential is used by runtime application code. `auth.users` is never queried or returned. Migrations 001–009 are unchanged.

## Audit behavior

Every successful create writes an audit event with the resulting row snapshot (`resource_type` = `academic_year` or `academic_term`). Every successful update writes before and after snapshots. An update that changes `status` is recorded as `status_change`; any other successful update is recorded as `update`. Failed authorization or validation does not mutate the row and does not create an audit event.

## Deferred work

- academic groups (TASK 004.5);
- hard delete;
- marking/changing which academic year is "current";
- an explicit overlap rule for academic terms, should product requirements ever call for one;
- student, professor, membership, or course-allocation management;
- a general-purpose audit viewer for these events.
