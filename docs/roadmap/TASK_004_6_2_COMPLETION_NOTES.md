# TASK 004.6.2 Completion Notes

## Completed scope

- Added forward-only migration `018_academic_group_staff_responsibilities.sql` without modifying migrations 001–017 (016/017 are already applied to production and immutable).
- Added `academic_group_staff_assignments` (current Professor <-> Academic Group responsibility rows; `unique (academic_group_id, staff_profile_id)`; no status/revoked_at/ended_at) and `academic_group_staff_assignment_audit_events` (immutable history; `actor_role` allows `university_admin`/`platform_admin`/`program_coordinator`, never `professor`; `action` allows `assign`/`unassign`/`cleanup_on_program_role_revoke`).
- Added `assign_professor_to_academic_group` and `unassign_professor_from_academic_group` — both `SECURITY DEFINER`, both authorize via the unmodified `resolve_academic_program_editor_mode` (migration 016), both share one professor-lifecycle advisory lock key `(profile, program, 'professor')` with `grant_academic_program_staff_role`/`revoke_academic_program_staff_role`. Assign uses `insert ... on conflict (academic_group_id, staff_profile_id) do nothing returning ...` for idempotency — no exception-based duplicate handling, no audit event written on conflict.
- `create or replace`'d `revoke_academic_program_staff_role` (migration 016 untouched) to clean up group responsibilities when a revoked role was `professor` **and** no other real professor role remains for that exact profile+program — `profile_roles` intentionally has no unique constraint, so this last-row check is not optional. The professor-lifecycle advisory lock is acquired **before** the exact `profile_roles` row lock (not after), keeping lock order identical to `assign_professor_to_academic_group`'s.
- `create or replace`'d `update_academic_group` (migration 016 untouched) to deny a cross-program move outright when the group has any active responsibility row — no auto-delete, no silent migration, no inferred eligibility in the target program.
- `create or replace`'d `get_program_staff_academic_overview` and `get_academic_groups_editor_overview` (migrations 016/011 untouched) with two additive fields (`group_staff_assignments`, `eligible_professors`). The professor-only privacy filter (own rows only, `eligible_professors: []`) is enforced in SQL inside `get_program_staff_academic_overview`, not left to the UI — `get_academic_groups_editor_overview` never authorizes a `professor` actor_mode today, so its fields are always the full, unfiltered university scope.
- Extended `src/types/database.ts`: new `AcademicGroupStaffAssignment`/`EligibleProfessor` types, both overview types gain the two new fields, two new `Functions` entries.
- `adaptProgramStaffOverview` now carries `group_staff_assignments`/`eligible_professors` through into the `AcademicGroupsEditorOverview`-shaped object it builds for the professor/coordinator page.
- Added `src/lib/manage/mutate-academic-group-staff-assignment.ts` (new wrapper, mirrors `mutate-academic-program-staff-assignment.ts`'s exact error-mapping convention) and a new `AcademicGroupStaffPanel` component (`src/components/manage/academic-group-staff-panel.tsx`, mirrors `AcademicProgramStaffEditor`/`GroupMembershipPanel`'s conventions).
- `AcademicGroupsEditor` gained two new optional props (`groupStaffTranslations`, `groupStaffAction`) and renders `AcademicGroupStaffPanel` per group; the component itself gates the action to `undefined` when `overview.actor_mode === 'professor'`, so every caller can pass the mutation action unconditionally and a plain professor still only ever gets a read-only view. Also added a client-side "My groups" filter (professor only), reusing data already fetched.
- `AcademicStructureView` threads the same two new props through to its own internal `AcademicGroupsEditor` call (the University Admin "full overview" success path).
- Wired both `/[locale]/app/manage/academic` (all three `AcademicGroupsEditor`/`AcademicStructureView` call sites — professor/coordinator, the University-Admin partial-overview fallback, and the full-overview success path) and `/[locale]/admin/academic-structure` (Platform Admin) with new server actions (`mutateAcademicGroupStaffAssignmentAction`, `mutateAdminAcademicGroupStaffAssignmentAction`), each a thin `revalidatePath` wrapper around the shared `mutateAcademicGroupStaffAssignment`, matching every existing action in both `actions.ts` files exactly.
- Added the `groupStaffEditor` translation block to both `ro.ts` and `en.ts` (title/description, assign/unassign copy, "My groups" copy, and the full error-reason message set).
- Updated `docs/CODEX_TASK_INDEX.md`.

## Next.js guides consulted

`node_modules/next/dist/docs/01-app/02-guides/server-actions.md` and `.../forms.md` — confirmed the established pattern already used throughout this codebase (form `action` + `useActionState`, mandatory server-side authorization regardless of UI hiding, `revalidatePath` after a successful mutation) matches Next.js's own current guidance exactly; no deviation was needed.

## Migration state

- Migrations 001–017 are unchanged. 016 and 017 are already applied to production and remain immutable; neither was edited.
- `018_academic_group_staff_responsibilities.sql` is the only new migration. It has **not** been applied remotely and no seed was run against production — this is source-only work, pending review.
- Every existing function this migration touches (`revoke_academic_program_staff_role`, `update_academic_group`, `get_program_staff_academic_overview`, `get_academic_groups_editor_overview`) keeps its exact signature, so its existing grants are preserved automatically; only the two new functions needed explicit `revoke`/`grant`.

## Self-target rule

No special-case code exists anywhere for a Program Coordinator/University Admin/Platform Admin targeting their own profile. The eligibility check inside `assign_professor_to_academic_group` never compares `target_profile_id` to the actor — it is allowed exactly when that profile independently holds a real current professor row for the target program, and denied otherwise, by the identical rule applied to any other target. The audit trail always records the actor's true `actor_mode`, never `'professor'`, since a plain professor is denied before eligibility is even checked.

## Security confirmation

- Every new/extended RPC re-validates authentication, active profile ownership, and program-scoped authorization (via the unmodified `resolve_academic_program_editor_mode`) before any mutation.
- `resolve_academic_units_editor_mode`/`resolve_academic_program_editor_mode` are both unchanged and untouched; nothing in this task calls either and catches its exception as control flow.
- Target-professor eligibility is always a real `profile_roles` row (`role.code='professor'`, `scope_type='program'`, `scope_id=<program>`) — never `profile_type` alone, in either the assign RPC or either read RPC's `eligible_professors` field.
- No direct table grants were added; RLS remains enabled with zero policies on both new tables, matching every table from migration 004 onward. `revoke all ... from public, anon, authenticated` was applied to both.
- No hard delete anywhere; both new RPCs and the extended `revoke_academic_program_staff_role` have no exception handler, so a failure in any statement — including any audit insert — aborts the entire transaction. Confirmed by re-reading every block in migration 018: no `exception when others`, no `raise warning` in place of a failure.
- No avoidable `FOR UPDATE` lock is acquired before the actor is authorized for the resource being locked, in either new RPC or the two extended write RPCs — see the task doc's "Assign / unassign RPCs" and "Program-role revoke integration" sections for the exact lock order in each.
- The professor-lifecycle advisory lock `(profile, program, 'professor')` is the same key across `grant_academic_program_staff_role`, `revoke_academic_program_staff_role`, `assign_professor_to_academic_group`, and `unassign_professor_from_academic_group` — this is what makes program-role grant/revoke and group-responsibility assign/unassign for the same profile+program fully mutually exclusive, with no interleaving window.

## Validation

- `corepack pnpm lint`: passed, no warnings or errors.
- `corepack pnpm build`: passed; Next.js compiled and type-checked successfully, including the two extended `Database["public"]["Functions"]` overview return types and the two new function entries.
- `git diff --check`: passed, no whitespace errors.
- Migration 018 was re-read in full after writing it to confirm balanced `$$`/`begin`/`end` blocks (6 functions × 2 = 12 `$$` delimiters, matching exactly) and that every carried-forward function body (`revoke_academic_program_staff_role`, `update_academic_group`, `get_program_staff_academic_overview`, `get_academic_groups_editor_overview`) matches its live migration-016/011 source except for the intended additions.
- Migrations 001–017 confirmed unchanged: `git diff origin/main -- supabase/migrations/001*.sql ... 017*.sql` is empty (the branch was created directly from `origin/main`, so this diff is trivially empty by construction, and was re-checked after writing migration 018 to confirm nothing else touched those files).

## Manual QA still required

Migration 018 has not been applied to Supabase and was not exercised end-to-end in this environment. After applying it:

- a Program Coordinator can assign an eligible professor (real current professor role in the coordinated program) to a group in that program, and the assignment appears immediately;
- assigning a profile with `profile_type='professor'` but no real program-scoped professor role is denied;
- assigning an eligible professor to a group in a program the coordinator does not coordinate is denied;
- a plain professor's crafted/manual call to assign or unassign is denied `42501` regardless of UI state;
- an eligible professor can be assigned to multiple groups, in the same or different authorized programs;
- a professor with zero group responsibilities keeps full TASK 004.6.1 program access, and "My groups" is empty;
- a plain professor's `get_program_staff_academic_overview` payload contains only their own `group_staff_assignments` rows and an empty `eligible_professors` array — verified at the RPC/network level, not just visually;
- a Program Coordinator's overview shows every responsibility and every eligible professor in the coordinated program;
- University Admin manages responsibilities from `/[locale]/app/manage/academic` within their own university only;
- Platform Admin manages responsibilities from `/[locale]/admin/academic-structure` for the selected university only;
- a Program Coordinator who also independently holds `professor` for the same program can assign themselves to a group, and the audit row records `actor_role='program_coordinator'`;
- the same Coordinator, without an independent professor role, is denied the identical self-target attempt;
- two rapid duplicate assign attempts for the same (group, professor) leave exactly one live row and exactly one `assign` audit event; the second response reports `already_existed: true`;
- unassign removes the exact row and records one `unassign` audit event;
- assigning to an inactive/archived group or program is denied; unassigning an existing responsibility from an inactive/archived group or program still succeeds;
- moving a group with active responsibilities to a different program is denied; after explicitly unassigning every professor, the same move succeeds under the existing authorization rules;
- a profile with two professor `profile_roles` rows for the same program (an edge case `grant_academic_program_staff_role`'s idempotency should normally prevent, but worth exercising directly) keeps its group responsibilities intact when only one row is revoked, and loses them (with one `cleanup_on_program_role_revoke` audit row per responsibility) only when the last one is revoked;
- revoking a `program_coordinator` role never removes an independent professor role's group responsibilities;
- both locales render the assign form, the responsibility list, the read-only badge view for a plain professor, and the "My groups" filter correctly.

## Deferred work

TASK 004.7 (student join requests), Course/Course Offering staff assignment (TASK 004.8.1), a broader role-aware Home/dashboard redesign, a general-purpose audit viewer, professor self-request/approval workflows, and any lead/assistant-professor or group-coordinator hierarchy remain deferred — none of them are implemented here.
