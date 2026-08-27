# TASK 002 — Auth, Users, Profiles & Roles


## Scop

Construiește logica reală de autentificare, profile multiple, profil activ și verificare de permisiuni.

## Build

- Register / login / logout.
- Redirect după login.
- Protecție rute `/app` și `/admin`.
- Pagina `/app/profiles` pentru listare profile.
- Selector de profil activ în topbar.
- Helper `hasPermission(profileId, permissionCode, scope)`.
- Afișare roluri pe profil.

## Design references

- `05-user-types-roles.png`
- `12-calendar-multi-profile-member.png`
- `20-member-dashboard-learning.png`

## Acceptance Criteria

- Utilizatorul vede doar profilele proprii.
- Utilizatorul poate seta profil activ.
- Admin area refuză accesul fără rol potrivit.
