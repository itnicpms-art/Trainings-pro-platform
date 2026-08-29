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

## Documentație de implementare TASK 002

TASK 002 folosește baseline-ul validat în `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`. Documentația de implementare și securitate este împărțită astfel:

- `docs/auth/AUTH_IMPLEMENTATION.md`
- `docs/auth/REGISTER_AND_ONBOARDING_FLOW.md`
- `docs/auth/LOGIN_LOGOUT_FLOW.md`
- `docs/auth/PROFILE_AND_ACTIVE_PROFILE.md`
- `docs/auth/ROLE_HELPERS_AND_ADMIN_ACCESS.md`
- `docs/security/ROUTE_PROTECTION.md`
- `docs/security/RLS_AUTH_NOTES.md`
- `docs/roadmap/TASK_002_COMPLETION_NOTES.md`

`TASK_002_COMPLETION_NOTES.md` este documentul de stare și trebuie actualizat cu migrațiile, rezultatele QA și limitările reale înainte ca TASK 002 să fie declarat finalizat.

## Reguli de execuție

- Nu sări peste task-uri.
- Nu implementa task-uri viitoare în task-ul curent.
- Fiecare task trebuie să aibă migrations, RLS, UI minim și acceptance criteria.
- Fiecare task trebuie să pornească de la starea produsă de task-ul anterior.
- TASK 002 și task-urile ulterioare relevante trebuie să respecte baseline-ul din `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`.
- Documentația TASK 002 trebuie să descrie separat funcționalitatea existentă, funcționalitatea obligatorie neimplementată și elementele amânate pentru TASK 002.5 sau TASK 003.
