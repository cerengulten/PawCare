import { ThemeFamily } from '../lib/themes';

export type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  push_token: string | null;
  created_at: string;
};

export type Dog = {
  id: string;
  owner_id: string;
  name: string;
  species: string | null;
  breed: string | null;
  birth_date: string | null;
  weight_kg: number | null;
  sex: 'male' | 'female' | null;
  photo_url: string | null;
  notes: string | null;
  theme_family: ThemeFamily | null;
  created_at: string;
  updated_at: string;
};

export type Allergen = {
  id: string;
  dog_id: string;
  owner_id: string;
  allergen: string;
  created_at: string;
};

export type DogMood = {
  id: string;
  dog_id: string;
  owner_id: string;
  mood: 'sleepy' | 'off' | 'good' | 'great' | 'sick';
  logged_date: string;
  created_at: string;
};

export type HabitType =
  | 'feeding'
  | 'water'
  | 'walking'
  | 'medication'
  | 'vitamin'
  | 'custom'
  | 'dental';

export type Habit = {
  id: string;
  dog_id: string;
  owner_id: string;
  title: string;
  category: 'feeding' | 'walk' | 'medication' | 'grooming' | 'training' | 'vaccine' | 'other';
  frequency: 'daily' | 'weekly' | 'custom';
  reminder_times: string[] | null;
  is_active: boolean;
  created_at: string;
  habit_type: HabitType;
  times_per_day: number | null;
  portion_grams: number | null;
  food_brand: string | null;
  wet_dry_ratio: number | null;
  water_goal_ml: number | null;
  walk_duration_minutes: number | null;
  dosage_amount: number | null;
  dosage_unit: string | null;
  reminder_weekday: number | null;
  notification_ids: string[] | null;
};

export type HabitCompletion = {
  id: string;
  habit_id: string;
  owner_id: string;
  occurrence_count: number;
  completed_at: string;
  completed_date: string;
};

export type VaccineRecord = {
  id: string;
  dog_id: string;
  owner_id: string;
  vaccine_name: string;
  date_given: string | null;
  next_due_date: string;
  notes: string | null;
  reminder_enabled: boolean;
  notification_id: string | null;
  created_at: string;
};

export type PoopConsistency = 'solid' | 'soft' | 'liquid' | 'mucus';
export type PoopColor = 'brown' | 'yellow' | 'green' | 'black' | 'red';

export type PoopLogDetails = {
  consistency: PoopConsistency;
  color: PoopColor;
  frequency: number;
};

export type VomitSeverity = 'mild' | 'moderate' | 'severe';
export type VomitCause = 'food' | 'motion' | 'ate_too_fast' | 'hairball' | 'foreign_object' | 'unknown';

export type VomitLogDetails = {
  severity: VomitSeverity;
  possibleCause: VomitCause;
  frequency: number;
};

export type HealthLog = {
  id: string;
  dog_id: string;
  owner_id: string;
  type: 'poop' | 'vomit';
  details: PoopLogDetails | VomitLogDetails;
  notes: string | null;
  logged_at: string;
};

export type FoodType = 'wet' | 'dry' | 'mixed' | 'raw';

export type MealDetail = {
  id: string;
  completion_id: string;
  dog_id: string;
  owner_id: string;
  food_type: FoodType;
  wet_amount_grams: number | null;
  brand_wet: string | null;
  dry_amount_grams: number | null;
  brand_dry: string | null;
  raw_amount_grams: number | null;
  brand_raw: string | null;
  notes: string | null;
  logged_at: string;
};

export type WaterLog = {
  id: string;
  dog_id: string;
  owner_id: string;
  logged_at: string;
  amount_ml: number;
  notes: string | null;
  created_at: string;
};

export type VetResult = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  address: string | null;
  phone: string | null;
  openingHours: string | null;
  distanceKm: number;
};