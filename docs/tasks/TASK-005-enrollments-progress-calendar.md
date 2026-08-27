# TASK 005 — Enrollments, Progress & Calendar


## Scop

Construiește înscrierea la cursuri, progresul lecțiilor și calendarul multi-profile.

## Build

- enrollments
- lesson_progress
- calendar_events
- personal_events
- calendar_preferences
- auto allocation pentru studenții universitari
- `/app/calendar`

## Design references

- `11-course-scheduling-booking-auto-university.png`
- `12-calendar-multi-profile-member.png`
- `01-mvp-flow-updated.png`

## Reguli

- Calendarul este pentru membru, nu superadmin.
- Selector obligatoriu: toate profilele, profil individual, calendar personal.
- Enrollment poate fi manual, purchase sau university_auto.
