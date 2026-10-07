-- Phase 2: pitching library, lesson plans (templates) and the lesson log.
--
-- Same safety pattern as Phase 1:
--   * every row has coach_id and RLS limits each coach to their own rows
--   * "real" records (library items, plans, lessons) are archived, never deleted
--   * child rows a coach legitimately removes (an item from a plan or lesson,
--     a follow-up note) can be deleted
--   * child-table policies also check the parent belongs to the same coach

-- ---------------------------------------------------------------- library
create table public.library_items (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null default auth.uid() references auth.users (id) on delete restrict,
  type         text not null check (type in ('concept', 'drill', 'cue')),
  title        text not null check (length(trim(title)) > 0),
  note         text not null default '',
  source       text,
  tags         text[] not null default '{}',
  levels       text[] not null default '{beginner,intermediate,advanced}'
               check (levels <@ array['beginner', 'intermediate', 'advanced']),
  focus_areas  text[] not null default '{}',
  minutes      smallint not null default 5 check (minutes between 1 and 180),
  archived     boolean not null default false,
  -- id from the old standalone pitching app, so re-running an import can't create duplicates
  legacy_id    text,
  created_at   timestamptz not null default now(),
  unique (coach_id, legacy_id)
);
create index library_items_coach_idx on public.library_items (coach_id);

-- ---------------------------------------------------------------- lesson plans (templates)
create table public.lesson_plans (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null default auth.uid() references auth.users (id) on delete restrict,
  name         text not null check (length(trim(name)) > 0),
  focus_area   text,
  level        text check (level in ('beginner', 'intermediate', 'advanced')),
  description  text,
  is_starter   boolean not null default false, -- created by "load starter plans"
  archived     boolean not null default false,
  legacy_id    text,
  created_at   timestamptz not null default now(),
  unique (coach_id, legacy_id)
);
create index lesson_plans_coach_idx on public.lesson_plans (coach_id);

create table public.lesson_plan_items (
  id               uuid primary key default gen_random_uuid(),
  coach_id         uuid not null default auth.uid() references auth.users (id) on delete restrict,
  plan_id          uuid not null references public.lesson_plans (id) on delete restrict,
  library_item_id  uuid not null references public.library_items (id) on delete restrict,
  position         int not null default 0,
  minutes          smallint check (minutes between 1 and 180), -- null = use the library item's minutes
  instructions     text, -- e.g. "3x8 each side"
  created_at       timestamptz not null default now()
);
create index lesson_plan_items_plan_idx on public.lesson_plan_items (plan_id, position);
create index lesson_plan_items_coach_idx on public.lesson_plan_items (coach_id);
create index lesson_plan_items_library_idx on public.lesson_plan_items (library_item_id);

-- ---------------------------------------------------------------- lesson log
create table public.lessons (
  id             uuid primary key default gen_random_uuid(),
  coach_id       uuid not null default auth.uid() references auth.users (id) on delete restrict,
  player_id      uuid not null references public.players (id) on delete restrict,
  lesson_date    date not null, -- the app sends the coach's local date
  plan_id        uuid references public.lesson_plans (id) on delete restrict, -- template it started from
  title          text not null default '',
  overall_notes  text,
  archived       boolean not null default false,
  created_at     timestamptz not null default now()
);
create index lessons_player_idx on public.lessons (player_id, lesson_date desc);
create index lessons_coach_idx on public.lessons (coach_id, lesson_date desc);
create index lessons_plan_idx on public.lessons (plan_id);

create table public.lesson_items (
  id               uuid primary key default gen_random_uuid(),
  coach_id         uuid not null default auth.uid() references auth.users (id) on delete restrict,
  lesson_id        uuid not null references public.lessons (id) on delete restrict,
  library_item_id  uuid references public.library_items (id) on delete restrict,
  custom_title     text, -- for something done that isn't in the library
  position         int not null default 0,
  minutes          smallint check (minutes between 1 and 180),
  instructions     text,
  completed        boolean not null default false,
  comment          text, -- how it went for this player today
  created_at       timestamptz not null default now(),
  check (library_item_id is not null or length(trim(coalesce(custom_title, ''))) > 0)
);
create index lesson_items_lesson_idx on public.lesson_items (lesson_id, position);
create index lesson_items_coach_idx on public.lesson_items (coach_id);
create index lesson_items_library_idx on public.lesson_items (library_item_id);

-- Dated follow-up comments added after the lesson, so later thoughts never overwrite the original notes.
create table public.lesson_notes (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default auth.uid() references auth.users (id) on delete restrict,
  lesson_id   uuid not null references public.lessons (id) on delete restrict,
  body        text not null check (length(trim(body)) > 0),
  created_at  timestamptz not null default now()
);
create index lesson_notes_lesson_idx on public.lesson_notes (lesson_id, created_at);
create index lesson_notes_coach_idx on public.lesson_notes (coach_id);

-- ---------------------------------------------------------------- access
revoke all on public.library_items, public.lesson_plans, public.lesson_plan_items,
  public.lessons, public.lesson_items, public.lesson_notes from anon;

grant select, insert, update on public.library_items, public.lesson_plans, public.lessons to authenticated;
grant select, insert, update, delete on public.lesson_plan_items, public.lesson_items, public.lesson_notes to authenticated;

alter table public.library_items enable row level security;
alter table public.lesson_plans enable row level security;
alter table public.lesson_plan_items enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_items enable row level security;
alter table public.lesson_notes enable row level security;

-- Parent tables: own rows only. No DELETE policy = archive instead.
create policy "coach reads own library" on public.library_items
  for select to authenticated using (coach_id = (select auth.uid()));
create policy "coach adds own library" on public.library_items
  for insert to authenticated with check (coach_id = (select auth.uid()));
create policy "coach edits own library" on public.library_items
  for update to authenticated using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

create policy "coach reads own plans" on public.lesson_plans
  for select to authenticated using (coach_id = (select auth.uid()));
create policy "coach adds own plans" on public.lesson_plans
  for insert to authenticated with check (coach_id = (select auth.uid()));
create policy "coach edits own plans" on public.lesson_plans
  for update to authenticated using (coach_id = (select auth.uid())) with check (coach_id = (select auth.uid()));

create policy "coach reads own lessons" on public.lessons
  for select to authenticated using (coach_id = (select auth.uid()));
create policy "coach adds lessons for own players" on public.lessons
  for insert to authenticated with check (
    coach_id = (select auth.uid())
    and exists (select 1 from public.players p where p.id = player_id and p.coach_id = (select auth.uid()))
    and (plan_id is null or exists (select 1 from public.lesson_plans lp where lp.id = plan_id and lp.coach_id = (select auth.uid())))
  );
create policy "coach edits own lessons" on public.lessons
  for update to authenticated using (coach_id = (select auth.uid())) with check (
    coach_id = (select auth.uid())
    and exists (select 1 from public.players p where p.id = player_id and p.coach_id = (select auth.uid()))
  );

-- Child tables: own rows, and the parent (and any linked library item) must be yours too.
create policy "coach reads own plan items" on public.lesson_plan_items
  for select to authenticated using (coach_id = (select auth.uid()));
create policy "coach adds own plan items" on public.lesson_plan_items
  for insert to authenticated with check (
    coach_id = (select auth.uid())
    and exists (select 1 from public.lesson_plans lp where lp.id = plan_id and lp.coach_id = (select auth.uid()))
    and exists (select 1 from public.library_items li where li.id = library_item_id and li.coach_id = (select auth.uid()))
  );
create policy "coach edits own plan items" on public.lesson_plan_items
  for update to authenticated using (coach_id = (select auth.uid())) with check (
    coach_id = (select auth.uid())
    and exists (select 1 from public.lesson_plans lp where lp.id = plan_id and lp.coach_id = (select auth.uid()))
    and exists (select 1 from public.library_items li where li.id = library_item_id and li.coach_id = (select auth.uid()))
  );
create policy "coach removes own plan items" on public.lesson_plan_items
  for delete to authenticated using (coach_id = (select auth.uid()));

create policy "coach reads own lesson items" on public.lesson_items
  for select to authenticated using (coach_id = (select auth.uid()));
create policy "coach adds own lesson items" on public.lesson_items
  for insert to authenticated with check (
    coach_id = (select auth.uid())
    and exists (select 1 from public.lessons l where l.id = lesson_id and l.coach_id = (select auth.uid()))
    and (library_item_id is null or exists (select 1 from public.library_items li where li.id = library_item_id and li.coach_id = (select auth.uid())))
  );
create policy "coach edits own lesson items" on public.lesson_items
  for update to authenticated using (coach_id = (select auth.uid())) with check (
    coach_id = (select auth.uid())
    and exists (select 1 from public.lessons l where l.id = lesson_id and l.coach_id = (select auth.uid()))
    and (library_item_id is null or exists (select 1 from public.library_items li where li.id = library_item_id and li.coach_id = (select auth.uid())))
  );
create policy "coach removes own lesson items" on public.lesson_items
  for delete to authenticated using (coach_id = (select auth.uid()));

create policy "coach reads own lesson notes" on public.lesson_notes
  for select to authenticated using (coach_id = (select auth.uid()));
create policy "coach adds own lesson notes" on public.lesson_notes
  for insert to authenticated with check (
    coach_id = (select auth.uid())
    and exists (select 1 from public.lessons l where l.id = lesson_id and l.coach_id = (select auth.uid()))
  );
create policy "coach edits own lesson notes" on public.lesson_notes
  for update to authenticated using (coach_id = (select auth.uid())) with check (
    coach_id = (select auth.uid())
    and exists (select 1 from public.lessons l where l.id = lesson_id and l.coach_id = (select auth.uid()))
  );
create policy "coach removes own lesson notes" on public.lesson_notes
  for delete to authenticated using (coach_id = (select auth.uid()));
