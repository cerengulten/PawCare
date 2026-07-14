import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export type Habit = {
  id: string;
  dog_id: string;
  name: string;
  category: 'feeding' | 'health' | 'grooming' | 'exercise' | 'other';
  frequency: 'daily' | 'weekly' | 'custom';
  scheduled_time: string | null;
  notes: string | null;
};

export function useHabits(dogId: string | null) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!dogId) return;
    fetchHabits();
    fetchCompletions();
  }, [dogId]);

  async function fetchHabits() {
    const { data } = await supabase
      .from('habits')
      .select('*')
      .eq('dog_id', dogId)
      .eq('is_active', true);
    if (data) setHabits(data);
  }

  async function fetchCompletions() {
    const { data } = await supabase
      .from('habit_completions')
      .select('habit_id')
      .eq('date', today);
    if (data) setCompletedToday(new Set(data.map(r => r.habit_id)));
  }

  async function toggleCompletion(habitId: string) {
    const isDone = completedToday.has(habitId);
    if (isDone) {
      await supabase
        .from('habit_completions')
        .delete()
        .eq('habit_id', habitId)
        .eq('date', today);
      setCompletedToday(prev => { const s = new Set(prev); s.delete(habitId); return s; });
    } else {
      await supabase
        .from('habit_completions')
        .upsert({ habit_id: habitId, date: today });
      setCompletedToday(prev => new Set([...prev, habitId]));
    }
  }

  const completionRate = habits.length > 0
    ? Math.round((completedToday.size / habits.length) * 100)
    : 0;

  return { habits, completedToday, toggleCompletion, completionRate };
}