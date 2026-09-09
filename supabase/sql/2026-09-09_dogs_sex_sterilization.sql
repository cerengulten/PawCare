-- dogs.sex already existed (text, nullable, CHECK IN ('male','female')) — this migration
-- relaxes it to allow 'unknown', backfills existing NULLs, and makes it NOT NULL with a
-- default. Also adds is_sterilized.

ALTER TABLE dogs DROP CONSTRAINT dogs_sex_check;

UPDATE dogs SET sex = 'unknown' WHERE sex IS NULL;

ALTER TABLE dogs
  ALTER COLUMN sex SET DEFAULT 'unknown',
  ALTER COLUMN sex SET NOT NULL;

ALTER TABLE dogs ADD CONSTRAINT dogs_sex_check
  CHECK (sex IN ('male', 'female', 'unknown'));

ALTER TABLE dogs
  ADD COLUMN IF NOT EXISTS is_sterilized boolean NOT NULL DEFAULT false;
