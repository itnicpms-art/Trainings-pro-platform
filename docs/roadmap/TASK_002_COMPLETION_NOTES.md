# TASK 002 — Completion notes

## Baseline

TASK 002 trebuie să implementeze baseline-ul manager-validat din `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`.

## Status

**TASK 002 este implementat în cod, cu validarea remote Supabase și QA-ul autentificat end-to-end încă necesare înainte de deployment.**

Fluxul de invitații este intenționat fail-closed: codul este hash-uit și cererea rămâne `pending_review`; emiterea, expirarea, revocarea și consumul automat al invitației rămân limitări cunoscute.

## Ce există înainte de TASK 002

- client Supabase browser și server bazat pe anon key;
- formular comun email/parolă pentru sign-up și sign-in;
- pagini localizate `/ro/login`, `/en/login`, `/ro/register`, `/en/register`;
- `getCurrentUser()` bazat pe `auth.getUser()`;
- `getActiveProfile()` care derivă profilul activ din profilul implicit;
- `hasPermission()` pentru granturi role-permission;
- migrarea `001_foundation.sql` cu profiles, organizations, memberships, roles și permissions;
- trigger de profil individual implicit;
- politici RLS foundation;
- UI demonstrativ pentru app, profiles și admin.

Aceste elemente sunt fundație parțială și nu reprezintă acceptarea TASK 002.

## Ce a implementat TASK 002

- cele trei opțiuni de register;
- stările `active`, `pending_email_confirmation`, `pending_organization_approval`, `pending_review`;
- confirmarea emailului și callback localizat;
- placeholder sigur pentru invitații, fără acordare de membership/rol;
- cerere și aprobare reprezentant;
- logout real;
- refresh cookie/sesiune;
- route protection pentru app/admin;
- încărcarea profilului activ real;
- selectorul de profil activ;
- `getProfileRoles()` și `hasRole()`;
- verificarea `platform_admin`;
- stare admin restricted;
- întărirea RLS pentru a elimina escaladarea prin `profiles`;
- erori și stări RO/EN;
- UI și erori localizate RO/EN;
- date reale în profiles/dashboard și eliminarea numerelor statice admin.

## Migrații

### Existente

- `supabase/migrations/001_foundation.sql` — migrare TASK 001.

### TASK 002

- `supabase/migrations/002_auth_onboarding.sql` — nomenclatură learner, statusuri și termeni, `onboarding_requests`, trigger Auth sigur, callback email și întărirea granturilor/politicilor RLS.

## QA manual

### Rezultat curent

- `pnpm lint`: passed;
- `pnpm build`: passed, inclusiv Proxy și cele 22 de rute generate;
- `/ro`, `/en` și redirectul `/` → `/ro`: passed;
- `/ro/register` și `/en/register`: passed;
- cele trei opțiuni/formulare de onboarding RO: passed;
- switcher RO → EN pe ruta register: passed;
- `/ro/login` și `/en/login`: passed;
- redirect neautentificat pentru `/ro/app`, `/en/app`, `/ro/admin`, `/en/admin`: passed, cu locale și `next` păstrate;
- placeholder-ele `În pregătire` / `Coming soon`: passed; valorile publice interzise nu apar;
- erori browser console în scenariile de mai sus: none;
- QA autentificat și teste RLS: necesită aplicarea migrării 002 într-un proiect Supabase de test și conturi de test.

### Checklist necesar înainte de completare

- register individual în RO și EN;
- register prin invitație validă, expirată, revocată și consumată;
- cerere reprezentant și tranzițiile de status;
- confirmare email și callback localizat;
- login valid/invalid în RO și EN;
- logout și invalidarea accesului;
- redirect neautentificat pentru toate rutele protejate;
- `next` intern valid și respingerea open redirect;
- selectare profil activ și fallback la profil implicit;
- cross-user profile denial;
- non-admin restricted în `/admin`;
- `platform_admin` autorizat în `/admin`;
- cross-organization denial;
- verificarea lipsei service-role din browser;
- verificarea mesajelor localizate și a lipsei erorilor sensibile.

## Validări tehnice înainte de completare

- `pnpm lint`;
- `pnpm build`;
- teste auth/helper;
- teste RLS;
- verificare migrations pe un proiect Supabase de test;
- scan pentru secrete și `.env.local` necomis.

## Limitări cunoscute curente

- migrarea 002 trebuie aplicată și testată într-un proiect Supabase înainte de deployment;
- nu există încă interfață/admin backend pentru emiterea, expirarea, revocarea și consumul invitațiilor;
- codurile de invitație rămân fail-closed în `pending_review` și nu acordă membership;
- aprobarea/rejectarea cererilor de reprezentant nu are încă UI administrativ;
- fluxul securizat de creare/atribuire/revocare `platform_admin` rămâne operație administrativă manuală;
- testele automate RLS/cross-organization și auditul rolurilor sensibile rămân de adăugat;
- managementul complet al organizațiilor și ierarhiilor academice rămâne TASK 003.

## Ce rămâne pentru TASK 002.5

- Admin CMS / Website Settings;
- branding, homepage, navigation, footer și SEO editabile;
- workflow `Draft` / `Preview` / `Publicat`;
- permisiuni CMS pe secțiune;
- metrici publice conectate numai la date reale.

TASK 002.5 începe numai după auth, roluri și admin protejat.

## Ce rămâne pentru TASK 003

- organizații administrabile complet;
- ierarhia universitate → facultate → program → grupă → an;
- importuri și administrarea membrilor organizaționali;
- grupuri și apartenențe complete;
- substructuri pentru instituții publice;
- scope-uri academice detaliate și rapoarte organizaționale.

## Documente TASK 002

- `docs/auth/AUTH_IMPLEMENTATION.md`;
- `docs/auth/REGISTER_AND_ONBOARDING_FLOW.md`;
- `docs/auth/LOGIN_LOGOUT_FLOW.md`;
- `docs/auth/PROFILE_AND_ACTIVE_PROFILE.md`;
- `docs/auth/ROLE_HELPERS_AND_ADMIN_ACCESS.md`;
- `docs/security/ROUTE_PROTECTION.md`;
- `docs/security/RLS_AUTH_NOTES.md`;
- `docs/roadmap/TASK_002_COMPLETION_NOTES.md`.
