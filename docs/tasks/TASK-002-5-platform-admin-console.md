# TASK 002.5 — Platform Admin Console Foundation

## Baseline

Implementarea urmează regulile validate în `docs/auth/MANAGER_VALIDATED_ONBOARDING_CMS_RULES.md` și protecția introdusă în TASK 002. Autentificarea, `profile_type` sau existența unei sesiuni nu acordă singure acces administrativ.

## Scop

TASK 002.5 adaugă o consolă bilingvă, read-only, pentru guvernanța globală a platformei:

- overview administrativ;
- organizații și universități;
- utilizatori și profile publice;
- roluri, permisiuni și scope-uri RBAC;
- securitate și boundary-uri de acces;
- fundații pentru audit, Website/CMS, aprobări și conținut educațional.

Zonele fără backend dedicat afișează empty states și `În pregătire` / `Coming soon`. Nu se generează date sau metrici demonstrative.

## Contract de autorizare

Toate rutele `/{locale}/admin` și descendenții folosesc layout-ul admin server-side. Accesul necesită simultan:

1. utilizator Supabase validat;
2. profil activ, propriu și cu status `active`;
3. rol `platform_admin` în scope `platform`, fără `scope_id`;
4. permisiune `admin.access` acordată și fără aprobare în așteptare.

Non-admin primește starea restricted localizată. Verificarea nu se bazează doar pe `profile_type` și nu este client-side.

## Acces read-only la date

Migrarea `supabase/migrations/003_platform_admin_read_access.sql` adaugă exclusiv funcții de citire:

- `has_platform_admin_console_access(uuid)`;
- `get_platform_admin_overview(uuid)`;
- `list_platform_admin_organizations(uuid)`;
- `list_platform_admin_profiles(uuid)`;
- `list_platform_admin_onboarding_requests(uuid)`.

Funcțiile `SECURITY DEFINER` au `search_path` fix, verifică `auth.uid()`, ownership-ul profilului, statusul activ, rolul și permisiunea. `EXECUTE` este revocat pentru `public` și `anon` și acordat numai rolului `authenticated`. Nu se adaugă politici globale SELECT pe tabele și nu se acordă operații INSERT/UPDATE/DELETE.

Aplicația runtime continuă să folosească clientul Supabase cookie-based cu cheia anon. Nu citește și nu folosește service-role.

## Date expuse

- overview: count-uri reale pentru profile active, organizații, roluri, permisiuni și cereri pending;
- organizations: nume, slug, tip, status, website și data creării;
- profiles: nume afișat, tip, status și context organizațional; nu se interoghează `auth.users`;
- approvals: câmpuri sanitizate din cererile de onboarding, fără hash-ul invitației, motiv, website sau date Auth;
- RBAC: tabelele foundation `roles`, `permissions` și `role_permissions`, numai după verificarea admin.

## Funcționalitate amânată

- mutații administrative și acțiuni destructive;
- suspendare/reactivare profile și schimbări de rol;
- aprobare/respingere cereri;
- audit log și evenimente de securitate;
- editor CMS și workflow Draft/Preview/Publicat;
- backend pentru cursuri, curriculum, certificate, credite și raportare;
- paginare, căutare și filtre avansate.

Aceste funcții necesită workflow-uri auditate, politici RLS dedicate și task-uri ulterioare.
