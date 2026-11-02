import { useEffect, useMemo, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../supabase';
import { Habit } from '../../types';
import { scheduleHabitReminder, cancelHabitReminder } from '../notifications';
import { checkAndCreateWaterGoalNotif } from '../notificationService';
import {
  toLocalDateString,
  getStartOfWeekDateString,
  getEndOfWeekDateString,
  parseLocalDate,
} from '../dateUtils';

export function getHabitTarget(habit: Habit): number {
  if (habit.habit_type === 'water') return habit.water_goal_ml ?? 0;
  return habit.times_per_day != null && habit.times_per_day > 0 ? habit.times_per_day : 1;
}

export function isHabitDueToday(
  habit: Habit,
  latestDate?: string | null,
  weekCount: number = 0
): boolean {
  const scheduleType = habit.schedule_type ?? (habit.frequency === 'weekly' ? 'specific_days' : 'daily');

  if (scheduleType === 'daily') {
    return true;
  }

  if (scheduleType === 'specific_days') {
    const todayWeekday = new Date().getDay() + 1; // 1=Sun, 2=Mon...7=Sat
    const targetDays =
      habit.target_days_of_week && habit.target_days_of_week.length > 0
        ? habit.target_days_of_week
        : habit.reminder_weekday
        ? [habit.reminder_weekday]
        : [];
    return targetDays.includes(todayWeekday);
  }

  if (scheduleType === 'weekly_target') {
    const target = habit.weekly_target_count ?? 1;
    return weekCount < target;
  }

  if (scheduleType === 'interval_days') {
    if (!latestDate) return true;
    try {
      const lastDate = parseLocalDate(latestDate);
      const todayDate = parseLocalDate(toLocalDateString());
      const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      const interval = habit.interval_days ?? 14;
      return diffDays >= interval;
    } catch {
      return true;
    }
  }

  if (scheduleType === 'monthly') {
    if (!latestDate) return true;
    try {
      const lastDate = parseLocalDate(latestDate);
      const todayDate = parseLocalDate(toLocalDateString());
      return lastDate.getFullYear() !== todayDate.getFullYear() || lastDate.getMonth() !== todayDate.getMonth();
    } catch {
      return true;
    }
  }

  return true;
}

async function scheduleAllReminders(
  title: string,
  times: string[] | null,
  frequency: Habit['frequency'],
  weekday: number | null,
  scheduleType?: Habit['schedule_type'],
  targetDays?: number[] | null
): Promise<string[] | null> {
  if (!times || times.length === 0) return null;
  const ids: (string | null)[] = [];

  if (scheduleType === 'specific_days' && targetDays && targetDays.length > 0) {
    for (const day of targetDays) {
      for (const t of times) {
        const id = await scheduleHabitReminder(title, t, 'weekly', day);
        ids.push(id);
      }
    }
  } else if (scheduleType === 'weekly_target') {
    for (const t of times) {
      const id = await scheduleHabitReminder(title, t, 'weekly', weekday ?? 2);
      ids.push(id);
    }
  } else {
    for (const t of times) {
      const id = await scheduleHabitReminder(title, t, frequency, weekday);
      ids.push(id);
    }
  }
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
  const [completionIds, setCompletionIds] = useState<Map<string, string>>(new Map());
  const [weeklyCounts, setWeeklyCounts] = useState<Map<string, number>>(new Map());
  const [latestCompletions, setLatestCompletions] = useState<Map<string, string>>(new Map());
  const isFocused = useIsFocused();

  const completedToday = useMemo(() => {
    const set = new Set<string>();
    habits.forEach(h => {
      const count = completedCounts.get(h.id) ?? 0;
      if (count >= getHabitTarget(h)) set.add(h.id);
    });
    return set;
  }, [habits, completedCounts]);

  const today = toLocalDateString();

  useEffect(() => {
    if (!dogId || !isFocused) return;
    (async () => {
      const fetchedHabits = await fetchHabits();
      await fetchCompletions(fetchedHabits.map(h => h.id));
    })();
  }, [dogId, isFocused]);

  async function fetchHabits(): Promise<Habit[]> {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
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
    if (habitIds.length === 0) {
      setCompletedCounts(new Map());
      setCompletionIds(new Map());
      setWeeklyCounts(new Map());
      setLatestCompletions(new Map());
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) {
      setCompletedCounts(new Map());
      setCompletionIds(new Map());
      setWeeklyCounts(new Map());
      setLatestCompletions(new Map());
      return;
    }

    const startOfWeek = getStartOfWeekDateString();
    const endOfWeek = getEndOfWeekDateString();

    // 1. Fetch today's completions
    const { data: todayData } = await supabase
      .from('habit_completions')
      .select('id, habit_id, occurrence_count')
      .eq('owner_id', user.id)
      .eq('completed_date', today)
      .in('habit_id', habitIds);

    if (todayData) {
      setCompletedCounts(new Map(todayData.map(r => [r.habit_id, r.occurrence_count])));
      setCompletionIds(new Map(todayData.map(r => [r.habit_id, r.id])));
    }

    // 2. Fetch current week's completions
    const { data: weekData } = await supabase
      .from('habit_completions')
      .select('habit_id, occurrence_count, completed_date')
      .eq('owner_id', user.id)
      .gte('completed_date', startOfWeek)
      .lte('completed_date', endOfWeek)
      .in('habit_id', habitIds);

    if (weekData) {
      const wMap = new Map<string, number>();
      weekData.forEach(r => {
        const current = wMap.get(r.habit_id) ?? 0;
        wMap.set(r.habit_id, current + (r.occurrence_count ?? 1));
      });
      setWeeklyCounts(wMap);
    }

    // 3. Fetch latest completion date for interval / monthly habits
    const { data: latestData } = await supabase
      .from('habit_completions')
      .select('habit_id, completed_date')
      .eq('owner_id', user.id)
      .in('habit_id', habitIds)
      .order('completed_date', { ascending: false });

    if (latestData) {
      const lMap = new Map<string, string>();
      latestData.forEach(r => {
        if (!lMap.has(r.habit_id)) {
          lMap.set(r.habit_id, r.completed_date);
        }
      });
      setLatestCompletions(lMap);
    }
  }

  async function fetchCompletionId(habitId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return;
    const { data } = await supabase
      .from('habit_completions')
      .select('id')
      .eq('habit_id', habitId)
      .eq('owner_id', user.id)
      .eq('completed_date', today)
      .maybeSingle();
    if (data) setCompletionIds(prev => new Map(prev).set(habitId, data.id));
  }

  async function toggleCompletion(habitId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
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
      const prevTodayCount = completedCounts.get(habitId) ?? 1;
      setCompletedCounts(prev => { const m = new Map(prev); m.delete(habitId); return m; });
      setCompletionIds(prev => { const m = new Map(prev); m.delete(habitId); return m; });
      setWeeklyCounts(prev => {
        const m = new Map(prev);
        const cur = m.get(habitId) ?? 0;
        m.set(habitId, Math.max(0, cur - prevTodayCount));
        return m;
      });
    } else {
      const target = habit ? getHabitTarget(habit) : 1;
      await supabase
        .from('habit_completions')
        .upsert({ habit_id: habitId, owner_id: user.id, completed_date: today, occurrence_count: target });
      const prevTodayCount = completedCounts.get(habitId) ?? 0;
      const added = target - prevTodayCount;
      setCompletedCounts(prev => new Map(prev).set(habitId, target));
      setWeeklyCounts(prev => {
        const m = new Map(prev);
        const cur = m.get(habitId) ?? 0;
        m.set(habitId, cur + added);
        return m;
      });
      setLatestCompletions(prev => new Map(prev).set(habitId, today));
      await fetchCompletionId(habitId);
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
    setWeeklyCounts(prev => {
      const m = new Map(prev);
      const cur = m.get(habitId) ?? 0;
      m.set(habitId, cur + 1);
      return m;
    });
    setLatestCompletions(prev => new Map(prev).set(habitId, today));
    if (newCount > 0) await fetchCompletionId(habitId);
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
    setWeeklyCounts(prev => {
      const m = new Map(prev);
      const cur = m.get(habitId) ?? 0;
      m.set(habitId, Math.max(0, cur - 1));
      return m;
    });
    if (newCount <= 0) setCompletionIds(prev => { const m = new Map(prev); m.delete(habitId); return m; });
  }

  async function logWaterAmount(habitId: string, amountMl: number, notes?: string | null) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return;
    const { data } = await supabase.rpc('increment_habit_amount', {
      p_habit_id: habitId,
      p_completed_date: today,
      p_amount: amountMl,
      p_max: getHabitTarget(habit),
    });
    const newCount = (data as number | null) ?? 0;
    setCompletedCounts(prev => new Map(prev).set(habitId, newCount));
    setLatestCompletions(prev => new Map(prev).set(habitId, today));
    await supabase.from('water_logs').insert({
      dog_id: dogId,
      owner_id: user.id,
      amount_ml: amountMl,
      notes: notes ?? null,
    });
    if (dogId) checkAndCreateWaterGoalNotif(dogId, user.id);
  }

  async function resetWaterToday(habitId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return;
    await supabase
      .from('habit_completions')
      .delete()
      .eq('habit_id', habitId)
      .eq('owner_id', user.id)
      .eq('completed_date', today);
    setCompletedCounts(prev => { const m = new Map(prev); m.delete(habitId); return m; });
    setCompletionIds(prev => { const m = new Map(prev); m.delete(habitId); return m; });
  }

  async function resetHabitToday(habitId: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return;
    const prevTodayCount = completedCounts.get(habitId) ?? 0;
    await supabase
      .from('habit_completions')
      .delete()
      .eq('habit_id', habitId)
      .eq('owner_id', user.id)
      .eq('completed_date', today);
    setCompletedCounts(prev => { const m = new Map(prev); m.delete(habitId); return m; });
    setCompletionIds(prev => { const m = new Map(prev); m.delete(habitId); return m; });
    setWeeklyCounts(prev => {
      const m = new Map(prev);
      const cur = m.get(habitId) ?? 0;
      m.set(habitId, Math.max(0, cur - prevTodayCount));
      return m;
    });
  }

  async function logHabitToday(habitId: string) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;
    if (getHabitTarget(habit) > 1) await logOccurrence(habitId);
    else await toggleCompletion(habitId);
  }

  async function undoHabitToday(habitId: string) {
    await resetHabitToday(habitId);
  }

  async function addHabit(habit: Omit<Habit, 'id' | 'dog_id' | 'owner_id' | 'created_at' | 'notification_ids'>) {
    if (!dogId) return { data: null, error: new Error('No dog selected') };
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
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
        data.reminder_weekday,
        data.schedule_type,
        data.target_days_of_week
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
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return { error: new Error('Not authenticated') };

    const existing = habits.find(h => h.id === id);
    const reminderAffected =
      'reminder_times' in updates ||
      'frequency' in updates ||
      'title' in updates ||
      'reminder_weekday' in updates ||
      'schedule_type' in updates ||
      'target_days_of_week' in updates;
    let notificationIds = existing?.notification_ids ?? null;
    let finalUpdates: Partial<Habit> = updates;

    if (reminderAffected) {
      await cancelAllReminders(notificationIds);
      const nextReminderTimes = updates.reminder_times ?? existing?.reminder_times ?? null;
      const nextFrequency = updates.frequency ?? existing?.frequency ?? 'daily';
      const nextTitle = updates.title ?? existing?.title ?? '';
      const nextWeekday = updates.reminder_weekday ?? existing?.reminder_weekday ?? null;
      const nextScheduleType = updates.schedule_type ?? existing?.schedule_type;
      const nextTargetDays = updates.target_days_of_week ?? existing?.target_days_of_week ?? null;
      notificationIds = await scheduleAllReminders(
        nextTitle,
        nextReminderTimes,
        nextFrequency,
        nextWeekday,
        nextScheduleType,
        nextTargetDays
      );
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
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
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

  // Habits scheduled to be done today (excluding weekly_target which live in the weekly section)
  const dueHabitsToday = useMemo(() => {
    return habits.filter(h => {
      if (h.schedule_type === 'weekly_target') return false;
      const latest = latestCompletions.get(h.id);
      return isHabitDueToday(h, latest);
    });
  }, [habits, latestCompletions]);

  // Habits with a flexible weekly target (e.g. 2 times a week)
  const weeklyTargetHabits = useMemo(() => {
    return habits.filter(h => h.schedule_type === 'weekly_target');
  }, [habits]);

  const isWeeklyGoalReached = (habit: Habit): boolean => {
    const count = weeklyCounts.get(habit.id) ?? 0;
    const target = habit.weekly_target_count ?? 1;
    return count >= target;
  };

  const completionRate = useMemo(() => {
    const totalDue = dueHabitsToday.length;
    if (totalDue === 0) {
      if (weeklyTargetHabits.length > 0) {
        const reachedCount = weeklyTargetHabits.filter(h => isWeeklyGoalReached(h)).length;
        return Math.round((reachedCount / weeklyTargetHabits.length) * 100);
      }
      return 100;
    }
    const doneCount = dueHabitsToday.filter(h => completedToday.has(h.id)).length;
    return Math.round((doneCount / totalDue) * 100);
  }, [dueHabitsToday, completedToday, weeklyTargetHabits, weeklyCounts]);

  return {
    habits,
    dueHabitsToday,
    weeklyTargetHabits,
    weeklyCounts,
    completedToday,
    completedCounts,
    completionIds,
    isWeeklyGoalReached,
    toggleCompletion,
    logOccurrence,
    undoOccurrence,
    logHabitToday,
    undoHabitToday,
    resetHabitToday,
    logWaterAmount,
    resetWaterToday,
    completionRate,
    addHabit,
    updateHabit,
    deleteHabit,
  };
}
