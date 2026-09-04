# TASK 004.5 Completion Notes

## Completed scope

- Added migration `011_academic_groups_write_access.sql` without modifying migrations 001–010.
- Added a scoped academic groups editor overview RPC and audited create/update RPCs, all `SECURITY DEFINER` with `SET search_path = public`, reusing `resolve_academic_units_editor_mode(...)` from migration 007 for actor/scope resolution.
- Added `academic_group_audit_events` with mandatory before/after snapshots for every academic group mutation.
- Enhanced `/{locale}/app/manage/academic` (University Admin) and `/{locale}/admin/academic-structure` (Platform Admin) with an Academic Groups editor, alongside the existing Faculties/Departments, Academic Programs, Academic Years, and Semesters editors.
- Applied specific, localized error mapping (`archivedParent`, `inactiveParent`, `invalidTermYear`) from the start, instead of the generic-only mapping that TASK 004.4 initially shipped with and had to be fixed afterward.
- Left `/admin/organizations` untouched.
- Implemented no student membership and no join-request workflow — see the explicit confirmations below.

## Exact `academic_groups` schema fields used

`id`, `organization_id` (not null), `academic_program_id` (**not null**), `academic_year_id` (nullable), `academic_term_id` (nullable), `code`, `name`, `description`, `status`, `created_at`, `updated_at` — all real, unmodified columns from migration 004. No column was added.

## Exact hierarchy relationships used

- `academic_program_id` → `academic_programs(id, organization_id)`: required, same university.
- `academic_year_id` → `academic_years(id, organization_id)`: optional, same university when present.
- `academic_term_id` → `academic_terms(id, organization_id, academic_year_id)`: optional, same university **and** same selected year when present.
- `academic_term_id is null or academic_year_id is not null`: a term can never be set without a year — enforced both by the real DB check constraint and, with a friendly message, by the RPC before it reaches the database.

## Exact status values exposed

Database allows `active`/`inactive`/`suspended`/`archived`; the editor RPCs restrict writes to `active`/`inactive`/`archived`, matching TASK 004.1/004.3/004.4 precedent so all five editable-hierarchy editors on this page stay consistent.

## Exact uniqueness rules

`code` uniqueness is scoped to `organization_id` (the university) — matching the real `unique(organization_id, code)` constraint on `academic_groups`. This is **not** year-scoped or program-scoped; it mirrors the faculties/departments/programs pattern, not the `academic_terms` pattern.

## Code generation behavior

Empty code → auto-generated from the group name: uppercase, Romanian diacritics stripped, symbols/spaces collapsed to single hyphens, capped at 100 characters, with `-2`/`-3`/… appended on a university-scoped collision. A manually supplied code is normalized the same way, then rejected with a safe duplicate error (23505) instead of being silently suffixed if it collides.

## Hierarchy/status validation implemented

For each of the group's parents (program always, year if set, term if set): a group cannot be created under an archived parent; an existing group may keep an archived parent only if it isn't moved away from it and its own status also becomes/stays `archived`; an active group requires an active parent. None of these RPCs write to `academic_programs`/`academic_years`/`academic_terms` — there is no cascade in either direction beyond these create/update-time checks, and no group is silently deleted, reassigned, or reactivated when a parent's own status changes via its own editor. `update_academic_group` has no university parameter at all, so cross-university moves are structurally impossible.

## Audit implementation

`academic_group_audit_events` (RLS enabled, all direct privileges revoked from `public`/`anon`/`authenticated`) records every create and update, with a distinct `status_change` action when `status` itself changes (else `update`). Every row carries `before_snapshot`/`after_snapshot` (create rows carry `after_snapshot` only). Writes happen only inside the same RPC transaction as the mutation — there is no separate, bypassable audit path.

## Existing membership/group relation discovered

`public.academic_profile_contexts` (migration 004) already has an `academic_group_id` column with `academic_profile_contexts_group_same_program_fk` — a compound foreign key requiring the linked group to share the profile's `organization_id` and `academic_program_id`. **This is the schema's existing profile-to-group relationship.** It is currently populated and read only by pre-existing, unrelated read paths (Home context, the read-only academic structure overview). TASK 004.5 does not read, write, or migrate this table in any way. TASK 004.6 is expected to add editing RPCs for it rather than introduce a new membership table.

## Security confirmation

- The active profile is derived server-side; the browser does not choose an arbitrary actor profile.
- Every RPC independently validates authentication, active profile ownership, role, scope, target university, and hierarchy — the same defense-in-depth pattern as TASK 004.1/004.3/004.4.
- University Admin is limited to its scoped university; Platform Admin requires the existing platform role plus `admin.access` permission.
- No direct table write is performed by runtime application code.
- No broad RLS policy or table grant was added, and RLS was not weakened.
- `auth.users` is never queried or returned by any of these RPCs.
- No service-role key, secret, environment file, fake group, or fake metric was added.
- No DELETE RPC or hard-delete UI exists.

## Validation

- `npx pnpm@11.19.0 lint`: passed, no warnings or errors.
- `npx pnpm@11.19.0 build`: passed; Next.js compiled, type-checked, and generated both localized `/app/manage/academic` and `/admin/academic-structure` routes.
- `git diff --check`: passed, no whitespace errors.
- Static security review: RPC-only runtime access, scoped authorization, hierarchy validation, no broad grants, and mandatory audit inserts confirmed.

## Manual QA status

Authenticated browser QA was not executed in this implementation environment because a privileged University Admin / Platform Admin QA session with migration 011 already applied was not part of the local validation run. **Migration 011 must be applied manually in Supabase before any authenticated runtime QA** — the same manual-apply flow already used for migrations 007–010.

After migration 011 is applied, verify:

- University Admin can create and edit an academic group in its own university, with a required program and optional year/term;
- University Admin cannot target another university;
- the term selector is disabled until a year is chosen, and only offers terms belonging to that year;
- changing the selected year clears any previously chosen term;
- generated codes are uppercase, diacritic-free, university-scoped, and receive `-2`, `-3`, … on collisions;
- manually edited codes remain unchanged by later name edits, and duplicate manual codes are rejected;
- a group cannot be created under an archived program/year/term, and an existing group under a parent that becomes archived can only be saved by also setting the group itself to `archived`;
- an active group cannot be created or kept under a non-active program/year/term;
- Platform Admin can select any real university and create/edit its academic groups with the same rules;
- each successful create/update/status change produces an audit row in `academic_group_audit_events`;
- Academic Student, Professor, and Coordinator have no write controls for groups (unchanged from before this task);
- organization roles and Individual Learner have no access to this editor;
- no student appears assignable to a group anywhere in this UI, and no join-request control exists anywhere;
- `/ro/app/manage/academic`, `/en/app/manage/academic`, `/ro/admin/academic-structure`, and `/en/admin/academic-structure` are localized, including the new Academic Groups section;
- `/admin/organizations` behavior is unchanged;
- homepage, auth/login/register/logout, onboarding, active-profile switching, Home/Acasă behavior, and the QA seed are all unaffected.

## Deferred work

TASK 004.6 (Student Group Membership Management) and TASK 004.7 (Group Join Requests & Approval Workflow) remain fully deferred — no membership row, join request, or related UI was implemented. Hard delete and a general-purpose audit viewer also remain deferred.
