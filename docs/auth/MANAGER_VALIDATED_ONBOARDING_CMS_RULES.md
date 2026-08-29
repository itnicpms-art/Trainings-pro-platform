# Reguli validate — onboarding, organizații, RBAC, confidențialitate și CMS

## Statutul documentului

Acest document extrage regulile de planificare din fișierul de referință `Trainings_PRO_Validare_Manager_Onboarding_CMS_v2.xlsx`, datat 29 august 2026. Pentru această etapă, fișierul a fost desemnat drept sursa de adevăr pentru regulile de business și pentru ordinea de implementare.

Fișierul Excel rămâne exclusiv un artefact de planificare. Aplicația nu trebuie să îl citească, iar conținutul lui nu trebuie importat în baza de date.

> Notă de trasabilitate: în workbook, câmpurile „Decizie manager” și „Status manager” sunt încă afișate ca `De validat`. Pentru această documentare, regulile recomandate sunt tratate drept baseline-ul validat deoarece fișierul a fost furnizat explicit ca referință validată. Elementele marcate în workbook ca necesitând decizie juridică, managerială ulterioară sau evaluare în alt task rămân deschise și sunt enumerate separat.

## Limitele acestei etape

Acest document:

- definește reguli funcționale și de acces pentru implementări viitoare;
- nu implementează autentificarea, onboarding-ul sau CMS-ul;
- nu definește și nu creează tabele, migrații, politici RLS sau funcții SQL;
- nu importă Excel-ul în Supabase;
- nu introduce dependențe runtime față de Excel;
- nu modifică configurația Supabase;
- nu înlocuiește o revizuire juridică pentru GDPR, retenție sau dreptul la ștergere.

## Decizii generale

1. Platforma acceptă atât conturi individuale, cât și utilizatori afiliați organizațiilor.
2. Organizațiile sunt modelate unitar, cu tipuri și permisiuni diferite.
3. Utilizatorii organizaționali nu își pot declara liber apartenența. Relația cu o organizație trebuie validată prin invitație, cod, email instituțional/corporate, import sau creare controlată.
4. Rolurile sensibile nu se acordă prin formular public.
5. Accesul organizațional este limitat la organizația și grupurile proprii.
6. Datele individuale detaliate sunt ascunse implicit și pot fi expuse numai condiționat.
7. Conținutul public va deveni editabil printr-un CMS protejat, într-un task ulterior.
8. Metricile publice nu sunt editabile manual și nu pot afișa valori inventate.
9. Regulile de onboarding și permisiuni trebuie documentate înainte de implementarea autentificării reale.

## Tipuri de utilizatori, profiluri și acces inițial

| Tip utilizator | Intrare în platformă | Profil sau rol inițial | Acces inițial | Regulă importantă |
|---|---|---|---|---|
| Utilizator individual | Register public | `individual_learner` | Cursuri publice sau cumpărate individual, certificate și istoric personal | Nu necesită invitație |
| Utilizator din organizație | Invitație, cod, email instituțional/corporate sau import CSV | `organization_learner` | Cursuri, programe și grupuri alocate de organizație | Nu se auto-declară ca membru al organizației |
| Student universitar | Invitație universitate, cod, email instituțional sau import | `organization_learner`, sub-tip `university_student` | Cursuri universitare, grupe, programe și certificate | Sub-tipul este derivat automat din tipul organizației |
| Angajat companie | Link/cod companie sau import | `organization_learner`, sub-tip `company_learner` | Traininguri alocate de companie | Sub-tipul este derivat automat din tipul organizației |
| Reprezentant organizație | Invitație securizată sau creare de către admin | `organization_representative` | Dashboard de grup, progres și rapoarte permise | Nu primește acces automat prin register public |
| Profesor / trainer | Invitație sau creare de către admin | `instructor` / `trainer` | Cursuri predate, participanți alocați și evaluări relevante | Rol sensibil, acordat controlat |
| Consultant | Invitație sau creare de către admin | `consultant` | Sesiuni și participanți alocați | Rol sensibil, acordat controlat |
| Admin organizație | Creat sau invitat de `platform_admin` | `organization_admin` | Utilizatori, grupe și rapoarte din organizația proprie | Nu are acces global |
| Admin platformă | Creat manual prin flux securizat | `platform_admin` | Acces complet la platformă | Nu se creează niciodată public |

### Derivarea sub-tipurilor learner

- `university_student` se derivă automat când organizația este de tip Universitate.
- `company_learner` se derivă automat când organizația este de tip Companie.
- Sub-tipul nu este ales de utilizator și nu este setat manual ca alegere liberă de către admin.
- Profilul de bază rămâne `organization_learner`.

### Apartenența la mai multe organizații

- Este permisă pentru `organization_representative`, `instructor` / `trainer` și `consultant`.
- Nu este permisă ca apartenență organizațională activă simultană pentru learners.
- Un `individual_learner` sau `organization_learner` păstrează o singură organizație activă per relație de învățare.
- Regula urmărește să păstreze neambiguă alocarea la grup și raportarea organizațională.

## Fluxurile de înregistrare

### 1. Creez cont individual

Date solicitate:

- email;
- parolă;
- nume și prenume;
- limbă preferată;
- acceptarea termenilor și politicilor.

Comportament planificat:

- se creează contul de autentificare și profilul `individual_learner`;
- contul devine activ imediat;
- confirmarea emailului este recomandată, dar neblocantă pentru acest flux considerat cu risc redus.

### 2. Am invitație / cod de acces

Public țintă: studenți, angajați și alți participanți invitați de organizații.

Date solicitate:

- email;
- parolă;
- nume;
- codul sau linkul de invitație.

Comportament planificat:

- invitația este validată;
- organizația este identificată;
- utilizatorul este legat de grupul, cursul sau programul corespunzător;
- confirmarea emailului este obligatorie;
- contul devine activ numai după validarea invitației și confirmarea emailului.

### 3. Reprezint o organizație

Public țintă: companii, universități, instituții și parteneri.

Date solicitate:

- date de contact;
- date despre organizație;
- cod sau link de invitație, dacă există.

Comportament planificat:

- sistemul creează o solicitare sau validează o invitație de reprezentant;
- nu se acordă automat rol de admin;
- confirmarea emailului este obligatorie;
- contul intră în starea `pending` și nu are acces la date;
- activarea se face numai după aprobarea unui `platform_admin` desemnat;
- SLA-ul de aprobare este de maximum 3 zile lucrătoare.

## Reguli pentru invitații

- O invitație identifică organizația și, după caz, grupul, cursul sau programul alocat.
- Linkurile și codurile expiră implicit după 14 zile.
- Emitentul poate revoca manual invitația înainte de folosire.
- O invitație devine invalidă după prima folosire.
- Codurile organizaționale `multi-use` sunt singura excepție și trebuie marcate explicit ca atare.
- Confirmarea emailului este obligatorie pentru acceptarea invitațiilor și pentru fluxul de reprezentant organizație.
- Apartenența sau rolul rezultat nu trebuie deduse numai dintr-un email introdus de utilizator fără validarea fluxului autorizat.

## Tipuri de organizații

| Tip | Structură și utilizatori | Regula de modelare |
|---|---|---|
| Universitate | Facultăți, programe, centre; studenți, profesori, admini și reprezentanți | La TASK 002 se modelează doar organizația generică. Ierarhia facultate → program → grupă → an este rezervată TASK 003 |
| Companie | Angajați, HR, manageri și admini | Structură plată organizație → angajați; poate avea grupuri de training și rapoarte pe grup |
| Instituție publică | Angajați, reprezentanți și admini | Similar companiei; necesitatea departamentelor se evaluează la TASK 003 |
| ONG / asociație | Membri, participanți și coordonatori | Structură plată organizație → membri |
| Training provider | Traineri, cursanți și admini | Poate gestiona cursuri proprii conform contractului |
| Partener educațional | Utilizatori invitați și administratori limitați | Acces și funcționalități limitate contractual |
| Alt tip | Cazuri speciale | Rămâne extensibil; nu se presupune o ierarhie înainte de definire |

## Aprobarea rolurilor sensibile

- `organization_representative`, `instructor` / `trainer`, `consultant`, `organization_admin` și `platform_admin` nu se creează liber prin register public.
- Rolurile sensibile se acordă prin invitație, creare controlată de admin sau aprobare.
- `organization_admin` este creat sau invitat de un `platform_admin` și rămâne limitat la organizația proprie.
- `platform_admin` se creează numai manual, printr-un flux securizat.
- Un cont cu credențiale valide, dar aflat în `pending`, nu poate accesa date până la aprobare.

## Accesul reprezentantului organizației

| Resursă sau informație | Acces | Limită |
|---|---|---|
| Participanți invitați | Da | Numai organizația și grupurile proprii |
| Status înscriere | Da | Invitat, activ sau nefinalizat, în organizația proprie |
| Progres curs | Da | Agregat; individual numai dacă este permis |
| Prezență / participare | Da | Pentru sesiunile live și webinarele relevante |
| Finalizare curs | Da | Finalizat / nefinalizat în organizația proprie |
| Certificate emise | Da | Numai participanții organizației; descărcarea depinde de politica organizației |
| Rapoarte de grup | Da | Agregat pe grup, program și curs |
| Rezultate individuale detaliate | Condiționat | Contract, consimțământ și politici de confidențialitate |
| Date din alte organizații | Nu | Interzis și blocat explicit |
| Date administrative globale | Nu | Rezervate `platform_admin` |

### Reguli de raportare

- Rapoartele manageriale afișează implicit date agregate.
- Datele individuale nu sunt expuse implicit într-un raport de grup.
- Orice interogare organizațională trebuie limitată la `organization_id` din contextul autorizat.
- Vizualizarea rezultatelor individuale necesită verificarea consimțământului înainte de acces.
- Fiecare acces la rezultate individuale detaliate trebuie înregistrat într-un audit log cu utilizatorul, data/ora și informația consultată.

## Matricea RBAC de bază

Matricea de mai jos este baseline-ul funcțional pentru viitoarele politici RLS. Nu reprezintă o implementare SQL în această etapă.

| Rol | Resursă | Vizualizare | Creare | Editare | Ștergere |
|---|---|---:|---:|---:|---:|
| `individual_learner` | Cursuri și certificate proprii | Da | Nu | Nu | Nu |
| `organization_learner` | Cursuri și grupe alocate de organizația proprie | Da | Nu | Nu | Nu |
| `organization_representative` | Date agregate și participanți din organizația proprie | Da | Nu | Nu | Nu |
| `organization_representative` | Date din alte organizații | Nu | Nu | Nu | Nu |
| `instructor` / `trainer` | Cursuri predate și participanți alocați | Da | Da, conținut curs | Da, conținut curs | Nu |
| `consultant` | Sesiuni de consultanță alocate | Da | Nu | Nu | Nu |
| `organization_admin` | Utilizatori, grupe și rapoarte din organizația proprie | Da | Da | Da | Da, numai în organizația proprie |
| `organization_admin` | CMS / Website Settings global | Nu | Nu | Nu | Nu |
| `platform_admin` | Toate resursele și organizațiile | Da | Da | Da | Da |

### Cerințe pentru implementarea ulterioară a permisiunilor

- Scopul organizațional trebuie verificat la fiecare query, nu numai în UI.
- Interdicția accesului între organizații trebuie aplicată prin politici RLS.
- Permisiunile de creare/editare ale instructorului sunt limitate la conținutul cursurilor predate.
- Dreptul de ștergere al `organization_admin` este limitat la resursele organizației proprii.
- Accesul global aparține exclusiv `platform_admin`.

## Consimțământ, confidențialitate, retenție și audit

### Rezultate individuale

- Accesul reprezentantului la rezultate individuale este blocat implicit.
- Deblocarea necesită un flag de consimțământ, data acordului și sursa acordului.
- Consimțământul poate fi păstrat la nivel de organizație sau participant, în funcție de tipul de date și de decizia juridică finală.
- Accesul trebuie să respecte simultan contractul, consimțământul și politica de confidențialitate aplicabilă.

### Auditarea accesului

- Fiecare vizualizare a datelor individuale detaliate trebuie jurnalizată.
- Jurnalul minim conține: cine a accesat, când a accesat și ce informație a consultat.
- Jurnalul este o funcție de sistem și nu este destinat afișării reprezentantului organizației.

### Retenția datelor

- Relația utilizator–organizație trebuie să poată avea o dată de expirare sau arhivare.
- Perioada exactă de retenție după încetarea relației cu organizația nu este încă stabilită.
- Perioada finală necesită decizie managerială și revizuire juridică.

### Dreptul la ștergere

- Platforma va avea un flux de ștergere sau anonimizare la cererea utilizatorului.
- Certificatele deja emise pot necesita păstrare conform cerințelor legale.
- Regula finală trebuie clarificată cu un consultant juridic înainte de implementarea TASK 002.

### Acceptarea termenilor

- Formularul de register include checkbox obligatoriu pentru termeni și politici.
- Sistemul trebuie să poată păstra versiunea documentului acceptat și data acceptării pentru fiecare cont.

## Domeniul CMS viitor

CMS-ul public se implementează numai după autentificare, roluri și zonă admin protejată. Acest document descrie domeniul funcțional, nu îl implementează.

### Elemente editabile ulterior

| Element | Secțiune recomandată | Reguli |
|---|---|---|
| Logo | Branding | Branding public |
| Nume brand | Branding | Exemplu: Trainings PRO |
| Sub-brand | Branding | Exemplu: NICPMS Academy |
| Imagini / background homepage | Media Library / Homepage | Upload în Supabase Storage sau asset-uri publice, într-o implementare viitoare |
| Headline RO / EN | Homepage | Conținut bilingv |
| Subtitle RO / EN | Homepage | Conținut bilingv |
| Butoane homepage | Homepage | Text, link și target |
| Meniu principal | Navigation | Text bilingv RO/EN |
| Carduri module homepage | Homepage modules | Titlu, descriere, icon și ordine |
| Trust indicators | Homepage | Conținut administrabil |
| Footer | Footer | Texte, linkuri și contact, bilingv RO/EN |
| SEO title / description | SEO | Conținut bilingv RO/EN pentru paginile publice |

### Elemente care nu se editează manual

- Numărul de cursanți, cursuri și certificate trebuie calculat din date reale.
- Statisticile de satisfacție se afișează numai dacă există o sursă reală.
- CMS-ul nu poate introduce valori manuale pentru metrici publice.
- În lipsa datelor reale se păstrează placeholder-ele aprobate: `În pregătire` / `Coming soon`.

### Workflow și permisiuni CMS

- Conținutul are stări `Draft`, `Preview` și `Publicat`.
- Utilizatorul trebuie să poată previzualiza modificările înainte de publicare.
- Branding-ul și navigația globală sunt editate numai de `platform_admin`.
- `organization_admin` nu are acces la CMS-ul public global al platformei.
- Permisiunile CMS trebuie să poată fi limitate per secțiune.

## Ordinea recomandată de implementare

1. **TASK 001.9 — Auth, Onboarding, Organization Invitations & Profile Rules**: documentarea și aprobarea regulilor din acest fișier.
2. **TASK 002 — Auth, Users, Profiles & Roles**: login, register, logout, profiluri, roluri, protecția rutelor și starea admin restricționată.
3. **TASK 002.5 — Admin CMS: Branding, Homepage & Public Site Settings**: CMS numai după auth, roluri și admin protejat.
4. **TASK 003 — Organizations, Universities & Academic Structure**: ierarhii universitare, grupe și programe academice după stabilizarea entității Organizație generice.

## Decizii rămase explicit deschise

Aceste puncte nu trebuie completate prin presupuneri în timpul implementării:

- perioada exactă de retenție a datelor după încetarea relației cu organizația;
- detaliile juridice ale ștergerii/anonimizării și păstrării certificatelor;
- nivelul la care se stochează consimțământul pentru fiecare tip de date: organizație, participant sau ambele;
- politica exactă pentru descărcarea certificatelor de către reprezentanți;
- necesitatea substructurilor/departamentelor pentru instituțiile publice la TASK 003;
- regulile specifice pentru tipul de organizație „Alt tip”.

## Criterii de acceptare pentru task-urile viitoare

- Register-ul public nu poate acorda roluri sensibile.
- Fluxul cu invitație validează invitația și confirmarea emailului înainte de activare.
- Fluxul de reprezentant păstrează contul fără acces în `pending` până la aprobare.
- Sub-tipurile learner sunt derivate din tipul organizației.
- Nicio organizație nu poate citi datele alteia.
- Rezultatele individuale sunt blocate fără condițiile de acces și sunt auditate când sunt consultate.
- `organization_admin` nu poate accesa CMS-ul global.
- Metricile publice provin numai din date reale și nu pot fi editate manual.
- CMS-ul nu este început înainte ca autentificarea, rolurile și zona admin protejată să fie funcționale.

## Trasabilitate la workbook

| Fișă Excel | Conținut extras |
|---|---|
| `00_Jurnal_Modificari` | Corecțiile de audit și criticitatea lor |
| `00_Validare_Manager` | Deciziile generale și recomandările de business |
| `01_Tipuri_Utilizatori` | Tipuri de cont, roluri, sub-tipuri și multi-organizație |
| `02_Flux_Register` | Fluxuri register, stări și ciclul invitațiilor |
| `03_Organizatii` | Tipuri de organizații și limitele TASK 002/TASK 003 |
| `04_Reprezentant_Org` | Vizibilitate, raportare și acces condiționat |
| `05_CMS` | Domeniul viitor al CMS-ului, workflow și permisiuni |
| `06_Roadmap` | Ordinea task-urilor și dependențele |
| `07_Checklist_Validare` | Checklist-ul deciziilor de validat |
| `08_Matrice_Permisiuni_RBAC` | Matricea rol × resursă × acțiune |
| `09_Consimtamant_GDPR` | Consimțământ, retenție, ștergere și audit |

