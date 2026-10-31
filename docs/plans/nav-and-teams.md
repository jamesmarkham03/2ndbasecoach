# Plan: side menu, teams, full player delete, Quick Entry inside players

Status: **approved Oct 31, 2026, not started.** Do **all steps in one session**, in order, without stopping between them (only pause to show James the SQL in steps 2 and 4). After each step: `npm run build`, check demo mode (`/?demo`) at 375×812, 768×1024 and 1024×768, tick the box here, and commit. Don't push to `main` until James has looked (every push deploys).

Recommended model: Sonnet, high effort. Show James the SQL in steps 2 and 4 before applying it.

## Decisions (don't re-ask)
- Home screen is **Players**. The tab row and the Quick Entry tab are removed.
- A player has **at most one regular team** (e.g. 14U) and **may also be on the private-lessons team**. Moving a player from 14U to 15U is just changing their regular team.
- Deleting a team never deletes players: they just lose that team. Their stats and lessons stay.
- Full player delete is allowed but deliberate: archive stays the normal path.
- Real team names are in `CLAUDE.local.md` (some contain coaches' surnames). They are added as data, never in migrations, code or demo seed. Demo mode uses made-up teams.
- The old idea "item 4" from James's list is dropped unless he brings it back.

## Why the phone header is off
The header row (logo + "Coach James" + Sign out) is wider than a phone screen, so the page scrolls sideways. Moving name and Sign out into the menu, plus shrinking the logo on narrow screens, fixes it.

## Steps

- [x] **1. Side menu**
  - Header: ☰ button + `BrandTitle` only. Scale the brand text down on narrow screens; no horizontal scroll at 375px.
  - New `src/components/SideMenu.tsx`: slides in from the left over a dark overlay; tap outside or Escape closes it. Items (44px+): Players, Teams, Lessons, Library. At the very bottom, after a divider: "Coach {firstName}" and Sign out (keep the existing confirm; "Exit demo" in demo mode).
  - `App.tsx`: remove `TABS`/tab row and the `entry` tab; add a `teams` view. Default view `players`. Colors only from CSS variables in `src/index.css`.

- [x] **2. Teams in the database** (follow the database checklist in `CLAUDE.md`; backup first)
  - `teams`: id, coach_id (default `auth.uid()`), name, `is_private_lessons boolean default false`, created_at. RLS: select/insert/update/**delete** own rows.
  - `players` gets two nullable columns: `team_id` and `lesson_team_id`, both `references teams(id) on delete set null`. This enforces "one regular team + optional private lessons" without a link table.
  - Migrate existing data: for each distinct non-empty `players.team` per coach, create a team and set `team_id`. Keep the old `team` text column for now (drop it in a later change once verified).
  - Extend `supabase/tests/rls_check.sql`, check the security advisor, regenerate `src/lib/database.types.ts`, add `teams` to `TABLES` in `scripts/backup.py`.
  - Demo: add `teams` to `demoClient.ts`/`demoData.ts` with made-up names (e.g. "11U Blue", "13U Gold", "Private Lessons") and assign demo players.
  - After James approves, insert his real teams (list in `CLAUDE.local.md`) via MCP SQL with his `coach_id`.

- [x] **3. Teams screens**
  - `src/lib/useTeams.ts` hook (same pattern as `useCoachData`).
  - `src/views/TeamsView.tsx`: list of teams (private-lessons team marked), "+ Create team" (name + "private lessons team" checkbox).
  - `src/views/TeamDetail.tsx`: roster, "Add player to team" (picker of active players; for a regular team this moves them off their old team, so say so), remove from team, rename, **Delete team** with a confirm that says how many players will be unlinked.

- [x] **4. Players: teams on the form + full delete**
  - `PlayerForm`: replace the free-text Team input with a "Team" select (None + regular teams) and a "Private lessons" toggle/select (None + private-lessons teams). Works for add and edit.
  - `PlayersView`: group by the real regular team ("No team" last).
  - Full delete: SQL function `delete_player(p_id uuid)`, `security invoker`, that deletes the player's lesson_notes, lesson_items, lessons, measurements, then the player, in one transaction (all rows `coach_id = auth.uid()`). Add the DELETE policies it needs on those tables. Call it with `supabase.rpc`; add `rpc('delete_player')` to the demo client.
  - `PlayerDetail`: red "Delete permanently" button next to Archive. Dialog lists what will be erased (counts of measurements and lessons) and requires typing the player's full name to enable the button.
  - Update the `CLAUDE.md` rule "Players… archived, never deleted" to: archive is the default; players can be fully deleted only via `delete_player` with typed-name confirm.

- [ ] **5. Quick Entry moves into the player page**
  - Rework `QuickEntry` into an "Add measurement" panel at the top of `PlayerDetail`, fixed to that player (pick metric, enter value, save, PB check). Chart refreshes after saving. Remove the standalone screen and its empty state.
  - Update the Layout section of `CLAUDE.md` (tabs → menu, new views and hook).

- [ ] **6. Wrap-up**: screenshots from demo mode at phone and iPad sizes into `docs/screenshots/`, README updated if it mentions tabs or Quick Entry, mark this plan done in `CLAUDE.md`'s roadmap.
