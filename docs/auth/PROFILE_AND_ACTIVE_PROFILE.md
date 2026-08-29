# TASK 002 — Profiles and active profile

## Baseline obligatoriu

Modelul de profil urmează `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`, inclusiv derivarea sub-tipurilor organizaționale, regula multi-organizație și interdicția de a alege liber un rol sensibil.

## Cont vs profil

### Cont

Contul este identitatea de autentificare din `auth.users`:

- deține emailul și credențialele;
- deține sesiunea Supabase;
- este unic pentru persoană;
- nu reprezintă direct un rol sau o organizație.

### Profil

Profilul este o identitate contextuală din `public.profiles`:

- aparține unui `auth.users` prin `user_id`;
- poate reprezenta context individual, academic, organizațional sau administrativ;
- poate avea roluri cu scope în `profile_roles`;
- poate fi activ, inactiv, suspendat sau arhivat conform modelului final;
- nu poate fi folosit dacă nu aparține utilizatorului autentificat.

Rolurile nu trebuie deduse exclusiv din `profile_type`. `profile_roles`, `roles` și `role_permissions` sunt sursa pentru autorizare, după întărirea politicilor RLS.

## Încărcarea profilurilor

### Implementat acum

`src/lib/auth/get-active-profile.ts` exportă `getActiveProfile()`:

1. încarcă în paralel clientul Supabase de server și utilizatorul curent;
2. interoghează `profiles` pentru `user_id = currentUser.id` și `status = active`;
3. sortează `is_default` descrescător;
4. returnează primul profil sau `null`.

RLS din foundation permite utilizatorului autentificat să selecteze numai profilele cu propriul `user_id`.

Helper-ul nu este folosit în layout-urile `/app` sau `/admin`; pagina `/app/profiles` afișează în prezent un rând static.

### Obligatoriu în TASK 002

- helper pentru listarea tuturor profilelor proprii active;
- tratarea explicită a erorilor și a profilului lipsă;
- încărcarea profilului activ în layout-ul protejat;
- încărcarea rolurilor și scope-ului aferent profilului;
- UI alimentat din date reale;
- refuzul accesului la un `profileId` care nu aparține utilizatorului.

## Profilul implicit

Migrarea `001_foundation.sql` conține triggerul `handle_new_user()`:

- rulează după insert în `auth.users`;
- folosește `full_name`, `name` sau email pentru `display_name`;
- creează un profil `profile_type = individual`;
- setează `label = Individual Member`;
- setează `is_default = true` și `status = active`.

Baseline-ul manager-validat folosește numele `individual_learner`. TASK 002 trebuie să decidă nomenclatura canonică și să includă o migrare compatibilă; documentația nu presupune că `individual` și `individual_learner` sunt automat echivalente.

Pentru invitații și cereri organizaționale, profilul/rolul contextual nu devine utilizabil înainte de confirmările și aprobările cerute.

## Conceptul de profil activ

Profilul activ determină:

- identitatea contextuală afișată;
- rolurile evaluate;
- scope-ul organizație/universitate/program/curs;
- navigația disponibilă;
- datele pe care RLS și helper-ele le pot returna.

Profilul activ nu schimbă utilizatorul Auth și nu acordă permisiuni noi.

## Unde este stocat profilul activ

### Acum

Nu există o selecție persistentă. `getActiveProfile()` derivă profilul activ alegând profilul activ marcat implicit, apoi primul rezultat. Topbar-ul afișează un selector vizual fără logică de schimbare.

### Contract TASK 002

- Selecția trebuie păstrată server-side într-o formă asociată utilizatorului și validată la fiecare request.
- Un cookie poate păstra numai identificatorul preferat, semnat/validat și tratat ca input neîncrezător; autorizarea se verifică în baza de date.
- Alternativ, o coloană/setare de preferință poate păstra profilul curent dacă schema este aprobată.
- Dacă selecția lipsește, este invalidă, inactivă sau nu mai aparține utilizatorului, sistemul revine la profilul implicit valid.
- Schimbarea profilului trebuie să reîncarce rolurile, scope-ul, navigația și datele.

Decizia finală cookie vs preferință în DB trebuie consemnată în acest document când TASK 002 este implementat.

## Suportul pentru profile multiple

- Un cont poate avea mai multe profile contextuale.
- Utilizatorul vede numai profilele proprii.
- Profilurile organizaționale sunt create prin invitație/aprobare, nu liber.
- Multi-organizație este permis pentru reprezentanți, instructori/trainers și consultanți.
- Learners păstrează o singură organizație activă per relație de învățare.
- UI-ul `/app/profiles` va lista profilele reale și va permite alegerea profilului activ.
- Crearea liberă a unui profil suplimentar rămâne dezactivată până când există un flux autorizat.
- Ierarhiile academice și managementul complet al organizațiilor rămân TASK 003.

## Reguli de securitate

- `user_id` vine din utilizatorul validat, nu din formular.
- Clientul nu poate seta liber `profile_type`, `status`, `organization_id`, `is_default` sau roluri.
- Un singur profil implicit trebuie garantat pentru fiecare cont prin constrângere/tranzacție.
- Orice schimbare a profilului activ verifică ownership și status.
- Profilele suspendate/arhivate nu pot deveni active.
- Rolurile sensibile sunt acordate prin flux administrativ auditat.
