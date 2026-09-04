# TASK 004.5 — Academic Groups Editable Management

## Scope

TASK 004.5 adds controlled editing for academic groups. The hierarchy remains:

`University → Faculty → Department → Academic Program → Academic Year → Term / Semester → Academic Group`

This task **does not** implement student membership or join requests. Those are separate, explicitly planned follow-up tasks:

- **TASK 004.6 — Student Group Membership Management**: assigning/removing students on a group.
- **TASK 004.7 — Group Join Requests & Approval Workflow**: a self-service request/approval flow for students to join a group.

No membership row is created, changed, or read by this task, and no student/professor membership UI exists anywhere in this change.

## Real schema used

Before writing migration 011, `public.academic_groups` from `supabase/migrations/004_organizations_academic_structure.sql` was inspected and used as-is — no column, enum value, or relationship was invented:

- **`academic_program_id` is required (`not null`)** — every group must belong to a program.
- **`academic_year_id` and `academic_term_id` are optional (nullable)** — a group does not have to be tied to a specific year or term.
- `foreign key (academic_program_id, organization_id) references academic_programs(id, organization_id)` — the program must belong to the same university as the group.
- `foreign key (academic_year_id, organization_id) references academic_years(id, organization_id)` — if a year is set, it must belong to the same university.
- `foreign key (academic_term_id, organization_id, academic_year_id) references academic_terms(id, organization_id, academic_year_id)` — if a term is set, it must belong to the same university **and** the same year as the group.
- `check (academic_term_id is null or academic_year_id is not null)` — a term can never be set without a year.
- `unique(organization_id, code)` — code uniqueness is **university-scoped**, matching faculties/departments/programs, not the year-scoped pattern used by `academic_terms`.
- `status` uses the same four-value domain as every other academic table (`active`/`inactive`/`suspended`/`archived`).

### Existing membership relation discovered

`public.academic_profile_contexts` (also migration 004) already links a profile to `academic_group_id`, via `academic_profile_contexts_group_same_program_fk` — a compound foreign key ensuring the linked group shares the same `organization_id` and `academic_program_id` as the profile's own program context. **This is the real profile-to-group relationship the schema already models.** It is currently read-only (used by the Home context readouts and the read-only academic structure overview). TASK 004.5 does not read, write, or otherwise touch this table — TASK 004.6 is expected to add the editing RPCs for it, reusing the same relationship rather than inventing a new one.

## Access model

University Admin uses `/{locale}/app/manage/academic`. The active profile must be owned by the authenticated user, active, assigned the `university_admin` role with `scope_type = university`, and scoped to the target university. It can create and update academic groups only inside that university.

Platform Admin uses `/{locale}/admin/academic-structure`. The existing admin layout still requires both the scoped `platform_admin` role and the `admin.access` permission. Once a university is selected, the Academic Groups section sits below the existing Faculties/Departments, Academic Programs, Academic Years, and Semesters editors.

Professor and Coordinator keep the existing read-only group visibility; this task adds no new write permission for them. Academic Student group visibility is unchanged (read-only, no join-request control).

`/admin/organizations` is untouched; organizations and universities are still managed there exclusively (TASK 004.2).

## Editable fields

Academic program (required), academic year (optional), academic term/semester (optional, only selectable once a year is chosen, filtered to that year's own terms), name, code (auto-generated from the name, editable, uppercase, diacritics removed, university-scoped uniqueness), description, status. `description` is not in this task's suggested field list but is included because the column exists and every sibling editable entity in this hierarchy already exposes its own `description` column — omitting it here would be an unexplained inconsistency across the same page's editors, and would make the column permanently unmanageable through the UI.

## Hierarchy and status rules

Rules mirror the precedent already established by TASK 004.1/004.3/004.4, applied independently to each of the group's three possible parents (program, year if present, term if present):

- A group cannot be created under an archived program, year, or term.
- An existing group may keep an archived parent only if it is not moved away from that parent **and** its own status also becomes/stays `archived`; it can never be freshly created or moved into an archived parent.
- An active group always requires an active program, and — when set — an active year and an active term.
- A term can only be set together with a matching year, and must belong to that year in the same university (enforced both by the real DB foreign key and, with a friendlier message, by the RPC before it ever reaches the database).
- These RPCs never write to `academic_programs`, `academic_years`, or `academic_terms` — there is no cascade in either direction between a parent's status and its groups beyond the create/update-time eligibility checks above. If a program, year, or term is later changed to `inactive`/`archived` by their own editors (TASK 004.3/004.4), existing groups under it are left completely untouched; only *future* writes to those groups are constrained by the rules above. No group is silently deleted, reassigned, or reactivated as a side effect of a parent's status changing.
- `update_academic_group` never accepts a university parameter; the university is always derived from the existing row, so moving a group to a different university is structurally impossible, not just rejected by validation.
- Status is restricted to `active`/`inactive`/`archived` at the RPC layer, even though the column also allows `suspended` — the same restriction already applied to every other editable entity in this hierarchy.

## Database and security boundary

Migration `011_academic_groups_write_access.sql` adds:

- `get_academic_groups_editor_overview(requested_profile_id, target_university_id)`;
- `create_academic_group(...)` / `update_academic_group(...)`;
- `academic_group_audit_events` for immutable create, update, and status-change evidence.

No column, constraint, or enum value was added to `academic_groups`; migration 011 is purely additive (new audit table + new RPCs), exactly like migrations 007, 009, and 010. All three RPCs reuse `public.resolve_academic_units_editor_mode(requested_profile_id, target_university_id)` from migration 007 for actor/scope resolution.

The RPCs are `SECURITY DEFINER` with `SET search_path = public`. No broad `SELECT`, `INSERT`, `UPDATE`, or `DELETE` policy is added. Direct audit-table privileges are revoked from `public`, `anon`, and `authenticated`; writes occur only inside the scoped RPC transaction. No service-role credential is used by runtime application code. `auth.users` is never queried or returned. Migrations 001–010 are unchanged.

## Audit behavior

Every successful create writes an audit event with the resulting row snapshot. Every successful update writes before and after snapshots. An update that changes `status` is recorded as `status_change`; any other successful update is recorded as `update`. Failed authorization or validation does not mutate the group and does not create an audit event.

## Error mapping

`create_academic_group`/`update_academic_group` raise every business-rule violation with errcode `22023`, distinguished by a stable, specific message. `src/lib/manage/mutate-academic-group.ts` matches those exact messages to derive specific action-state reasons (`archivedParent`, `inactiveParent`, `invalidTermYear`) with their own localized RO/EN copy, instead of collapsing them into a generic "could not be saved" message — the same fix already applied to the TASK 004.4 year/term editors, applied here from the start.

## Deferred work

- TASK 004.6 — Student Group Membership Management (assigning/removing students via `academic_profile_contexts`, reusing its existing schema);
- TASK 004.7 — Group Join Requests & Approval Workflow;
- hard delete;
- a general-purpose audit viewer for these events.
