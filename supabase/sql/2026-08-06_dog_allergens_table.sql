-- Normalizes food sensitivities from the flat dogs.allergens text[] column into
-- their own table so each allergen has a stable id for Edit/Delete (Phase 2 item 5).
-- dogs.allergens is left in place but no longer written to by the app after this
-- change; existing rows are backfilled into dog_allergens below. Drop the old
-- column in a later cleanup migration once dog_allergens is confirmed working.
--
-- Verify the dogs table shape against the live Supabase schema before running.

create table if not exists public.dog_allergens (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  allergen text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists dog_allergens_dog_id_lower_allergen_key
  on public.dog_allergens (dog_id, lower(allergen));

alter table public.dog_allergens enable row level security;

do $$
begin
  create policy dog_allergens_owner_all on public.dog_allergens
    for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
exception
  when duplicate_object then null;
end $$;

-- Backfill existing dogs.allergens[] rows into the new table.
insert into public.dog_allergens (dog_id, owner_id, allergen)
select d.id, d.owner_id, trim(a)
from public.dogs d, unnest(d.allergens) as a
where d.allergens is not null
on conflict (dog_id, lower(allergen)) do nothing;
