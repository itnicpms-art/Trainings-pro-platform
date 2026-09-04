# TASK 004.6 — Student Group Membership Management

## Scope

TASK 004.6 adds explicit, audited student ↔ academic group membership management. The hierarchy is now:

`University → Faculty → Department → Academic Program → Academic Year → Term / Semester → Academic Group → Student Membership`

This task does **not** implement student self-service join requests — that is TASK 004.7, fully unimplemented here (no request table, no RPC, no UI).

## Model decision: reuse, not a new table

Before writing migration 012, `public.academic_profile_contexts` (migration 004) was inspected against every product rule this task needs, and found sufficient. **No new membership table was created.**

- It already has every field a membership needs: `profile_id` (the student), `organization_id`, `academic_program_id`, `academic_year_id`, `academic_term_id`, `academic_group_id`, `status`, `is_primary`, `started_at`, `ended_at`.
- `academic_profile_contexts_group_same_program_fk` — `foreign key (academic_group_id, organization_id, academic_program_id) references academic_groups(id, organization_id, academic_program_id)` — already guarantees, at the database level, that a group assignment is consistent with the student's own program and university. This is exactly the "group program must be compatible with student program" rule the task asks for, already enforced before this migration existed.
- `academic_profile_contexts_one_primary_per_profile_idx` — a partial unique index on `profile_id` where `is_primary and status = 'active'` — already enforces at most one active primary context per profile. This is exactly the primary-membership rule this task needs, with no new constraint required.
- Nothing needs to be deleted to preserve history: a **move** ends the old row (`status = 'inactive'`, `ended_at = current_date`) and inserts a new one; an **end** only changes `status`/`ended_at`/`is_primary` on the existing row. A profile naturally accumulates multiple rows over time — that multiplicity already is the history.

The only thing genuinely new is the *editing capability* (RPCs) and the *audit trail* — the data model itself was already correct.

## Primary membership rule — exact scope

The one-primary-per-profile rule enforced by `academic_profile_contexts_one_primary_per_profile_idx` is **global across the whole table, not scoped by `organization_id`** — the index key is `profile_id` alone. Every RPC that needs to find "the other primary row" for a student (in `add_student_to_group` and `set_primary_group_membership`) deliberately queries by `profile_id` alone, matching that real scope, rather than adding an organization filter that the database itself does not apply.

## Access model

**University Admin** (`/{locale}/app/manage/academic`) and **Platform Admin** (`/{locale}/admin/academic-structure`) can add, move, and end memberships and change the primary flag — scoped to their own university (University Admin) or the selected university (Platform Admin), reusing `resolve_academic_units_editor_mode(...)` from migration 007 exactly like every prior TASK 004.x write RPC. Neither can hard-delete a historical record, and neither can act outside their scoped university.

**Professor / Coordinator / Program Coordinator: read and write access unchanged (none added).** This was investigated carefully, not assumed:

- `profile_roles(scope_type = 'program', scope_id = <academic_program_id>)` **is** a real, already-enforced relation — the `roles` seed gives both `professor` and `program_coordinator` `scope: 'program'`, and `get_academic_structure_management_overview` (migration 006, lines 36–48 and 84–95) already validates exactly this shape today to gate their *read* visibility into their own program's structure.
- However, that relation has only ever been used for **read scoping** ("what can this person see"), never for **write authority** ("what can this person change"). Every prior TASK 004.x write migration (007, 009, 010, 011) restricts writes to `university_admin`/`platform_admin` only — none of them has ever granted `professor`/`program_coordinator`/`coordinator` write access to faculties, programs, years, terms, or groups, despite the read-scoping relation having existed since migration 006.
- Extending a role's *read* scope into new *write* authority over student membership is a product decision, not a fact "the schema already proves." Given the unbroken precedent across four prior write-access tasks, this migration keeps that same boundary rather than being the first to break it based on an inference about what "program coordinator" should imply for membership specifically.
- **Conclusion, matching the task's explicit fallback**: Professor/Coordinator/Program Coordinator get no new UI, read or write, in TASK 004.6. Their existing `/app/manage/academic` experience (the read-only `AcademicStructureView` context/sections) is completely unchanged. If a future task decides program-scoped write access is warranted, `profile_roles(scope_type='program')` is the concrete, already-proven relation to build on — documented here for that purpose.

**Student**: no new self-facing UI was added. The existing Home context readout (`get_home_academic_context`, migration 005) already surfaces a student's current primary group by name/code and is preserved untouched — it continues to reflect whatever this task's RPCs write, since it reads the same `academic_profile_contexts` rows. A dedicated "My groups" view showing full membership history (including secondary/ended memberships) was explicitly optional in the task brief and was not built, to keep this already-large task's scope bounded; it remains a candidate for a small follow-up.

## Hierarchy validation

For `add_student_to_group`: the student must be an active `profile_type = 'student'` profile with `university_id` equal to the target university; the target group must belong to that university and be `active` (not `archived`, not `inactive` — an active membership can only be created under an active group); if the student already has an active primary membership in a *different group*, the call is rejected (use `move_student_group_membership` instead); if that existing primary membership is in a *different program*, the call is rejected outright — **the student's program is never silently rewritten**.

For `move_student_group_membership` and `end_student_group_membership`: no university parameter is accepted at all — the university is derived from the existing membership row, so a cross-university move is structurally impossible, not just rejected by validation (matching the TASK 004.3/004.4/004.5 precedent). A move additionally requires the destination group to be in the *same academic program* as the membership being moved — moving to a different program is rejected with a clear error rather than attempted.

A membership's `academic_year_id`/`academic_term_id` are always derived directly from the target group's own values, never accepted as independent parameters — so an "incompatible year/term" state cannot occur by construction; there is nothing for the caller to mismatch.

## Deferred work

- TASK 004.7 — Group Join Requests & Approval Workflow (student self-service);
- Professor/Program Coordinator write access to their own program's group memberships, if a future task decides to extend the documented `profile_roles(scope_type='program')` relation to membership writes;
- a dedicated "My groups" read view for students beyond the existing Home primary-group readout;
- hard delete (intentionally never provided);
- a general-purpose audit viewer for these events.
