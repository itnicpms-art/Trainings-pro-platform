# TASK 002 — Register and onboarding flow

## Baseline obligatoriu

Fluxurile descrise aici implementează `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md`. Formularul public nu poate acorda roluri sensibile și nu poate crea o apartenență organizațională numai pe baza unei declarații a utilizatorului.

## Starea curentă

`src/components/auth/register-form.tsx` afișează cele trei opțiuni și formularele lor localizate. Toate folosesc Supabase Auth, iar triggerul securizat din migrarea `002_auth_onboarding.sql` ignoră orice tentativă de rol sau organizație privilegiată transmisă prin metadata.

- contul individual creează un profil canonic `individual_learner`;
- invitația creează o cerere cu hash-ul codului și status pending, fără membership;
- reprezentantul creează o cerere pending, fără organizație, rol sau acces admin;
- termenii, versiunea lor, limba și data acceptării sunt persistate;
- erorile Auth sunt mapate la mesaje RO/EN fără afișarea mesajelor brute.

## Modelul de stare cerut de TASK 002

| Stare | Semnificație | Acces la zona protejată |
|---|---|---|
| `active` | Contul și onboarding-ul necesar sunt validate | Da, în limitele profilului și rolurilor |
| `pending_email_confirmation` | Contul Auth există, dar emailul obligatoriu nu a fost confirmat | Nu |
| `pending_organization_approval` | Email confirmat; cererea de reprezentant așteaptă aprobarea `platform_admin` | Nu la date organizaționale |
| `pending_review` | Invitația, apartenența sau cererea necesită verificare manuală înainte de activare | Nu la resursa solicitată |

Stările sunt persistate în `profiles.status` și, pentru invitații/reprezentanți, în `onboarding_requests.status` prin migrarea `002_auth_onboarding.sql`.

## Opțiunea 1 — Cont individual

### Câmpuri

- nume și prenume sau nume complet;
- email;
- parolă;
- limbă preferată (`ro` / `en`);
- acceptarea obligatorie a termenilor și politicilor;
- versiunea termenilor și data acceptării, persistate server-side.

### Procesare

1. Se validează inputul pe server.
2. Se creează utilizatorul Supabase Auth fără rol furnizat de client.
3. Se creează profilul implicit individual conform nomenclaturii aprobate.
4. Dacă politica proiectului nu blochează pe confirmarea emailului, onboarding status devine `active`.
5. Dacă mediul impune confirmarea înainte de sesiune, statusul devine `pending_email_confirmation` până la callback.
6. După activare, utilizatorul ajunge la `/{locale}/app`.

Baseline-ul numește profilul `individual_learner`; migrarea foundation folosește `individual`. TASK 002 trebuie să aleagă și să migreze nomenclatura canonică înainte de finalizare.

## Opțiunea 2 — Invitație / cod de acces

### Câmpuri

- nume;
- email;
- parolă;
- codul sau tokenul din linkul de invitație;
- limba preferată;
- acceptarea termenilor și politicilor.

Organizația, grupul, cursul, programul și rolul nu sunt câmpuri libere. Ele provin exclusiv din invitația validată.

### Procesare

1. Se creează utilizatorul Auth fără rol sau organizație din payload-ul clientului.
2. Codul este normalizat de trigger și persistat numai ca SHA-256 hash.
3. Se creează `onboarding_requests` cu `pending_email_confirmation` sau `pending_review`.
4. Nu se creează membership și nu se atribuie rol organizațional.
5. După confirmarea emailului, callback-ul mută cererea în `pending_review`.

Validarea completă a invitațiilor emise, expirării, revocării și consumului atomic este limitarea cunoscută a acestei etape. Până la backend-ul administrativ corespunzător, toate codurile rămân în verificare manuală și nu acordă acces.

Invitațiile expiră implicit după 14 zile și pot fi revocate de emitent. Implementarea tabelelor de invitații și a administrării lor rămâne în TASK 002/TASK 003 conform limitei de mai jos.

## Opțiunea 3 — Cerere de reprezentant organizație

### Câmpuri

- nume și prenume;
- email;
- parolă;
- telefon sau altă metodă de contact, dacă este aprobată în UI;
- numele organizației;
- tipul organizației;
- identificatori/date organizaționale necesare verificării;
- rolul profesional și motivul solicitării;
- cod/link de invitație, dacă există;
- limba preferată;
- acceptarea termenilor și politicilor.

Lista finală de date juridice/identificatori trebuie validată înainte de implementare; formularul trebuie să colecteze numai datele necesare.

### Procesare

1. Se creează contul Auth fără rol administrativ.
2. Până la confirmarea emailului, statusul este `pending_email_confirmation`.
3. După confirmare, cererea devine `pending_organization_approval`.
4. Dacă organizația sau solicitarea necesită verificări suplimentare, se folosește `pending_review` fără acces privilegiat.
5. Numai un `platform_admin` desemnat poate aproba cererea.
6. După aprobare se creează relația organizațională și rolul permis, apoi statusul devine `active`.
7. SLA-ul de business pentru aprobare este de maximum 3 zile lucrătoare.

Un răspuns Auth reușit nu înseamnă aprobare organizațională.

## După înregistrarea reușită

| Rezultat | Comportament UI |
|---|---|
| `active` | Mesaj localizat, sesiune reîmprospătată și redirect către `/{locale}/app` |
| `pending_email_confirmation` | Ecran localizat „verifică emailul”; fără redirect într-o zonă cu date |
| `pending_organization_approval` | Ecran de așteptare cu statut și explicație; fără acces organizațional |
| `pending_review` | Ecran de așteptare/revizuire; fără a dezvălui detalii interne |

Callback-ul de email trebuie să păstreze locale-ul și să derive destinația din starea reală citită server-side.

## Validări și erori

- email invalid sau deja folosit;
- parolă sub politica minimă;
- termeni neacceptați;
- invitație invalidă, expirată, revocată sau deja folosită;
- emailul nu corespunde invitației;
- organizație sau solicitare duplicată;
- limitare de rată / eroare de rețea;
- configurare Supabase lipsă;
- cerere respinsă, suspendată sau în curs de revizuire.

Mesajele trebuie mapate la chei RO/EN; mesajele brute Supabase nu sunt contractul UI final.

## Amânat pentru task-uri viitoare

- structura universitate → facultate → program → grupă → an — TASK 003;
- administrarea completă a organizațiilor și grupurilor — TASK 003;
- importurile CSV și interfața de emitere/revocare în masă — TASK 003;
- CMS și editarea website-ului — TASK 002.5;
- politici juridice finale pentru retenție, ștergere și rezultate individuale;
- rapoarte organizaționale avansate.
