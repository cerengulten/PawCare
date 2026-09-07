-- Adds water_logs: a timestamped ledger of individual hydration log entries (amount_ml +
-- optional notes), additive alongside the existing habit_completions-based water tracking
-- (water_goal_ml / increment_habit_amount RPC / occurrence_count — unchanged, still drives
-- the daily ring + streaks). Every water log write (the existing +50/+100/+250 pill taps,
-- plus the new custom-amount sheet) inserts here in addition to the existing RPC call, so
-- this becomes the detailed audit trail while habit_completions stays the simple daily-cap
-- counter it already was.
--
-- Verify the dogs/auth.users FK shape against the live Supabase schema before running.

create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  logged_at timestamptz not null default now(),
  amount_ml integer not null check (amount_ml > 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists water_logs_dog_id_logged_at_idx
  on public.water_logs (dog_id, logged_at desc);

alter table public.water_logs enable row level security;

do $$
begin
  create policy water_logs_owner_all on public.water_logs
    for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
exception
  when duplicate_object then null;
end $$;
