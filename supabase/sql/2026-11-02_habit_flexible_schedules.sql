-- Migration: Add flexible scheduling columns to habits table
ALTER TABLE habits
  ADD COLUMN IF NOT EXISTS schedule_type text DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS target_days_of_week integer[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS weekly_target_count integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS interval_days integer DEFAULT NULL;

COMMENT ON COLUMN habits.schedule_type IS 'daily | specific_days | weekly_target | interval_days | monthly';
COMMENT ON COLUMN habits.target_days_of_week IS 'Array of day-of-week numbers (1=Sun, 2=Mon, ..., 7=Sat) for specific_days schedule';
COMMENT ON COLUMN habits.weekly_target_count IS 'Target number of completions per week (Mon-Sun) for weekly_target schedule';
COMMENT ON COLUMN habits.interval_days IS 'Cadence in days (e.g. every N days) for interval_days schedule';
