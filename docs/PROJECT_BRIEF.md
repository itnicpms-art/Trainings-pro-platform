# PROJECT BRIEF — Trainings PRO / NICPMS Academy

## Scop

Trainings PRO / NICPMS Academy este o platformă educațională completă pentru cursuri individuale, programe universitare, sesiuni live, evaluări, certificate, credite și administrare centralizată.

Platforma nu este doar un site de prezentare. Este un produs LMS + CMS + academic management + booking + certification.

## Direcții principale

### 1. Cursuri individuale

Utilizatorii pot crea cont, explora catalogul de cursuri, se pot înscrie sau pot cumpăra acces, pot parcurge lecții, pot face assignments, proiecte, quiz-uri, teste și examene, pot completa survey final și pot primi certificat.

### 2. Zonă universitară

Universitățile pot avea facultăți, departamente, programe academice, ani universitari, semestre, groups, studenți, profesori, discipline, credite ECTS, note, rezultate și certificate.

Studenții universitari pot fi alocați automat la cursurile obligatorii ale programului și group-ului lor.

## Decizii confirmate

- Un user poate avea mai multe profile.
- Folosim `groups`, nu `cohorts`.
- `Organization` este concept central pentru universități, companii, training providers și parteneri.
- `Course` este separat de `Course Session`.
- `Enrollment` este pentru curs; `Booking` este pentru sesiune.
- `Assignment` este legat de lecție.
- `Project` este legat de curs și poate fi individual sau de grup.
- `Quiz`, `Test`, `Exam` sunt obiecte de evaluare.
- `Survey` este separat și se completează după examenul final / finalizarea cursului.
- Calendarul este pentru membru și poate afișa un profil sau toate profilele.
- Modificările importante trec prin approval workflow.
- Audit log este obligatoriu pentru acțiuni importante.

## Stack tehnic

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- PostgreSQL
- Supabase Auth, Database, Storage, RLS
- Stripe
- Resend
- Vimeo / Mux
- Zoom / Google Meet / Teams integrations
- Vercel

## Principiu de implementare

Se implementează pe faze. Codex nu trebuie să construiască toată platforma dintr-un singur task.
