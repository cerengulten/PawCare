-- Phase 2 item 12, Option C follow-up: the original single food_type + amount_grams + brand
-- shape doesn't support mixed meals (wet portion and dry portion need separate
-- amounts/brands). This migration adds per-type columns and backfills from the existing
-- single-value columns. amount_grams/brand are kept for now (dropped in a follow-up
-- migration, 2026-08-13_meal_details_drop_old_amount_brand.sql, only after this backfill is
-- confirmed correct against live data).
--
-- Verify against the live schema before running -- derived here from
-- 2026-08-11_meal_details.sql (the table this alters), not queried live.
--
-- 'raw' meals get their own raw_amount_grams/brand_raw pair rather than being folded into
-- wet_* or dry_* -- raw is a distinct food_type from wet/dry/mixed, not a variant of either.

alter table public.meal_details
  add column if not exists wet_amount_grams integer,
  add column if not exists dry_amount_grams integer,
  add column if not exists raw_amount_grams integer,
  add column if not exists brand_wet text,
  add column if not exists brand_dry text,
  add column if not exists brand_raw text;

-- Backfill amount: split evenly for 'mixed' (rough split -- integer division rounds down,
-- user can correct the exact split later), direct copy for the single-type rows.
update public.meal_details
set wet_amount_grams = amount_grams
where food_type = 'wet' and amount_grams is not null;

update public.meal_details
set dry_amount_grams = amount_grams
where food_type = 'dry' and amount_grams is not null;

update public.meal_details
set raw_amount_grams = amount_grams
where food_type = 'raw' and amount_grams is not null;

update public.meal_details
set wet_amount_grams = amount_grams / 2,
    dry_amount_grams = amount_grams / 2
where food_type = 'mixed' and amount_grams is not null;

-- Backfill brand: direct copy for the single-type rows. For 'mixed', the old single `brand`
-- column was ambiguous (one brand text for a meal that could span two products) -- copied
-- into both brand_wet and brand_dry as a starting guess since a single-brand mixed product
-- is the common case; user can split it manually later if the two portions were actually
-- different brands.
update public.meal_details
set brand_wet = brand
where food_type = 'wet' and brand is not null;

update public.meal_details
set brand_dry = brand
where food_type = 'dry' and brand is not null;

update public.meal_details
set brand_raw = brand
where food_type = 'raw' and brand is not null;

update public.meal_details
set brand_wet = brand,
    brand_dry = brand
where food_type = 'mixed' and brand is not null;
