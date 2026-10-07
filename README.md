# Coach App

An all-in-one baseball coaching app built for a youth baseball program (12U–19U). It's designed to be used on an iPad at the field.

**Planned features:** player metric tracking (exit velo, throwing velo, etc.), progress charts across sessions, lesson planner, practice plan maker, and parent-friendly progress reports.

**Status:** Phase 0. The project is set up and connected to the database.

## Stack

- **App:** React + TypeScript, built with [Vite](https://vite.dev)
- **Database:** [Supabase](https://supabase.com) (hosted Postgres), project `coach-app`
- **Scripts:** Python (backups, analytics)

## Setup

1. Install [Node.js](https://nodejs.org) 20 or newer.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local` and fill in the Supabase URL and **publishable** key (Supabase dashboard → Project Settings → API Keys).

## Run

```bash
npm run dev
```

Open the URL it prints (usually http://localhost:5173).

**To test on the iPad on the same wifi:**

```bash
npm run dev -- --host
```

Then open the "Network" URL it prints in Safari on the iPad.

## Other commands

| Command | What it does |
|---|---|
| `npm run build` | Type-checks and builds the production version into `dist/` |
| `npm run lint` | Checks the code for common mistakes |
| `npm run preview` | Serves the production build locally |
