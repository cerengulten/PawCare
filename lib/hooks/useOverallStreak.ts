import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../supabase';
import { computeStreak } from './useHabitHistory';
import { localDateDaysAgo, toLocalDateString } from '../dateUtils';

function dateStringDaysAgo(days: number): string {
  return localDateDaysAgo(days);
}

function todayDateString(): string {
  return toLocalDateString();
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
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
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
