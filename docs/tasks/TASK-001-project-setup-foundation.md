# TASK 001 — Project Setup & Foundation

## Scop

Construiește fundația aplicației Trainings PRO / NICPMS Academy folosind Next.js, TypeScript, Tailwind CSS, shadcn/ui și Supabase.

Acest task nu implementează încă toate modulele platformei. Creează baza aplicației, layout-urile principale, conectarea la Supabase și modelul inițial pentru profile, organizații, roluri și permisiuni.

## Stack

```text
Next.js App Router
TypeScript
Tailwind CSS
shadcn/ui
Supabase
PostgreSQL
```

## Rute de creat

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

## Structură foldere

```text
src/
  app/
    page.tsx
    login/page.tsx
    register/page.tsx
    app/layout.tsx
    app/page.tsx
    app/profiles/page.tsx
    app/settings/page.tsx
    admin/layout.tsx
    admin/page.tsx
    admin/settings/page.tsx
  components/
    layout/
      app-sidebar.tsx
      admin-sidebar.tsx
      topbar.tsx
    ui/
  lib/
    supabase/client.ts
    supabase/server.ts
    auth/get-current-user.ts
    auth/get-active-profile.ts
    permissions/has-permission.ts
  types/
    database.ts
    app.ts
```

## UI

Folosește stil SaaS modern: alb/gri deschis, accent albastru-mov, carduri rotunjite, shadow discret, sidebar în stânga, topbar simplu.

Folosește logo-ul din:

```text
/public/brand/logo-trainings-pro-official.png
```

## shadcn/ui

Instalează minimum:

```text
button
card
input
label
dropdown-menu
avatar
badge
tabs
table
separator
sheet
sonner
```

## Database

Folosește migrarea:

```text
/supabase/migrations/001_foundation.sql
```

Tabele create:

```text
profiles
organizations
organization_members
roles
permissions
role_permissions
profile_roles
```

## Auth behavior

La register, Supabase Auth creează user-ul. Sistemul trebuie să creeze un profil default:

```text
profile_type = individual
display_name = full_name sau email
is_default = true
status = active
```

Triggerul SQL din migrare poate face acest lucru automat.

## Ce NU se implementează încă

```text
courses reale
curriculum complet
assignments
projects
quiz/test/exam
survey
calendar funcțional
certificate
payments
approvals
audit logs
webinars
consultations
universities complete
```

## Acceptance Criteria

- Aplicația pornește local fără erori.
- `/`, `/login`, `/register`, `/app`, `/admin` există.
- Tailwind funcționează.
- shadcn/ui este configurat.
- Supabase client/server este configurat.
- Există layout separat pentru `/app` și `/admin`.
- Migration Phase 1 există și rulează.
- RLS este activat.
- Rolurile și permisiunile sunt seed-uite.
- Userul poate avea mai multe profile.
- Codul este TypeScript curat.
- Proiectul este pregătit pentru Vercel.
