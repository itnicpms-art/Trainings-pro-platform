# CODEX TASK INDEX

## Ordine recomandată

| Task | Document | Scop |
|---|---|---|
| 001 | `TASK-001-project-setup-foundation.md` | Setup proiect, Supabase, layout-uri, foundation DB |
| 001.9 | `auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md` | Reguli validate pentru onboarding, invitații, organizații, RBAC, confidențialitate și domeniul CMS viitor |
| 002 | `TASK-002-auth-users-profiles-roles.md` | Auth, profile multiple, active profile, permissions helper |
| 003 | `TASK-003-organizations-universities-academic.md` | Organizații, universități, programe, years, semesters, groups |
| 004 | `TASK-004-courses-curriculum-lessons.md` | Catalog cursuri, curriculum, module, lecții, resurse |
| 005 | `TASK-005-enrollments-progress-calendar.md` | Enrollment, auto-allocation, progress, calendar multi-profile |
| 006 | `TASK-006-assignment-project-assessments-survey.md` | Assignment, Project, Quiz, Test, Exam, Survey, Grades |
| 007 | `TASK-007-sessions-webinars-consultations.md` | Course sessions, bookings, webinars, consultații live/async |
| 008 | `TASK-008-certificates-credits-payments.md` | Certificate, credite, payments, subscriptions |
| 009 | `TASK-009-admin-cms-approvals-audit.md` | Admin CMS complet, approvals, change requests, audit logs |

## Reguli de execuție

- Nu sări peste task-uri.
- Nu implementa task-uri viitoare în task-ul curent.
- Fiecare task trebuie să aibă migrations, RLS, UI minim și acceptance criteria.
- Fiecare task trebuie să pornească de la starea produsă de task-ul anterior.
- TASK 002 și task-urile ulterioare relevante trebuie să respecte baseline-ul din `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`.
