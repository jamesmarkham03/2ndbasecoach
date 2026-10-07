# Coach App (baseball coaching app)

Project-specific instructions. The global `CLAUDE.md` one folder up still applies.

## What this is
An iPad-first web app for coaching a youth program (12U–19U): player metric tracking, progress charts, lesson planner, practice plans, and parent reports. James is the only user for now. It could later become a product for other coaches and programs, so keep multi-coach support in mind without building it yet.

## Stack
- React + TypeScript + Vite. **This project overrides the global Python default for app code.** Python is used for scripts (backups, analytics).
- Supabase (Postgres). Project ref `<project-ref>`, org (private). Use the Supabase MCP tools for database work.
- Settings live in `.env.local` (gitignored). The app may only use the **publishable** key. Never put the secret/service_role key in app code or commit it.

## Rules for this project
- **Data safety is the #1 priority.** James cannot lose player data.
  - Before any schema change that alters or drops existing tables or columns, run a backup first and confirm it worked.
  - Never run `DELETE`, `DROP` or `TRUNCATE` on real data without asking.
  - Every table gets Row Level Security (RLS) enabled.
- **Design for the iPad at the field.** Big tap targets (44px or more), few taps to enter a metric, readable in sunlight, works in portrait and landscape.
- **Prove it works.** Check UI changes in the browser at iPad size (1024×768 and 768×1024) before calling them done. Run `npm run build` to type-check.
- TypeScript is new to James. When new TS/React ideas come up, explain them briefly in context.

## Roadmap
- [x] Phase 0: project setup, Supabase connected
- [ ] Phase 1: players, metric types, sessions, measurements; quick-entry screen; progress chart; backup script
- [ ] Phase 2: lesson notes and planner
- [ ] Phase 3: practice plan maker
- [ ] Phase 4: shareable parent progress report

## Commands
- `npm run dev`: local dev server (add `-- --host` to test on the iPad over wifi)
- `npm run build`: type-check and build
- `npm run lint`: lint
