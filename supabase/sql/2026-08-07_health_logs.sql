-- New table for the dog health log feature (Phase 2 item 8: poop tracker).
-- `type` allows 'vomit' via the check constraint so a later vomit tracker (item 9,
-- not implemented yet) can reuse this table without a schema change; the app only
-- ever writes 'poop' rows for now. `details` is jsonb to keep the table shape stable
-- across future log types with different field sets — for 'poop' it currently stores
-- { consistency: 'solid'|'soft'|'liquid'|'mucus', color: 'brown'|'yellow'|'green'|'black'|'red', frequency: number }.
--
-- Verify this table name/shape against the live Supabase schema before running —
-- confirmed absent as of 2026-08-07 (grepped all prior migrations, no match).

create table if not exists public.health_logs (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('poop', 'vomit')),
  details jsonb not null default '{}'::jsonb,
  notes text,
  logged_at timestamptz not null default now()
);

create index if not exists health_logs_dog_id_type_logged_at_idx
  on public.health_logs (dog_id, type, logged_at desc);

alter table public.health_logs enable row level security;

do $$
begin
  create policy health_logs_owner_all on public.health_logs
    for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
exception
  when duplicate_object then null;
end $$;
