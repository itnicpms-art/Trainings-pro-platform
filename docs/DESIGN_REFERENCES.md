# DESIGN REFERENCES

Aceste imagini sunt referințe vizuale pentru Codex și designer. Ele nu sunt sursa finală de adevăr pentru date sau logică. Pentru reguli de business, folosește documentele de task și schema bazei de date.

## Asset oficial

| Fișier | Rol |
|---|---|
| `00-logo-trainings-pro-official.png` | Logo oficial pentru aplicație și documente |
| `30-trainings-pro-logo.png` | Logo din workbook-ul de referință |

## Mapare imagini → module

| Fișier | Modul / rută | Observații |
|---|---|---|
| `01-mvp-flow-updated.png` | MVP / product flow | Flux principal actualizat: user, profiles, curs, evaluare, survey, certificat, calendar live |
| `02-admin-cms-editor-curriculum.png` | `/admin/courses/[id]/edit` | Editor CMS pentru curs, module, lecții, quiz-uri și metadata |
| `03-admin-cms-editor-approval.png` | `/admin/courses/[id]/edit` | Variantă cu approval workflow și status draft/pending |
| `04-public-homepage-overview.png` | `/` | Homepage / landing page generală |
| `05-user-types-roles.png` | roles & profiles | Tipuri de utilizatori și model de roluri/profile |
| `06-organization-concept.png` | organizations | Concept central Organization: university, company, training provider, partner |
| `07-course-structure-page.png` | course page | Structură curs comercial + curriculum + beneficii |
| `08-curriculum-original.png` | curriculum | Diagramă inițială Course → Curriculum → Module → Lesson |
| `09-curriculum-updated.png` | curriculum | Curriculum actualizat cu assignment, project, quiz, test |
| `10-assessment-assignment-project-survey.png` | evaluation | Assignment, Project, Quiz, Test, Exam, Survey final |
| `11-course-scheduling-booking-auto-university.png` | sessions / booking | Separare Course vs Course Session + auto-enrollment universitar |
| `12-calendar-multi-profile-member.png` | `/app/calendar` | Calendar membru cu selector pentru toate profilele / profil individual / personal |
| `13-webinars.png` | webinars | Webinare ca evenimente cu registration și attendance |
| `14-live-consultation.png` | consultation live | Disponibilitate consultant + booking live |
| `15-offline-async-consultation.png` | consultation async | Sistem de solicitări asincrone, similar ticketing specializat |
| `16-certificate-system.png` | certificates | Sistem certificate + verificare publică |
| `17-certificate-individual.png` | certificate template | Certificat individual NICPMS Academy / Trainings PRO |
| `18-university-student-results-dashboard.png` | academic results | Rezultate, note, credite, transcript |
| `19-academic-structure-dashboard.png` | academic admin | Structură academică: program, year, semester, groups |
| `20-member-dashboard-learning.png` | `/app` | Dashboard membru / cursant |
| `21-member-dashboard-data.png` | `/app` | Dashboard cu date, progres, evenimente, certificate |
| `22-student-dashboard.png` | `/app/student` | Dashboard student universitar |
| `23-professor-dashboard.png` | `/app/professor` | Dashboard profesor |
| `24-admin-dashboard.png` | `/admin` | Dashboard administrator |
| `25-platform-admin-dashboard-light.png` | `/admin` | Admin platformă, variantă light |
| `26-platform-admin-dashboard-dark-sidebar.png` | `/admin` | Admin platformă cu sidebar dark |
| `27-tech-stack-security.png` | tech stack | Stack tehnic + RLS / multi-organizație |
| `28-tech-stack-simple.png` | tech stack | Stack tehnic simplificat |
| `29-database-schema-v1.png` | database | Schema bazei de date conceptuală |
| `30-trainings-pro-logo.png` | brand | Logo Trainings PRO |

## Reguli pentru Codex

- Folosește imaginile ca direcție vizuală, nu copia pixel-perfect.
- Respectă brandul Trainings PRO.
- Pentru fiecare task, citește doar imaginile relevante.
- Nu implementa module din task-uri viitoare doar pentru că apar în imagini.
