# TASK 003.3 — Home Workspace Cleanup and Assessment Module Split

## Purpose

TASK 003.3 clarifies the Acasă/Home information architecture established by TASK 003.1:

- **Context** answers where the active profile belongs and is rendered once in the real academic or organization/training readout.
- **Workspace** answers what the active profile needs to do and contains only task, learning, review, or administration modules.

This is a bilingual UI-configuration cleanup. It does not add data access, database objects, workflows, management actions, or educational records.

## Role workspace matrix

| Active profile | Workspace modules |
|---|---|
| Individual learner | My courses, Assignments, Quizzes, Tests, Exams, Projects, Certificates, Credits, Recent activity |
| Organization learner | Assigned trainings, Assignments, Quizzes, Tests, Exams, Projects, Certificates, Credits, Recent activity |
| Academic student | Academic courses, Assignments, Quizzes, Tests, Exams, Projects, Credits, Grades/results, Academic calendar, Recent activity |
| Instructor / trainer | Taught courses, Scheduled sessions, Participants, Assignments to review, Quizzes to review, Tests to review, Exams, Projects to review, Feedback, Recent activity |
| Professor | Academic courses, Groups/programs, Assignments to review, Quizzes to review, Tests to review, Exams, Projects to review, Grades/results, Academic calendar, Recent activity |
| Consultant | Consulting sessions, Projects, Clients/learners, Calendar, Feedback, Documents/resources, Recent activity |
| Coordinator | Coordinated programs, My courses, Professors/trainers, Monitored groups, Assignments, Quizzes, Tests, Exams, Reports, Pending requests |
| Organization representative | Representative status, Members, Invitations, Assigned trainings, Monitored groups/teams, Reports, Organization activity |
| Organization admin | Members, Invitations, Assigned trainings, Groups/teams, Aggregate progress, Organization certificates, Pending requests, Reports |
| University admin | Academic structure, Academic programs, Academic years, Semesters, Groups, Students, Professors, Academic courses, Aggregated results, Reports |

Platform Admin remains outside normal Home behavior and continues to use the protected `/{locale}/admin` console.

## Removed duplication

- Organization, training period, university, faculty, program, level, academic year, semester, and group remain in the top readouts when a real scoped association exists.
- `Associated organization` is no longer a Workspace card for organization learners, representatives, or administrators.
- Academic program, academic year, semester, and group are no longer placeholder Workspace cards for academic students.
- University Admin uses an `Academic structure` administration module; it does not repeat the university value or claim that an already-visible university will appear later.

## Assessment naming

Learner and coordinator workspaces expose Assignments, Quizzes, Tests, Exams, and Projects independently where relevant. Instructor and professor workspaces use the review-specific labels Assignments to review, Quizzes to review, Tests to review, Exams, and Projects to review.

The former combined `Quizzes & tests`, `Quiz / test / exams`, and generic coordinator `Assessments` modules are not used in role configuration.

## Primary-context limitation

Professor, coordinator, organization representative, and university administrator profiles may eventually span multiple organizations, faculties, programs, periods, or groups. Home currently renders only the active primary context returned by the scoped TASK 003.1 read RPC. A multiple-context selector is deferred.

## Data and security boundaries

- Every module remains an empty-state shell with `0` and `În pregătire` / `Coming soon` until a dedicated real workflow exists.
- No course, assignment, quiz, test, exam, project, certificate, credit, grade, ECTS, report, activity, or metric is invented.
- No migration, RLS policy, Supabase helper, authentication flow, active-profile rule, QA seed, public page, or admin route is changed.
