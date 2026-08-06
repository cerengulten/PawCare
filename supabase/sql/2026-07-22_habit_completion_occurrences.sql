-- Adds per-occurrence progress tracking to habit_completions so a habit with
-- times_per_day > 1 (e.g. "Walks" 2x/day) can record partial daily progress
-- (1 of 2 walks done) instead of only a binary done/not-done per day.
-- The existing unique index (habit_id, owner_id, completed_date) is kept as-is —
-- still one row per habit per day, but the row now carries a count.

alter table public.habit_completions
  add column if not exists occurrence_count smallint not null default 1;

alter table public.habit_completions
  drop constraint if exists habit_completions_occurrence_count_check;
alter table public.habit_completions
  add constraint habit_completions_occurrence_count_check
  check (occurrence_count >= 0);

-- ONE-TIME BACKFILL — run this once, immediately, before any app code calls
-- logOccurrence/undoOccurrence. Pre-existing rows were written by the OLD
-- binary toggleCompletion() (no count field), which under the old schema
-- meant "fully done that day." Bump those rows to their habit's own target
-- so a previously-"done" 2x/day habit doesn't regress to "1 of 2" the moment
-- this ships. Do NOT re-run this block after real partial-progress data
-- exists — it would wrongly stamp a genuine "1 of 2" as fully done. If you
-- ever re-run this whole file against a live DB later, delete/comment this
-- UPDATE out first; the column/constraint/function statements above and
-- below it are all safely idempotent on their own.
update public.habit_completions hc
set occurrence_count = greatest(1, coalesce(h.times_per_day, 1))
from public.habits h
where h.id = hc.habit_id
  and hc.occurrence_count = 1;

-- Atomic increment/decrement RPCs — supabase-js has no relative-update
-- primitive, so client-side "read count, compute +1, write" is racy under
-- rapid double-taps. These do the read-modify-write as one Postgres
-- statement instead, so it's correct regardless of tap timing.

create or replace function public.increment_habit_completion(
  p_habit_id uuid,
  p_completed_date date,
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
  values (p_habit_id, v_owner_id, p_completed_date, 1)
  on conflict (habit_id, owner_id, completed_date)
  do update set occurrence_count = least(p_max, public.habit_completions.occurrence_count + 1)
  returning occurrence_count into v_count;
  return v_count;
end;
$$;

create or replace function public.decrement_habit_completion(
  p_habit_id uuid,
  p_completed_date date
) returns smallint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid := auth.uid();
  v_count smallint;
begin
  update public.habit_completions
  set occurrence_count = occurrence_count - 1
  where habit_id = p_habit_id and owner_id = v_owner_id and completed_date = p_completed_date
  returning occurrence_count into v_count;

  if v_count is null then
    return null; -- no row existed for today; nothing to undo
  end if;

  if v_count <= 0 then
    delete from public.habit_completions
    where habit_id = p_habit_id and owner_id = v_owner_id and completed_date = p_completed_date;
    return 0;
  end if;

  return v_count;
end;
$$;

revoke all on function public.increment_habit_completion(uuid, date, smallint) from public;
revoke all on function public.decrement_habit_completion(uuid, date) from public;
grant execute on function public.increment_habit_completion(uuid, date, smallint) to authenticated;
grant execute on function public.decrement_habit_completion(uuid, date) to authenticated;
