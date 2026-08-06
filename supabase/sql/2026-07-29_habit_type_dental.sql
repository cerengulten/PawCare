-- Adds 'dental' (tooth brushing) as a first-class habit_type, alongside the existing
-- feeding/water/walking/medication/vitamin/custom presets. Maps to the existing 'grooming'
-- category value (see HABIT_TYPE_CATEGORY in HabitFormScreen.tsx) — no category migration needed.
alter table public.habits drop constraint if exists habits_habit_type_check;
alter table public.habits
  add constraint habits_habit_type_check
  check (habit_type in ('feeding', 'water', 'walking', 'medication', 'vitamin', 'custom', 'dental'));
