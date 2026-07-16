import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Habit } from '../../types';

export function useHabits(dogId: string | null) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedToday, setCompletedToday] = useState<Set<string>>(new Set());

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!dogId) return;
    (async () => {
      const fetchedHabits = await fetchHabits();
      await fetchCompletions(fetchedHabits.map(h => h.id));
    })();
  }, [dogId]);

  async function fetchHabits(): Promise<Habit[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setHabits([]); return []; }
    const { data, error } = await supabase
      .from('habits')
      .select('*')
      .eq('dog_id', dogId)
      .eq('owner_id', user.id)
      .eq('is_active', true);
    if (!error && data) { setHabits(data); return data; }
    return [];
  }

  async function fetchCompletions(habitIds: string[]) {
    if (habitIds.length === 0) { setCompletedToday(new Set()); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCompletedToday(new Set()); return; }
    const { data } = await supabase
      .from('habit_completions')
      .select('habit_id')
      .eq('owner_id', user.id)
      .eq('completed_date', today)
      .in('habit_id', habitIds);
    if (data) setCompletedToday(new Set(data.map(r => r.habit_id)));
  }

  async function toggleCompletion(habitId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const isDone = completedToday.has(habitId);
    if (isDone) {
      await supabase
        .from('habit_completions')
        .delete()
        .eq('habit_id', habitId)
        .eq('owner_id', user.id)
        .eq('completed_date', today);
      setCompletedToday(prev => { const s = new Set(prev); s.delete(habitId); return s; });
    } else {
      await supabase
        .from('habit_completions')
        .upsert({ habit_id: habitId, owner_id: user.id, completed_date: today });
      setCompletedToday(prev => new Set([...prev, habitId]));
    }
  }

  async function addHabit(habit: Omit<Habit, 'id' | 'dog_id' | 'owner_id' | 'created_at'>) {
    if (!dogId) return { data: null, error: new Error('No dog selected') };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('habits')
      .insert({ ...habit, dog_id: dogId, owner_id: user.id })
      .select()
      .single();
    if (!error && data) setHabits(prev => [...prev, data]);
    return { data, error };
  }

  async function updateHabit(id: string, updates: Partial<Omit<Habit, 'id' | 'dog_id' | 'owner_id' | 'created_at'>>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('habits')
      .update(updates)
      .eq('id', id)
      .eq('owner_id', user.id);
    if (!error) setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));
    return { error };
  }

  async function deleteHabit(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('habits')
      .update({ is_active: false })
      .eq('id', id)
      .eq('owner_id', user.id);
    if (!error) setHabits(prev => prev.filter(h => h.id !== id));
    return { error };
  }

  const completionRate = habits.length > 0
    ? Math.round((completedToday.size / habits.length) * 100)
    : 0;

  return { habits, completedToday, toggleCompletion, completionRate, addHabit, updateHabit, deleteHabit };
}
