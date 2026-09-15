# TASK 004.6.1 Completion Notes

## Completed scope

- Added migration `016_academic_staff_program_access.sql` without modifying migrations 001–015 (015 belongs to TASK 004.8 / Codex and was neither accessed nor touched).
- Widened `academic_group_audit_events.actor_role` and `student_group_membership_audit_events.actor_role` CHECK constraints (discovered by inspecting `pg_constraint` at migration-run time, not a guessed name) to additionally accept `professor`/`program_coordinator` — required so the audit `INSERT` in every extended write RPC doesn't fail its own CHECK the moment a staff actor performs the first mutation.
- Added `academic_program_staff_assignment_audit_events` — immutable audit trail for grant/revoke, `actor_role` restricted to `university_admin`/`platform_admin` only.
- Added `resolve_academic_program_editor_mode` (new, additive) and left `resolve_academic_units_editor_mode` (migration 007) completely unchanged.
- Added `grant_academic_program_staff_role`, `revoke_academic_program_staff_role`, `get_academic_program_staff_assignments_editor_overview`, `get_assigned_academic_programs`, `get_program_staff_academic_overview`.
- `create or replace`'d `create_academic_group`, `update_academic_group` (migration 011), `add_student_to_group`, `move_student_group_membership`, `end_student_group_membership`, `set_primary_group_membership` (migrations 012/013/014) to add a professor/program_coordinator authorization branch alongside the unchanged University Admin/Platform Admin path. Migration 013's `ended_at = greatest(current_date, started_at)` fix and migration 014's `before_snapshot = to_jsonb(existing_membership)` fix are both preserved verbatim in the carried-forward function bodies — diffed line-by-line against the live 013/014 source before writing migration 016 to confirm this.
- Updated `scripts/seed-qa-profiles.ts`: professor/program_coordinator QA assignments now use a real `academic_program_id` (previously always `null` — a pre-existing gap this task's own investigation surfaced); added a second QA faculty/program (`Dentistry`/`DENT`) so the QA professor profile has two simultaneous program assignments (`General Medicine` + `Dentistry`), while the QA coordinator profile keeps its single `General Medicine` assignment — covering the one-program, multiple-program, and cross-program-denial QA cases without adding a dedicated zero-programs fixture (any other existing QA profile already holds zero professor/program_coordinator rows, which already covers that case).
- Extended `/{locale}/app/manage/academic` (no new route) with a professor/program_coordinator section reusing the existing `AcademicGroupsEditor`/`GroupMembershipPanel` components via a new adapter (`adaptProgramStaffOverview`), and added a new `AcademicProgramStaffEditor` component (University Admin/Platform Admin only) for grant/revoke.
- Left Platform Admin console, `/admin/organizations`, and every prior academic editor's own behavior for University Admin/Platform Admin unchanged.

## Root cause / model corrections made during design review

Two Phase-1 findings were corrected before implementation (see the task doc's own history for the full reasoning): migration 006's read model was found to resolve down to a single *group*, not "all groups in the program," for non-admin roles; and the audit `actor_role` CHECK constraint gap (§ above) was identified as a hard blocker that static review of RPC authorization alone would have missed, since it only manifests once a staff actor's mutation reaches the audit `INSERT`.

## Cross-program safety

`update_academic_group` and `set_primary_group_membership` are the only two extended RPCs that mutate a row beyond the one directly requested (a group's program can change; a primary promotion can demote another membership in a different program). Both now run a second `resolve_academic_program_editor_mode` check against the second affected program when the actor is professor/program_coordinator, denying the whole operation if that second authorization fails — University Admin/Platform Admin are unaffected. `move_student_group_membership`/`end_student_group_membership` need no second check: the former's own existing business rule already forces the target group into the source membership's program.

## Student eligibility for staff

`add_student_to_group`'s staff-only eligibility check requires a real `academic_profile_contexts` row for the *target program specifically* — active or historical, deliberately not `status='active'`-only, so a student who previously ended a membership in that program remains eligible for staff to re-add, matching TASK 004.6's own zero-active-memberships rule. University Admin/Platform Admin keep the broader, pre-existing university-wide eligibility check unchanged.

## Program assignment lifecycle

`profile_roles` was **not** altered with a `revoked_at`/status column or a new unique constraint, per explicit product correction — it stays the same table every other role on the platform uses, representing only currently-active assignments. Grant inserts one row; revoke deletes that exact row (never bulk); full history is preserved in the new `academic_program_staff_assignment_audit_events` table instead. Concurrent-grant race-safety comes from a transaction-scoped `pg_advisory_xact_lock` keyed on (profile, program, role), not from a schema constraint; an already-existing exact assignment is treated as an idempotent success.

## Security confirmation

- Every new/extended RPC independently re-validates authentication, active profile ownership, and scope before any mutation.
- `resolve_academic_units_editor_mode` is unchanged and untouched; the new resolver is additive, never calls it and catches its exception as control flow.
- Program Coordinator cannot grant/revoke program assignments — only University Admin (own university) / Platform Admin (selected university) can, via the existing unmodified resolver.
- No cross-university assignment is possible: `grant_academic_program_staff_role` requires the target profile's `university_id` to match the program's `organization_id`; the new resolver re-checks the same invariant independently at authorization time.
- No direct table grants were added; RLS remains pure default-deny with zero policies on every table this task touches, matching the established pattern.
- No hard delete anywhere; audit is atomic everywhere (no `RAISE WARNING`, no swallowed exceptions, no best-effort audit) — confirmed by re-reading every `exception when others` block removed or added in this migration (there are none; every raised exception in migration 016 propagates uncaught).
- Migration 015 (TASK 004.8 / Codex) was never accessed, read, or modified; the Codex worktree was never accessed.

## Validation

- `npx pnpm@11.19.0 lint`: passed, no warnings or errors.
- `npx pnpm@11.19.0 build`: passed; Next.js compiled, type-checked, and generated `/app/manage/academic` (now dynamic, due to the new `searchParams`-driven program picker) for both locales.
- `git diff --check`: passed, no whitespace errors.
- Migration 016 was re-read in full after writing it to confirm balanced `$$`/`begin`/`end` blocks (12 functions × 2 + 2 `do` blocks × 2 = 28 `$$` delimiters, matching exactly) and that every carried-forward function body matches its live source (011/012/013/014) except for the intended authorization additions.

## Manual QA still required

Migration 016 has not been applied to Supabase and was not exercised end-to-end in this environment. After applying it:

- a professor assigned to exactly one program sees no picker and can manage that program's groups/memberships;
- the QA professor (assigned to General Medicine + Dentistry) sees a program picker, and switching programs reloads the scoped overview;
- the QA coordinator (assigned only to General Medicine) is denied access to Dentistry's groups/memberships if a Dentistry group/membership id is attempted directly;
- a professor cannot move a group from an authorized program into an unauthorized one;
- promoting a membership does not silently demote a primary membership in a program the actor isn't authorized for, and the operation is denied (not silently skipped) in that case;
- a professor can re-add a student who previously had a membership (now ended) in their program, but cannot add a student with no prior association with that program;
- an inactive/archived program blocks staff mutations but remains readable;
- University Admin can grant/revoke professor/program_coordinator assignments only within their own university; Platform Admin can do so for any selected university; Program Coordinator cannot reach the grant/revoke RPCs successfully;
- granting an assignment that already exists succeeds idempotently rather than erroring;
- revoking removes exactly one assignment and leaves every other `profile_roles` row for that profile untouched;
- every grant/revoke produces a row in `academic_program_staff_assignment_audit_events`; every staff-authorized group/membership mutation produces a row in the existing audit tables with `actor_role` set to `professor`/`program_coordinator`;
- University Admin and Platform Admin's own existing group/membership/faculty/program/year/term editing behavior is unchanged;
- `/admin/organizations` and all prior academic editors are unaffected;
- both locales render the new program picker, program-staff group/membership editor, and the admin assignment editor correctly.

## Deferred work

TASK 004.6.2 (nominal Professor/Group assignment, "My groups," self-request, Program Coordinator approval), TASK 004.7 (student join requests), a general-purpose audit viewer, and the optional `profile_roles` uniqueness constraint (flagged in design review as a possible future hygiene improvement, not required for correctness) remain deferred.
