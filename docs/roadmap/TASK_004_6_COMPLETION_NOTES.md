# TASK 004.6 Completion Notes

## Completed scope

- Added migration `012_student_group_memberships.sql` without modifying migrations 001–011.
- **No new membership table.** `public.academic_profile_contexts` (migration 004) is reused as-is — see the model decision below.
- Added a scoped membership editor overview RPC and four mutation RPCs (`add_student_to_group`, `move_student_group_membership`, `end_student_group_membership`, `set_primary_group_membership`), all `SECURITY DEFINER` with `SET search_path = public`, reusing `resolve_academic_units_editor_mode(...)` from migration 007.
- Added `student_group_membership_audit_events` with mandatory before/after snapshots, plus explicit `old_academic_group_id`/`new_academic_group_id` columns, for every membership create/move/end/primary-change event.
- Enhanced `/{locale}/app/manage/academic` (University Admin) and `/{locale}/admin/academic-structure` (Platform Admin) with a "Group members" panel rendered inside each group's existing expandable section, below the TASK 004.5 group editor.
- Left Professor/Coordinator/Program Coordinator, `/admin/organizations`, and all prior academic editors (units, programs, years, terms, groups) completely untouched.
- Implemented no self-service join-request workflow — see the explicit confirmation below.

## Investigation: "student still shown as active" after End membership

Runtime QA reported that after clicking End, the student kept appearing as an active member — with no error shown, after the earlier `ended_at` constraint bug was already fixed and migration 012 re-applied. This was investigated end-to-end without database access, by tracing every layer of the actual code:

- `end_student_group_membership`'s SQL was re-read line by line: it correctly targets the submitted `membership_id`, updates `status`/`ended_at`/`is_primary` only when the row is currently `active`, and raises a real exception (which would surface as a visible error) if it is not.
- The "End" form's hidden fields (`intent`, `locale`, `membership_id`) were re-verified present and correctly wired to `mutate-student-group-membership.ts`'s zod schema and RPC call.
- Zod v4's `discriminatedUnion` behavior was verified directly (not assumed): extra form fields the "end" branch doesn't declare are silently stripped, and a real `gen_random_uuid()`-shaped id parses successfully — no validation bug here.
- This project's actual Next.js version's `revalidatePath`/caching docs (`node_modules/next/dist/docs/`, since this fork deviates from stock Next.js per `AGENTS.md`) were read directly: `fetch` requests are not cached by default in this build's active model (`cacheComponents` is not enabled in `next.config.ts`), and `revalidatePath` from a Server Function updates a currently-viewed path's UI immediately — matching how the action here is wired.

No further logic bug was found in the RPC, the schema validation, or the revalidation call. Given a live database wasn't available to directly confirm the row's post-call state, two independent, low-risk improvements were made instead of leaving the report inconclusive:

1. **Defensive payload verification** in `mutateStudentGroupMembership`: after a successful RPC call, the returned row's own `status`/`is_primary` fields are checked against what each intent claims to have done (`end` → `status: 'inactive'`, `move` → `status: 'active'`, `setPrimary` → `is_primary: true`). Any mismatch is now treated as an error instead of blindly trusting "no Postgres error" as "the operation did what it claims."
2. **UI restructuring**: the membership panel now shows *only* active memberships in the main list; ended ones move into a separate, clearly labeled, collapsed "Membership history" disclosure. Previously both were mixed in one list distinguished only by a badge color, which could read as "the student is still there" even when the status had changed correctly. This removes that ambiguity regardless of the underlying cause.

## Membership schema/model used

`public.academic_profile_contexts` (migration 004), unmodified. Relevant columns: `id`, `profile_id`, `organization_id`, `academic_program_id`, `academic_year_id` (nullable), `academic_term_id` (nullable), `academic_group_id` (nullable), `status`, `is_primary`, `started_at`, `ended_at`. No column was added.

## Was `academic_profile_contexts` reused or supplemented, and why

**Reused, not supplemented.** It already modeled everything the product rules required:

- `academic_profile_contexts_group_same_program_fk (academic_group_id, organization_id, academic_program_id) → academic_groups(id, organization_id, academic_program_id)` already guarantees a group assignment is consistent with the student's program and university.
- `academic_profile_contexts_one_primary_per_profile_idx` (partial unique index on `profile_id` where `is_primary and status = 'active'`) already enforces at most one active primary membership per student — globally across organizations, not per-university, since the index has no `organization_id` in its key.
- Multiple rows per profile were already possible (no conflicting uniqueness), so history is preserved simply by never deleting a row and always inserting a new one on a genuine group change.

Only the write RPCs and the audit trail were new; the data model required nothing.

## Exact membership status values

`academic_profile_contexts.status` allows `active`/`inactive`/`suspended`/`archived` at the database level (unchanged). These RPCs only ever write `active` (on create/move-into) or `inactive` (on end/move-out-of) — `suspended`/`archived` are never written by this task, matching the "no hard delete, no destructive states" requirement. `is_primary` is always cleared to `false` whenever a row's status is set to `inactive`, to avoid an "ended but still flagged primary" state.

## Exact primary-membership rule

At most one row with `is_primary = true and status = 'active'` per `profile_id`, enforced by the pre-existing partial unique index — no new constraint added. `add_student_to_group` rejects adding a primary membership when the student already has an active primary in a *different group*; `set_primary_group_membership` demotes any other active-primary row for the same student (found by `profile_id` alone, matching the index's real global scope) before promoting the requested one, inside the same transaction. The index caps the maximum at one; it does not require a minimum — **zero active primary memberships is a valid, supported state.**

## Confirmed: a student may have zero active group memberships

Investigated explicitly (not assumed) whether any schema constraint or RPC logic requires an active student to always have an active group. It does not, on either side:

- `end_student_group_membership` takes only `membership_id` — it has no group parameter, so it cannot request or require a destination even if it wanted to. It marks the row `status = 'inactive'` with `is_primary = false` and a safe `ended_at`, and never inserts a replacement row.
- `academic_profile_contexts.academic_group_id` is nullable with no constraint anywhere forcing it to be set when `status = 'active'`.
- `eligible_students` in `get_student_group_membership_editor_overview` queries `profiles` only — it has no join to `academic_profile_contexts` — so a student's group state (including having none) never affects their eligibility to be added to a group later.
- `add_student_to_group`'s primary-conflict check only fires when an existing active primary row *still has a group* (`existing_primary_group_id is not null`); after a membership is ended, that condition is false, so the student can be freely assigned to a new compatible group with no leftover blocker.
- Ending a membership only ever changes `status`/`ended_at`/`is_primary` on that one row — `organization_id`, `academic_program_id`, `academic_year_id`, and `academic_term_id` are left exactly as they were, so the ended membership's own history remains fully visible (not just in the audit log) in the group's member panel.

No code path anywhere assumed the opposite; the UI's "End membership" button already submitted no destination-group field. This turn's change was documentation and copy, not a behavior fix: an explicit comment was added directly above `end_student_group_membership` in migration 012 stating this guarantee for future readers, and the success message was updated to state explicitly that the student is not currently assigned to a group (see below).

## Exact hierarchy compatibility rules

- Student must be `profile_type = 'student'`, `status = 'active'`, and `university_id` equal to the target university.
- Target group must belong to the same university and be `status = 'active'` (archived and inactive groups both reject a new active membership, with distinct error messages).
- A student's existing academic program is never silently rewritten: if their current active primary membership is in a different program than the target group, the call is rejected with a specific error.
- `move_student_group_membership` additionally requires the destination group to share the *same* `academic_program_id` as the membership being moved; moving to a different program is rejected.
- `move_student_group_membership`/`end_student_group_membership`/`set_primary_group_membership` take no university parameter — it is derived from the existing row — so cross-university tampering is structurally impossible, matching TASK 004.3/004.4/004.5 precedent.
- A membership's year/term are always copied from the target group's own values; they are never independently supplied parameters, so an "incompatible year/term" input cannot occur.

## Audit implementation

`student_group_membership_audit_events` (RLS enabled, all direct privileges revoked from `public`/`anon`/`authenticated`) records every create/move/end/primary-change with a 4-value `action` enum (`create`/`move`/`end`/`primary_change` — deliberately distinct from the generic `create`/`update`/`status_change` triad used by other TASK 004.x audit tables, since membership operations have genuinely distinct semantics worth naming explicitly). Each row carries `actor_user_id`, `actor_profile_id`, `actor_role`, `student_profile_id`, `organization_id`, `old_academic_group_id`, `new_academic_group_id`, and `before_snapshot`/`after_snapshot` — a richer shape than prior audit tables, extended specifically because the task requires "old group, new group" to be directly queryable, not just embedded in a generic snapshot. A `move` writes one combined audit row capturing both the old and new group; a `set_primary_group_membership` call that also demotes another row writes one audit row per affected row.

## University Admin behavior

Can view groups and eligible students in their own university, add a student to a group (as primary or secondary), move a student between groups in the same program, end a membership, and promote a membership to primary — all through `/{locale}/app/manage/academic`, gated by the same `university_admin` scope check used by every prior TASK 004.x editor on that page.

## Platform Admin behavior

Identical actions, for the university selected on `/{locale}/admin/academic-structure`, gated by the existing `platform_admin` + `admin.access` layout check plus each RPC's own independent re-validation.

## Professor/Coordinator behavior

**Unchanged — no new read or write access.** Full reasoning, including the concrete evidence considered, is in `docs/tasks/TASK-004-6-student-group-membership-management.md`. In short: a real relation (`profile_roles(scope_type='program')`) exists and is already used for read-scoping elsewhere (migration 006), but no prior TASK 004.x write RPC has ever extended that relation into write authority, and this task keeps that same boundary rather than being the first to break it.

## Whether a real professor/group responsibility relation exists

`profile_roles(scope_type = 'program', scope_id = <academic_program_id>)` exists and is real (seeded with `scope: 'program'` for both `professor` and `program_coordinator` roles, and already enforced by `get_academic_structure_management_overview` in migration 006). It proves *program*-level scope, not *group*-level scope, and has only ever been used for read visibility. No table or relation proving group-level teaching/coordination responsibility exists anywhere in migrations 001–011.

## Student visibility behavior

Unchanged. The existing Home context readout (`get_home_academic_context`, migration 005) already shows a student's current primary group by name/code and continues to work correctly, since it reads the same `academic_profile_contexts` rows these RPCs maintain. No dedicated "My groups" page was added (explicitly optional in the task brief); this remains a candidate follow-up.

## Confirmation: no join-request workflow implemented

Confirmed. No request table, RPC, or UI for students to request/cancel a group join, or for anyone to approve/reject such a request, exists anywhere in this change. That is TASK 004.7, fully deferred.

## Security confirmation

- The active profile is derived server-side; the browser does not choose an arbitrary actor profile.
- Every RPC independently validates authentication, active profile ownership, role, scope, target university, and hierarchy.
- University Admin is limited to its scoped university; Platform Admin requires the existing platform role plus `admin.access` permission.
- No direct table write is performed by runtime application code.
- No broad RLS policy or table grant was added, and RLS was not weakened.
- `auth.users` is never queried or returned by any of these RPCs.
- No service-role key, secret, environment file, fake student, or fake membership was added.
- No DELETE RPC or hard-delete UI exists.

## Validation

- `npx pnpm@11.19.0 lint`: passed, no warnings or errors.
- `npx pnpm@11.19.0 build`: passed; Next.js compiled, type-checked, and generated both localized `/app/manage/academic` and `/admin/academic-structure` routes.
- `git diff --check`: passed, no whitespace errors.
- Static security review: RPC-only runtime access, scoped authorization, hierarchy validation, no broad grants, and mandatory audit inserts confirmed.

## Manual QA status

Authenticated browser QA was not executed in this implementation environment because a privileged University Admin / Platform Admin QA session with migration 012 already applied was not part of the local validation run. **Migration 012 must be applied manually in Supabase before any authenticated runtime QA** — the same manual-apply flow already used for migrations 007–011.

After migration 012 is applied, verify:

- University Admin can add an eligible student to a group in their own university, as either primary or secondary;
- adding a student who already has an active primary membership in a different group is rejected with a clear "primary conflict" message;
- adding a student whose existing program differs from the target group's program is rejected without silently changing their program;
- a student cannot be added to an archived or inactive group;
- moving a student to a group in a different academic program is rejected;
- moving preserves history — the old row becomes `inactive` with an `ended_at` date rather than being deleted, and a new `active` row is created;
- ending a membership sets it `inactive` and clears the primary flag without deleting the row;
- promoting a secondary membership to primary correctly demotes the previous primary membership for the same student;
- each add/move/end/primary-change produces an audit row in `student_group_membership_audit_events` with the correct action and old/new group ids;
- Platform Admin can perform the same actions for any selected university;
- Professor, Coordinator, Academic Student, and all other roles have no write controls and no successful write access to these RPCs;
- the existing Home context readout for a student with a primary group is unaffected;
- `/ro/app/manage/academic`, `/en/app/manage/academic`, `/ro/admin/academic-structure`, and `/en/admin/academic-structure` are localized, including the new "Group members" panel;
- `/admin/organizations` and all prior academic editors (faculties/departments, programs, years, terms, groups) behave exactly as before this task;
- homepage, auth/login/register/logout, onboarding, active-profile switching, and the QA seed are all unaffected.

## Deferred work

TASK 004.7 (Group Join Requests & Approval Workflow), Professor/Program Coordinator write access (pending a dedicated decision), a dedicated "My groups" student view, hard delete, and a general-purpose audit viewer remain deferred.
