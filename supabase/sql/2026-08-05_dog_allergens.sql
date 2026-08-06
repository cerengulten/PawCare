-- Adds food-sensitivity/allergen data to dogs (sage-green redesign) so the Pets list
-- and Pet Profile screens can show real allergen chips instead of placeholder UI.
-- Plain nullable text array, no RLS change needed since the existing dogs table
-- policy is already owner-scoped.
--
-- Verify the dogs table shape against the live Supabase schema before running.

alter table public.dogs
  add column if not exists allergens text[];
