# TASK 003.2 — Secure QA Academic and Training Context Seed

## Purpose

TASK 003.2 extends the existing operator-only QA seed so the TASK 003.1 Acasă/Home readouts can be verified with real relational context. All inserted records are explicitly QA-only and belong to the two existing QA organizations.

No migration or production fixture is added. The Acasă/Home UI contains no hardcoded QA value.

## Seeded academic structure

The script reuses `QA University Organization` and idempotently ensures:

- Faculty of Medicine (`organization_units`, code `MED`);
- General Medicine (`academic_programs`, code `GMED`, level `bachelor`);
- academic year 2026–2027 (`academic_years`, code `2026-2027`);
- Semester 1 (`academic_terms`, code `S1`);
- Group 101 (`academic_groups`, code `101`).

Real `academic_profile_contexts` records connect QA Academic Student, QA Professor, QA Coordinator, and QA University Admin to that structure. The student receives Group 101; the professional/admin contexts have no group.

## Seeded training context

The script reuses `QA Training Organization` and ensures current `organization_training_periods` record `QA-TRAINING-2026`. This supports the readout for QA Organization Learner, QA Organization Representative, and QA Organization Admin without adding university fields.

## Idempotency

Stable scoped codes use the unique constraints introduced by migration 004. Academic profile contexts use deterministic lookup/update behavior: the existing active primary context is normalized to the expected structure; when none exists, a matching/existing record is reused before a new record is inserted.

Repeated successful executions leave one scoped record for each structure code, one current QA academic year, one current QA training period, and one active primary context per academic QA profile.

Each run finishes with read-only assertions over the four active primary contexts and the current training period. A mismatch fails the command instead of reporting a successful seed.

## Production safety

The script checks production markers before loading local configuration and again before creating the Supabase client. It refuses `VERCEL_ENV=production` and `NODE_ENV=production`.

The service-role key remains confined to this local/staging command, is never printed, and is not imported by runtime code. Required configuration remains:

- `NEXT_PUBLIC_SUPABASE_URL`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- `QA_SEED_PASSWORD`.

Do not run the seed in production. A separate production Supabase project receives migrations only, never QA seed data.

## Excluded data and behavior

The seed creates no courses, lessons, assignments, quizzes, tests, exams, projects, certificates, credits, ECTS, grades, reports, bookings, progress, activity, or metrics. It changes no public authentication/onboarding flow, active-profile behavior, Home layout, admin route, RLS policy, or existing migration.
