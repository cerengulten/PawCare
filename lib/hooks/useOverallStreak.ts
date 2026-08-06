import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../supabase';
import { computeStreak } from './useHabitHistory';

function dateStringDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function useOverallStreak() {
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!isFocused) return;
    refetch();
  }, [isFocused]);

  async function refetch() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setStreak(0); setLoading(false); return; }

    const { data } = await supabase
      .from('habit_completions')
      .select('completed_date, occurrence_count')
      .eq('owner_id', user.id)
      .gte('completed_date', dateStringDaysAgo(90))
      .gt('occurrence_count', 0);

    const activeDates = new Map<string, number>();
    (data ?? []).forEach(row => activeDates.set(row.completed_date, 1));

    setStreak(computeStreak(activeDates, 1, todayDateString()));
    setLoading(false);
  }

  return { streak, loading };
}
