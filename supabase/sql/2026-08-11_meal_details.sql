-- Phase 2 item 12, Option C: feeding stays a quick tick; this table holds an OPTIONAL,
-- additive detail record a user can attach to a day's feeding completion after ticking it.
-- One row per habit_completions row (one feeding habit, one day) -- not per individual
-- occurrence, since habit_completions itself is already one row per (habit_id, owner_id,
-- completed_date) regardless of times_per_day.
--
-- Verify against the live schema before running (habit_completions.id type/PK, dogs.id,
-- auth.users.id) -- derived here from supabase/sql/2026-07-21_habit_types.sql and
-- 2026-07-22_habit_completion_occurrences.sql, not queried live.

create table if not exists public.meal_details (
  id uuid primary key default gen_random_uuid(),
  completion_id uuid not null references public.habit_completions(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  food_type text not null check (food_type in ('wet', 'dry', 'mixed', 'raw')),
  brand text,
  amount_grams integer,
  notes text,
  logged_at timestamptz not null default now()
);

-- One optional detail per completion -- lets the client check "does a detail already
-- exist for this completion" with a simple lookup instead of guarding against duplicates.
create unique index if not exists meal_details_completion_id_unique
  on public.meal_details (completion_id);

create index if not exists meal_details_dog_id_idx on public.meal_details (dog_id);

alter table public.meal_details enable row level security;

do $$
begin
  create policy meal_details_owner_all on public.meal_details
    for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
exception
  when duplicate_object then null;
end $$;
