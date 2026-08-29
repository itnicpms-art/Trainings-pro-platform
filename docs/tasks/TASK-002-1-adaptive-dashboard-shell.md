# TASK 002.1 — Adaptive dashboard shell by role

## Scop

TASK 002.1 înlocuiește dashboard-ul generic din `/{locale}/app` cu un shell adaptiv după profilul activ, rolurile reale și contextul organizațional/academic disponibil. Implementarea pornește de la autentificarea, profilele și helper-ele RBAC livrate în TASK 002 și respectă baseline-ul manager-validat din `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`.

Acest task este exclusiv o fundație UI. Nu implementează cursuri, enrollment, assignments, quiz-uri, teste, examene, proiecte, certificate, credite, calendar, rapoarte sau CMS.

## Surse de decizie

- `Matrice_dashboard_roluri.xlsx`, în special foaia `Matrice roluri`, definește cele 12 contexte de referință și guardrail-urile lor.
- `Trainings_PRO_TASK_002_1_Dashboard_All_Roles.xlsx`, în special foile `02_Profile_Dashboard`, `07_Dashboard_By_Role`, `08_Module_Access_Matrix` și `09_Allocation_Rules`, definește vizibilitatea shell-urilor și separă `EMPTY`, `FUTURE`, `HIDE` și `ADMIN`.
- `Trainings_PRO_dashboard_mockups_all_roles.zip` este folosit exclusiv ca direcție vizuală: layout academy SaaS, sidebar, hero, carduri compacte și accente colorate.

Conținutul fișierelor atașate nu este importat în baza de date și nu este citit de codul runtime.

## Încărcarea contextului

`src/lib/dashboard/get-dashboard-context.ts` încarcă server-side:

- toate profilele utilizatorului curent;
- profilul activ validat de helper-ul TASK 002;
- rolurile reale din `profile_roles`;
- permisiunea `admin.access` în scope `platform`;
- numărul real de profile active și organizații conectate;
- existența câmpurilor de context academic.

Rezultatul este memoizat pe request cu `React.cache()` și este folosit atât de layout, cât și de pagina dashboard. Cookie-ul de profil activ rămâne input neîncrezător și este revalidat de helper-ele existente.

## Derivarea variantei

`src/lib/dashboard/dashboard-config.ts` definește prioritatea variantelor:

1. platform admin;
2. university admin;
3. organization admin;
4. organization representative;
5. coordinator;
6. professor;
7. instructor/trainer;
8. consultant;
9. academic student;
10. organization learner;
11. individual learner.

`university_student` este tratat ca role code, nu ca `profile_type`. Profilul `student` primește shell-ul academic; câmpurile academice rămân `În pregătire` / `Coming soon` până când există date afișabile reale. UUID-urile de context nu sunt prezentate drept nume de program, an, semestru sau grupă.

## Comportament pe rol

| Variantă | Module shell principale | Guardrail |
|---|---|---|
| Individual learner | cursuri, assignments, quiz/test, examene, proiecte, certificate, credite, activitate, organizații | fără an/semestru/grupă/note/ECTS universitare inventate |
| Organization learner | traininguri alocate, evaluări, proiecte, certificate, compliance/credite, organizație | fără raportare organizațională detaliată sau context academic implicit |
| Academic student | program/an/semestru/grupă, cursuri, evaluări, rezultate, ECTS shell | câmpurile academice apar numai din context real |
| Instructor/trainer | cursuri predate, sesiuni, participanți, evaluări, feedback | numai scope-ul atribuit |
| Professor | cursuri academice, grupe/programe, evaluări, examene, gradebook shell | fără studenți din afara scope-ului |
| Consultant | sesiuni, proiecte, clienți, calendar, feedback, documente | proiectele de consultanță rămân distincte |
| Coordinator | programe, cursuri, traineri, grupe, evaluări, rapoarte, cereri | date agregate și permise |
| Organization representative | organizație, status, membri, invitații, traininguri, rapoarte | fără elevare automată sau rezultate individuale |
| Organization admin | membri, invitații, alocări, progres/certificate agregate, cereri, rapoarte | numai organizația proprie |
| University admin | structură academică, persoane, cursuri, rezultate agregate, rapoarte | fără acces platform-wide |
| Platform admin | overview, admin, website settings, organizații, utilizatori, roluri, securitate, audit | `/admin` rămâne protejat separat prin rol + permisiune |

## Componente UI

- `AdaptiveDashboard` compune shell-ul pentru varianta derivată.
- `DashboardHero` afișează identitatea reală, tipul și statusul profilului.
- `DashboardStatCard` afișează numai numere reale de cont sau valoarea sigură `0`.
- `DashboardSectionCard` și `DashboardEmptyState` afișează modulele viitoare fără date demonstrative.
- `DashboardQuickActions` leagă numai rute existente; acțiunile viitoare sunt dezactivate.
- `DashboardSidebarModules` afișează modulele relevante rolului ca elemente dezactivate marcate `În pregătire` / `Coming soon`.

## Regula fără date false

Până la implementarea backend-urilor dedicate, dashboard-ul poate afișa numai:

- valori reale din profilurile utilizatorului;
- `0` ca stare sigură pentru module neconectate;
- `În pregătire` / `Coming soon`;
- empty states traduse.

Nu sunt permise cursuri, procente de progres, note, ECTS, examene, assignments, certificate sau activități inventate. Această regulă previne confundarea designului de produs cu date validate și păstrează corectitudinea raportării.

## Securitate și limite

- Nu există schimbări de schemă, migrare sau politici RLS.
- Nu există schimbări în login, register, logout, profile active sau autorizarea admin.
- Linkul rapid către `/{locale}/admin` apare numai când `admin.access` este acordat în scope platform.
- Linkul nu înlocuiește verificarea cumulativă rol + permisiune din layout-ul admin.
- Sidebar-ul nu creează linkuri către rute inexistente.
- Homepage-ul și CMS-ul nu sunt modificate.

## Funcționalitate amânată

Datele reale și acțiunile pentru cursuri, evaluări, proiecte, certificate, credite, calendar, organizații, structura academică, rapoarte și audit se implementează în task-urile lor dedicate. Shell-urile TASK 002.1 nu trebuie folosite drept dovadă că modulele respective sunt complete.

## Criterii de acceptare

- `/ro/app` și `/en/app` folosesc aceeași derivare și texte localizate;
- profilul, tipul și statusul active sunt reale;
- toate variantele sunt configurate central și reutilizate de pagină/sidebar;
- modulele viitoare nu navighează către rute inexistente;
- profilul individual nu expune carduri academice;
- accesul admin existent rămâne neschimbat;
- nu există date false, secrete, `.env.local` sau schimbări de migrare în commit;
- `pnpm lint` și `pnpm build` trec.
