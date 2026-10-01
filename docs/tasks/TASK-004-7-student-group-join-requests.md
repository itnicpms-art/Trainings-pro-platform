# TASK 004.7 — Student Academic Group Join Requests & Approval Workflow

## Scope

Adds a student-initiated request/approval layer on top of the existing membership RPCs (migration 012, extended in 016). This task introduces no new authorization concept: approval authorization is the exact same `resolve_academic_program_editor_mode` (migration 016, unchanged) every membership-write RPC already uses — whoever can already call `add_student_to_group` for a program could already, before this task, create that same membership directly. This task does not widen who can mutate membership; it adds a request/review step in front of a student's own join, and the approval RPC delegates the actual mutation to `add_student_to_group` unchanged, so no membership business rule is duplicated.

**PROGRAM ASSIGNMENT CONTROLS AUTHORIZATION. GROUP ASSIGNMENT/RESPONSIBILITY DOES NOT GRANT AUTHORIZATION** (TASK 004.6.1/004.6.2, unchanged and untouched by this task).

## Product rules (final, as approved)

1. **Request creator**: only a student creates a request, only for their own profile. Staff/Admin never create a request on a student's behalf — they keep using `add_student_to_group` directly, unchanged.
2. **Program boundary**: a student may request only an active group in a program where they currently hold an ACTIVE `academic_profile_contexts` association. Historical-only association is not sufficient. There is no cross-program request — the group's own program is the only program ever considered, and a request never creates or changes program enrollment by itself (there is no separate "target program" parameter at all).
3. **Approvers** are exactly the actors `resolve_academic_program_editor_mode` already authorizes for the request's program: professor (their authorized program), program_coordinator (their coordinated program), university_admin (their own university), platform_admin (the selected university). No parallel permission system.
4. **Lifecycle**: `pending -> approved | rejected | cancelled`. All three are terminal. No expired/TTL/cron in this task.
5. **Cancel**: only the requesting student, only while pending. Staff/Admin use reject, never cancel.
6. **Primary membership**: `is_primary` is never exposed to the student. On approval: the new membership is primary only if the student currently has no active primary membership at all, otherwise secondary. Approval never demotes or moves an existing primary — that remains exclusively TASK 004.6's own RPCs (`set_primary_group_membership`/`move_student_group_membership`).
7. **Duplicate/current membership**: request creation denies cleanly if already an active member of the exact group, and treats an already-pending request for the same student+group as a clean `already_pending: true` success, not an error (via `INSERT ... ON CONFLICT` on the partial unique index, not a pre-check-then-insert race). Historical ended membership never blocks a new request. Approval is idempotent if an active membership for the exact student+group already exists by the time it runs (whether it existed before approval started, or a concurrent `add_student_to_group` call won a race during the approval itself): no second membership is created, the request is still marked approved and linked to the existing membership, and no false membership-create audit event is written.
8. **Request-specific revalidation at approval**: before any membership mutation, under the lock already held on the request row, approval independently revalidates: request status is still pending; student profile is active; the student still has an ACTIVE association with the request's `academic_program_id`; the group is still active; the program is still active; the group/program/organization tuple is unchanged since the request was filed; the approver is still authorized (naturally re-verified again inside the nested `add_student_to_group` call). These are invariants of the request workflow itself — `add_student_to_group`'s own (differently scoped) checks are not relied on for them.
9. **Stale request**: if the program/group becomes inactive/archived, or the student's active program association ends, before approval runs, approval is denied with a clear reason and the request stays pending — no auto-reject, no auto-expire. The student can still cancel it; an approver can still reject it (rejection never re-validates group/program/student status, since it performs no membership mutation at all).

## Data model

`public.academic_group_join_requests` (migration 019) — current request state only, matching the required minimal column set exactly (`id`, `student_profile_id`, `academic_group_id`, `academic_program_id`, `organization_id`, `status`, `reviewed_by_profile_id`, `reviewed_at`, `resulting_membership_id`, `student_note`, `decision_note`, `created_at`, `updated_at`). No `requested_by_profile_id` — the creator is always `student_profile_id` (product rule 1). A partial unique index `(student_profile_id, academic_group_id) WHERE status = 'pending'` — the same technique `academic_profile_contexts_one_primary_per_profile_idx` (migration 004) already uses — allows unlimited historical (decided) requests for the same pair while preventing two simultaneous pending ones. The compound FK `(academic_group_id, organization_id, academic_program_id) -> academic_groups(id, organization_id, academic_program_id) on delete restrict` mirrors `academic_group_staff_assignments`'s (migration 018) existing pattern.

`public.academic_group_join_request_audit_events` (migration 019) — immutable, matching the established audit-table shape exactly. `actor_role` includes `'student'` — a new value, never used by a prior audit table — because a student is a valid actor for `request`/`cancel`; `professor`/`program_coordinator`/`university_admin`/`platform_admin` are valid actors for `approve`/`reject`, the same set `resolve_academic_program_editor_mode` already returns. `action` allows `request`/`approve`/`reject`/`cancel`.

RLS on both tables: enabled, zero policies, `revoke all ... from public, anon, authenticated`, matching every table from migration 004 onward. All access is through `SECURITY DEFINER` RPCs with explicit `auth.uid()`/profile-ownership validation.

## RPCs

`request_academic_group_join(requested_profile_id, target_academic_group_id, student_note)` — validates group/program active, the program-boundary association, and the duplicate/already-pending rules above; `INSERT ... ON CONFLICT (student_profile_id, academic_group_id) WHERE status = 'pending' DO NOTHING RETURNING ...`, falling back to a read of the existing pending row (`already_pending: true`) on conflict — no exception-based idempotency.

`cancel_academic_group_join_request(requested_profile_id, request_id)` — non-locking lookup confirms the caller is the requesting student, then the standard lock-and-revalidate-exact-row-before-mutate idiom (mirrors `revoke_academic_program_staff_role`), transitions to `cancelled`.

`approve_academic_group_join_request(requested_profile_id, request_id)` — non-locking lookup of the request's program -> `resolve_academic_program_editor_mode` (product rule 3) -> lock the exact request row and revalidate it (product rule 8) -> if an active membership for the exact student+group already exists, link it (product rule 7, idempotent) -> otherwise compute `is_primary` per product rule 6 and call `add_student_to_group` unchanged, catching only `unique_violation` (the one 23505 that function can raise, "already has an active membership in this group") as the same idempotent case, for the narrow concurrent-race window described in product rule 7 — no other exception is swallowed. Transitions the request to `approved` with `resulting_membership_id` set.

`reject_academic_group_join_request(requested_profile_id, request_id, decision_note)` — same authorization as approve; no membership mutation at all, so none of approve's request-specific revalidation applies — always allowed on a pending request regardless of group/program/student status drift (product rule 9).

`get_student_academic_group_join_overview(requested_profile_id)` — new: nothing like this existed before (a student previously had only the single-row Home readout, migration 005). Returns every one of the student's own `academic_profile_contexts` rows (not just the primary), every active group in a program they are actively associated with (excluding groups already actively joined or already pending), and every one of their own requests (pending + history).

## Integration with existing RPCs

`get_program_staff_academic_overview` and `get_student_group_membership_editor_overview` are both `create or replace`d with unchanged signatures (migrations 016/018 and 012 respectively untouched otherwise) to add `pending_join_requests`, scoped to the program (professor/program_coordinator/university_admin/platform_admin alike — unlike migration 018's `eligible_professors`, there is no privacy reason to filter this for a plain professor, since product rule 3 explicitly authorizes them to approve/reject in their own program) or to the resolved university (university_admin/platform_admin), respectively. `get_student_group_membership_editor_overview` was never touched by 016/018 — professor/program_coordinator already read through the separate `get_program_staff_academic_overview` instead, so this is the first time this specific function changes since migration 012.

## Concurrency

- **Duplicate request creation**: closed by the partial unique index + `ON CONFLICT`, not by a pre-check race.
- **Approve vs. reject/cancel on the same request**: lock-then-revalidate on the request row; the loser sees a clean "not pending" error, never a crash.
- **Approval concurrent with a direct `add_student_to_group` call**: `approve_academic_group_join_request`'s own pre-check (existing membership) plus its `unique_violation` catch around the nested call together cover both the "already existed before approval started" and "created during approval" orderings — product rule 7's idempotency, not a new advisory lock.
- **Group/program status change, or the student's program association ending, between request and approval**: product rule 8's explicit revalidation denies cleanly; no broad advisory lock is introduced — row-level locks and the existing unique constraints are sufficient, per the explicit instruction not to invent one where they already are.
- **Double approval**: the second call sees `status <> 'pending'` after acquiring the row lock and is denied cleanly.

## UI

Student: a new route, `/[locale]/app/groups` (profile_type-gated at the page level — the RPC independently re-enforces the same `profile_type = 'student'` check, so this is route-shell convenience, not the authorization boundary). Shows active/historical memberships (not just the single primary the Home context already shows), eligible groups with a request action, and the student's own requests (pending, with cancel; history, read-only). Linked from the Home dashboard's existing `DashboardQuickActions` sidebar (a real link, not one of the placeholder "coming soon" module cards that make up the rest of the dashboard today), shown only for the `academicStudent` variant.

Professor / Program Coordinator / University Admin: a new `PendingGroupJoinRequestsPanel`, rendered once per page (not nested per group, since it is an actionable inbox rather than per-group nominal state like `GroupMembershipPanel`/`AcademicGroupStaffPanel`) on the existing `/[locale]/app/manage/academic` — fed from `programStaffOverview.pending_join_requests` for professor/program_coordinator, `membershipEditorOverview.pending_join_requests` for university_admin, matching the exact two-source split the read model already has.

Platform Admin: the same panel on the existing `/[locale]/admin/academic-structure`, fed from the admin `membershipOverview.pending_join_requests`.

No new top-level admin route; no change to `/admin/organizations` or any prior academic editor.

## Not part of this task

Professor self-request / auto-approval workflows of any kind beyond what is specified above (there is none for staff); professor ↔ group responsibility (TASK 004.6.2, untouched); Course/Course Offering staff assignment or any Course/Course Offering/curriculum schema or code change (TASK 004.8, Codex-owned, untouched except reading already-shared tables where unavoidable — none were needed here); request expiry/TTL/cron; a broader Home/dashboard redesign (only one new real link was added to the existing `DashboardQuickActions` list); enrollment/course-enrollment systems.
