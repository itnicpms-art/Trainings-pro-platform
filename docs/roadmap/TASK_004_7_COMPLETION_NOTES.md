# TASK 004.7 Completion Notes

## Completed scope

- Added forward-only migration `019_student_academic_group_join_requests.sql` without modifying migrations 001–018 (016/017/018 are already applied to production and immutable).
- Added `academic_group_join_requests` (current request state; `status in ('pending','approved','rejected','cancelled')`; partial unique index `(student_profile_id, academic_group_id) where status='pending'`; no `requested_by_profile_id` — the creator is always `student_profile_id`) and `academic_group_join_request_audit_events` (immutable history; `actor_role` adds `'student'` as a new value alongside `professor`/`program_coordinator`/`university_admin`/`platform_admin`; `action in ('request','approve','reject','cancel')`).
- Added `request_academic_group_join`, `cancel_academic_group_join_request`, `approve_academic_group_join_request`, `reject_academic_group_join_request`, and `get_student_academic_group_join_overview` — all `SECURITY DEFINER`. Request idempotency is `INSERT ... ON CONFLICT ... DO NOTHING` on the partial unique index, not a pre-check race. Approval delegates the actual membership mutation to `add_student_to_group` unchanged (no duplicated business logic), and is idempotent — via an upfront check plus a narrow `unique_violation` catch around the nested call — when the exact student+group membership already exists.
- `create or replace`'d `get_program_staff_academic_overview` (migrations 016/018 untouched) and `get_student_group_membership_editor_overview` (migration 012 untouched — this function was never touched by 016 or 018) with one additive field, `pending_join_requests`, scoped to the program or to the resolved university respectively. Unlike migration 018's `eligible_professors`, this is never filtered for a plain professor — product rule 3 explicitly authorizes them to approve/reject in their own program.
- Extended `src/types/database.ts`: new `PendingAcademicGroupJoinRequest`, `StudentAcademicGroupMembership`, `StudentEligibleAcademicGroup`, `StudentAcademicGroupJoinRequest`, `StudentAcademicGroupJoinOverview` types; both existing overview types gain `pending_join_requests`; five new `Functions` entries.
- Added `src/lib/manage/get-student-academic-group-join-overview.ts` and `src/lib/manage/mutate-academic-group-join-request.ts` (new wrappers, mirroring this codebase's established `T | null` / discriminated-union-by-intent conventions exactly).
- `adaptProgramStaffOverview` now also threads `pending_join_requests` through into the `StudentGroupMembershipEditorOverview`-shaped object it builds (required by the extended type; not itself consumed by `GroupMembershipPanel`, which doesn't render it — the professor/coordinator page reads `pending_join_requests` from the raw `programStaffOverview` directly for its own `PendingGroupJoinRequestsPanel`).
- Added `src/components/manage/pending-group-join-requests-panel.tsx` (approver-side: a flat actionable queue, not nested per group) and `src/components/manage/student-group-join-overview.tsx` (student-side: memberships / eligible groups / requests, three sections).
- Added the new student route `src/app/[locale]/app/groups/page.tsx` + `actions.ts` (profile_type-gated at the page level; the RPC independently re-enforces the same check).
- Wired `PendingGroupJoinRequestsPanel` into all three reachable branches of `/[locale]/app/manage/academic` (professor/coordinator early return, the University-Admin partial-overview fallback, and the full-overview success path) and into `/[locale]/admin/academic-structure`, each via a new shared mutation wrapper and per-page server actions (`mutateAcademicGroupJoinRequestAction`, `mutateAdminAcademicGroupJoinRequestAction`, `mutateStudentAcademicGroupJoinRequestAction`), matching every existing action in all three `actions.ts` files exactly.
- Added a new `myGroups` quick-action link (`/${locale}/app/groups`) to the Home dashboard's existing `DashboardQuickActions` sidebar, shown only for the `academicStudent` variant — the only dashboard surface with real (non-"coming soon") links today.
- Added the `groups` (student page) and `joinRequestsEditor` (approver panel) translation blocks to both `ro.ts` and `en.ts`.
- Updated `docs/CODEX_TASK_INDEX.md`.

## Next.js guides consulted

`node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` (new route/page creation under the `app` directory — confirmed the plain `page.tsx`-per-folder convention this codebase already uses needed no deviation) and `.../02-guides/server-actions.md` / `.../forms.md` (re-confirmed from TASK 004.6.2; the same form-action/`useActionState`/mandatory-server-side-authorization/`revalidatePath` pattern applies unchanged to the new mutation flows).

## Migration state

- Migrations 001–018 are unchanged. 016, 017, and 018 are already applied to production and remain immutable; none was edited.
- `019_student_academic_group_join_requests.sql` is the only new migration. It has **not** been applied remotely and no seed was run against production — this is source-only work, pending review.
- `get_program_staff_academic_overview` and `get_student_group_membership_editor_overview` both keep their exact signatures, so their existing grants are preserved automatically; only the five new functions needed explicit `revoke`/`grant`.

## Security confirmation

- Every new/extended RPC re-validates authentication, active profile ownership, and authorization before any mutation. Approval/rejection authorization is exactly `resolve_academic_program_editor_mode` — no parallel permission system was introduced.
- Request-time eligibility is always a real, current `academic_profile_contexts` row for the exact program (`status = 'active'`) — never `profile_type` alone, and never satisfied by a historical-only association.
- No direct table grants were added; RLS remains enabled with zero policies on both new tables, matching every table from migration 004 onward. `revoke all ... from public, anon, authenticated` was applied to both, and independently confirmed by executing a direct `INSERT`/`SELECT` against both tables as the real `authenticated` Postgres role (not the harness superuser) in the local PGlite run below — both were rejected, while the RPC itself still succeeded for that same role.
- No hard delete anywhere; none of the five new RPCs has an exception handler except `approve_academic_group_join_request`'s single, narrowly-scoped `when unique_violation` catch (the one 23505 `add_student_to_group` can raise, for the documented idempotent-race case) — every other failure path propagates uncaught, aborting the whole transaction.
- No avoidable `FOR UPDATE` lock is acquired before the actor is authorized for the resource being locked, in any of the four new mutation RPCs — see the task doc's "RPCs" section for the exact lock order in each.
- Approval never derives eligibility or program boundary from `add_student_to_group` alone — product rule 8's own revalidation (student active, student's program association still active, group/program still active, group/program/organization tuple unchanged) runs first, under the request row's own lock, independently of whatever `add_student_to_group` itself later re-checks.

## Validation

- `corepack pnpm lint`: passed, no warnings or errors.
- `corepack pnpm build`: passed; Next.js compiled and type-checked successfully, including the two extended overview return types, the five new function entries, and the new `/app/groups` route.
- `git diff --check`: passed, no whitespace errors.
- Migration 019 was re-read in full after writing it to confirm balanced `$$`/`begin`/`end` blocks (7 functions × 2 = 14 `$$` delimiters, matching exactly) and that both carried-forward function bodies (`get_program_staff_academic_overview`, `get_student_group_membership_editor_overview`) match their live migration-018/012 source except for the intended additive field.
- Migrations 001–018 confirmed unchanged: `git diff origin/main -- supabase/migrations/001*.sql ... 018*.sql` is empty (the branch was created directly from `origin/main`, so this diff is trivially empty by construction, and was re-checked after writing migration 019 to confirm nothing else touched those files). No migration 020 exists.
- Migration 019 was **executed**, not just statically reviewed: migrations 001–019 were applied, in order, to a throwaway in-memory Postgres (PGlite, run from outside the repository, with stand-ins for Supabase's `auth.users`/`auth.uid()`/`anon`/`authenticated`), and 71 scenario checks were run against it, covering:
  - request creation: success, program-boundary denial (no active association, historical-only association, cross-university), archived/inactive group denial, inactive-program denial, already-active-member denial, duplicate-pending idempotency (including that no extra audit row is written on the duplicate);
  - the student read model: full membership list (not just primary), eligible-groups exclusions (already a member, already pending), requests list, and denial for a non-student profile;
  - approval: authorization matrix (professor denied on another program's request, professor/program_coordinator/university_admin/platform_admin each approving correctly with the actor's real role recorded in the audit row), the primary-vs-secondary computation on both a student with and without an existing primary, re-approval of an already-approved request denied;
  - approval idempotency when an active membership for the exact student+group already exists beforehand (no new row, no false membership-create audit event, `resulting_membership_id` links the pre-existing row);
  - stale requests at approval time: group archived, program made inactive, and the student's active program association ended — each denied with the specific documented reason, the request left pending, still cancellable by the student and still rejectable by an approver;
  - cancel: non-owner denied, owner succeeds, re-cancelling an already-cancelled request denied, exactly one audit row;
  - approver-side read models: a professor sees only their own program's pending requests, university admin and platform admin both see the whole university's;
  - direct table access as the real `authenticated` Postgres role (not the harness superuser) is rejected for both new tables, while the RPC itself still succeeds for that role.
  - The same suite, run before fixing a genuine bug this process found (see below), failed at the point the bug was exercised.
- **A genuine bug was found and fixed by this execution, not by static review**: `reject_academic_group_join_request`'s `decision_note` parameter had the same name as the `academic_group_join_requests.decision_note` column; inside `UPDATE ... SET decision_note = nullif(btrim(decision_note), '')`, PL/pgSQL's default `variable_conflict = error` setting correctly refused to guess whether the bare identifier meant the parameter or the column being updated, raising `42702 "column reference is ambiguous"` at the first real call — a runtime error that plpgsql's own create-time syntax check cannot catch, since the ambiguity only exists once that specific statement actually plans. Fixed by renaming the parameter to `decision_note_input`; no other function had a colliding parameter/column name in a context where the ambiguity can arise (confirmed by auditing every `UPDATE ... SET` in the migration, not just the one that failed).
- Concurrent-session races (e.g. the advisory-lock-free, truly-concurrent form of "approval vs. a simultaneous direct `add_student_to_group` call") cannot be exercised in a single in-process PGlite connection; the sequential approximation (pre-creating the conflicting membership, then approving) was run instead and is documented above as such — this is the same disclosed limitation as TASK 004.6.2's own validation notes. No Supabase project, remote database, or seed was touched, and the harness is not part of this repository.

## Manual QA still required

Migration 019 has not been applied to Supabase and was not exercised end-to-end against a real browser session. After applying it:

- a student can request to join an active group in a program they are actively associated with, and sees it appear as pending immediately;
- requesting a group in a program the student has no active association with (or only a historical one) is denied with a clear message;
- requesting a group the student is already an active member of is denied cleanly; submitting the same request twice shows the existing pending request rather than an error;
- a professor/program_coordinator sees pending requests for their own authorized/coordinated program only, on `/app/manage/academic`;
- a university admin sees pending requests across their own university, and a platform admin for the selected university, both on their respective existing pages;
- approving a request creates the membership (primary if the student had none, secondary otherwise) and the request disappears from the pending list;
- rejecting a request (with an optional reason) removes it from the pending list without creating a membership;
- a student can cancel their own pending request from `/app/groups`, and it moves to the request history section there;
- a stale request (group archived, program deactivated, or the student's program association ended after the request was filed) is denied at approval time with a specific message, remains visible as pending, and can still be cancelled or rejected;
- both locales render `/app/groups` (the memberships/eligible-groups/requests sections, the request and cancel actions) and the new pending-requests panel on both management pages correctly;
- the new "Grupele mele" / "My groups" quick-action link appears only for a student's Home dashboard, and the dashboard is otherwise unaffected for every other role;
- `/admin/organizations` and all prior academic editors (faculties/departments, programs, years, terms, groups, program/group staff) behave exactly as before this task.

## Deferred work

Professor self-request/auto-approval workflows beyond what already exists for staff (there are none); request expiry/TTL/cron; a broader Home/dashboard redesign; Course/Course Offering staff assignment (TASK 004.8.1); enrollment/course-enrollment systems; a general-purpose audit viewer — none of them are implemented here.
