-- Phase 1: players, metric types and measurements.
--
-- Data-safety design:
--   * Every row belongs to a coach (coach_id). Row Level Security (RLS) means a
--     signed-in coach can only ever see and change their own rows.
--   * Players and metric types cannot be deleted (no DELETE policy). Archive them
--     instead, so a mis-tap can never wipe a player's history.
--   * Measurements CAN be deleted, so a typo'd entry can be fixed.
--   * Foreign keys use ON DELETE RESTRICT so the database itself refuses to
--     delete anything that still has measurements attached.

-- ---------------------------------------------------------------- players
create table public.players (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default auth.uid() references auth.users (id) on delete restrict,
  first_name  text not null check (length(trim(first_name)) > 0),
  last_name   text not null default '',
  birth_year  int check (birth_year between 1990 and 2035),
  team        text,
  bats        text check (bats in ('R', 'L', 'S')),
  throws      text check (throws in ('R', 'L')),
  positions   text[] not null default '{}',
  notes       text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create index players_coach_idx on public.players (coach_id);

-- ---------------------------------------------------------------- metric types
-- coach_id NULL = a built-in default every coach can see.
create table public.metric_types (
  id               uuid primary key default gen_random_uuid(),
  coach_id         uuid default auth.uid() references auth.users (id) on delete restrict,
  name             text not null check (length(trim(name)) > 0),
  unit             text not null,
  higher_is_better boolean not null default true, -- false for times (60 yd, pop time)
  decimals         smallint not null default 1 check (decimals between 0 and 2),
  sort_order       int not null default 100,
  archived         boolean not null default false,
  created_at       timestamptz not null default now()
);

create index metric_types_coach_idx on public.metric_types (coach_id);

-- ---------------------------------------------------------------- measurements
create table public.measurements (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null default auth.uid() references auth.users (id) on delete restrict,
  player_id       uuid not null references public.players (id) on delete restrict,
  metric_type_id  uuid not null references public.metric_types (id) on delete restrict,
  value           numeric(7, 2) not null check (value > 0),
  -- The app always sends the coach's local date. This default is UTC, so an
  -- evening entry in North America would otherwise land on tomorrow's date.
  recorded_on     date not null default current_date,
  note            text,
  created_at      timestamptz not null default now()
);

create index measurements_player_metric_idx
  on public.measurements (player_id, metric_type_id, recorded_on);
create index measurements_coach_idx on public.measurements (coach_id);
create index measurements_metric_type_idx on public.measurements (metric_type_id);

-- ---------------------------------------------------------------- access
-- Be explicit about who can touch what: signed-out visitors (anon) get nothing.
revoke all on public.players, public.metric_types, public.measurements from anon;
grant select, insert, update on public.players to authenticated;
grant select, insert, update on public.metric_types to authenticated;
grant select, insert, update, delete on public.measurements to authenticated;

alter table public.players enable row level security;
alter table public.metric_types enable row level security;
alter table public.measurements enable row level security;

-- (select auth.uid()) is wrapped in a sub-select so Postgres evaluates it once
-- per query instead of once per row.

create policy "coach reads own players" on public.players
  for select to authenticated using (coach_id = (select auth.uid()));
create policy "coach adds own players" on public.players
  for insert to authenticated with check (coach_id = (select auth.uid()));
create policy "coach edits own players" on public.players
  for update to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

create policy "coach reads defaults and own metric types" on public.metric_types
  for select to authenticated using (coach_id is null or coach_id = (select auth.uid()));
create policy "coach adds own metric types" on public.metric_types
  for insert to authenticated with check (coach_id = (select auth.uid()));
create policy "coach edits own metric types" on public.metric_types
  for update to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

create policy "coach reads own measurements" on public.measurements
  for select to authenticated using (coach_id = (select auth.uid()));
-- Also checks the player is yours, so you can't attach data to someone else's player.
create policy "coach adds measurements for own players" on public.measurements
  for insert to authenticated with check (
    coach_id = (select auth.uid())
    and exists (
      select 1 from public.players p
      where p.id = player_id and p.coach_id = (select auth.uid())
    )
  );
create policy "coach edits own measurements" on public.measurements
  for update to authenticated
  using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));
create policy "coach deletes own measurements" on public.measurements
  for delete to authenticated using (coach_id = (select auth.uid()));

-- ---------------------------------------------------------------- default metrics
insert into public.metric_types (coach_id, name, unit, higher_is_better, decimals, sort_order) values
  (null, 'Exit Velo',      'mph', true,  1, 10),
  (null, 'Bat Speed',      'mph', true,  1, 20),
  (null, 'Pitching Velo',  'mph', true,  1, 30),
  (null, 'Infield Velo',   'mph', true,  1, 40),
  (null, 'Outfield Velo',  'mph', true,  1, 50),
  (null, 'Pop Time',       'sec', false, 2, 60),
  (null, '60-Yard Dash',   'sec', false, 2, 70),
  (null, 'Home to 1st',    'sec', false, 2, 80);
