# TASK 004.6.1 — Academic Staff Program Assignments & Program-Scoped Group Management

## Scope

Extends the academic staff authorization model for **Professor** (`professor`) and **Program Coordinator** (`program_coordinator`) — the two real, already-seeded `public.roles.code` values (no generic `coordinator` role exists; it appears only as a `profiles.profile_type` value and as a defensive, currently-unreachable literal in migration 006's role list).

**PROGRAM ASSIGNMENT CONTROLS AUTHORIZATION. GROUP ASSIGNMENT CONTROLS RESPONSIBILITY, NOT ACCESS.** A professor or program_coordinator authorized for an academic program may manage every group and student membership inside that program, regardless of any nominal group-level assignment — which does not exist as an access concept anywhere in this task. Nominal staff-to-group assignment ("My groups", professor self-request, coordinator approval) is **TASK 004.6.2**, not implemented here. Student self-service join requests remain **TASK 004.7**, not implemented here. Courses/curriculum/lessons (**TASK 004.8**) are Codex-owned and untouched.

## Authorization model

Authorization is derived exclusively from `public.profile_roles(scope_type='program', scope_id=<academic_program_id>, role in (professor, program_coordinator))` — the same real relation migration 006 already reads for staff READ visibility, now also driving WRITE authorization for the first time. A profile may hold several such rows simultaneously: different programs, or `professor` in one program and `program_coordinator` in another. Nothing added here limits this to one.

`public.resolve_academic_program_editor_mode(requested_profile_id, target_academic_program_id)` (migration 016) is a **new**, additive resolver, checked in order: active profile ownership → target program exists (resolving its `organization_id`) → Platform Admin → University Admin for that program's own university → professor/program_coordinator exact-program assignment (with deterministic precedence: `program_coordinator` before `professor` if a profile somehow holds both for the same program) → deny. `public.resolve_academic_units_editor_mode` (migration 007) is **unchanged** and still the sole authority for faculty/department/organization/program/year/term editing — it is never called-and-caught as control flow by the new resolver; the University Admin/Platform Admin checks are inlined independently instead.

## Program assignment provisioning

`profile_roles` itself is **unchanged as a table**: no `revoked_at`/status/soft-delete column, no new unique constraint — it keeps representing only currently-active assignments, exactly like every other role on the platform. Grant inserts the exact row; revoke deletes that exact row (never a bulk delete). Full history lives in the new `academic_program_staff_assignment_audit_events` table instead, atomic with every grant/revoke.

`grant_academic_program_staff_role`/`revoke_academic_program_staff_role` (migration 016): only University Admin (own university) / Platform Admin (selected university) may call these — authorized via the existing, unmodified `resolve_academic_units_editor_mode`. Program Coordinator cannot grant or revoke program-level authorization in this task. Grant validates: target program exists; target profile exists, is active, and belongs to the *same university* as the program (`profiles.university_id` — the platform's existing, already-load-bearing one-profile-one-university mechanism, reused here rather than inventing anything new); target profile's `profile_type` is an eligible staff type (`professor`/`coordinator`); `role_code` is exactly `professor` or `program_coordinator`. Since `profile_roles` has no unique constraint, race-safety for concurrent grants of the exact same assignment comes from a transaction-scoped `pg_advisory_xact_lock`, not from the schema; an already-existing exact assignment is handled idempotently (returns success, does not insert a duplicate).

## Cross-program safety

Two existing write RPCs mutate more than the row an actor directly requested, and both needed an extra authorization check to stay safe once professor/program_coordinator could reach them:

- **`update_academic_group`** can move a group between programs (`target_academic_program_id` is a distinct parameter from the group's current `academic_program_id`). A professor/program_coordinator authorized only for the source program must not move a group into a program they aren't also authorized for — so when the target differs from the source, the target program is authorized independently too. University Admin/Platform Admin are unaffected (their university-wide authority already covers both).
- **`set_primary_group_membership`** can demote another active primary membership belonging to the *same student*, located via a deliberately global, cross-university search (the one-primary-per-profile rule has no organization scope). If that other membership sits in a different program than the one the actor just authorized, promoting the requested membership must not silently demote it — the whole operation is denied unless the actor is *also* authorized for that other program. University Admin/Platform Admin keep their existing unconditional behavior.

`move_student_group_membership` and `end_student_group_membership` need no equivalent second check: the former's own business rule already forces the target group into the same program as the source membership, so authorizing the source program is sufficient.

## Program status and student eligibility for staff

For professor/program_coordinator specifically (University Admin/Platform Admin keep their existing TASK 004.5/004.6 behavior unchanged): an inactive/archived program stays visible for read purposes but blocks every group/membership mutation. Eligible students for the staff-scoped editor are university-active students who already have a real `academic_profile_contexts` association with the *target program specifically* — active **or historical** (TASK 004.6 explicitly allows a student to have zero active memberships after an "end" and remain eligible for later re-addition, so this check is not `status='active'`-only). This is enforced in the mutation RPC itself (`add_student_to_group`), not only in the UI, and is what keeps staff from taking an arbitrary university student and creating their first association with an unrelated program.

## Multi-program read model

Migration 006's existing read RPC (`get_academic_structure_management_overview`) resolves at most **one** program per call via `LIMIT 1`, derived from the profile's own single `academic_profile_contexts` row — it cannot represent, and is not reused for, a staff profile with multiple simultaneous assignments. Two new functions instead:

- `get_assigned_academic_programs(requested_profile_id)` — the full set of programs the profile is currently assigned to (no `LIMIT 1`), each with its `role_codes` array (a program appears once even if both roles apply to it).
- `get_program_staff_academic_overview(requested_profile_id, target_academic_program_id)` — requires an explicit target (never an inferred "current" program), authorizes via `resolve_academic_program_editor_mode`, and returns *all* groups/memberships/eligible-students for that one program.

## UI

Reuses `/{locale}/app/manage/academic` — `canAccessAcademicStructureManagement` already whitelisted professor/program_coordinator for this route. No new top-level route. Zero assigned programs → clear restricted/empty state. One assigned program → no picker. Multiple → a plain `<form method="get">` program selector (mirroring the existing Platform Admin university selector on `/admin/academic-structure`) that reloads the page with the newly selected program's secure overview. The program-scoped overview is adapted (`adaptProgramStaffOverview`) into the same `AcademicGroupsEditorOverview`/`StudentGroupMembershipEditorOverview` shapes the existing `AcademicGroupsEditor`/`GroupMembershipPanel` components already consume, so those components are reused unmodified — no group/membership business logic is duplicated. `mutateAcademicGroup`/`mutateStudentGroupMembership` (the existing server actions) are reused as-is: both were already role-agnostic RPC passthroughs.

A new `AcademicProgramStaffEditor` component (University Admin/Platform Admin only) provides the grant/revoke UI, backed by a new `get_academic_program_staff_assignments_editor_overview` read RPC.

## Not part of this task

Nominal Professor/Group assignment, "My groups," professor self-request, Program Coordinator staff-group approval (TASK 004.6.2); student join requests (TASK 004.7); anything course/curriculum/lesson-related (TASK 004.8).
