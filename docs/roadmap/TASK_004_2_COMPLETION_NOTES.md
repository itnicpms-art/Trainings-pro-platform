# TASK 004.2 Completion Notes

## Completed scope

- Added migration `008_organizations_write_access.sql` without modifying migrations 001–007.
- Formalized `organizations.status` with an explicit `active` / `inactive` / `suspended` / `archived` check constraint (the foundation column previously had none).
- Added a scoped organizations editor overview RPC and audited create/update RPCs, all `SECURITY DEFINER` with `SET search_path = public`, reusing `has_platform_admin_console_access(requested_profile_id)`.
- Added `platform_admin_organization_audit_events` with mandatory before/after snapshots for every organization mutation.
- Enhanced `/{locale}/admin/organizations` with create and edit controls, restricted to Platform Admin by the existing admin layout.
- Added automatic, editable slug generation with Romanian diacritic removal, hyphen normalization, and collision suffixes (`-2`, `-3`, …).
- Added the required bilingual note clarifying that faculties and departments remain managed separately in Academic structure.
- Kept `/admin/academic-structure` unchanged; the two pages remain separate and unmerged.

## Security confirmation

- The active profile is derived server-side; the browser does not choose an arbitrary actor profile.
- Every RPC independently re-validates `has_platform_admin_console_access`, so the admin layout is not the only authorization barrier.
- No direct table write is performed by runtime application code; all writes go through the three new RPCs.
- No broad RLS policy or table grant was added, and RLS was not weakened; `organizations` retains its existing policies.
- The audit table has RLS enabled and no public/authenticated read or write policy; direct privileges are revoked from `public`, `anon`, and `authenticated`.
- `EXECUTE` on the three new RPCs is revoked from `public`/`anon` and granted only to `authenticated`.
- No service-role key, secret, environment file, fake organization, or fake metric was added.
- No DELETE RPC or hard-delete UI exists.
- An empty slug is generated server-side from the name; a manually supplied duplicate slug still fails explicitly instead of being silently suffixed.
- The pre-existing `prevent_incompatible_organization_type_change` trigger (TASK 003/004) continues to guard `type` changes against organizations with incompatible academic or training records; this task adds no bypass for it.
- Faculty/department editing, member/role assignment, and academic-unit access are not exposed anywhere on this page.

## Validation

- `npx pnpm@11.19.0 lint`: passed, no warnings or errors.
- `npx pnpm@11.19.0 build`: passed; Next.js compiled, type-checked, and generated both localized `/admin/organizations` routes (a stale `.next/dev` type-validator error unrelated to this change was cleared by removing the gitignored `.next` cache before rebuilding).
- `git diff --check`: passed, no whitespace errors.
- Static security review: RPC-only runtime access, Platform-Admin-only authorization, explicit type/status/slug validation, no broad grants, and mandatory audit inserts confirmed.

## Manual QA status

Authenticated browser QA was not executed in this implementation environment because applying migration 008 and using a privileged Platform Admin QA session were not part of the local validation run. No password or secret was entered or exposed.

After migration 008 is applied, verify:

- Platform Admin can create an organization and a university from `/{locale}/admin/organizations`;
- the create form exposes exactly `Type`, `Name`, `Internal slug`, `Website`, `Status`, `Description`, and `Logo URL`, with no delete control and no member/role assignment control;
- generated slugs are lowercase, URL-safe, no longer contain Romanian diacritics, collapse repeated separators, and receive `-2`, `-3`, and later suffixes on collisions;
- manually edited slugs remain unchanged by later name edits, and duplicate manually supplied slugs are rejected with the safe duplicate message;
- changing only `status` on an existing organization is recorded as a `status_change` audit event, while other field edits are recorded as `update`;
- attempting to change a university's `type` away from `university` while it still has academic records is rejected by the existing TASK 003 trigger;
- non-Platform-Admin profiles (Professor, Coordinator, Academic Student, University Admin, organization roles, Individual Learner) have no write controls and no successful write access to these RPCs;
- `/admin/academic-structure` is unaffected and still manages only faculties and departments;
- `/ro/admin/organizations` and `/en/admin/organizations` are both localized, including the new note about faculties/departments being managed separately;
- `/ro/admin`, `/en/admin`, and unrelated admin routes remain protected and unchanged.

## Deferred work

Hard delete, organization member/role management, faculty/department editing from this page, bulk import/export, and a general-purpose audit viewer remain deferred to dedicated tasks.
