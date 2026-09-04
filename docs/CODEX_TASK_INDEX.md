# CODEX TASK INDEX

## Ordine recomandată

| Task | Document | Scop |
|---|---|---|
| 001 | `TASK-001-project-setup-foundation.md` | Setup proiect, Supabase, layout-uri, foundation DB |
| 001.9 | `auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md` | Reguli validate pentru onboarding, invitații, organizații, RBAC, confidențialitate și domeniul CMS viitor |
| 002 | `TASK-002-auth-users-profiles-roles.md` | Auth, profile multiple, active profile, permissions helper |
| 002.1 | `TASK-002-1-adaptive-dashboard-shell.md` | Dashboard shell adaptiv după profil activ și rol, fără date demonstrative |
| 002.2 | `testing/QA_PROFILES_SEED.md` | Seed local/staging securizat pentru verificarea variantelor de dashboard după profil și rol |
| 002.5 | `TASK-002-5-platform-admin-console.md` | Consolă Platform Admin bilingvă, protejată și read-only pentru guvernanță globală |
| 003 | `tasks/TASK-003-organizations-academic-structure.md` | Fundație securizată pentru universități, structură academică și perioade de training organizaționale |
| 003.1 | `tasks/TASK-003-1-home-context-readouts.md` | Readout-uri Acasă/Home pentru context academic și perioade organizaționale reale, prin RPC-uri scoped |
| 003.2 | `tasks/TASK-003-2-secure-qa-context-seed.md` | Seed QA securizat și idempotent pentru context academic și perioade de training reale |
| 003.3 | `tasks/TASK-003-3-home-workspace-cleanup.md` | Separă contextul real de modulele de lucru și desparte quiz-urile, testele și evaluările pe rol |
| 004 | `tasks/TASK-004-structure-management-ui-foundation.md` | Vizualizare read-only a structurii academice și organizaționale prin RPC-uri strict scoped |
| 004.1 | `tasks/TASK-004-1-academic-units-editable-management.md` | Editare auditată și strict scoped pentru facultăți și departamente |
| 004.2 | `tasks/TASK-004-2-organizations-universities-editable-management.md` | Editare auditată pentru organizații și universități, exclusiv Platform Admin |
| 004.3 | `tasks/TASK-004-3-academic-programs-editable-management.md` | Editare auditată și strict scoped pentru programe academice |
| 004.4 | `tasks/TASK-004-4-academic-years-semesters-editable-management.md` | Editare auditată și strict scoped pentru ani academici și semestre |
| 004.5 | `tasks/TASK-004-5-academic-groups-editable-management.md` | Editare auditată și strict scoped pentru grupe academice |
| 004.6 | *(neimplementat)* | Alocare studenți în grupe academice |
| 004.7 | *(neimplementat)* | Cereri de înscriere în grupă și flux de aprobare |
| 004.8 | `TASK-004-courses-curriculum-lessons.md` | Catalog cursuri, curriculum, module, lecții, resurse |
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

## Documentație TASK 002.1

- `docs/tasks/TASK-002-1-adaptive-dashboard-shell.md` — arhitectura, variantele pe rol, guardrail-urile și limitele shell-ului;
- `docs/roadmap/TASK_002_1_COMPLETION_NOTES.md` — fișiere, validări, QA și funcționalitatea amânată.

TASK 002.1 nu adaugă backend-uri educaționale, schemă, migrare sau politici RLS. Cardurile și navigația viitoare folosesc exclusiv empty states și marcajele `În pregătire` / `Coming soon` până când task-urile dedicate furnizează date reale.

## Documentație TASK 002.2

- `docs/testing/QA_PROFILES_SEED.md` — configurare sigură, date QA create, matrice profil/rol, idempotency și pașii de QA manual;
- `docs/roadmap/TASK_002_2_COMPLETION_NOTES.md` — scop, fișiere, validări, limitări și confirmările de securitate.

TASK 002.2 este exclusiv un instrument operator local/staging. Nu expune cheia service-role în aplicație, nu schimbă înregistrarea publică sau RLS și nu creează date educaționale demonstrative.

## Documentație TASK 002.5

- `docs/tasks/TASK-002-5-platform-admin-console.md` — scop, autorizare, acces read-only și limite;
- `docs/roadmap/TASK_002_5_COMPLETION_NOTES.md` — rute, migrare, validări, QA și lucru amânat.

TASK 002.5 adaugă consola globală numai pentru profilul activ care are simultan rolul `platform_admin` și permisiunea `admin.access`. Datele globale sunt disponibile prin RPC-uri de citire verificate; nu se folosește service-role în runtime și nu se adaugă mutații administrative.

## Documentație TASK 003

- `docs/tasks/TASK-003-organizations-academic-structure.md` — modelul de business, tabelele, integritatea, securitatea și limitele fundației academice;
- `docs/roadmap/TASK_003_COMPLETION_NOTES.md` — scopul livrat, validările și lucrul amânat.

TASK 003 separă structura academică completă a universităților de perioadele simple de training ale celorlalte organizații. Nu adaugă UI, date demonstrative sau acces direct la noile tabele.

## Documentație TASK 003.1

- `docs/tasks/TASK-003-1-home-context-readouts.md` — regulile de afișare pe profil și accesul read-only scoped;
- `docs/roadmap/TASK_003_1_COMPLETION_NOTES.md` — implementarea, validările, QA și lucrul amânat.

TASK 003.1 conectează Acasă/Home la contextul real al profilului activ. Studentul academic folosește exclusiv contextul academic explicit, profilurile organizaționale folosesc doar organizația și perioada de training, iar Platform Admin rămâne în `/admin`.

## Documentație TASK 003.2

- `docs/tasks/TASK-003-2-secure-qa-context-seed.md` — structura QA, idempotency și limitele de producție;
- `docs/roadmap/TASK_003_2_COMPLETION_NOTES.md` — scope, validări și QA;
- `docs/testing/QA_PROFILES_SEED.md` — ghidul operator actualizat pentru profiluri și context.

TASK 003.2 adaugă numai fixture-uri QA în tabelele TASK 003 prin scriptul local/staging existent. Nu adaugă migrare, date de producție sau valori hardcodate în Acasă/Home.

## Documentație TASK 003.3

- `docs/tasks/TASK-003-3-home-workspace-cleanup.md` — regula context versus Workspace, matricea modulelor pe rol și limitele de date;
- `docs/roadmap/TASK_003_3_COMPLETION_NOTES.md` — modificările UI, validările, confirmările de scope și lucrul amânat.

TASK 003.3 este exclusiv o curățare de configurare UI, traduceri și documentație. Nu adaugă backend, migrare, date educaționale sau acțiuni de administrare.

## Documentație TASK 004

- `docs/tasks/TASK-004-structure-management-ui-foundation.md` — rutele, accesul scoped, RPC-urile read-only și limitele fundației;
- `docs/roadmap/TASK_004_COMPLETION_NOTES.md` — scope, securitate, validări și lucru amânat.

TASK 004 expune numai structura reală permisă profilului activ prin RPC-uri `SECURITY DEFINER`; nu acordă acces direct la tabele și nu implementează acțiuni de scriere.

## Documentație TASK 004.1

- `docs/tasks/TASK-004-1-academic-units-editable-management.md` — domeniul editabil, ierarhia, autorizarea, RPC-urile și auditul;
- `docs/roadmap/TASK_004_1_COMPLETION_NOTES.md` — implementarea, securitatea, validările, QA și lucrul amânat.

TASK 004.1 permite numai crearea și actualizarea facultăților/departamentelor prin RPC-uri auditate. University Admin este limitat la propria universitate, Platform Admin lucrează exclusiv din `/admin`, iar programele, anii, semestrele și grupele rămân read-only.

## Documentație TASK 004.2

- `docs/tasks/TASK-004-2-organizations-universities-editable-management.md` — domeniul editabil, separarea de structura academică, regulile de slug, autorizarea, RPC-urile și auditul;
- `docs/roadmap/TASK_004_2_COMPLETION_NOTES.md` — implementarea, securitatea, validările, QA și lucrul amânat.

TASK 004.2 permite numai Platform Admin să creeze și să actualizeze organizații și universități (nume, slug, tip, status, website, descriere, logo) prin RPC-uri auditate. Facultățile și departamentele universităților rămân administrate exclusiv din `/admin/academic-structure` (TASK 004.1); paginile nu sunt îmbinate. Nu există ștergere definitivă.

## Documentație TASK 004.3

- `docs/tasks/TASK-004-3-academic-programs-editable-management.md` — domeniul editabil, ierarhia, autorizarea, valorile de schemă folosite, RPC-urile și auditul;
- `docs/roadmap/TASK_004_3_COMPLETION_NOTES.md` — implementarea, securitatea, validările, QA și lucrul amânat.

TASK 004.3 permite numai crearea și actualizarea programelor academice prin RPC-uri auditate, reutilizând `resolve_academic_units_editor_mode` din migrarea 007. University Admin este limitat la propria universitate; Platform Admin lucrează global din `/admin/academic-structure`. Un program trebuie să aparțină unei facultăți sau unui departament din aceeași universitate. Anii academici, semestrele și grupele rămân read-only. Nu există ștergere definitivă, iar `/admin/organizations` nu este afectată.

## Documentație TASK 004.4

- `docs/tasks/TASK-004-4-academic-years-semesters-editable-management.md` — schema reală folosită, regulile de validare a datelor, decizia privind suprapunerea semestrelor, ierarhia, autorizarea, RPC-urile și auditul;
- `docs/roadmap/TASK_004_4_COMPLETION_NOTES.md` — implementarea, securitatea, validările, QA și lucrul amânat.

TASK 004.4 permite numai crearea și actualizarea anilor academici și a semestrelor (tabela reală `academic_terms`, cu `term_type`) prin RPC-uri auditate, reutilizând `resolve_academic_units_editor_mode` din migrarea 007. University Admin este limitat la propria universitate; Platform Admin lucrează global din `/admin/academic-structure`. Un semestru trebuie să aparțină unui an academic din aceeași universitate și să rămână în intervalul anului. Grupele rămân read-only până la TASK 004.5. Nu există ștergere definitivă, iar `/admin/organizations` nu este afectată.

## Documentație TASK 004.5

- `docs/tasks/TASK-004-5-academic-groups-editable-management.md` — schema reală folosită, relația de membership deja existentă (`academic_profile_contexts`), ierarhia, autorizarea, RPC-urile și auditul;
- `docs/roadmap/TASK_004_5_COMPLETION_NOTES.md` — implementarea, securitatea, validările, QA și lucrul amânat.

TASK 004.5 permite numai crearea și actualizarea grupelor academice (program obligatoriu, an și semestru opționale) prin RPC-uri auditate, reutilizând `resolve_academic_units_editor_mode` din migrarea 007. University Admin este limitat la propria universitate; Platform Admin lucrează global din `/admin/academic-structure`. Nu se creează, citește sau modifică nicio înregistrare de membership (`academic_profile_contexts`) și nu există niciun flux de cerere de înscriere. Nu există ștergere definitivă, iar `/admin/organizations` nu este afectată.

TASK 004.6 (Alocare studenți în grupe academice) și TASK 004.7 (Cereri de înscriere în grupă și flux de aprobare) sunt task-uri viitoare planificate, dar neimplementate; TASK 004.5 nu adaugă niciun UI sau RPC pentru ele.

## Reguli de execuție

- Nu sări peste task-uri.
- Nu implementa task-uri viitoare în task-ul curent.
- Fiecare task trebuie să aibă migrations, RLS, UI minim și acceptance criteria.
- Fiecare task trebuie să pornească de la starea produsă de task-ul anterior.
- TASK 002 și task-urile ulterioare relevante trebuie să respecte baseline-ul din `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`.
- Documentația TASK 002 trebuie să descrie separat funcționalitatea existentă, funcționalitatea obligatorie neimplementată și elementele amânate pentru TASK 002.5 sau TASK 003.
