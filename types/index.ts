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
  breed: string | null;
  birth_date: string | null;
  weight_kg: number | null;
  sex: 'male' | 'female' | null;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Habit = {
  id: string;
  dog_id: string;
  owner_id: string;
  title: string;
  category: 'feeding' | 'health' | 'grooming' | 'exercise' | 'other';
  frequency: 'daily' | 'weekly' | 'custom';
  reminder_time: string | null;
  is_active: boolean;
  created_at: string;
};

export type HabitCompletion = {
  id: string;
  habit_id: string;
  owner_id: string;
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
  created_at: string;
};