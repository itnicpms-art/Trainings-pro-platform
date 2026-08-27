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

## Rute inițiale pentru Task 001

```text
/
/login
/register
/app
/app/profiles
/app/settings
/admin
/admin/settings
```

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
