# TASK 002.5 — Completion Notes

## Rezumat

A fost implementată fundația bilingvă a Platform Admin Console, pe baza regulilor manager-validated din `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`. Consola păstrează autorizarea server-side existentă și oferă date globale reale numai prin interfețe read-only verificate.

## Rute

- `/{locale}/admin`;
- `/{locale}/admin/organizations`;
- `/{locale}/admin/users`;
- `/{locale}/admin/roles`;
- `/{locale}/admin/security`;
- `/{locale}/admin/audit`;
- `/{locale}/admin/website`;
- `/{locale}/admin/approvals`;
- `/{locale}/admin/content`.

`{locale}` este `ro` sau `en`. Ruta existentă `/{locale}/admin/settings` rămâne disponibilă, dar nu este duplicată în noua navigație principală.

## Implementare

- sidebar admin extins, compact și compatibil cu meniul mobil;
- componente reutilizabile pentru metrici, secțiuni, empty states și statusuri;
- overview cu count-uri reale atunci când migrarea este aplicată și placeholders aprobate când datele nu pot fi citite;
- tabele read-only pentru organizații, profile și cereri de onboarding;
- inventar read-only pentru roluri, permisiuni și relații RBAC;
- secțiuni explicite pentru securitate și stări viitoare pentru audit, CMS și conținut;
- toate textele vizibile noi sunt în dicționarele RO/EN.
- follow-up: ruta exactă `/{locale}/app` redirecționează server-side la `/{locale}/admin` numai când profilul activ are simultan rolul `platform_admin` în scope platform și permisiunea `admin.access`;
- dashboard-urile `/app` pentru profile individuale, academice și organizaționale rămân neschimbate, iar `/app/profiles` și `/app/settings` rămân accesibile.
- follow-up: un switch de profil reușit din orice rută admin navighează la `/{locale}/app`; profilul selectat este apoi rutat de regulile server-side existente către dashboard-ul normal sau înapoi în consola admin.

## Migrare

A fost adăugată `supabase/migrations/003_platform_admin_read_access.sql` deoarece RLS existent permite numai propriile profile și propriile cereri de onboarding.

Migrarea:

- adaugă numai funcții de citire;
- nu modifică politicile RLS existente;
- nu acordă SELECT global direct pe tabele;
- nu adaugă INSERT/UPDATE/DELETE;
- validează `auth.uid()`, profilul propriu activ, rolul `platform_admin` în scope platform și `admin.access`;
- nu folosește și nu expune service-role.

Migrarea nu a fost aplicată automat pe un proiect Supabase remote în această schimbare.

## Validare tehnică

- `npx pnpm@11.19.0 lint`: passed;
- `npx pnpm@11.19.0 build`: passed;
- build-ul Next.js a generat toate cele 9 rute admin noi/existente pentru ambele locale;
- `.env.local` nu este urmărit și nu este inclus în commit;
- nu au fost adăugate secrete sau date demonstrative.

## QA manual

- `/ro/admin` neautentificat redirecționează la `/ro/login?next=%2Fro%2Fadmin`: passed în browser local;
- `/en/admin` neautentificat redirecționează la `/en/login?next=%2Fen%2Fadmin`: passed în browser local;
- ecranele login rezultate sunt localizate corect RO/EN și nu au produs erori/warnings în consola browserului;
- verificarea stării restricted pentru profile non-admin: de rulat cu profilele QA locale;
- verificarea tuturor ecranelor cu QA Platform Admin: necesită aplicarea migrării 003 în instanța Supabase QA;
- fallback-ul fără acces la RPC este fail-closed și afișează starea localizată de date indisponibile.

### Checklist follow-up workspace

- QA Individual Learner: `/ro/app` deschide dashboard-ul normal — necesită sesiune QA autentificată;
- QA Academic Student: `/ro/app` deschide dashboard-ul academic — necesită sesiune QA autentificată;
- QA Organization Admin: `/ro/app` păstrează dashboard-ul organizațional dacă nu are acces Platform Admin — necesită sesiune QA autentificată;
- QA Platform Admin: `/ro/app` redirecționează la `/ro/admin` — necesită sesiune QA autentificată;
- QA Platform Admin: `/en/app` redirecționează la `/en/admin` — necesită sesiune QA autentificată;
- QA Platform Admin pe `/ro/admin/content` → QA Individual Learner: navighează la `/ro/app` și afișează dashboard-ul learner — necesită sesiune QA autentificată;
- QA Platform Admin pe `/ro/admin/users` → QA Academic Student: navighează la `/ro/app` și afișează dashboard-ul academic — necesită sesiune QA autentificată;
- QA Individual Learner pe `/ro/app` → QA Platform Admin: refresh-ul existent ajunge la `/ro/admin` prin redirectul server-side — necesită sesiune QA autentificată;
- aceleași fluxuri pentru `/en/admin` și `/en/app` — necesită sesiune QA autentificată;
- `/ro/admin` și `/en/admin` rămân protejate de layout-ul admin existent; redirecturile neautentificate au fost reverificate local.

## Confirmări de securitate

- public register, login/logout, triggerul Auth și active-profile switching nu au fost modificate;
- logica dashboard-urilor normale și seed-ul QA nu au fost modificate;
- nu există acces admin bazat doar pe `profile_type`;
- nu există mutații administrative sau cale publică de role escalation;
- nu se interoghează `auth.users` și nu se folosește service-role în runtime;
- nu au fost create date false, metrici false, aprobări sau evenimente audit false.

## Limitări și lucru amânat

- migrarea 003 trebuie aplicată și testată RLS end-to-end într-un proiect Supabase QA înainte de deployment;
- tabelele mari vor necesita paginare și filtre;
- acțiunile de administrare necesită workflow-uri auditate și politici dedicate;
- auditul, editorul CMS, aprobările mutabile și backend-ul educațional rămân neimplementate;
- datele Auth private și managementul conturilor rămân în boundary-ul Supabase Auth.
