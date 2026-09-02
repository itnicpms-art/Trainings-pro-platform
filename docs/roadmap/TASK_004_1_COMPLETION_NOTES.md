# TASK 004.1 Completion Notes

## Completed scope

- Added migration `007_academic_units_write_access.sql` without modifying migrations 001–006.
- Added scoped editor overview, faculty/department create, and faculty/department update RPCs.
- Added mandatory audit rows with before/after snapshots for academic unit mutations.
- Enhanced `/{locale}/app/manage/academic` with editing only for University Admin.
- Added `/{locale}/admin/academic-structure` and localized admin navigation for Platform Admin.
- Reused one bilingual faculty/department editor in both authorized workspaces.
- Split faculty and department creation into separate, explicit controls; the parent-faculty selector appears only for departments.
- Added automatic, editable internal-code generation with Romanian diacritic removal and collision suffixes.
- Enforced parent-status consistency: an active department requires an active faculty, and departments cannot be created or moved under archived faculties.
- Added faculty status cascades: inactive faculties deactivate active child departments, archived faculties archive every non-archived child department, and faculty reactivation never reactivates departments automatically.
- Added one complete audit event for every department status changed by a faculty cascade while retaining the faculty update audit event.
- Clarified that universities remain managed separately in Organizations & Universities; this task adds no university create/edit workflow.
- Kept programs, years, semesters/terms, and groups read-only.

## Security confirmation

- The active profile is derived server-side; the browser does not choose an arbitrary actor profile.
- Every RPC independently validates authentication, active profile ownership, role, scope, target university, hierarchy, unit type, and status.
- University Admin is limited to its scoped university.
- Platform Admin requires the existing platform role plus `admin.access` permission.
- No direct table write is performed by runtime application code.
- No broad RLS policy or table grant was added and RLS was not weakened.
- The audit table has RLS enabled and no public/authenticated read or write policy.
- No service-role key, secret, environment file, fake organization, fake unit, or fake metric was added.
- No DELETE RPC or hard-delete UI exists.
- An empty code is generated server-side from the name; manually provided duplicate codes still fail explicitly.
- Faculty status cascades and parent-status checks execute inside the scoped update RPC transaction; they add no direct table-write path or broader grant.

## Validation

- `npx pnpm@11.19.0 lint`: passed.
- `npx pnpm@11.19.0 build`: passed; Next.js compiled and generated both localized app/admin academic routes.
- Static security review: RPC-only runtime access, scoped authorization, hierarchy validation, no broad grants, and mandatory audit inserts confirmed.

## Manual QA status

Authenticated browser QA was not executed in this implementation environment because applying migration 007 and using a privileged QA session were not part of the local validation run. No password or secret was entered or exposed.

After migration 007 is applied, verify:

- University Admin can create a faculty and a department under a valid faculty in its own university;
- faculty forms never show a parent selector, while department forms require the faculty they belong to;
- generated internal codes are uppercase, safe, no longer contain Romanian diacritics, and receive `-2`, `-3`, and later suffixes on collisions;
- manually edited codes remain unchanged by later name edits and duplicate manual codes are rejected;
- University Admin cannot create a department without a parent or edit another university;
- an active department cannot be created, moved, or reactivated beneath an inactive faculty;
- no department can be created or moved beneath an archived faculty;
- changing a faculty to inactive changes only its active child departments to inactive and preserves archived children;
- changing a faculty to archived archives every active or inactive child department;
- changing a faculty back to active does not reactivate any child department;
- Platform Admin can select a real university and create/update its faculties and departments;
- each successful create/update/status change produces an audit row, including one row per department changed by a faculty cascade;
- Professor, Coordinator, Academic Student, organization roles, and Individual Learner have no write controls or successful write access;
- no delete control exists;
- the Platform Admin page clearly directs university creation/management to Organizations & Universities and exposes no university creation button;
- `/ro/app/manage/academic`, `/en/app/manage/academic`, `/ro/admin/academic-structure`, and `/en/admin/academic-structure` are localized;
- `/ro/admin`, `/en/admin`, and the existing Platform Admin `/app` redirect remain protected and unchanged.

## Deferred work

Editing programs, academic years, terms/semesters, groups, people, memberships, course allocation, educational records, reporting, and general audit viewing remains deferred to dedicated tasks.
