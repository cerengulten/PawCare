-- Adds a "species" field to the dogs table so a pet can be tagged as Dog/Cat/Rabbit/etc,
-- alongside the existing free-text "breed" column. Free text (no CHECK constraint) since
-- the picker UI allows a custom "Other" value the same way breed already does. No RLS
-- change needed since the existing dogs table policy is already owner-scoped.
--
-- Verify the dogs table shape against the live Supabase schema before running this.

alter table public.dogs
  add column if not exists species text;
