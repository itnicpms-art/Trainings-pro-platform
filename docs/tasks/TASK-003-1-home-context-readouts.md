# TASK 003.1 — Home Academic and Organization Context Readouts

## Purpose

TASK 003.1 connects the real TASK 003 academic and organization/training structure to the localized Acasă/Home workspace at `/{locale}/app`.

Acasă/Home is the active profile's operational landing area, not an analytics dashboard. The route remains unchanged and the user-facing navigation remains `Acasă` in Romanian and `Home` in English.

## Display rules

### Individual learner

An individual learner does not receive university, faculty, program, level, academic year, semester, group, grade, or ECTS context. An organization/training readout is shown only when the profile already has a real non-university organization association.

### Organization profiles

Organization learners, representatives, and administrators see only:

- the real associated organization;
- the active/current training period, when configured.

They do not receive university academic structure. A missing training period is explicitly displayed as `În pregătire` / `Coming soon`.

### Academic student

The Academic Context readout remains visible for an academic student. University identity may come from the profile's real university association, but faculty, program, program level, year, semester, and group come only from an active `academic_profile_contexts` record and its related TASK 003 records.

Legacy `profiles.academic_program_id` and `profiles.group_id` values are not used as the source of truth. Missing fields use localized placeholders; no values are inferred from `profile_type`.

### University professionals

Professors, university administrators, and academic program coordinators see the university-oriented readout only when the scoped RPC returns a real university association or academic context. Missing academic fields remain placeholders.

### Platform administrator

Platform Admin continues to redirect from `/{locale}/app` to `/{locale}/admin`. TASK 003.1 does not create a normal Home workspace for that profile and does not modify the existing admin guard.

## Read-only security model

Migration `supabase/migrations/005_home_context_read_access.sql` adds two `SECURITY DEFINER`, `STABLE`, read-only functions:

- `get_home_academic_context(requested_profile_id uuid)`;
- `get_home_training_context(requested_profile_id uuid)`.

Both functions require an authenticated user and verify that the requested profile belongs to `auth.uid()` and is active. They return at most the requested profile's own scoped readout. Execute access is granted only to `authenticated` after revoking access from `public`, `anon`, and `authenticated`.

The implementation does not grant table-level SELECT, does not add broad RLS policies, does not expose `auth.users`, and does not perform inserts, updates, deletes, or role changes. Runtime continues to use the server-side cookie Supabase client with the anon key; no service-role credential is used.

## Application integration

The central Home context loader determines the active profile variant and requests only the relevant academic or training RPC. The returned data is rendered server-side in compact bilingual cards. Technical table names and identifiers are not shown in the UI.

## Scope boundaries

- No fake academic, training, grade, ECTS, progress, or organization data is added.
- No management or write UI is added.
- Public homepage, registration, login/logout, onboarding, profile switching, QA seed, admin routes, and Platform Admin redirects are unchanged.
- Migrations 001–004 are unchanged.
