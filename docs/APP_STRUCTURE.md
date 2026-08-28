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
