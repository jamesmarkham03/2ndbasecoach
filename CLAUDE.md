# 2ndBaseCoach (baseball coaching app)

Project-specific instructions. The global `CLAUDE.md` in `OS/` still applies.

**This repo goes to GitHub.** Private details (James's program and location, Supabase project ref, live URL) live in `CLAUDE.local.md`, which is gitignored and loads alongside this file. Never write them into this file, the README, code or commit messages.

## What this is
**2ndBaseCoach**: an iPad-first web app for baseball coaches covering pitching, hitting, defense and more: player metric tracking, progress charts, a drill/concept library, lesson plans and lesson log, practice plans, and parent reports. Built for James's own coaching first (he coaches in a youth program, 12U–19U), with the goal of becoming a product **any** coach or program can use. Keep features sport-skill-agnostic (not pitching-only) and keep multi-coach support in mind.

**Name and brand:**
- **Story:** every team has a 1st and 3rd base coach; this is the one in between. Tagline: "Every team has a 1st and 3rd base coach. This is the one in between."
- **Always write it "2ndBaseCoach"** (numeral, camel case), never "Second Base Coach", to keep the baseball meaning front and centre over the slang one.
- **Checked Oct 2026:** no registered trademarks and no existing apps. 2ndbasecoach.com was unregistered. James will buy the domain only when he's about to market it, and may rename before launch.
- The name lives in `src/components/BrandTitle.tsx` (`APP_NAME`, `APP_TAGLINE`) and `index.html` only.
- **Not the program's name:** James's program is not the product.

The original goals for the app:
- Quick input of player metrics (exit velocity, throwing velocity, etc.) at the field
- Player progression tracking: compare metrics across sessions so progress is easy to see and show to players and parents
- Lesson planner and practice plan maker

## Stack
- React + TypeScript + Vite. **This project overrides the global Python default for app code.** Python is used for scripts (backups, analytics).
- Supabase (Postgres). Project ref, org and region are in `CLAUDE.local.md`. Use the Supabase MCP tools for database work.
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
- **Look and feel:** dark-only (James prefers dark mode). The palette started from James's program site and is kept as 2ndBaseCoach's own: burnt orange `#C15700`, bright orange `#FF7300`, charcoal `#262626`, gray `#7D7D7D`, Poppins headings. Don't use the program's logo or name in the product. Brand colors and fonts are CSS variables in `src/index.css`. Use those variables and never hard-code colors in components. Use bright orange (`--brand-bright`) for orange text on dark backgrounds. Burnt orange (`--brand`) is for filled buttons and bars only, because as text on dark it's too low-contrast.
- **Design for the iPad at the field.** Big tap targets (44px or more), few taps to enter a metric, readable in sunlight, works in portrait and landscape.
- **Prove it works.** Check UI changes in the browser at iPad size (1024×768 and 768×1024) before calling them done. Run `npm run build` to type-check.
- TypeScript is new to James. When new TS/React ideas come up, explain them briefly in context.

## Roadmap
- [x] Phase 0: project setup, Supabase connected
- [x] Phase 1: players, metric types, measurements; login; quick-entry screen; progress charts; backup script
- [ ] Phase 1.5: ~~deploy to Vercel, install on iPad home screen~~ (done Oct 22, 2026), nightly backup, restore script, add custom metrics in-app
- [ ] Layout redesign: James doesn't like the current layout (Oct 2026), especially on iPhone. Ask what bothers him before changing anything. iPhone = quick notes and metrics at the field; iPad = everything else
- [x] Phase 2: pitching library (59-item starter library + import from the old standalone pitching app), lesson plan templates (3 starter plans), lesson log with per-item comments and dated follow-up notes, autosave
- [ ] Phase 2.5: running private lessons (James started them Oct 23, 2026). Build in this order:
  - [ ] Quick notes: one-tap note during a lesson, saved to the player as an open "to fix" item; a player's open items show before the next lesson and get checked off
  - [ ] Intake questionnaire: editable question list (starter set: background, goals, commitment, health/injury, training, learning style) and dated answers per player. Answers keep the question text, so editing a question never changes old answers. Later: workout, nutrition and tips sections
  - [ ] Schedule and calendar: Today view plus a week/month view. Event types: individual lesson, group lesson, team lesson, program team practice. Repeating events (e.g. every other Friday 5–6pm until Dec 31) create one row per date, so a single date can be moved or cancelled. "Start lesson" from an event opens the lesson log; a group lesson makes one lesson per player so each player keeps their own history
- [ ] Before selling: "Sign in with Google" (free: Google Cloud OAuth client + Supabase Google provider; needs the deployed URL). Re-check the 2ndBaseCoach trademark and domain, consider a paid trademark search and filing, and test the name with a few parents, program directors and players.
- [x] Product name chosen: 2ndBaseCoach (Oct 2026). Ruled out: Coachable (US TM), CoachBase, BaseCoach, Backfield, DugoutIQ, PitchPath, FiveTool, BenchCoach, PinchCoach (existing apps), Fungo, RepBook, Basepath (registered for software).
- [ ] Phase 3: practice plan maker (team practices; different from the individual lesson plans in Phase 2)
- [ ] Phase 4: shareable parent progress report

## Deployment
- Live on Vercel; the URL is in `CLAUDE.local.md` (Vercel Hobby plan, free; non-commercial only, so selling means upgrading to Pro). Installed on James's iPad and iPhone home screens.
- **Every push to `main` deploys automatically.** Run `npm run build` before pushing; a broken push breaks the app James uses at the field.
- Vercel holds only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Never add `COACH_EMAIL`/`COACH_PASSWORD` or any secret key there.
- Supabase Auth URL Configuration: Site URL is the Vercel URL; redirect URLs are the Vercel URL and `http://localhost:5173`, each ending in `/**`. Update both if the domain changes.

## Commands
- `npm run dev`: local dev server (add `-- --host` to test on the iPad over wifi)
- `npm run build`: type-check and build
- `npm run lint`: lint
- `python scripts/backup.py`: export all data to `backups/<timestamp>/` (JSON + CSV), verified
- `python scripts/transcript.py <youtube-url>`: print a video's transcript with `[mm:ss]` timestamps (`--id-only` for just the ID)
- `/add-video <youtube-url>` skill (`.claude/skills/add-video/`): transcript → library items, preview, approve, insert. MCP SQL runs as admin, so it sets `coach_id` explicitly (looked up from `COACH_EMAIL`). Dedupes on the video ID in `source`. Hitting/defense items get no focus areas or tags until those focus areas exist.

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
