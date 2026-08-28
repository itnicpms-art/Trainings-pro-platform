# Trainings PRO / NICPMS Academy

Fundația aplicației Trainings PRO, construită cu Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui și Supabase.

## Pornire locală

1. Instalează dependențele cu `pnpm install`.
2. Copiază `.env.example` în `.env.local` și completează cheile proiectului Supabase.
3. Aplică `supabase/migrations/001_foundation.sql` în proiectul Supabase.
4. Pornește aplicația cu `pnpm dev` și deschide `http://localhost:3000`.

Comenzi disponibile:

```text
pnpm dev
pnpm lint
pnpm build
pnpm start
```

Pentru Vercel, configurează aceleași variabile din `.env.example`; aplicația folosește configurația standard Next.js și nu necesită adaptări suplimentare de build.

## Rute bilingve

```text
/{locale}
/{locale}/login
/{locale}/register
/{locale}/app
/{locale}/app/profiles
/{locale}/app/settings
/{locale}/admin
/{locale}/admin/settings
```

Localele acceptate sunt `ro` și `en`, iar limba implicită este româna. Rutele vechi fără prefix de limbă redirecționează către echivalentul `/ro`. Selectorul RO / EN păstrează calea paginii și salvează preferința în cookie-ul `NEXT_LOCALE`.

Textele interfeței sunt definite în `src/i18n/dictionaries/ro.ts` și `src/i18n/dictionaries/en.ts`. Orice text UI nou trebuie adăugat în ambele fișiere de traduceri, nu scris direct în pagini sau componente.

## Documentație de produs

## Ce conține

- `docs/PROJECT_BRIEF.md` — context produs și reguli principale.
- `docs/BRAND_GUIDELINES.md` — brand, logo, stil vizual și utilizare asset-uri.
- `docs/DESIGN_REFERENCES.md` — maparea imaginilor de referință la modulele aplicației.
- `docs/APP_STRUCTURE.md` — rute, zone ale aplicației și structură foldere.
- `docs/DATABASE_SCHEMA_V1.md` — modelul de date v1 pe module.
- `docs/CODEX_TASK_INDEX.md` — ordinea task-urilor de implementare.
- `docs/tasks/` — câte un document separat pentru fiecare task.
- `docs/prompts/TASK-001-CODEX-PROMPT.txt` — prompt direct pentru Codex.
- `supabase/migrations/001_foundation.sql` — migrare Supabase pentru primul task.
- `public/brand/` — logo-ul oficial Trainings PRO.

## Ordinea de implementare

Nu da toate documentele simultan. Începe cu:

1. `docs/PROJECT_BRIEF.md`
2. `docs/BRAND_GUIDELINES.md`
3. `docs/APP_STRUCTURE.md`
4. `docs/tasks/TASK-001-project-setup-foundation.md`
5. `supabase/migrations/001_foundation.sql`

După finalizarea Task 001, se trece la Task 002.
