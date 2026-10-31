-- Row Level Security check. Proves each coach can only see/change their own data.
--
-- Safe to run against the real database: it all happens inside a transaction
-- that is never committed, so the fake coaches and test rows vanish afterwards.
-- Run it after every schema change (paste into the Supabase SQL editor, or ask
-- Claude to run it via the Supabase MCP). Every row should match its "expect".

begin;
create temp table rls_results (test text, result text) on commit drop;
-- Coach A's row ids, so the test can try to attack them as coach B (a real attacker could guess ids).
create temp table rls_ids (name text primary key, id uuid) on commit drop;
grant all on rls_results, rls_ids to authenticated, anon;

insert into auth.users (id, aud, role, email) values
  ('00000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated', 'rls-test-a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated', 'rls-test-b@example.test');

-- Coach A ------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
insert into players (first_name, last_name) values ('Test', 'PlayerA');
insert into measurements (player_id, metric_type_id, value, recorded_on)
  select p.id, m.id, 72.5, '2026-10-07' from players p, metric_types m where m.name = 'Exit Velo';
insert into rls_results select 'A sees own players (expect 1)', count(*)::text from players;
insert into rls_results select 'A sees default metrics (expect 8+)', count(*)::text from metric_types;
insert into rls_results select 'A sees own measurements (expect 1)', count(*)::text from measurements;
with d as (delete from players returning 1) insert into rls_results select 'A delete player (expect 0 rows)', count(*)::text from d;
with d as (delete from metric_types returning 1) insert into rls_results select 'A delete metric type (expect 0 rows)', count(*)::text from d;
with u as (update metric_types set name = 'hacked' where coach_id is null returning 1)
  insert into rls_results select 'A edit default metric (expect 0 rows)', count(*)::text from u;

-- Phase 2 (coach A): library item -> plan -> plan item; lesson -> lesson item -> note
insert into library_items (type, title) values ('drill', 'Test Drill');
insert into lesson_plans (name) values ('Test Plan');
insert into lesson_plan_items (plan_id, library_item_id) select lp.id, li.id from lesson_plans lp, library_items li;
insert into lessons (player_id, lesson_date, plan_id, title) select p.id, '2026-10-07', lp.id, 'Test lesson' from players p, lesson_plans lp;
insert into lesson_items (lesson_id, library_item_id) select l.id, li.id from lessons l, library_items li;
insert into lesson_notes (lesson_id, body) select id, 'Follow-up' from lessons;
insert into rls_ids select 'player', id from players;
insert into rls_ids select 'library_item', id from library_items;
insert into rls_ids select 'plan', id from lesson_plans;
insert into rls_ids select 'lesson', id from lessons;
insert into rls_results select 'A sees own lesson chain (expect 1/1/1/1/1/1)',
  concat_ws('/', (select count(*) from library_items), (select count(*) from lesson_plans), (select count(*) from lesson_plan_items),
                 (select count(*) from lessons), (select count(*) from lesson_items), (select count(*) from lesson_notes));
with d as (delete from library_items returning 1) insert into rls_results select 'A delete library item (expect 0 rows)', count(*)::text from d;
with d as (delete from lesson_plans returning 1) insert into rls_results select 'A delete plan (expect 0 rows)', count(*)::text from d;
with d as (delete from lessons returning 1) insert into rls_results select 'A delete lesson (expect 0 rows)', count(*)::text from d;

-- Teams (coach A): own team, link a player, can delete the team (players survive, just unlinked)
insert into teams (name) values ('Test Team');
insert into rls_ids select 'team', id from teams;
update players set team_id = (select id from teams where name = 'Test Team');
insert into rls_results select 'A sees own teams (expect 1)', count(*)::text from teams;

-- Coach B ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
insert into rls_results select 'B sees A players (expect 0)', count(*)::text from players;
insert into rls_results select 'B sees A measurements (expect 0)', count(*)::text from measurements;
with u as (update players set first_name = 'hacked' returning 1) insert into rls_results select 'B edit A player (expect 0 rows)', count(*)::text from u;

-- Phase 2 (coach B): can't see A's chain, and can't attach rows to A's records even knowing the ids
insert into rls_results select 'B sees A lesson chain (expect 0/0/0/0/0/0)',
  concat_ws('/', (select count(*) from library_items), (select count(*) from lesson_plans), (select count(*) from lesson_plan_items),
                 (select count(*) from lessons), (select count(*) from lesson_items), (select count(*) from lesson_notes));
do $$ begin
  insert into public.lessons (player_id, lesson_date) values ((select id from rls_ids where name = 'player'), '2026-10-07');
  insert into rls_results values ('B logs lesson for A player', 'ALLOWED - BAD');
exception when insufficient_privilege then
  insert into rls_results values ('B logs lesson for A player (expect blocked)', 'blocked');
end $$;
do $$ begin
  insert into public.lesson_notes (lesson_id, body) values ((select id from rls_ids where name = 'lesson'), 'sneaky');
  insert into rls_results values ('B adds note to A lesson', 'ALLOWED - BAD');
exception when insufficient_privilege then
  insert into rls_results values ('B adds note to A lesson (expect blocked)', 'blocked');
end $$;
do $$ begin
  insert into public.lesson_plans (name) values ('B plan');
  insert into public.lesson_plan_items (plan_id, library_item_id)
    values ((select id from public.lesson_plans where name = 'B plan'), (select id from rls_ids where name = 'library_item'));
  insert into rls_results values ('B uses A library item in own plan', 'ALLOWED - BAD');
exception when insufficient_privilege then
  insert into rls_results values ('B uses A library item in own plan (expect blocked)', 'blocked');
end $$;

-- Teams (coach B): can't see, edit or delete A's team, and can't put a player on it
insert into rls_results select 'B sees A teams (expect 0)', count(*)::text from teams;
with u as (update teams set name = 'hacked' returning 1) insert into rls_results select 'B edit A team (expect 0 rows)', count(*)::text from u;
with d as (delete from teams returning 1) insert into rls_results select 'B delete A team (expect 0 rows)', count(*)::text from d;
do $$ begin
  insert into public.players (first_name, team_id) values ('Sneaky', (select id from rls_ids where name = 'team'));
  insert into rls_results values ('B puts own player on A team', 'ALLOWED - BAD');
exception when insufficient_privilege then
  insert into rls_results values ('B puts own player on A team (expect blocked)', 'blocked');
end $$;

-- Signed-out visitor -------------------------------------------------------
reset role;
set local role anon;
do $$ begin
  perform count(*) from public.players;
  insert into rls_results values ('anon reads players', 'ALLOWED - BAD');
exception when insufficient_privilege then
  insert into rls_results values ('anon reads players (expect blocked)', 'blocked');
end $$;
do $$ begin
  perform count(*) from public.lessons;
  insert into rls_results values ('anon reads lessons', 'ALLOWED - BAD');
exception when insufficient_privilege then
  insert into rls_results values ('anon reads lessons (expect blocked)', 'blocked');
end $$;
do $$ begin
  perform count(*) from public.teams;
  insert into rls_results values ('anon reads teams', 'ALLOWED - BAD');
exception when insufficient_privilege then
  insert into rls_results values ('anon reads teams (expect blocked)', 'blocked');
end $$;
reset role;

-- Back as coach A: deleting a team must leave the player in place with no team.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
with d as (delete from teams returning 1) insert into rls_results select 'A delete own team (expect 1 row)', count(*)::text from d;
insert into rls_results select 'A player survives team delete, unlinked (expect 1/0)',
  concat_ws('/', (select count(*) from players), (select count(*) from players where team_id is not null));
reset role;

select * from rls_results;
rollback;
