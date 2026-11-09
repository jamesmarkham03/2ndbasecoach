-- Pro Days and indoor testing days.
--
-- testing_days    one session: a date, a template, and its settings (config).
-- testing_entries one player at one day: their number that day, primary position and note.
-- testing_results one best-effort value: a time, a velo or a 20-80 grade.
--
-- Numbers live on the entry because a kid can wear a different number every time.
-- team_name is copied onto the entry so old results still show the team the player was
-- on that day, after they move up an age group.
--
-- Deleting a day removes its entries and results (the app makes the coach type the day's
-- name first). Players stay protected: player_id is "on delete restrict", so only
-- delete_player() can erase a player who has testing history.

create table public.testing_days (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default auth.uid() references auth.users (id) on delete restrict,
  name        text not null check (length(trim(name)) > 0),
  held_on     date not null,
  kind        text not null default 'pro_day' check (kind in ('pro_day', 'velo', 'exit_velo', 'sprint')),
  indoor      boolean not null default false,
  config      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index testing_days_coach_idx on public.testing_days (coach_id, held_on);

create table public.testing_entries (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null default auth.uid() references auth.users (id) on delete restrict,
  day_id          uuid not null references public.testing_days (id) on delete cascade,
  player_id       uuid not null references public.players (id) on delete restrict,
  number          int not null check (number between 1 and 999),
  position        text not null check (position in ('P', 'C', '1B', '2B', '3B', 'SS', 'OF')),
  team_name       text,
  extra_stations  text[] not null default '{}',
  note            text,
  created_at      timestamptz not null default now(),
  unique (day_id, number),
  unique (day_id, player_id)
);
create index testing_entries_coach_idx on public.testing_entries (coach_id);
create index testing_entries_player_idx on public.testing_entries (player_id);

create table public.testing_results (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default auth.uid() references auth.users (id) on delete restrict,
  entry_id    uuid not null references public.testing_entries (id) on delete cascade,
  station     text not null check (station in ('SPRINT', 'OF', 'IF', '1B', 'C', 'HIT', 'PITCH')),
  metric      text not null check (
    metric ~ '^sprint_[0-9]+$'
    or metric in (
      'throw_velo', 'pop_time', 'exit_velo', 'pitch_velo', 'pitch_movement', 'mechanics',
      'fielding_current', 'fielding_future', 'throwing_current', 'throwing_future',
      'hit_current', 'hit_future', 'power_current', 'power_future'
    )
  ),
  -- '' rather than null for everything except pitches, so the unique rule below works.
  pitch_type  text not null default '',
  value       numeric(6, 2) not null check (value > 0),
  created_at  timestamptz not null default now(),
  unique (entry_id, station, metric, pitch_type),
  -- Grades are whole numbers on the 20-80 scouting scale. The database enforces it too.
  constraint testing_results_grade_range check (
    metric not in (
      'fielding_current', 'fielding_future', 'throwing_current', 'throwing_future',
      'hit_current', 'hit_future', 'power_current', 'power_future', 'mechanics', 'pitch_movement'
    )
    or (value between 20 and 80 and value = trunc(value))
  )
);
create index testing_results_coach_idx on public.testing_results (coach_id);

-- ---------------------------------------------------------------- access
-- Signed-out visitors get nothing. Signed-in coaches only reach their own rows, through RLS.
revoke all on public.testing_days, public.testing_entries, public.testing_results from anon;
grant select, insert, update, delete on public.testing_days, public.testing_entries, public.testing_results to authenticated;

alter table public.testing_days enable row level security;
alter table public.testing_entries enable row level security;
alter table public.testing_results enable row level security;

create policy "coach reads own testing days" on public.testing_days
  for select to authenticated using (coach_id = (select auth.uid()));
create policy "coach adds own testing days" on public.testing_days
  for insert to authenticated with check (coach_id = (select auth.uid()));
create policy "coach edits own testing days" on public.testing_days
  for update to authenticated using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy "coach deletes own testing days" on public.testing_days
  for delete to authenticated using (coach_id = (select auth.uid()));

-- Inserts and edits also check the day and the player are yours, even if someone knew another coach's ids.
create policy "coach reads own testing entries" on public.testing_entries
  for select to authenticated using (coach_id = (select auth.uid()));
create policy "coach adds own testing entries" on public.testing_entries
  for insert to authenticated with check (
    coach_id = (select auth.uid())
    and exists (select 1 from public.testing_days d where d.id = day_id and d.coach_id = (select auth.uid()))
    and exists (select 1 from public.players p where p.id = player_id and p.coach_id = (select auth.uid()))
  );
create policy "coach edits own testing entries" on public.testing_entries
  for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (
    coach_id = (select auth.uid())
    and exists (select 1 from public.testing_days d where d.id = day_id and d.coach_id = (select auth.uid()))
    and exists (select 1 from public.players p where p.id = player_id and p.coach_id = (select auth.uid()))
  );
create policy "coach deletes own testing entries" on public.testing_entries
  for delete to authenticated using (coach_id = (select auth.uid()));

create policy "coach reads own testing results" on public.testing_results
  for select to authenticated using (coach_id = (select auth.uid()));
create policy "coach adds own testing results" on public.testing_results
  for insert to authenticated with check (
    coach_id = (select auth.uid())
    and exists (select 1 from public.testing_entries e where e.id = entry_id and e.coach_id = (select auth.uid()))
  );
create policy "coach edits own testing results" on public.testing_results
  for update to authenticated
  using (coach_id = (select auth.uid()))
  with check (
    coach_id = (select auth.uid())
    and exists (select 1 from public.testing_entries e where e.id = entry_id and e.coach_id = (select auth.uid()))
  );
create policy "coach deletes own testing results" on public.testing_results
  for delete to authenticated using (coach_id = (select auth.uid()));

-- ---------------------------------------------------------------- delete_player
-- Same function as before, plus the player's testing entries (their results go with them).
create or replace function public.delete_player(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  removed int;
begin
  if not exists (select 1 from public.players where id = p_id and coach_id = (select auth.uid())) then
    raise exception 'Player not found';
  end if;

  delete from public.lesson_notes
    where lesson_id in (select id from public.lessons where player_id = p_id and coach_id = (select auth.uid()));
  delete from public.lesson_items
    where lesson_id in (select id from public.lessons where player_id = p_id and coach_id = (select auth.uid()));
  delete from public.lessons where player_id = p_id and coach_id = (select auth.uid());
  delete from public.measurements where player_id = p_id and coach_id = (select auth.uid());
  delete from public.testing_entries where player_id = p_id and coach_id = (select auth.uid());
  delete from public.players where id = p_id and coach_id = (select auth.uid());

  get diagnostics removed = row_count;
  if removed <> 1 then
    raise exception 'Player was not deleted';
  end if;
end;
$$;

revoke execute on function public.delete_player(uuid) from public, anon;
grant execute on function public.delete_player(uuid) to authenticated;
