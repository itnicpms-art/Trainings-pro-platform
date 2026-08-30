# Secure QA profiles seed

## Purpose and scope

`scripts/seed-qa-profiles.ts` prepares one dedicated Auth identity and the profile contexts needed to verify the adaptive dashboard. It is an operator-only utility for local and staging environments. It is not imported by runtime application code and is not exposed through the UI or public registration.

The seed creates no courses, assignments, assessments, grades, credits, progress, certificates, activity, academic programs, groups, or other educational records.

## Security rules

- Run only against a disposable local or approved staging Supabase project.
- Never run against production. The script refuses execution when `VERCEL_ENV=production`.
- `SUPABASE_SERVICE_ROLE_KEY` is used only by the local Node.js process. It must never use a `NEXT_PUBLIC_` prefix or be included in frontend code.
- Keep `QA_SEED_PASSWORD` and the service-role key in `.env.local` or the operator environment. Do not commit or paste their values into documentation, logs, issues, or pull requests.
- The script validates all required variables before contacting Supabase and never prints their values.
- Error output redacts the configured URL, service-role key, and QA password.
- The privileged platform administrator context is created only for the fixed QA identity `qa@trainings-pro.test`.

## Required environment variables

Set these locally without committing their values:

```text
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
QA_SEED_PASSWORD=
```

If any variable is missing or empty, the script exits before creating or updating data.

## Run

From the repository root:

```bash
npx pnpm@11.19.0 seed:qa-profiles
```

The script loads `.env.local` when present. Variables already supplied by the shell take precedence. Safe output reports only whether the fixed QA user and each named profile were created or reused.

## Seeded data

The script creates or reuses:

- Auth user `qa@trainings-pro.test`;
- `QA Training Organization` with slug `qa-training-organization`;
- `QA University Organization` with slug `qa-university-organization`;
- organization memberships only for profile contexts that have an organization;
- the following active profiles and exact role assignments.

| Profile key | Profile type | Role | Context |
|---|---|---|---|
| `individualLearner` | `individual_learner` | `individual_learner` | own; default profile; no organization |
| `organizationLearner` | `organization_learner` | `organization_learner` | QA training organization |
| `academicStudent` | `student` | `university_student` | QA university; no invented program or group |
| `instructorTrainer` | `instructor` | `instructor` | QA training organization |
| `professor` | `professor` | `professor` | QA university; no invented program |
| `consultant` | `consultant` | `consultant` | own; no organization |
| `coordinator` | `coordinator` | `program_coordinator` | QA university; no invented program |
| `organizationRepresentative` | `organization_representative` | `organization_representative` | QA training organization |
| `organizationAdmin` | `organization_admin` | `organization_admin` | QA training organization |
| `universityAdmin` | `university_admin` | `university_admin` | QA university |
| `platformAdmin` | `platform_admin` | `platform_admin` | platform; no organization |

The script also ensures that the existing `platform_admin` role has the existing `admin.access` permission. It does not provide a public role-escalation path and does not change RLS policies.

## Idempotency

Stable email, organization slugs, and profile labels are used to find existing records. On subsequent runs the Auth user and organizations are reused, the trigger-created default profile is reused, profile fields are normalized, organization membership is upserted, and each QA profile is normalized to its intended single role assignment. Repeated successful runs therefore leave one QA Auth identity and one profile per listed context.

To verify idempotency, run the command twice. The second run should report the Auth user and all profiles as `reused`, with no duplicate organizations, profiles, memberships, or role assignments.

## Manual dashboard QA

1. Sign in through `/ro/login` or `/en/login` with `qa@trainings-pro.test` and the locally configured `QA_SEED_PASSWORD`.
2. Open `/ro/app/profiles` or `/en/app/profiles`.
3. Select each profile and inspect the corresponding dashboard at `/{locale}/app`.
4. Confirm that individual learner has no organization UI when it has no organization association.
5. Confirm that only the platform administrator profile can pass the existing admin access check.
6. Confirm that dashboard empty states contain no fabricated educational metrics.

## Troubleshooting

- `Missing required environment variable`: set the named variable locally; do not add a real value to `.env.example`.
- Auth or database error: confirm that the URL and service-role key belong to the same non-production Supabase project and that migrations `001_foundation.sql` and `002_auth_onboarding.sql` are already applied.
- Missing table, column, role, or permission: stop and reconcile the target project schema with the existing migrations. Do not create an ad-hoc migration only to make the QA seed pass.
