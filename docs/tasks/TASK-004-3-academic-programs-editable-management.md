# TASK 004.3 — Academic Programs Editable Management

## Scope

TASK 004.3 adds controlled editing for academic programs. The hierarchy remains:

`University → Faculty → Department → Academic Program → Academic Year → Term / Semester → Group`

An academic program must belong to a faculty or a department in the same university — the two unit types that TASK 004.1 already made editable. There is no requirement to prefer a department over a faculty; the editor exposes every non-archived faculty and department in the selected university, and the actor chooses the one that matches the program. Academic years, terms/semesters, and groups remain read-only and receive no create or edit controls in this task.

No hard-delete function or button exists. Programs can move only between `active`, `inactive`, and `archived` states — the same three states already used by the faculty/department editor, even though the underlying `academic_programs.status` column also allows `suspended`.

A program cannot be created under an archived academic unit. An existing program may keep an archived unit only if it already sits there and its own status is also `archived`; it cannot be freshly moved into an archived unit, and an active program always requires an active unit. Academic unit status itself is never written by these RPCs — a program never reactivates or otherwise changes its parent faculty/department, and unit status changes made through TASK 004.1 never cascade to programs.

The internal code is generated automatically from the program name, while remaining editable before submission. Generated values are uppercase and URL-safe, remove Romanian diacritics, normalize spaces and symbols to hyphens, and are limited to 100 characters. If a generated code already exists in the same university, the RPC appends `-2`, `-3`, and so on. A manually supplied duplicate keeps the explicit duplicate-code error instead of being silently suffixed.

Program level uses only the five values already defined by the `academic_programs.program_level` check constraint from migration 004: `bachelor`, `master`, `phd`, `postgraduate`, `other`. No new value is invented, and the existing bilingual labels for these values (already used by the read-only academic context view) are reused as-is rather than duplicated with different wording.

## Access model

University Admin uses `/{locale}/app/manage/academic`. The active profile must be owned by the authenticated user, active, assigned the `university_admin` role with `scope_type = university`, and scoped to the target university. It can create and update academic programs only inside that university, and only under a faculty or department that also belongs to that university.

Professor and Coordinator keep the existing TASK 004 read-only academic view. They receive no program write controls; this task does not add any new permission grant for them.

Platform Admin uses `/{locale}/admin/academic-structure`. The existing admin layout still requires both the scoped `platform_admin` role and the `admin.access` permission. The page lists real universities, and once one is selected, the Academic Programs section sits below the existing Faculties/Departments editor and lets Platform Admin create/update programs in that university.

`/admin/organizations` is untouched by this task; organizations and universities are still managed there exclusively (TASK 004.2).

## Database and security boundary

Migration `009_academic_programs_write_access.sql` adds:

- `get_academic_programs_editor_overview(requested_profile_id, target_university_id)`;
- `create_academic_program(...)`;
- `update_academic_program(...)`;
- `academic_program_audit_events` for immutable create, update, and status-change evidence.

The `academic_programs` table itself is unchanged — no column was added, renamed, or altered. All three RPCs reuse the existing `public.resolve_academic_units_editor_mode(requested_profile_id, target_university_id)` helper from migration 007 for actor/scope resolution, so university_admin scope enforcement and platform_admin console access checks are not duplicated.

The RPCs are `SECURITY DEFINER` with `SET search_path = public`. They validate `auth.uid()`, active profile ownership, role, scope, target university, that the referenced academic unit is a faculty or department belonging to the same university, non-empty name, allowed program level, allowed status, and generated or manually supplied code uniqueness. The runtime app calls these RPCs only through the authenticated cookie Supabase client.

No broad `SELECT`, `INSERT`, `UPDATE`, or `DELETE` policy is added. Direct audit-table privileges are revoked from `public`, `anon`, and `authenticated`; writes occur only inside the scoped RPC transaction. No service-role credential is used by runtime application code. Migrations 001–008 are unchanged.

## Audit behavior

Every successful create writes an audit event with the resulting row snapshot. Every successful update writes before and after snapshots. An update that changes `status` is recorded as `status_change`; any other successful update is recorded as `update`. Failed authorization or validation does not mutate the program and does not create an audit event.

## Deferred work

- hard delete;
- editing academic years, terms/semesters, or groups;
- student, professor, membership, or course-allocation management;
- assignments, quizzes, tests, exams, projects, certificates, credits, and reports;
- a general-purpose audit viewer for these events.
