# Plan: Pro Days and indoor testing days

Status: **built and pushed Nov 9, 2026.** Tested in demo mode only; James hasn't used it on real data yet.

## Decisions (don't re-ask)
- One feature, "testing days", with four templates: Pro Day, Velo, Exit Velo, Sprint. The menu item is **Pro Days**.
- A day can include **any teams** (usually a 14U–19U day or split 14U–16U / 17U–19U). Check-in search stays inside the day's teams, and age groups list oldest first.
- Numbers belong to a day, not a player. Series: P 100, C 200, 1B 300, 2B 400, 3B 500, SS 600, OF 700 (a day can start OF at 800). Next open number by default, editable.
- Grades are whole numbers, **20–80 in 1s**. Blank is fine.
- **One value per measurement: the player's best effort.** No per-play or per-attempt logging. A re-run in the sprint line only replaces the time if it's better.
- Times are typed in from a stopwatch.
- Default sprint order: OF, C, 1B, 2B, 3B, SS, P. Editable per day. Runners go 1 or 2 at a time.
- Sprint distances are picked per day from 10, 20, 40, 60.
- Stations in the day's order: OF, IF (2B/3B/SS), 1B, C, Hitting, Pitching. Anyone can be added to any station without changing their number, e.g. a 3B catching.
- OF, IF, 1B: velo (best, one number), Fielding and Throwing, each Current and Future. C adds pop time. Hitting: Hit and Power, each Current and Future, plus optional exit velo. Pitching: any pitch types, top velo and optional movement grade per type, plus one mechanics grade.
- Each player gets a note per day, reachable from every screen of that day and shown on their player page.
- Indoor and outdoor share one progression chart, indoor points marked.
- Coaches only for now: no parent or player view. James will talk to the program head.
- One iPad at a time for now, and a hotspot at the field: no offline queue.
- Pro Day numbers do not feed the older `measurements` charts. Progression has its own section on the player page, so the same number can't be counted twice.

## Steps
- [x] 1. Database: `testing_days`, `testing_entries`, `testing_results` with RLS, narrow grants, 20–80 check. `delete_player` also erases a player's testing rows.
- [x] 2. Days list and setup form (template, date, teams, distances, stations, settings).
- [x] 3. Check-in: tap a position, get a number; edit numbers; remove a player.
- [x] 4. Sprint lineup: heats, scratch, put anyone in a lane, re-run, order editor, time entry.
- [x] 5. Stations (throwing, catching, hitting, pitching) and per-player notes.
- [x] 6. Leaderboard per day, filter by position and team.
- [x] 7. Progression on the player page, indoor marked.
- [x] 8. Demo data, `rls_check.sql`, `backup.py`, README/CLAUDE.md, checks at 1024×768 and 768×1024.

## Data this adds
Subjective grades and free-text notes about minors. Same lockdown as players; include in the privacy policy once it exists.
