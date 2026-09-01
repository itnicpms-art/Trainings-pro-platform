# TASK 004 — Academic & Organization Structure Management UI Foundation

## Purpose

TASK 004 adds the first bilingual, read-only app-level management views for structure already created by TASK 003. These pages belong to an eligible active profile's operational workspace; Platform Admin remains in `/{locale}/admin`.

Routes:

- `/{locale}/app/manage/academic`
- `/{locale}/app/manage/organization`

No create, edit, delete, deactivate, assign, import, or approval action is available.

## Access model

Academic structure is available to active profiles carrying `university_admin`, `professor`, `program_coordinator`, or `coordinator` and a valid university context. University Admin receives the active university overview. Professor and Coordinator receive only records referenced by their active/primary academic context.

Organization structure is available only to active `organization_admin` and `organization_representative` profiles and is scoped to the organization assigned to that profile. Organization Learner, Academic Student, Individual Learner, Consultant, and other ineligible profiles receive a restricted state.

Platform Admin is redirected to the existing protected admin console and does not use these pages as its normal workspace.

## Database boundary

Migration `006_structure_management_read_access.sql` adds two `STABLE`, read-only, `SECURITY DEFINER` RPCs:

- `get_academic_structure_management_overview(requested_profile_id uuid)`
- `get_organization_structure_management_overview(requested_profile_id uuid)`

Each function verifies `auth.uid()`, active profile ownership, an eligible role assignment, the role scope, and the target context before returning JSON. Execution is revoked from `public` and `anon` and granted only to `authenticated`.

The migration adds no broad `SELECT` policy or direct table grant. Existing TASK 003 tables remain RLS-locked. Runtime loaders use the authenticated cookie client and call RPCs only; no service-role credential is used.

## Read-only UI

The academic page renders the active context and scoped faculties/departments, programs, years, terms, and groups. The organization page renders the active organization and its real training periods. Empty arrays produce localized empty states. All values originate from scoped database results; no fake record or metric is created.

Navigation links are visible only when the server-derived active profile context is eligible, including the mobile sidebar.

## Multiple-context limitation

Professor, Coordinator, University Admin, Organization Representative, and Organization Admin may later require multiple universities, programs, groups, teams, or allocations. TASK 004 intentionally shows only the safely available active/primary context. Context selection and audited write workflows are deferred.

## Deferred work

- create/edit/delete/deactivate flows;
- assignments, imports, and approvals;
- multiple-context management;
- audit events for write workflows;
- courses and all educational workflow records.
