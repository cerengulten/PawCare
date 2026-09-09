-- Estrus/heat cycle tracking (Task 2). dog_id (not pet_id) and the idempotent
-- do-block RLS policy style match this project's existing tables, e.g. health_logs.
-- Confirmed absent on the live schema as of 2026-09-09 (grepped information_schema.tables
-- for %cycle%/%heat%/%estrus%, no matches).

create table if not exists public.cycle_records (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  species text not null check (species in ('dog', 'cat', 'rabbit', 'guinea_pig')),
  start_date date not null,
  end_date date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists cycle_records_dog_id_start_date_idx
  on public.cycle_records (dog_id, start_date desc);

-- At most one open (not-yet-ended) cycle per dog.
create unique index if not exists cycle_records_one_open_per_dog
  on public.cycle_records (dog_id) where (end_date is null);

alter table public.cycle_records enable row level security;

do $$
begin
  create policy cycle_records_owner_all on public.cycle_records
    for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
exception
  when duplicate_object then null;
end $$;

create table if not exists public.cycle_symptoms (
  id uuid primary key default gen_random_uuid(),
  cycle_id uuid not null references public.cycle_records(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  logged_date date not null,
  symptoms text[] not null default '{}',
  intensity text check (intensity in ('mild', 'moderate', 'severe')),
  notes text,
  created_at timestamptz not null default now()
);

-- One symptom-log row per cycle per day (upsert target for logSymptoms).
create unique index if not exists cycle_symptoms_cycle_id_logged_date_idx
  on public.cycle_symptoms (cycle_id, logged_date);

alter table public.cycle_symptoms enable row level security;

do $$
begin
  create policy cycle_symptoms_owner_all on public.cycle_symptoms
    for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
exception
  when duplicate_object then null;
end $$;
