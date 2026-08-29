# TASK 002 — Auth, Users, Profiles & Roles

## Stare curentă

TASK 002 este implementat pe branch-ul de lucru prin migrarea `002_auth_onboarding.sql`, cele trei fluxuri de register, login/logout, Proxy, layout-uri protejate, profile reale, profil activ și helper-ele RBAC. Aplicarea migrării și QA-ul autentificat/RLS pe un proiect Supabase de test rămân obligatorii înainte de deployment.

## Scop

Construiește logica reală de autentificare, profile multiple, profil activ și verificare de permisiuni.

Implementarea trebuie să pornească de la regulile validate din `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`, inclusiv fluxurile de register, invitațiile, starea `pending`, derivarea sub-tipurilor organizaționale, aprobarea rolurilor sensibile și matricea RBAC. Documentul de reguli nu autorizează crearea anticipată a structurii CMS sau a structurii academice din TASK 003.

Baseline-ul manager-validat din TASK 001.9 este sursa de adevăr pentru deciziile funcționale din TASK 002. Orice diferență dintre scaffold-ul existent și baseline trebuie rezolvată explicit, inclusiv denumirea tipului de profil individual (`individual` în migrarea curentă față de `individual_learner` în baseline).

## Build

- Register prin trei opțiuni: cont individual, invitație/cod de acces și solicitare ca reprezentant al unei organizații.
- Statusuri explicite pentru onboarding: `active`, `pending_email_confirmation`, `pending_organization_approval` și `pending_review`.
- Login / logout și redirect-uri localizate pentru RO/EN.
- Protecție pentru `/{locale}/app`, `/{locale}/app/*`, `/{locale}/admin` și `/{locale}/admin/*`.
- Pagina `/app/profiles` pentru listare profile.
- Selector de profil activ în topbar.
- Persistarea sigură a profilului activ și fallback la profilul implicit.
- Helper-ele `getProfileRoles()`, `hasRole()` și `hasPermission(profileId, permissionCode, scope)`.
- Afișare roluri pe profil.
- Stare localizată de acces restricționat pentru admin, fără divulgarea datelor administrative.

## Securitate și RLS

- Clientul folosește exclusiv cheia publică anon; cheia `service_role` nu este expusă în frontend.
- Profilurile, rolurile și permisiunile sunt verificate server-side și prin RLS; ascunderea elementelor UI nu reprezintă autorizare.
- Utilizatorii publici sau autentificați nu pot acorda roluri, crea permisiuni sau promova un profil la `platform_admin`.
- Politicile curente pentru `profiles` trebuie întărite înainte de finalizarea TASK 002 pentru a împiedica modificarea câmpurilor privilegiate de către proprietarul profilului.
- Migrațiile pentru invitații sau cereri organizaționale se adaugă numai dacă sunt necesare fluxurilor TASK 002 și trebuie documentate în notele de finalizare.

## Documentație obligatorie

- `docs/auth/AUTH_IMPLEMENTATION.md`
- `docs/auth/REGISTER_AND_ONBOARDING_FLOW.md`
- `docs/auth/LOGIN_LOGOUT_FLOW.md`
- `docs/auth/PROFILE_AND_ACTIVE_PROFILE.md`
- `docs/auth/ROLE_HELPERS_AND_ADMIN_ACCESS.md`
- `docs/security/ROUTE_PROTECTION.md`
- `docs/security/RLS_AUTH_NOTES.md`
- `docs/roadmap/TASK_002_COMPLETION_NOTES.md`

Documentația trebuie actualizată pe măsură ce implementarea avansează. Nu trebuie să prezinte drept finalizate comportamente care există doar ca plan.

## Limitări acceptate în această livrare

- Invitațiile sunt fail-closed: codul este hash-uit, cererea intră în `pending_review`, iar membership-ul/rolul nu sunt acordate automat.
- Emiterea, expirarea, revocarea și consumul invitațiilor necesită backend-ul administrativ viitor.
- Aprobarea cererilor de reprezentant și atribuirea rolurilor sensibile rămân fluxuri administrative controlate, fără grant public.
- Managementul complet al organizațiilor și structura academică rămân TASK 003.

## Design references

- `05-user-types-roles.png`
- `12-calendar-multi-profile-member.png`
- `20-member-dashboard-learning.png`

## Acceptance Criteria

- Utilizatorul vede doar profilele proprii.
- Utilizatorul poate seta profil activ.
- Admin area refuză accesul fără rol potrivit.
- Toate cele trei opțiuni de înregistrare produc statusul corect și o destinație clară după succes.
- Redirect-urile de autentificare păstrează locale-ul RO/EN.
- `getProfileRoles()`, `hasRole()` și `hasPermission()` sunt testate pentru acces permis și refuzat.
- Nu există cale publică de escaladare a rolurilor sau de creare a unui profil `platform_admin`.
- `docs/roadmap/TASK_002_COMPLETION_NOTES.md` conține migrațiile reale, rezultatele QA, limitările cunoscute și delimitarea pentru TASK 002.5/TASK 003.
