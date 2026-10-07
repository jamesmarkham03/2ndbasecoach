-- Row Level Security check. Proves each coach can only see/change their own data.
--
-- Safe to run against the real database: it all happens inside a transaction
-- that is never committed, so the fake coaches and test rows vanish afterwards.
-- Run it after every schema change (paste into the Supabase SQL editor, or ask
-- Claude to run it via the Supabase MCP). Every row should match its "expect".

begin;
create temp table rls_results (test text, result text) on commit drop;
grant all on rls_results to authenticated, anon;

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

-- Coach B ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}', true);
insert into rls_results select 'B sees A players (expect 0)', count(*)::text from players;
insert into rls_results select 'B sees A measurements (expect 0)', count(*)::text from measurements;
with u as (update players set first_name = 'hacked' returning 1) insert into rls_results select 'B edit A player (expect 0 rows)', count(*)::text from u;

-- Signed-out visitor -------------------------------------------------------
reset role;
set local role anon;
do $$ begin
  perform count(*) from public.players;
  insert into rls_results values ('anon reads players', 'ALLOWED - BAD');
exception when insufficient_privilege then
  insert into rls_results values ('anon reads players (expect blocked)', 'blocked');
end $$;
reset role;

select * from rls_results;
rollback;
