-- New table for the Today tab's per-dog daily mood selector (sage-green redesign).
-- One mood value per dog per calendar day, upserted directly from the client (plain
-- upsert on the unique key below is safe — unlike habit_completions this isn't a
-- racy increment, so no RPC is needed). Mood values match the 5 options in the
-- mockup's mood-grid exactly: sleepy / off / good / great / sick.
--
-- Verify this table name/shape against the live Supabase schema before running if
-- anything here looks off compared to the dashboard.

create table if not exists public.dog_moods (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  mood text not null check (mood in ('sleepy', 'off', 'good', 'great', 'sick')),
  logged_date date not null default current_date,
  created_at timestamptz not null default now()
);

create unique index if not exists dog_moods_unique on public.dog_moods (dog_id, owner_id, logged_date);

alter table public.dog_moods enable row level security;

do $$
begin
  create policy dog_moods_owner_all on public.dog_moods
    for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
exception
  when duplicate_object then null;
end $$;
