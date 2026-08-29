# TASK 002 — Login and logout flow

## Baseline obligatoriu

Fluxurile de acces respectă `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`: autentificarea validează identitatea, dar accesul final depinde de starea onboarding-ului, profilul activ, roluri, scope și RLS.

## Login — starea curentă

`src/components/auth/auth-form.tsx`:

1. colectează email și parolă;
2. creează clientul Supabase pentru browser;
3. apelează `supabase.auth.signInWithPassword()`;
4. afișează toast de succes sau mesajul Supabase brut;
5. navighează la `/{locale}/app` și execută `router.refresh()`.

Lipsesc verificarea stării onboarding-ului, încărcarea profilului, return URL sigur și protecția server-side a destinației.

## Login — contract TASK 002

1. Utilizatorul trimite email și parolă din ruta localizată.
2. Supabase validează credențialele și actualizează cookie-urile sesiunii.
3. Serverul validează utilizatorul cu `auth.getUser()`.
4. Se încarcă starea onboarding-ului și profilul activ/implicit.
5. Pentru `pending_email_confirmation`, `pending_organization_approval` sau `pending_review`, se afișează starea localizată; nu se acordă accesul asociat.
6. Pentru un cont `active`, utilizatorul este redirecționat către o cale internă `next` validată sau către `/{locale}/app`.
7. Accesul admin este evaluat separat și nu se obține prin redirectul solicitat de client.

## Logout — starea curentă

Topbar-ul afișează o opțiune localizată de logout, dar elementul nu are handler și nu apelează `supabase.auth.signOut()`. Nu există Route Handler sau Server Action de logout.

## Logout — contract TASK 002

1. Acțiunea de logout apelează Supabase `signOut()` într-un flux care poate actualiza cookie-urile.
2. Starea client este invalidată și componentele server sunt reîmprospătate.
3. Utilizatorul este redirecționat la `/{locale}/login`.
4. Un return URL privat vechi nu este reutilizat automat după logout.
5. Accesarea ulterioară a `/app` sau `/admin` declanșează din nou protecția server-side.

## Redirecturi

| Eveniment | Destinație |
|---|---|
| Login activ fără `next` | `/{locale}/app` |
| Login activ cu `next` intern valid | Calea localizată validată |
| Login cu status pending | Ecranul localizat corespunzător statusului |
| Logout | `/{locale}/login` |
| Acces neautentificat la rută protejată | `/{locale}/login?next=<path-intern>` |
| Acces non-admin la `/admin` | Stare admin restricted localizată |

Parametrul `next` nu acceptă URL absolut, protocol, host sau cale care schimbă locale-ul fără validare.

## Comportament RO/EN

- Login și logout păstrează locale-ul curent `ro` sau `en`.
- Selectorul de limbă păstrează calea echivalentă prin `localizePath()` și cookie-ul `NEXT_LOCALE`.
- Redirecturile de auth sunt construite cu locale-ul rezolvat din rută, nu numai din cookie.
- Titlurile, validările, stările pending și erorile trebuie să existe în ambele dicționare.
- În prezent, succesul și etichetele sunt localizate, dar erorile Supabase sunt afișate brut și trebuie mapate în TASK 002.

## Stări de eroare comune

- credențiale invalide;
- email neconfirmat;
- cont inexistent sau dezactivat;
- cont suspendat/arhivat;
- onboarding în așteptare;
- profil activ absent;
- cerere organizațională respinsă;
- sesiune expirată;
- rate limit;
- conexiune indisponibilă;
- configurare Supabase lipsă;
- eroare neașteptată fără detalii sensibile.

Mesajele de login nu trebuie să faciliteze enumerarea conturilor. UI-ul poate folosi un mesaj generic pentru combinațiile email/parolă invalide.
