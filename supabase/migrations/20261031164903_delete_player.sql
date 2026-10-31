-- Full player delete, on purpose and only through one function.
--
-- Archiving stays the normal way to remove a player. Deleting for good is allowed, but the
-- app only does it through delete_player(), which asks the coach to type the player's name first.
--
-- delete_player erases, in ONE transaction (a function call is atomic: if any step fails,
-- nothing is deleted): the player's lesson notes, lesson items, lessons, measurements, then the player.
-- It is "security invoker", so it runs as the signed-in coach and row level security still applies:
-- a coach can never delete another coach's player, even with the right id.
--
-- The foreign keys from lessons and measurements to players stay "on delete restrict". So a
-- direct `delete from players` on a player that has data still fails. Only this function,
-- which removes the child rows first, can erase a player who has history.

-- DELETE policies the function needs (measurements, lesson_items and lesson_notes already have them).
grant delete on public.players, public.lessons to authenticated;

create policy "coach deletes own lessons" on public.lessons
  for delete to authenticated using (coach_id = (select auth.uid()));
create policy "coach deletes own players" on public.players
  for delete to authenticated using (coach_id = (select auth.uid()));

create function public.delete_player(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  removed int;
begin
  -- Everything below is limited to this coach's rows by RLS; the explicit coach_id checks are belt and braces.
  if not exists (select 1 from public.players where id = p_id and coach_id = (select auth.uid())) then
    raise exception 'Player not found';
  end if;

  delete from public.lesson_notes
    where lesson_id in (select id from public.lessons where player_id = p_id and coach_id = (select auth.uid()));
  delete from public.lesson_items
    where lesson_id in (select id from public.lessons where player_id = p_id and coach_id = (select auth.uid()));
  delete from public.lessons where player_id = p_id and coach_id = (select auth.uid());
  delete from public.measurements where player_id = p_id and coach_id = (select auth.uid());
  delete from public.players where id = p_id and coach_id = (select auth.uid());

  get diagnostics removed = row_count;
  if removed <> 1 then
    raise exception 'Player was not deleted';
  end if;
end;
$$;

-- Signed-in coaches only: not callable by signed-out visitors.
revoke execute on function public.delete_player(uuid) from public, anon;
grant execute on function public.delete_player(uuid) to authenticated;
