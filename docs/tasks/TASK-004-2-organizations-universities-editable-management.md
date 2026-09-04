# TASK 004.2 — Organizations & Universities Editable Management

## Scope

TASK 004.2 makes `/{locale}/admin/organizations` editable for Platform Admin only. Platform Admin can:

- create an organization or a university;
- edit an existing organization or university;
- change its status;
- update `name`, `slug`, `type`, `status`, `website`, `description`, and `logo_url`.

Platform Admin cannot, from this page:

- hard-delete an organization or university;
- edit faculties or departments — that remains in **Structure academică** (`/admin/academic-structure`, TASK 004.1);
- edit users or memberships;
- assign administrators;
- bypass the audit trail.

`type` accepts only the existing organization types: `university`, `company`, `training_provider`, `partner`. Changing a university's `type` away from `university` (or the reverse) is still blocked by the TASK 003 `prevent_incompatible_organization_type_change` trigger whenever incompatible academic or training records already exist; that guard is unchanged by this task.

## Separation from academic structure

`/admin/organizations` manages organizations and universities as business entities. `/admin/academic-structure` continues to manage faculties and departments inside a selected university (TASK 004.1). The two pages are not merged; the organizations editor links to no faculty/department editing control, and its note explicitly tells Platform Admin where academic units are managed.

## Slug behavior

The internal slug is generated automatically from the name when left blank, and remains editable. Slug normalization:

- lowercase;
- Romanian diacritics removed;
- spaces and symbols converted to hyphens;
- repeated hyphens collapsed to one;
- leading/trailing hyphens trimmed;
- capped at 160 characters.

When the slug is left blank (create) or cleared back to blank, the server generates it from the name and appends `-2`, `-3`, and so on if the normalized value collides with an existing organization's slug. When a slug is explicitly supplied, the server still normalizes it to the rules above, then rejects an exact collision with a safe duplicate error instead of silently appending a suffix.

## Access model

`/{locale}/admin/organizations` sits behind the existing admin layout, which already requires the active profile to be authenticated, owned by the current user, active, hold the `platform_admin` role in `scope_type = platform`, and hold the `admin.access` permission. This task adds no new route-level guard; every RPC also re-validates `has_platform_admin_console_access(requested_profile_id)` independently, so the page-level check is not the only barrier.

## Database and security boundary

Migration `008_organizations_write_access.sql` adds:

- an `organizations_status_check` constraint formalizing the existing `active` / `inactive` / `suspended` / `archived` status domain (the foundation column had no explicit check);
- `get_platform_admin_organizations_editor(requested_profile_id)`;
- `create_platform_admin_organization(...)`;
- `update_platform_admin_organization(...)`;
- `platform_admin_organization_audit_events` for immutable create, update, and status-change evidence.

All three RPCs are `SECURITY DEFINER` with `SET search_path = public` and reuse `has_platform_admin_console_access(requested_profile_id)` from migration 003. They validate the actor, required name, allowed type, allowed status, and slug uniqueness before writing. No broad `SELECT`, `INSERT`, `UPDATE`, or `DELETE` policy is added to `organizations`. Direct audit-table privileges are revoked from `public`, `anon`, and `authenticated`; writes occur only inside the scoped RPC transaction. `EXECUTE` is revoked from `public`/`anon`/`authenticated` by default and re-granted only to `authenticated` for the three new functions. No service-role credential is used by runtime application code. No DELETE RPC or hard-delete UI exists.

Migrations 001–007 are unchanged.

## Audit behavior

Every successful create writes an audit event with the resulting row snapshot. Every successful update writes before and after snapshots. An update that changes `status` is recorded as `status_change`; any other successful update is recorded as `update`. Failed authorization or validation does not mutate the organization and does not create an audit event.

## Deferred work

- hard delete;
- organization member and role assignment from this page;
- faculty/department editing from this page (stays in TASK 004.1's `/admin/academic-structure`);
- a general-purpose audit viewer for these events;
- bulk import/export of organizations.
