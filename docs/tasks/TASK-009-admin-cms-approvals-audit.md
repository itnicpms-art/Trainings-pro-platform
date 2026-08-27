# TASK 009 — Admin CMS, Approvals & Audit


## Scop

Construiește zona administrativă completă, workflow-ul de aprobare și audit log-ul.

## Build

- approval_rules
- change_requests
- change_approvals
- audit_logs
- admin dashboards
- admin CMS actions
- pending approvals pages

## Design references

- `24-admin-dashboard.png`
- `25-platform-admin-dashboard-light.png`
- `26-platform-admin-dashboard-dark-sidebar.png`
- `02-admin-cms-editor-curriculum.png`
- `03-admin-cms-editor-approval.png`

## Reguli

- Modificările importante nu se publică direct.
- Draft → Pending Approval → Approved/Rejected → Published.
- Soft delete pentru obiecte importante.
- Audit log pentru cine/ce/când/before/after.
