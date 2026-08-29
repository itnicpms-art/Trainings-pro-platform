# TASK 002 — Role helpers and admin access

## Baseline obligatoriu

Autorizarea urmează matricea manager-validată din `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`. Rolurile sensibile nu se acordă public, iar scope-ul organizațional trebuie impus prin RLS și verificări server-side.

## Starea curentă

- `getProfileRoles()`, `hasRole()` și `hasPermission()` sunt implementate server-side.
- layout-ul `/admin` validează utilizatorul și profilul activ;
- accesul cere cumulativ rolul `platform_admin` în scope `platform` și `admin.access` aprobat;
- utilizatorul autentificat fără aceste drepturi primește starea restricted localizată;
- rolurile și membership-urile nu au mutații publice după migrarea 002.

## `getProfileRoles()`

### Contract TASK 002

`getProfileRoles(profileId)` trebuie să:

1. valideze utilizatorul curent;
2. verifice prin RLS/ownership că profilul îi aparține sau că apelantul are drept administrativ explicit;
3. citească `profile_roles` împreună cu `roles`;
4. returneze codul rolului, scope type și scope id;
5. ignore/rejecte rolurile inactive sau relațiile invalide, dacă schema introduce aceste stări;
6. returneze listă goală la lipsa accesului, fără a expune rolurile altui profil.

Helper-ul este implementat în `src/lib/permissions/get-profile-roles.ts`. Query-urile separate pentru assignments și roluri rămân fail-closed și sunt limitate prin RLS la profilurile proprii.

## `hasRole()`

### Contract TASK 002

`hasRole(profileId, roleCode, context?)` verifică dacă profilul are rolul cerut în scope-ul solicitat.

- Compară coduri canonice din tabela `roles`.
- Verifică `scope_type` și `scope_id` când acțiunea este scoped.
- Nu acceptă un rol transmis de client ca dovadă.
- Nu acordă implicit un rol global dacă există același cod într-un scope local.
- Returnează `false` la eroare, profil lipsă sau scope incompatibil.

Helper-ul este implementat în `src/lib/permissions/has-role.ts` și verifică opțional `scopeType` și `scopeId`.

## `hasPermission()`

`src/lib/permissions/has-permission.ts` implementează:

1. încărcarea rolurilor profilului din `profile_roles`;
2. filtrare opțională după `scope_type` și `scope_id`;
3. identificarea permisiunii după `permissions.code`;
4. căutarea unui grant `allowed = true` și `approval_required = false` în `role_permissions`;
5. rezultat boolean, fail-closed la erori principale.

Limitări curente:

- nu validează explicit că `profileId` este profilul activ; se bazează pe RLS pentru vizibilitate;
- nu verifică statusul profilului;
- nu gestionează deny explicit sau ierarhii de scope;
- este folosit împreună cu `hasRole()` în layout-ul admin;
- ignoră eroarea query-ului final și o transformă implicit în `false`;
- nu jurnalizează deciziile sensibile;
- permisiunile foundation nu sunt încă reconciliate complet cu matricea TASK 001.9.

## Verificarea `platform_admin`

Accesul global admin necesită, cumulativ:

- utilizator Supabase validat;
- profil activ valid și aparținând utilizatorului;
- rol `platform_admin` în scope `platform`;
- permisiunea `admin.access` sau echivalentul canonic aprobat;
- RLS/politici care permit operația cerută.

Verificarea recomandată folosește `hasRole()` și/sau `hasPermission()` pe server. `profile_type = platform_admin`, textul din UI sau o rută `/admin` nu sunt suficiente singure.

Crearea și atribuirea rolului `platform_admin` se fac numai prin flux securizat, niciodată prin register, metadata publică sau insert/update direct permis utilizatorului.

## Admin restricted state

Pentru un utilizator autentificat fără acces admin:

- ruta nu afișează dashboard-ul sau datele admin;
- se afișează o stare localizată „acces restricționat” sau un răspuns 403 echivalent;
- UI-ul nu dezvăluie date, nume de organizații sau detalii despre permisiunile altor persoane;
- utilizatorul poate reveni în `/{locale}/app` sau schimba profilul, dacă are alt profil eligibil;
- starea restricted nu înlocuiește RLS.

Pentru un utilizator neautentificat se aplică redirectul de login, nu starea restricted.

## Enforcement implementat acum

- RLS permite utilizatorului să vadă propriile `profile_roles`.
- Nu există politici publice de insert/update pentru `profile_roles`.
- `hasPermission()` poate verifica un grant vizibil în sesiunea curentă.
- `getProfileRoles()` și `hasRole()` sunt implementate și fail-closed.
- Rolul `platform_admin` este seed-uit și primește permisiunile foundation.
- layout-ul admin impune rol + permisiune și randă starea restricted pentru non-admin.
- migrarea 002 revocă insert/update/delete public pentru `profile_roles` și întărește `profiles`.

## Work rămas

- flux securizat de atribuire/revocare roluri;
- verificarea scope-urilor organization/university/program/course;
- teste pentru ownership, cross-organization denial și platform admin;
- audit pentru atribuiri și acțiuni administrative.
