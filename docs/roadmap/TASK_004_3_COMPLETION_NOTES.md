# TASK 004.3 Completion Notes

## Completed scope

- Added migration `009_academic_programs_write_access.sql` without modifying migrations 001–008.
- Added a scoped academic programs editor overview RPC and audited create/update RPCs, all `SECURITY DEFINER` with `SET search_path = public`, reusing `resolve_academic_units_editor_mode(...)` from migration 007 for actor/scope resolution.
- Added `academic_program_audit_events` with mandatory before/after snapshots for every academic program mutation.
- Enhanced `/{locale}/app/manage/academic` (University Admin) with an Academic Programs editor alongside the existing Faculties/Departments editor.
- Enhanced `/{locale}/admin/academic-structure` (Platform Admin) with the same Academic Programs section under the existing Faculties/Departments editor.
- Added automatic, editable internal-code generation with Romanian diacritic removal and collision suffixes, matching the TASK 004.1 faculty/department pattern exactly.
- Reused the existing bilingual `program_level` labels (`bachelor`/`master`/`phd`/`postgraduate`/`other`) already defined for the read-only academic context view, instead of introducing a second, differently worded translation for the same values.
- Left `/admin/organizations` untouched; organizations and universities remain managed there exclusively.

## Schema values used for program level / status

Inspected `supabase/migrations/004_organizations_academic_structure.sql` before writing any RPC:

- `academic_programs.program_level` check constraint: `bachelor`, `master`, `phd`, `postgraduate`, `other`. All five are used verbatim; no value was invented and `doctoral` is not used anywhere since the real schema value is `phd`.
- `academic_programs.status` check constraint allows `active`, `inactive`, `suspended`, `archived`. The editable RPCs and UI restrict writes to `active`, `inactive`, `archived` — the same three-state restriction TASK 004.1 already applies to faculties/departments — so the two editable-hierarchy editors stay consistent with each other. `suspended` remains a valid database value but is not exposed by this editor, matching precedent rather than inventing new UI scope.
- No new column was added to `academic_programs`. `standard_duration_years` (nullable, no default) is left untouched by these RPCs since it is not part of the requested UI fields.

## Security confirmation

- The active profile is derived server-side; the browser does not choose an arbitrary actor profile.
- Every RPC independently validates authentication, active profile ownership, role, scope, target university, unit type/hierarchy, and status — the same defense-in-depth pattern as TASK 004.1.
- University Admin is limited to its scoped university; Platform Admin requires the existing platform role plus `admin.access` permission.
- `update_academic_program` has no university parameter at all, so a program can never be moved to a different university — this is structural, not just validated.
- No direct table write is performed by runtime application code.
- No broad RLS policy or table grant was added, and RLS was not weakened.
- The audit table has RLS enabled and no public/authenticated read or write policy.
- No service-role key, secret, environment file, fake program, or fake metric was added.
- No DELETE RPC or hard-delete UI exists.
- An empty code is generated server-side from the name; manually provided duplicate codes still fail explicitly.
- These RPCs never write to `organization_units` — a program never reactivates or otherwise changes its parent faculty/department, and no cascade runs in either direction between unit status and program status beyond the create/update-time eligibility checks.

## Validation

- `npx pnpm@11.19.0 lint`: passed, no warnings or errors.
- `npx pnpm@11.19.0 build`: passed; Next.js compiled, type-checked, and generated both localized `/app/manage/academic` and `/admin/academic-structure` routes.
- `git diff --check`: passed, no whitespace errors.
- Static security review: RPC-only runtime access, scoped authorization, hierarchy validation, no broad grants, and mandatory audit inserts confirmed.

## Manual QA status

Authenticated browser QA was not executed in this implementation environment because a privileged University Admin / Platform Admin QA session with migration 009 already applied was not part of the local validation run (migrations 007 and 008 were applied manually to Supabase per the task context, and migration 009 is expected to follow the same manual-apply flow). No password or secret was entered or exposed.

After migration 009 is applied, verify:

- University Admin can create an academic program in its own university, assigned to a faculty or a department;
- University Admin cannot target another university (the university selector does not appear on `/app/manage/academic`; the RPC rejects any mismatched university even if attempted directly);
- generated internal codes are uppercase, safe, no longer contain Romanian diacritics, and receive `-2`, `-3`, and later suffixes on collisions;
- manually edited codes remain unchanged by later name edits and duplicate manual codes are rejected;
- editing an existing program works, including moving it between an eligible faculty and department in the same university;
- no delete control exists anywhere in the Academic Programs section;
- Platform Admin can select any real university and create/update its academic programs;
- Platform Admin cannot move a program to a different university (there is no such control, and the RPC has no university parameter to accept one);
- `/admin/organizations` behavior is unchanged;
- a program cannot be created under an archived academic unit;
- an existing program under a unit that becomes archived can still be saved only if its own status is also set to `archived`, and cannot be moved to a different unit while its current unit is archived;
- an active program cannot be created or kept under a non-active academic unit;
- each successful create/update/status change produces an audit row in `academic_program_audit_events`;
- Academic Student has no program write controls and no successful write access;
- Professor and Coordinator have no new write controls (unchanged from before this task);
- organization roles and Individual Learner have no access to this editor;
- `/ro/app/manage/academic`, `/en/app/manage/academic`, `/ro/admin/academic-structure`, and `/en/admin/academic-structure` are localized, including the new Academic Programs section;
- `/ro/admin`, `/en/admin`, and the existing Platform Admin `/app` redirect remain protected and unchanged;
- homepage, auth/login/register/logout, onboarding, active-profile switching, Home/Acasă behavior, and the QA seed are all unaffected.

## Deferred work

Editing academic years, terms/semesters, and groups, people/membership management, course allocation, educational records, reporting, and a general-purpose audit viewer remain deferred to dedicated tasks.
