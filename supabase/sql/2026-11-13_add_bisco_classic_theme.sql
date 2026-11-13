-- Widens the dogs.theme_family CHECK constraint to include 'bisco_classic'.

alter table public.dogs
  drop constraint if exists dogs_theme_family_check;

alter table public.dogs
  add constraint dogs_theme_family_check
  check (theme_family in (
    'nordic_slate', 'bisco_classic', 'sage_clay', 'warm_honey', 'cool_ash',
    'deep_cocoa', 'cream_chalk', 'midnight', 'dusty_bloom', 'quiet_tide'
  ));
