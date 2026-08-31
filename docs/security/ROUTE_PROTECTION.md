# TASK 002 — Route protection

## Baseline obligatoriu

Protecția rutelor respectă `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`: autentificarea nu implică automat acces admin sau organizațional.

## Rute protejate

Următoarele rute și toți descendenții lor sunt protejați:

- `/{locale}/app`;
- `/{locale}/app/*`;
- `/{locale}/admin`;
- `/{locale}/admin/*`.

`{locale}` acceptă `ro` și `en`. Rutele fără locale configurate în `next.config.ts` păstrează redirecturile către varianta română, dar autentificarea trebuie să folosească locale-ul rutei finale.

## Starea curentă

- `src/proxy.ts` reîmprospătează sesiunea și redirecționează lipsa utilizatorului validat.
- Layout-urile app/admin repetă `getCurrentUser()` înainte de randare.
- Layout-ul app cere un profil propriu cu status `active`; statusurile pending primesc o stare dedicată.
- Layout-ul admin cere rolul `platform_admin` și permisiunea `admin.access` în scope platform.
- Același layout protejează toate rutele TASK 002.5: overview, organizations, users, roles, security, audit, website, approvals și content.
- Non-admin vede starea restricted localizată, fără conținut admin.
- Route Handlers pentru logout și profil activ verifică origin/sesiune/ownership după caz.

## Contractul de protecție TASK 002

Protecția trebuie aplicată în straturi:

1. **Proxy optimist**: refresh pentru cookie-urile Supabase și redirect rapid când lipsește o sesiune utilizabilă.
2. **Layout/Server Component**: validare cu `getCurrentUser()` înainte de randarea zonei protejate.
3. **Autorizare admin**: încărcarea profilului activ și verificarea rolului/permisiunii.
4. **Server Actions/Route Handlers**: repetarea verificărilor pentru fiecare mutație sau răspuns sensibil.
5. **RLS**: limita finală pentru fiecare query de date.

În Next.js 16 fișierul se numește `proxy.ts`; Proxy nu trebuie folosit ca unic sistem de autorizare sau pentru query-uri lente de permisiuni.

## Redirect pentru utilizator neautentificat

| Rută cerută | Redirect |
|---|---|
| `/ro/app` sau descendent | `/ro/login?next=<cale-internă>` |
| `/en/app` sau descendent | `/en/login?next=<cale-internă>` |
| `/ro/admin` sau descendent | `/ro/login?next=<cale-internă>` |
| `/en/admin` sau descendent | `/en/login?next=<cale-internă>` |

Reguli pentru `next`:

- este opțional;
- conține numai o cale internă;
- păstrează locale-ul valid;
- nu acceptă protocol, host, `//`, schemă externă sau destinație nepermisă;
- este revalidat după login;
- nu poate ocoli verificarea admin.

## Comportament admin restricted

Un utilizator autentificat care nu are `platform_admin` + permisiunea admin necesară:

- nu este tratat ca neautentificat;
- nu vede conținutul admin;
- primește o stare localizată restricted/403;
- poate reveni la `/{locale}/app`;
- poate schimba profilul numai către un profil propriu eligibil;
- nu primește informații despre structura internă sau datele altor organizații.

RLS trebuie să blocheze datele chiar dacă utilizatorul ocolește UI-ul restricted.

Pentru datele globale TASK 002.5, RPC-urile read-only repetă verificarea profilului propriu activ, a rolului `platform_admin` și a permisiunii `admin.access`. Layout-ul nu este singura barieră de autorizare.

## Redirecturi locale

- Locale-ul este rezolvat cu `resolveLocale()`.
- Redirecturile folosesc locale-ul din pathname.
- `localizePath()` schimbă numai segmentul de locale și păstrează calea echivalentă.
- Cookie-ul `NEXT_LOCALE` este preferință de UI, nu dovadă de autentificare.
- Callback-urile Auth invalide sau fără locale cad înapoi la `ro` numai printr-o regulă explicită.

## Cazuri speciale

- Utilizator autentificat fără profil activ: ecran de remediere/selectare profil, fără date.
- Profil suspendat/arhivat: acces refuzat și sesiunea poate rămâne validă numai pentru acțiuni de cont permise.
- Status onboarding pending: ecran de status, nu dashboard.
- Sesiune expirată în timpul navigării: cookie refresh sau redirect localizat la login.
- Configurare Supabase lipsă: fail closed pentru rutele protejate.

## Criterii de acceptare

- fiecare rută protejată refuză accesul fără utilizator validat;
- fiecare redirect păstrează `ro`/`en`;
- non-admin nu poate reda conținutul admin;
- apelurile directe la acțiuni/API sunt protejate separat;
- un `next` extern este respins;
- o sesiune expirată nu păstrează accesul;
- testele includ `/app`, descendenți, `/admin`, descendenți și ambele locale.
