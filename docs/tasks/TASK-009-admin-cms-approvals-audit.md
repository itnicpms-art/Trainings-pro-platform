# TASK 009 — Admin CMS, Approvals & Audit

## Baseline validat

Domeniul CMS public, workflow-ul `Draft` / `Preview` / `Publicat`, restricțiile de rol, regulile pentru metrici reale și cerințele de audit sunt documentate în `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`. Acest task trebuie să respecte acel baseline, fără a transforma fișierul Excel de referință într-o dependență runtime sau într-o sursă de date a aplicației.


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
