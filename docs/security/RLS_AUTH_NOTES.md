# TASK 002 — RLS and auth notes

## Baseline obligatoriu

Regulile RLS și limitele de rol trebuie să implementeze `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`. Nicio regulă de business descrisă în baseline nu este considerată aplicată până când schema, politicile și testele o impun efectiv.

## Migrarea existentă

`supabase/migrations/001_foundation.sql` a fost adăugată în TASK 001 și definește fundația, nu schema finală TASK 002.

Tabelele relevante existente:

- `auth.users` — administrat de Supabase Auth;
- `public.profiles`;
- `public.organizations`;
- `public.organization_members`;
- `public.roles`;
- `public.permissions`;
- `public.role_permissions`;
- `public.profile_roles`.

Triggerul `handle_new_user()` creează un profil individual implicit după insert în `auth.users`.

## Tabele atinse de fluxurile auth/profile

### Acum

| Flux/helper | Tabele/servicii |
|---|---|
| Register simplu | Supabase Auth `auth.users`; trigger către `profiles` |
| Login | Supabase Auth și cookie-uri de sesiune |
| `getCurrentUser()` | Supabase Auth `getUser()` |
| `getActiveProfile()` | `profiles` |
| `hasPermission()` | `profile_roles`, `permissions`, `role_permissions` |

### Necesare în TASK 002

- starea de onboarding a contului/profilului;
- acceptarea termenilor: versiune, sursă și dată;
- invitații: token hash, destinatar, emitent, scope, expirare, revocare, limită de utilizări și consum;
- cereri de reprezentant organizație;
- aprobări/respingere și actorul care a decis;
- audit pentru rolurile sensibile și tranzițiile de status;
- preferința de profil activ, dacă se alege stocarea în DB.

Denumirea și forma tabelelor noi trebuie stabilite prin migrarea TASK 002. În repository nu există încă tabele de invitații sau cereri organizaționale.

## Politicile RLS foundation

### `profiles`

- utilizatorul autentificat își poate vedea profilele;
- utilizatorul autentificat poate insera un profil cu propriul `user_id`;
- utilizatorul autentificat poate actualiza un profil cu propriul `user_id`.

### `organizations`

- orice utilizator autentificat poate vedea organizațiile cu `status = active`.

### `organization_members`

- utilizatorul poate vedea membership-urile asociate propriilor profile.

### roluri și permisiuni

- orice utilizator autentificat poate citi `roles`, `permissions` și `role_permissions`;
- utilizatorul poate citi numai `profile_roles` pentru propriile profile;
- nu există politici publice de insert/update/delete pentru `profile_roles`.

## Gap critic: escaladarea prin `profiles`

Politicile foundation de insert/update pe `profiles` verifică numai `auth.uid() = user_id`. Coloanele controlate de client includ în schema actuală `profile_type`, `organization_id`, `university_id`, `group_id`, `is_default` și `status`.

Deoarece `profile_type` acceptă inclusiv `platform_admin`, un client autentificat ar putea încerca să insereze sau să actualizeze propriul profil cu un tip privilegiat. Chiar dacă autorizarea finală trebuie să folosească `profile_roles`, această posibilitate contrazice baseline-ul și poate produce escaladare dacă orice cod se bazează pe `profile_type`.

TASK 002 nu este complet până când:

- insertul direct de profile privilegiate este interzis;
- update-ul direct al coloanelor sensibile este interzis;
- profilele suplimentare sunt create numai prin funcții/fluxuri autorizate;
- `user_id` este derivat din `auth.uid()`;
- rolurile sunt atribuite numai prin operații administrative controlate;
- există teste negative pentru `platform_admin`, `organization_admin` și apartenență organizațională falsă.

## Boundary-uri de securitate

- Browserul folosește cheia anon și sesiunea utilizatorului.
- RLS este obligatoriu pentru toate query-urile din browser și server cu anon key.
- Server Components cu client cookie-based rulează cu drepturile utilizatorului, nu cu drepturi globale.
- Service role poate exista numai într-un mediu server securizat și nu este necesar pentru fluxurile frontend obișnuite.
- Operațiile privilegiate viitoare trebuie expuse prin funcții/Server Actions/Route Handlers care validează actorul; service role nu înlocuiește autorizarea.
- `organization_id` și scope-urile trimise de client nu sunt de încredere.
- Datele unei organizații nu pot fi citite prin apartenența la altă organizație.
- Rezultatele individuale detaliate necesită consimțământ și audit conform baseline-ului.

## Fără service role în frontend

- `SUPABASE_SERVICE_ROLE_KEY` nu are prefix `NEXT_PUBLIC_`.
- Nu se importă în Client Components.
- Nu se serializează în props, răspunsuri API, loguri sau bundle.
- Nu se folosește pentru a ocoli RLS în operații efectuate în numele utilizatorului.
- Repository-ul nu trebuie să conțină valoarea reală și nu comite `.env.local`.

Codul runtime curent nu citește service role.

## Fără escaladare publică de rol

- Register-ul ignoră orice `role`, `profile_type` sau `organization_id` trimis liber.
- User metadata nu este sursă de autorizare.
- `platform_admin` se creează manual/securizat.
- Reprezentantul și adminul organizației necesită aprobare.
- Instructor/trainer și consultant necesită invitație sau creare controlată.
- Atribuirea și revocarea rolurilor trebuie auditate.
- Un rol cu scope local nu devine rol platform-wide.

## Presupuneri RLS pentru TASK 002

- `auth.uid()` este identitatea canonică a utilizatorului autentificat.
- Ownership-ul profilului este separat de rolurile profilului.
- Profilul activ este validat server-side înainte de folosire.
- Accesul admin necesită rol și permisiune, nu numai tip de profil.
- Query-urile organizaționale sunt filtrate prin membership și scope.
- Operațiile fără politică explicită sunt refuzate.
- Erorile sau lipsa configurației produc fail closed.

## Teste RLS obligatorii

- utilizatorul A nu poate vedea sau modifica profilul utilizatorului B;
- utilizatorul nu își poate acorda tip/rol admin;
- utilizatorul nu își poate schimba liber organizația sau statusul;
- reprezentantul organizației A nu vede organizația B;
- learner nu inserează `profile_roles`;
- `organization_admin` rămâne în scope-ul propriu;
- numai `platform_admin` autorizat execută acțiuni globale;
- invitațiile expirate/revocate/consumate nu pot crea membership;
- un status pending nu obține acces prin sesiune validă;
- service role nu apare în niciun request browser.

## Migrații TASK 002

La momentul acestei documentări nu există o migrare TASK 002. Când este adăugată, această secțiune și `docs/roadmap/TASK_002_COMPLETION_NOTES.md` trebuie actualizate cu:

- numele fișierului;
- tabelele/coloanele/funcțiile adăugate;
- politicile înlocuite sau întărite;
- datele migrate din nomenclatura foundation;
- rezultatele testelor RLS.
