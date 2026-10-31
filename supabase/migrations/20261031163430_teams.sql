-- Teams: a coach's own groups of players (e.g. 14U, a private-lessons group).
--
-- A player has at most ONE regular team (players.team_id) and may ALSO be on a
-- private-lessons team (players.lesson_team_id). Two nullable columns enforce that
-- without a link table. Moving a player 14U -> 15U is just changing team_id.
--
-- Deleting a team never deletes players: the foreign keys are "on delete set null",
-- so those players simply lose the team. Their measurements and lessons are untouched.
--
-- The old free-text players.team column is kept for now (copied into teams below)
-- and will be dropped in a later change once this has been checked.

create table public.teams (
  id                   uuid primary key default gen_random_uuid(),
  coach_id             uuid not null default auth.uid() references auth.users (id) on delete restrict,
  name                 text not null check (length(trim(name)) > 0),
  is_private_lessons   boolean not null default false,
  created_at           timestamptz not null default now()
);
create index teams_coach_idx on public.teams (coach_id);
-- No two teams with the same name (ignoring case) for one coach.
create unique index teams_coach_name_idx on public.teams (coach_id, lower(trim(name)));

alter table public.players
  add column team_id        uuid references public.teams (id) on delete set null,
  add column lesson_team_id uuid references public.teams (id) on delete set null;
create index players_team_idx on public.players (team_id);
create index players_lesson_team_idx on public.players (lesson_team_id);

-- ---------------------------------------------------------------- access
revoke all on public.teams from anon;
grant select, insert, update, delete on public.teams to authenticated;
alter table public.teams enable row level security;

create policy "coach reads own teams" on public.teams
  for select to authenticated using (coach_id = (select auth.uid()));
create policy "coach adds own teams" on public.teams
  for insert to authenticated with check (coach_id = (select auth.uid()));
create policy "coach edits own teams" on public.teams
  for update to authenticated using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy "coach deletes own teams" on public.teams
  for delete to authenticated using (coach_id = (select auth.uid()));

-- A player may only be put on one of the same coach's teams, even if someone knew another coach's team id.
drop policy "coach adds own players" on public.players;
drop policy "coach edits own players" on public.players;

create policy "coach adds own players" on public.players
  for insert to authenticated with check (
    coach_id = (select auth.uid())
    and (team_id is null or exists (select 1 from public.teams t where t.id = team_id and t.coach_id = (select auth.uid())))
    and (lesson_team_id is null or exists (select 1 from public.teams t where t.id = lesson_team_id and t.coach_id = (select auth.uid())))
  );
create policy "coach edits own players" on public.players
  for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (
    coach_id = (select auth.uid())
    and (team_id is null or exists (select 1 from public.teams t where t.id = team_id and t.coach_id = (select auth.uid())))
    and (lesson_team_id is null or exists (select 1 from public.teams t where t.id = lesson_team_id and t.coach_id = (select auth.uid())))
  );

-- ---------------------------------------------------------------- migrate existing data
-- One team per distinct non-empty team text per coach (ignoring case and spacing), then link the players.
insert into public.teams (coach_id, name)
select coach_id, min(trim(team))
from public.players
where team is not null and length(trim(team)) > 0
group by coach_id, lower(trim(team));

update public.players p
set team_id = t.id
from public.teams t
where t.coach_id = p.coach_id
  and lower(trim(t.name)) = lower(trim(p.team));
