import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../supabase';
import { Habit } from '../../types';
import { getHabitTarget } from './useHabits';

function dateStringDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

export function computeStreak(dates: Map<string, number>, target: number, todayStr: string): number {
  const isDone = (dateStr: string) => (dates.get(dateStr) ?? 0) >= target;

  let cursor = new Date(todayStr);
  if (!isDone(todayStr)) {
    cursor.setDate(cursor.getDate() - 1);
    if (!isDone(cursor.toISOString().split('T')[0])) return 0;
  }

  let streak = 0;
  while (isDone(cursor.toISOString().split('T')[0])) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function computeBestStreak(dates: Map<string, number>, target: number): number {
  const doneDates = Array.from(dates.entries())
    .filter(([, count]) => count >= target)
    .map(([dateStr]) => dateStr)
    .sort();

  let best = 0;
  let current = 0;
  let prevDate: Date | null = null;

  for (const dateStr of doneDates) {
    const d = new Date(dateStr);
    if (prevDate) {
      const dayDiff = Math.round((d.getTime() - prevDate.getTime()) / 86400000);
      current = dayDiff === 1 ? current + 1 : 1;
    } else {
      current = 1;
    }
    best = Math.max(best, current);
    prevDate = d;
  }
  return best;
}

function last7Dates(todayStr: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(todayStr);
  for (let i = 0; i < 7; i++) {
    dates.push(cursor.toISOString().split('T')[0]);
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates;
}

export function computeWeekRecap(
  habits: Habit[],
  historyByHabit: Map<string, Map<string, number>>,
  todayStr: string
): { done: number; possible: number } {
  const dates = last7Dates(todayStr);
  let done = 0;
  habits.forEach(h => {
    const target = getHabitTarget(h);
    const hist = historyByHabit.get(h.id) ?? new Map<string, number>();
    dates.forEach(d => {
      if ((hist.get(d) ?? 0) >= target) done += 1;
    });
  });
  return { done, possible: habits.length * dates.length };
}

export function useHabitHistory(dogId: string | null, habits: Habit[], days: number) {
  const [historyByHabit, setHistoryByHabit] = useState<Map<string, Map<string, number>>>(new Map());
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();

  const habitIds = habits.map(h => h.id).join(',');

  useEffect(() => {
    if (!dogId || !isFocused || habitIds.length === 0) return;
    refetch();
  }, [dogId, isFocused, habitIds, days]);

  async function refetch() {
    if (habitIds.length === 0) { setHistoryByHabit(new Map()); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setHistoryByHabit(new Map()); setLoading(false); return; }

    const sinceDate = dateStringDaysAgo(days);
    const { data } = await supabase
      .from('habit_completions')
      .select('habit_id, completed_date, occurrence_count')
      .eq('owner_id', user.id)
      .gte('completed_date', sinceDate)
      .in('habit_id', habitIds.split(','));

    const next = new Map<string, Map<string, number>>();
    (data ?? []).forEach(row => {
      if (!next.has(row.habit_id)) next.set(row.habit_id, new Map());
      next.get(row.habit_id)!.set(row.completed_date, row.occurrence_count);
    });
    setHistoryByHabit(next);
    setLoading(false);
  }

  return { historyByHabit, loading, refetch };
}
