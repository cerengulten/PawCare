-- Follow-up to 2026-08-12_meal_details_split_amounts.sql -- run ONLY after confirming the
-- backfill in that migration looks correct against live data (spot-check a few 'wet'/'dry'/
-- 'mixed'/'raw' rows: wet_amount_grams/dry_amount_grams/raw_amount_grams and
-- brand_wet/brand_dry/brand_raw should all match what the old amount_grams/brand columns
-- held). Once confirmed, the old single-value columns are redundant and safe to drop.

alter table public.meal_details
  drop column if exists amount_grams,
  drop column if exists brand;
