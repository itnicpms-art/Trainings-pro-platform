# TASK 004.1 — Academic Units Editable Management

## Scope

TASK 004.1 adds controlled editing for two academic unit types only:

- faculties;
- departments.

The hierarchy remains:

`University → Faculty → Department → Academic Program → Academic Year → Term / Semester → Group`

A faculty belongs directly to a university and has no parent unit. A department must belong to an active or inactive faculty in the same university. Academic programs, years, terms, semesters, and groups remain read-only and receive no create or edit controls in this task.

No hard-delete function or button exists. Units can move only between `active`, `inactive`, and `archived` states.

Universities themselves are managed separately in **Organizations & Universities**. TASK 004.1 does not add university create or edit behavior and does not change `/admin/organizations`.

The create UI uses separate Faculty and Department actions. Faculty forms never show a parent field. Department forms require the clearly labeled faculty they belong to; the same rule applies to existing-unit edit forms.

The internal code is generated automatically from the unit name, while remaining editable before submission. Generated values are uppercase and URL-safe, remove Romanian diacritics, normalize spaces and symbols to hyphens, and are limited to 100 characters. If a generated code already exists in the same university, the RPC appends `-2`, `-3`, and so on. A manually supplied duplicate retains the explicit duplicate-code error.

## Access model

University Admin uses `/{locale}/app/manage/academic`. The active profile must be owned by the authenticated user, active, assigned the `university_admin` role with `scope_type = university`, and scoped to the target university. It can create and update faculties and departments only inside that university.

Professor and Coordinator keep the TASK 004 read-only academic view. They do not receive write controls.

Platform Admin uses `/{locale}/admin/academic-structure`. The existing admin layout still requires both the scoped `platform_admin` role and the `admin.access` permission. The page can list real universities, select one, and edit its faculties and departments. Platform Admin remains in `/admin` and is not routed through the app-level academic editor.

## Database and security boundary

Migration `007_academic_units_write_access.sql` adds:

- `get_academic_units_editor_overview(requested_profile_id, target_university_id)`;
- `create_academic_unit(...)`;
- `update_academic_unit(...)`;
- an internal scoped authorization helper;
- `academic_structure_audit_events` for immutable create, update, and status-change evidence.

The RPCs are `SECURITY DEFINER` with `SET search_path = public`. They validate `auth.uid()`, active profile ownership, role, scope, target university type, editable unit type, hierarchy, generated or manually supplied code uniqueness, non-empty names, and allowed status. The runtime app calls these RPCs only through the authenticated cookie Supabase client.

No broad `SELECT`, `INSERT`, `UPDATE`, or `DELETE` policy is added. Direct audit-table privileges are revoked from `public`, `anon`, and `authenticated`; writes occur only inside the scoped RPC transaction. No service-role credential is used by runtime application code.

## Audit behavior

Every successful create writes an audit event with the resulting row snapshot. Every successful update writes before and after snapshots. A status-changing update is identified as `status_change`. Failed authorization or validation does not mutate the unit and does not create an audit event.

## Deferred work

- hard delete;
- editing academic programs, years, semesters/terms, or groups;
- student, professor, membership, or course-allocation management;
- assignments, quizzes, tests, exams, projects, certificates, credits, and reports;
- a general-purpose audit viewer for these events.
