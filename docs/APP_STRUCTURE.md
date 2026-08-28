# APP STRUCTURE

## Zone principale

```text
/
public website

/app
zona membru/student/instructor/profesor/coordonator

/admin
zona superadmin / organization admin / university admin
```

## Rutare bilingvă

```text
/{locale}
/{locale}/login
/{locale}/register
/{locale}/app
/{locale}/app/profiles
/{locale}/app/settings
/{locale}/admin
/{locale}/admin/settings
```

`{locale}` acceptă `ro` și `en`, cu `ro` ca limbă implicită. Rutele fără prefix de limbă redirecționează către `/ro`, iar selectorul de limbă păstrează calea echivalentă și salvează preferința în cookie-ul `NEXT_LOCALE`.

Toate textele UI noi trebuie definite în ambele fișiere din `src/i18n/dictionaries/`; paginile și componentele nu trebuie să conțină texte traductibile scrise direct.

## Homepage public — TASK 001.6

Homepage-ul localizat (`/ro` și `/en`) folosește o prezentare premium, futuristă, construită direct în componente React și Tailwind CSS. Include hero, previzualizare vizuală a platformei, module, capabilități transversale, indicatori și footer, fără fotografii stock sau screenshot-uri statice full-page.

Indicatorii publici respectă următoarele reguli:

- sunt afișate numai valori reale obținute din surse agregate, public-safe și compatibile cu politicile RLS;
- statisticile inventate sau valorile de marketing neverificate nu sunt permise;
- dacă o sursă sigură nu există, interfața afișează exclusiv `În pregătire` / `Coming soon`;
- pagina publică nu folosește cheia service-role și nu interoghează direct date private;
- modulele viitoare vor conecta `src/lib/homepage-metrics.ts` la surse agregate sigure, pe măsură ce tabelele și funcționalitățile aferente sunt implementate.

## Rute viitoare

```text
/app/courses
/app/courses/[slug]
/app/learning/[courseId]
/app/calendar
/app/certificates
/app/consultations
/app/messages

/admin/members
/admin/organizations
/admin/universities
/admin/courses
/admin/courses/[id]/edit
/admin/curriculum
/admin/assessments
/admin/sessions
/admin/webinars
/admin/consultations
/admin/certificates
/admin/reports
/admin/settings
```

## Structură foldere recomandată

```text
src/
  app/
    [locale]/
      page.tsx
      login/page.tsx
      register/page.tsx
      app/layout.tsx
      app/page.tsx
      admin/layout.tsx
      admin/page.tsx

  components/
    layout/
    ui/
    forms/
    data-display/

  lib/
    supabase/
    auth/
    permissions/
    utils/

  types/
    database.ts
    app.ts

  i18n/
    config.ts
    get-dictionary.ts
    dictionaries/
      ro.ts
      en.ts

public/
  brand/
```

## Layout /app

Sidebar:

```text
Dashboard
Profilele mele
Cursurile mele
Calendar
Învățare
Evaluări
Certificate
Mesaje
Setări
```

## Layout /admin

Sidebar:

```text
Dashboard
Members
Organizations
Universities
Courses
Curriculum
Assessments
Sessions
Webinars
Consultations
Enrollments
Bookings
Certificates
Payments
Reports
Settings
```
