# 2ndBaseCoach

*Every team has a 1st and 3rd base coach. This is the one in between.*

An all-in-one baseball coaching app covering pitching, hitting, defense and more, designed to be used on an iPad at the field. It's built and used first by a youth coach (12U–19U), with the goal of working for any coach or program.

**What works now:**
- **Coach login.** Each coach only ever sees their own players and data.
- **Quick Entry for testing days.** Pick a metric, then tap a player, type the number and save. Players already measured that day get a check mark. It flags new personal bests.
- **Players.** Roster grouped by team. Add, edit or archive players. Archived players are hidden, never deleted.
- **Player page.** For each metric: latest result, personal best, change since the first test, a progress chart and the full history.
- **Built-in metrics:** Exit Velo, Bat Speed, Pitching Velo, Infield Velo, Outfield Velo, Pop Time, 60-Yard Dash, Home to 1st.
- **Pitching library.** Concepts, drills and cues, filterable by type, level and focus area. Load the 59-entry starter library or import an export from the old pitching app.
- **Lesson plans and lesson log.** Build reusable lesson plan templates, start a lesson for a player from a plan, check off items, comment on how each went, and add dated follow-up notes. Notes autosave.
- **Backup script.** Exports everything to dated JSON + CSV files and verifies them.

**Coming next:** hosting online plus an iPad home-screen install, nightly backups, team practice plans and parent reports.

## Stack

- **App:** React + TypeScript, built with [Vite](https://vite.dev)
- **Database:** [Supabase](https://supabase.com) (hosted Postgres), project `coach-app`
- **Scripts:** Python 3.10+ (standard library only)

## Setup

1. Install [Node.js](https://nodejs.org) 20 or newer and [Python](https://python.org) 3.10 or newer.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local` and fill it in:
   - The Supabase URL and **publishable** key (Supabase dashboard → Project Settings → API Keys).
   - `COACH_EMAIL` / `COACH_PASSWORD`: your app login. The backup script uses these.

## Run

```bash
npm run dev
```

Open the URL it prints (usually http://localhost:5173). The first time, choose "Create an account" and confirm the email Supabase sends you.

**To test on the iPad on the same wifi:**

```bash
npm run dev -- --host
```

Then open the "Network" URL it prints in Safari on the iPad.

## Back up your data

```bash
python scripts/backup.py
```

This creates `backups/<date_time>/` with a `.json` and a `.csv` for each table, plus a `manifest.json` with row counts. It re-reads the files to verify them before printing **Backup OK**. The `backups/` folder is kept out of git because it holds players' personal info. OneDrive syncs it, which gives you an off-site copy.

## Database

Schema changes live in `supabase/migrations/` in the order they were applied. `supabase/tests/rls_check.sql` proves that each coach can only see their own data. Run it after every schema change. It cleans up after itself.

## Other commands

| Command | What it does |
|---|---|
| `npm run build` | Type-checks and builds the production version into `dist/` |
| `npm run lint` | Checks the code for common mistakes |
| `npm run preview` | Serves the production build locally |
