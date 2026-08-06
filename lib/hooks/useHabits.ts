import { useEffect, useMemo, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../supabase';
import { Habit } from '../../types';
import { scheduleHabitReminder, cancelHabitReminder } from '../notifications';

export function getHabitTarget(habit: Habit): number {
  if (habit.habit_type === 'water') return habit.water_goal_ml ?? 0;
  return habit.times_per_day != null && habit.times_per_day > 0 ? habit.times_per_day : 1;
}

async function scheduleAllReminders(
  title: string,
  times: string[] | null,
  frequency: Habit['frequency'],
  weekday: number | null
): Promise<string[] | null> {
  if (!times || times.length === 0) return null;
  const ids = await Promise.all(times.map(t => scheduleHabitReminder(title, t, frequency, weekday)));
  const validIds = ids.filter((id): id is string => !!id);
  return validIds.length > 0 ? validIds : null;
}

async function cancelAllReminders(ids: string[] | null): Promise<void> {
  if (!ids || ids.length === 0) return;
  await Promise.all(ids.map(id => cancelHabitReminder(id)));
}

export function useHabits(dogId: string | null) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedCounts, setCompletedCounts] = useState<Map<string, number>>(new Map());
  const isFocused = useIsFocused();

  const completedToday = useMemo(() => {
    const set = new Set<string>();
    habits.forEach(h => {
      const count = completedCounts.get(h.id) ?? 0;
      if (count >= getHabitTarget(h)) set.add(h.id);
    });
    return set;
  }, [habits, completedCounts]);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!dogId || !isFocused) return;
    (async () => {
      const fetchedHabits = await fetchHabits();
      await fetchCompletions(fetchedHabits.map(h => h.id));
    })();
  }, [dogId, isFocused]);

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
    if (habitIds.length === 0) { setCompletedCounts(new Map()); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setCompletedCounts(new Map()); return; }
    const { data } = await supabase
      .from('habit_completions')
      .select('habit_id, occurrence_count')
      .eq('owner_id', user.id)
      .eq('completed_date', today)
      .in('habit_id', habitIds);
    if (data) setCompletedCounts(new Map(data.map(r => [r.habit_id, r.occurrence_count])));
  }

  async function toggleCompletion(habitId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const habit = habits.find(h => h.id === habitId);
    const isDone = completedToday.has(habitId);
    if (isDone) {
      await supabase
        .from('habit_completions')
        .delete()
        .eq('habit_id', habitId)
        .eq('owner_id', user.id)
        .eq('completed_date', today);
      setCompletedCounts(prev => { const m = new Map(prev); m.delete(habitId); return m; });
    } else {
      const target = habit ? getHabitTarget(habit) : 1;
      await supabase
        .from('habit_completions')
        .upsert({ habit_id: habitId, owner_id: user.id, completed_date: today, occurrence_count: target });
      setCompletedCounts(prev => new Map(prev).set(habitId, target));
    }
  }

  async function logOccurrence(habitId: string) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    const { data } = await supabase.rpc('increment_habit_completion', {
      p_habit_id: habitId,
      p_completed_date: today,
      p_max: getHabitTarget(habit),
    });
    const newCount = (data as number | null) ?? 0;
    setCompletedCounts(prev => new Map(prev).set(habitId, newCount));
  }

  async function undoOccurrence(habitId: string) {
    const { data } = await supabase.rpc('decrement_habit_completion', {
      p_habit_id: habitId,
      p_completed_date: today,
    });
    const newCount = (data as number | null) ?? 0;
    setCompletedCounts(prev => {
      const m = new Map(prev);
      if (newCount <= 0) m.delete(habitId); else m.set(habitId, newCount);
      return m;
    });
  }

  async function logWaterAmount(habitId: string, amountMl: number) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    const { data } = await supabase.rpc('increment_habit_amount', {
      p_habit_id: habitId,
      p_completed_date: today,
      p_amount: amountMl,
      p_max: getHabitTarget(habit),
    });
    const newCount = (data as number | null) ?? 0;
    setCompletedCounts(prev => new Map(prev).set(habitId, newCount));
  }

  async function resetWaterToday(habitId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('habit_completions')
      .delete()
      .eq('habit_id', habitId)
      .eq('owner_id', user.id)
      .eq('completed_date', today);
    setCompletedCounts(prev => { const m = new Map(prev); m.delete(habitId); return m; });
  }

  async function logHabitToday(habitId: string) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    if (getHabitTarget(habit) > 1) await logOccurrence(habitId);
    else await toggleCompletion(habitId);
  }

  async function undoHabitToday(habitId: string) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    if (getHabitTarget(habit) > 1) await undoOccurrence(habitId);
    else await toggleCompletion(habitId);
  }

  async function addHabit(habit: Omit<Habit, 'id' | 'dog_id' | 'owner_id' | 'created_at' | 'notification_ids'>) {
    if (!dogId) return { data: null, error: new Error('No dog selected') };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('habits')
      .insert({ ...habit, dog_id: dogId, owner_id: user.id })
      .select()
      .single();
    if (!error && data) {
      const notificationIds = await scheduleAllReminders(
        data.title,
        data.reminder_times,
        data.frequency,
        data.reminder_weekday
      );
      if (notificationIds) {
        await supabase.from('habits').update({ notification_ids: notificationIds }).eq('id', data.id);
        data.notification_ids = notificationIds;
      }
      setHabits(prev => [...prev, data]);
    }
    return { data, error };
  }

  async function updateHabit(id: string, updates: Partial<Omit<Habit, 'id' | 'dog_id' | 'owner_id' | 'created_at' | 'notification_ids'>>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const existing = habits.find(h => h.id === id);
    const reminderAffected =
      'reminder_times' in updates || 'frequency' in updates || 'title' in updates || 'reminder_weekday' in updates;
    let notificationIds = existing?.notification_ids ?? null;
    let finalUpdates: Partial<Habit> = updates;

    if (reminderAffected) {
      await cancelAllReminders(notificationIds);
      const nextReminderTimes = updates.reminder_times ?? existing?.reminder_times ?? null;
      const nextFrequency = updates.frequency ?? existing?.frequency ?? 'daily';
      const nextTitle = updates.title ?? existing?.title ?? '';
      const nextWeekday = updates.reminder_weekday ?? existing?.reminder_weekday ?? null;
      notificationIds = await scheduleAllReminders(nextTitle, nextReminderTimes, nextFrequency, nextWeekday);
      finalUpdates = { ...updates, notification_ids: notificationIds };
    }

    const { error } = await supabase
      .from('habits')
      .update(finalUpdates)
      .eq('id', id)
      .eq('owner_id', user.id);
    if (!error) setHabits(prev => prev.map(h => h.id === id ? { ...h, ...finalUpdates } : h));
    return { error };
  }

  async function deleteHabit(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };
    const existing = habits.find(h => h.id === id);
    await cancelAllReminders(existing?.notification_ids ?? null);
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

  return {
    habits,
    completedToday,
    completedCounts,
    toggleCompletion,
    logOccurrence,
    undoOccurrence,
    logHabitToday,
    undoHabitToday,
    logWaterAmount,
    resetWaterToday,
    completionRate,
    addHabit,
    updateHabit,
    deleteHabit,
  };
}
