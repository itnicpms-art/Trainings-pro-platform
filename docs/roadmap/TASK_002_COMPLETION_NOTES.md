# TASK 002 — Completion notes

## Baseline

TASK 002 trebuie să implementeze baseline-ul manager-validat din `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`.

## Status

**TASK 002 nu este complet la data acestei documentări.**

Fișierul este un jurnal viu de implementare. Nu trebuie schimbat la „Complet” până când auth, onboarding, profilele, rolurile, protecția rutelor, RLS și QA-ul descrise în documentele TASK 002 sunt efectiv implementate și validate.

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

## Ce trebuie completat în TASK 002

- cele trei opțiuni de register;
- stările `active`, `pending_email_confirmation`, `pending_organization_approval`, `pending_review`;
- confirmarea emailului și callback localizat;
- lifecycle invitație;
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
- teste automate și QA manual.

## Migrații

### Existente

- `supabase/migrations/001_foundation.sql` — migrare TASK 001.

### TASK 002

Nicio migrare TASK 002 nu există la data acestei documentări.

La implementare, se vor lista aici exact migrarea/migrările și scopul lor. Documentația nu creează tabele sau migrații.

## QA manual

### Rezultat curent

Nu este declarat un QA manual end-to-end pentru TASK 002 deoarece fluxurile necesare nu sunt implementate complet. Nu se vor raporta ca „passed” scenarii care verifică numai randarea paginilor demonstrative.

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

- app/admin nu sunt protejate;
- logout-ul din topbar este inert;
- pagina profiles folosește date statice;
- dashboard-urile folosesc valori demonstrative;
- register-ul nu respectă încă cele trei fluxuri;
- stările de onboarding nu sunt persistate;
- invitațiile și cererile nu au tabele;
- rolurile helper incomplete;
- schema foundation folosește nomenclatură diferită de baseline pentru learners;
- politicile `profiles` permit clientului prea mult control asupra coloanelor sensibile;
- erorile Supabase sunt afișate brut;
- nu există refresh de sesiune prin Proxy.

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
