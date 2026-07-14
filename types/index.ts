export type Dog = {
  id: string;
  user_id: string;
  name: string;
  breed: string | null;
  birth_date: string | null;
  weight_kg: number | null;
  sex: 'male' | 'female' | null;
  is_neutered: boolean;
  avatar_emoji: string;
  created_at: string;
};

export type Habit = {
  id: string;
  dog_id: string;
  name: string;
  category: 'feeding' | 'health' | 'grooming' | 'exercise' | 'other';
  frequency: 'daily' | 'weekly' | 'custom';
  scheduled_time: string | null;
  notes: string | null;
  is_active: boolean;
};

export type HabitCompletion = {
  id: string;
  habit_id: string;
  completed_at: string;
  date: string;
};