-- Adds an arbitrary-amount increment RPC for water intake tracking. The existing
-- increment_habit_completion (2026-07-22_habit_completion_occurrences.sql) only ever adds
-- exactly 1 per call (one occurrence, e.g. one meal/walk) — water logging needs to add a
-- variable ml amount per tap (+50/+100/+250) toward water_goal_ml, so a separate function
-- takes the amount as a parameter instead of hardcoding +1. occurrence_count stays smallint;
-- ml goals (hundreds to a few thousand) fit comfortably, no column change needed.

create or replace function public.increment_habit_amount(
  p_habit_id uuid,
  p_completed_date date,
  p_amount smallint,
  p_max smallint
) returns smallint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_count smallint;
begin
  insert into public.habit_completions (habit_id, owner_id, completed_date, occurrence_count)
  values (p_habit_id, v_owner_id, p_completed_date, least(p_max, p_amount))
  on conflict (habit_id, owner_id, completed_date)
  do update set occurrence_count = least(p_max, public.habit_completions.occurrence_count + p_amount)
  returning occurrence_count into v_count;
  return v_count;
end;
$$;

revoke all on function public.increment_habit_amount(uuid, date, smallint, smallint) from public;
grant execute on function public.increment_habit_amount(uuid, date, smallint, smallint) to authenticated;
