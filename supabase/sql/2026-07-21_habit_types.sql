-- Habit presets: feeding schedule/portions, water, walking, medication, vitamins, custom.
-- Verify the live `habits`/`habit_completions` schema in the Supabase dashboard before running
-- this file — the create table statements below are a safety net (no-op if they already exist
-- with this shape) and are not a substitute for that check.
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text not null check (category in ('feeding', 'walk', 'medication', 'grooming', 'training', 'vaccine', 'other')),
  frequency text not null,
  reminder_time text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  completed_at timestamptz not null default now(),
  completed_date date not null
);

-- toggleCompletion() in useHabits.ts upserts on this key with no onConflict target,
-- so a unique constraint here is required for the upsert to behave as a toggle.
create unique index if not exists habit_completions_unique
  on public.habit_completions (habit_id, owner_id, completed_date);

-- Matches the owner_id-scoped RLS pattern already used by profiles/dogs/vaccine_records.
-- Safe to run even if these tables/policies already exist elsewhere — enabling RLS twice
-- is a no-op, and duplicate policy names are caught below instead of erroring.
alter table public.habits enable row level security;
alter table public.habit_completions enable row level security;

do $$
begin
  create policy habits_owner_all on public.habits
    for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy habit_completions_owner_all on public.habit_completions
    for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
exception
  when duplicate_object then null;
end $$;

-- habit_type distinguishes preset behavior (which structured fields/reminder shape apply)
-- from `category`, which stays a coarser display grouping derived from habit_type.
alter table public.habits
  add column if not exists habit_type text not null default 'custom';

-- feeding_schedule/feeding_portion were merged into a single 'feeding' type during development;
-- reconcile any rows saved under the old values before the stricter constraint below is added.
update public.habits set habit_type = 'feeding' where habit_type in ('feeding_schedule', 'feeding_portion');

-- Dropped and recreated (not guarded like the policies above) since the allowed value list
-- has changed during development — this keeps re-running the file idempotent either way.
alter table public.habits drop constraint if exists habits_habit_type_check;
alter table public.habits
  add constraint habits_habit_type_check
  check (habit_type in ('feeding', 'water', 'walking', 'medication', 'vitamin', 'custom'));

-- Structured plan detail, all optional — nothing here is required to save a habit.
-- times_per_day is shared by 'feeding' (meals/day) and 'walking' (walks/day) — same shape,
-- one column, rather than duplicating it as meals_per_day/walks_per_day.
alter table public.habits
  add column if not exists times_per_day smallint,
  add column if not exists portion_grams numeric,
  add column if not exists food_brand text,
  add column if not exists wet_dry_ratio smallint,
  add column if not exists water_goal_ml numeric,
  add column if not exists walk_duration_minutes smallint,
  add column if not exists dosage_amount numeric,
  add column if not exists dosage_unit text,
  add column if not exists reminder_weekday smallint;

-- meals_per_day was an earlier, feeding-only name for this same column; fold any values
-- saved under it into times_per_day and drop it now that walking uses the column too.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'habits' and column_name = 'meals_per_day'
  ) then
    update public.habits set times_per_day = meals_per_day where meals_per_day is not null and times_per_day is null;
    alter table public.habits drop column meals_per_day;
  end if;
end $$;

-- reminder_time/notification_id (both singular, pre-existing columns) are replaced by
-- reminder_times/notification_ids (arrays) so a habit like "Feeding" with meals_per_day > 1
-- can carry one reminder per meal instead of a single time for the whole habit.
alter table public.habits
  add column if not exists reminder_times text[],
  add column if not exists notification_ids text[];

update public.habits
  set reminder_times = array[reminder_time]
  where reminder_time is not null and reminder_times is null;

update public.habits
  set notification_ids = array[notification_id]
  where notification_id is not null and notification_ids is null;
