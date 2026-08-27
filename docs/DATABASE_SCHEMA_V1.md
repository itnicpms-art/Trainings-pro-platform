# DATABASE SCHEMA V1 — Modular View

Această schemă este organizată pe faze. Pentru implementare, folosește task-urile și migrațiile specifice.

## Phase 1 — Foundation

```text
profiles
organizations
organization_members
roles
permissions
role_permissions
profile_roles
```

## Phase 2 — Academic

```text
universities
faculties
departments
academic_programs
academic_years
semesters
groups
group_members
program_courses
group_course_allocations
```

## Phase 3 — Learning

```text
courses
course_instructors
course_modules
lessons
lesson_resources
enrollments
lesson_progress
```

## Phase 4 — Evaluation

```text
assignments
assignment_submissions
assignment_files
projects
project_submissions
project_files
assessments
questions
question_options
assessment_attempts
answers
grades
surveys
survey_questions
survey_responses
survey_answers
```

## Phase 5 — Operations

```text
course_sessions
session_bookings
attendance
calendar_events
personal_events
calendar_preferences
webinars
webinar_registrations
consultation_types
consultant_availability
consultation_bookings
consultation_requests
consultation_request_files
consultation_responses
credit_types
course_credits
user_credits
certificates
certificate_security
certificate_verification_logs
payments
subscriptions
notifications
```

## Phase 6 — Governance

```text
approval_rules
change_requests
change_approvals
audit_logs
```

## Reguli cheie

- Supabase Auth este sursa de adevăr pentru autentificare.
- `profiles` reprezintă identitățile contextuale ale userului.
- Un user poate avea mai multe profile.
- `profile_roles` leagă profilele de roluri și scope.
- `Organization` este concept central pentru universități și companii.
- `Course` este separat de `Course Session`.
- `Assignment` este legat de `Lesson`.
- `Project` este legat de `Course`.
- `Survey` este separat de `Assessment`.
- `Calendar` poate afișa evenimente pentru toate profilele sau pentru un singur profil.
- Modificările structurale importante trec prin `change_requests` și `change_approvals`.
