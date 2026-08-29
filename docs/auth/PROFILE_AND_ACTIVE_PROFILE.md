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

`src/lib/auth/get-user-profiles.ts` încarcă toate profilurile utilizatorului curent și numele organizațiilor vizibile prin RLS. `getActiveProfile()` citește cookie-ul preferat, acceptă numai un profil propriu cu `status = active`, apoi revine la profilul implicit sau primul profil eligibil.

Helper-ele sunt integrate în layout-urile `/app` și `/admin`, în dashboard și în pagina reală `/app/profiles`. Un profil lipsă/pending afișează starea localizată de cont, fără randarea datelor protejate.

## Profilul implicit

Migrarea `001_foundation.sql` conține triggerul `handle_new_user()`:

- rulează după insert în `auth.users`;
- folosește `full_name`, `name` sau email pentru `display_name`;
- creează un profil `profile_type = individual`;
- setează `label = Individual Member`;
- setează `is_default = true` și `status = active`.

Migrarea 002 păstrează valoarea legacy în constraint pentru compatibilitate, migrează profilurile `individual` existente la `individual_learner` și folosește numai nomenclatura canonică pentru register-uri noi.

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

### Implementare TASK 002

- Selecția trebuie păstrată server-side într-o formă asociată utilizatorului și validată la fiecare request.
- Un cookie poate păstra numai identificatorul preferat, semnat/validat și tratat ca input neîncrezător; autorizarea se verifică în baza de date.
- Alternativ, o coloană/setare de preferință poate păstra profilul curent dacă schema este aprobată.
- Dacă selecția lipsește, este invalidă, inactivă sau nu mai aparține utilizatorului, sistemul revine la profilul implicit valid.
- Schimbarea profilului trebuie să reîncarce rolurile, scope-ul, navigația și datele.

Selecția este păstrată în cookie-ul HTTP-only `trainings_pro_active_profile`. `POST /api/auth/active-profile` validează sesiunea, ownership-ul și statusul înainte să scrie cookie-ul. Cookie-ul nu este o dovadă de autorizare; fiecare request revalidează profilul prin RLS și query server-side.

## Suportul pentru profile multiple

- Un cont poate avea mai multe profile contextuale.
- Utilizatorul vede numai profilele proprii.
- Profilurile organizaționale sunt create prin invitație/aprobare, nu liber.
- Multi-organizație este permis pentru reprezentanți, instructori/trainers și consultanți.
- Learners păstrează o singură organizație activă per relație de învățare.
- UI-ul `/app/profiles` listează profilele reale și permite alegerea unui profil propriu activ.
- Crearea liberă a unui profil suplimentar rămâne dezactivată până când există un flux autorizat.
- Ierarhiile academice și managementul complet al organizațiilor rămân TASK 003.

## Reguli de securitate

- `user_id` vine din utilizatorul validat, nu din formular.
- Clientul nu poate seta liber `profile_type`, `status`, `organization_id`, `is_default` sau roluri.
- Un singur profil implicit trebuie garantat pentru fiecare cont prin constrângere/tranzacție.
- Orice schimbare a profilului activ verifică ownership și status.
- Profilele suspendate/arhivate nu pot deveni active.
- Rolurile sensibile sunt acordate prin flux administrativ auditat.
