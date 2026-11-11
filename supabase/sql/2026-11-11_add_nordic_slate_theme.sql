-- Widens the dogs.theme_family CHECK constraint to include 'nordic_slate' as the new default theme.

alter table public.dogs
  drop constraint if exists dogs_theme_family_check;

alter table public.dogs
  add constraint dogs_theme_family_check
  check (theme_family in (
    'nordic_slate', 'sage_clay', 'warm_honey', 'cool_ash', 'deep_cocoa',
    'cream_chalk', 'midnight', 'dusty_bloom', 'quiet_tide'
  ));

alter table public.dogs
  alter column theme_family set default 'nordic_slate';
