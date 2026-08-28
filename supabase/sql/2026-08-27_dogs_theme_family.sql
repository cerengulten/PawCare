-- Adds a per-dog visual theme selection ("theme_family") so the app can render with a
-- pet-specific palette (see lib/themes.ts) instead of one fixed app-wide theme.
-- Plain nullable-with-default text column + CHECK constraint restricting to the 8 known
-- palette names. No RLS change needed since the existing dogs table policy is already
-- owner-scoped.
--
-- Verify the dogs table shape against the live Supabase schema before running this.

alter table public.dogs
  add column if not exists theme_family text default 'sage_clay';

alter table public.dogs
  add constraint dogs_theme_family_check
  check (theme_family in (
    'sage_clay', 'warm_honey', 'cool_ash', 'deep_cocoa',
    'cream_chalk', 'midnight', 'dusty_bloom', 'quiet_tide'
  ));
