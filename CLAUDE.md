# Coach App (baseball coaching app)

Project-specific instructions. The global `CLAUDE.md` in `OS/` still applies.

## What this is
An iPad-first web app for coaching a youth program (12U–19U): player metric tracking, progress charts, pitching library, lesson plans and lesson log, practice plans, and parent reports. Built for James's own coaching first. It could later become a product other coaches and programs pay for, so keep multi-coach support in mind without building it yet.

The original goals for the app:
- Quick input of player metrics (exit velocity, throwing velocity, etc.) at the field
- Player progression tracking: compare metrics across sessions so progress is easy to see and show to players and parents
- Lesson planner and practice plan maker

## Stack
- React + TypeScript + Vite. **This project overrides the global Python default for app code.** Python is used for scripts (backups, analytics).
- Supabase (Postgres). Project ref `<project-ref>`, org (private). Use the Supabase MCP tools for database work.
- Settings live in `.env.local` (gitignored). The app may only use the **publishable** key. Never put the secret/service_role key in app code or commit it.

## Rules for this project
- **Data safety is the #1 priority.** James cannot lose player data.
  - Before any schema change that alters or drops existing tables or columns, run a backup first and confirm it worked.
  - Never run `DELETE`, `DROP` or `TRUNCATE` on real data without asking.
  - Every table gets Row Level Security (RLS) enabled, with a `coach_id` column defaulting to `auth.uid()`.
  - Players and metric types are archived, never deleted (there's no DELETE policy, on purpose).
- **Database change checklist** (do it by hand until it becomes the `db-change` skill):
  1. Run `python scripts/backup.py` and confirm "Backup OK".
  2. Write the SQL as a new file in `supabase/migrations/`, then apply it with the Supabase MCP `apply_migration`.
  3. Rename the file to the version the server recorded (`supabase_migrations.schema_migrations`).
  4. Run `supabase/tests/rls_check.sql` (extend it for new tables) and check the security advisor.
  5. Regenerate `src/lib/database.types.ts`, then run `npm run build`.
  6. Add any new tables to `TABLES` in `scripts/backup.py` and run it to confirm they're included.
- **Look and feel:** dark-only (James prefers dark mode), matched to the program's website. Program branding: burnt orange `#C15700`, bright orange `#FF7300`, charcoal `#262626`, gray `#7D7D7D`, Poppins headings, orange Old English "M" logo. Brand colors and fonts are CSS variables in `src/index.css`. Use those variables and never hard-code colors in components. Use bright orange (`--brand-bright`) for orange text on dark backgrounds. Burnt orange (`--brand`) is for filled buttons and bars only, because as text on dark it's too low-contrast.
- **Design for the iPad at the field.** Big tap targets (44px or more), few taps to enter a metric, readable in sunlight, works in portrait and landscape.
- **Prove it works.** Check UI changes in the browser at iPad size (1024×768 and 768×1024) before calling them done. Run `npm run build` to type-check.
- TypeScript is new to James. When new TS/React ideas come up, explain them briefly in context.

## Roadmap
- [x] Phase 0: project setup, Supabase connected
- [x] Phase 1: players, metric types, measurements; login; quick-entry screen; progress charts; backup script
- [ ] Phase 1.5: deploy to Vercel, install on iPad home screen, nightly backup, restore script, add custom metrics in-app
- [x] Phase 2: pitching library (59-item starter library + import from the old standalone pitching app), lesson plan templates (3 starter plans), lesson log with per-item comments and dated follow-up notes, autosave
- [ ] Before selling: "Sign in with Google" (free: Google Cloud OAuth client + Supabase Google provider; needs the deployed URL). Also pick a product name: "Coachable" is a registered US trademark (#97546961, Able Apps, a sports-coaching app), and the program's name is, not a product name.
- [ ] Phase 3: practice plan maker (team practices; different from the individual lesson plans in Phase 2)
- [ ] Phase 4: shareable parent progress report

## Commands
- `npm run dev`: local dev server (add `-- --host` to test on the iPad over wifi)
- `npm run build`: type-check and build
- `npm run lint`: lint
- `python scripts/backup.py`: export all data to `backups/<timestamp>/` (JSON + CSV), verified

## Layout
- `src/views/`: screens. Tabs are Quick Entry, Players, Lessons, Library.
  - Players: PlayersView, PlayerDetail, PlayerForm. Metrics: QuickEntry. Auth: LoginScreen.
  - Lessons tab: LessonsView (log), StartLesson, LessonEditor, plus PlansView / PlanEditor for plan templates.
  - Library tab: LibraryView (incl. starter-library load and old-app import), LibraryItemForm.
- `src/components/`: reusable pieces (LineChart: hand-drawn SVG, no chart library; LibraryPicker; PasswordInput; TypeTag)
- `src/lib/`: Supabase client and types, formatting, stats (PB and improvement), data hooks (`useCoachData`, `useLibrary`, `usePlans`), `useAutosave`, `pitching.ts` (item types, levels, focus areas, starter plans), `libraryImport.ts`
- `src/data/starterLibrary.json`: the 59 starter library entries from the original pitching app
- `supabase/migrations/`: every schema change, in order. `supabase/tests/`: RLS check

## Learning backlog
James wants to be able to explain this app's code in job interviews (it's on his resume). When a natural moment comes up while building, teach one of these with a small hands-on exercise in this codebase:
- [ ] React basics: components, props, state, `useState` / `useEffect`, and how a custom hook like `useCoachData` works
- [ ] TypeScript basics: types vs interfaces, typing props, reading `database.types.ts`
- [ ] How the app talks to Supabase (queries, auth) and what Row Level Security does, in plain words
- [ ] Walk through one feature end to end (e.g. Quick Entry: tap → insert → PB check → chart)
