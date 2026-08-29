# TASK 002 — Auth implementation

## Baseline obligatoriu

TASK 002 urmează regulile validate în `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`. Dacă implementarea existentă și baseline-ul diferă, TASK 002 trebuie să rezolve diferența explicit prin cod, migrare și documentație; nu se consideră baseline-ul implementat implicit.

## Starea curentă

Repository-ul conține acum implementarea runtime TASK 002. Migrarea trebuie aplicată proiectului Supabase țintă înainte ca fluxurile să fie validate end-to-end.

| Capabilitate | Stare curentă |
|---|---|
| Client Supabase pentru browser | Implementat |
| Client Supabase pentru server | Implementat |
| Register cu trei opțiuni | Implementat |
| Login email/parolă | Implementat |
| Citirea utilizatorului curent pe server | Implementat |
| Încărcarea profilurilor și profilului activ | Implementat și integrat |
| Verificarea rolurilor și permisiunilor | Implementat și integrat în admin |
| Logout | Implementat prin Route Handler |
| Reîmprospătarea sesiunii prin Proxy | Implementat |
| Protecția `/app` și `/admin` | Implementată în Proxy și layout-uri |
| Cele trei fluxuri de onboarding | Implementate; invitațiile rămân în verificare manuală |
| Stările de onboarding aprobate | Persistate prin migrarea 002 |
| Verificarea `platform_admin` | Implementată prin rol + `admin.access` |

## Configurarea Supabase Auth folosită de aplicație

Aplicația folosește:

- `@supabase/supabase-js` pentru API-ul Auth;
- `@supabase/ssr` pentru clienții compatibili cu App Router și cookie-uri;
- `NEXT_PUBLIC_SUPABASE_URL` și `NEXT_PUBLIC_SUPABASE_ANON_KEY` pentru clienții browser/server;
- cookie-urile Supabase pentru propagarea sesiunii între browser și Server Components.

`SUPABASE_SERVICE_ROLE_KEY` există numai ca placeholder în `.env.example`. Nu este folosit de codul runtime curent și nu trebuie expus în browser, într-o variabilă `NEXT_PUBLIC_*` sau într-un Client Component.

## Helper-ele client și server

### Browser

`src/lib/supabase/client.ts` exportă `createBrowserSupabaseClient()`.

- Creează un client cu cheia anon publică.
- Returnează `null` dacă URL-ul sau cheia anon lipsesc.
- Este folosit în `src/components/auth/auth-form.tsx` pentru `signUp()` și `signInWithPassword()`.
- Securitatea datelor depinde de sesiunea utilizatorului și de RLS, nu de ascunderea cheii anon.

### Server

`src/lib/supabase/server.ts` exportă `createServerSupabaseClient()`.

- Creează clientul cu cheia anon și cookie-urile requestului curent.
- Citește toate cookie-urile prin `cookies()` din Next.js.
- Încearcă să scrie cookie-urile actualizate; excepția este ignorată în contexte Server Component care nu permit scrierea.
- Returnează `null` când configurația publică Supabase lipsește.

`src/proxy.ts` reîmprospătează cookie-urile Supabase și redirecționează optimist vizitatorii neautentificați. Autorizarea finală este repetată în layout-uri, Route Handlers și prin RLS.

## Utilizatorul curent și sesiunea

`src/lib/auth/get-current-user.ts` exportă `getCurrentUser()`.

- Creează clientul Supabase de server.
- Apelează `supabase.auth.getUser()`.
- Returnează utilizatorul validat de Supabase sau `null` la lipsa configurației/eroare.

`src/lib/auth/get-current-session.ts` expune `getCurrentSession()` pentru cazuri care au nevoie de datele sesiunii. Deciziile de securitate continuă să folosească `getCurrentUser()`/`auth.getUser()`, nu numai conținutul sesiunii locale.

Formularul client primește rezultatul Auth direct de la Supabase, apoi navighează cu `router.push()` și `router.refresh()`. Layout-urile nu citesc încă utilizatorul sau sesiunea.

## Localizarea logicii de auth

| Zonă | Fișiere curente sau planificate |
|---|---|
| Configurare client Supabase | `src/lib/supabase/client.ts` |
| Configurare server Supabase | `src/lib/supabase/server.ts` |
| Utilizator curent | `src/lib/auth/get-current-user.ts` |
| Profil activ derivat | `src/lib/auth/get-active-profile.ts` |
| Permisiuni | `src/lib/permissions/has-permission.ts` |
| UI login/register curent | `src/components/auth/auth-form.tsx`, `src/components/auth/auth-shell.tsx` |
| Rute login/register | `src/app/[locale]/login/page.tsx`, `src/app/[locale]/register/page.tsx` |
| Protecție optimistă și refresh cookie | `src/proxy.ts` |
| Callback email | `src/app/[locale]/auth/callback/route.ts` |
| Logout | `src/app/api/auth/logout/route.ts` |
| Selectare profil activ | `src/app/api/auth/active-profile/route.ts` |

## Reguli de securitate

- Cheia service-role nu intră niciodată în frontend.
- Clientul browser folosește numai cheia anon și este constrâns de RLS.
- Nicio alegere din formularul public nu poate acorda rol sensibil.
- `platform_admin`, `organization_admin`, reprezentant, instructor/trainer și consultant se acordă numai printr-un flux controlat.
- Rolul și permisiunea trebuie verificate pe server și prin RLS; ascunderea unui buton nu reprezintă autorizare.
- Un `profileId`, `organizationId`, `scopeId`, `next` sau cod de invitație primit de la client este input neîncrezător.
- Redirectul `next` acceptă numai căi interne localizate pentru a evita open redirect.
- Erorile afișate utilizatorului nu trebuie să expună stack traces, SQL, existența altor conturi sau detalii de configurare secretă.
- Politicile permisive din migrarea foundation pentru insert/update pe `profiles` trebuie întărite înainte ca TASK 002 să fie declarat complet; vezi `docs/security/RLS_AUTH_NOTES.md`.

## Implementat acum vs amânat

### Implementat acum

- infrastructura client/server Supabase;
- sign-up și sign-in email/parolă de bază;
- metadata `full_name` transmisă la sign-up;
- trigger foundation care creează un profil implicit;
- helper-ele `getCurrentUser()`, `getActiveProfile()` și `hasPermission()`;
- tabelele foundation pentru profiles, roles și permissions;
- politici RLS foundation de bază.

### Implementat în TASK 002

- cele trei fluxuri de register și stările lor sigure;
- callback localizat pentru confirmarea emailului;
- logout real și invalidarea cookie-ului de profil activ;
- refresh cookie și protecția rutelor;
- încărcarea contului/profilului în layout-uri;
- `getUserProfiles()`, `getProfileRoles()` și `hasRole()`;
- controlul `platform_admin` și starea admin restricted;
- blocarea escaladării prin `profiles` și roluri;
- erori RO/EN controlate;
- pagina profiles și dashboard-ul membrului alimentate din date reale.

### Amânat după TASK 002

- CMS-ul public și Website Settings — TASK 002.5;
- ierarhiile universitare, grupele și programele — TASK 003;
- administrarea completă a organizațiilor și importurile de membri — TASK 003;
- rapoartele avansate și consimțământul juridic final, conform roadmap-ului.
