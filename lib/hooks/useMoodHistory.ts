import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../supabase';
import { DogMood } from '../../types';
import { localDateDaysAgo } from '../dateUtils';

function dateStringDaysAgo(days: number): string {
  return localDateDaysAgo(days);
}

export function useMoodHistory(dogId: string | null, days: number) {
  const [historyByDate, setHistoryByDate] = useState<Map<string, DogMood['mood']>>(new Map());
  const [loading, setLoading] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!dogId || !isFocused) return;
    refetch();
  }, [dogId, isFocused, days]);

  async function refetch() {
    if (!dogId) { setHistoryByDate(new Map()); return; }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) { setHistoryByDate(new Map()); setLoading(false); return; }

    const { data } = await supabase
      .from('dog_moods')
      .select('logged_date, mood')
      .eq('dog_id', dogId)
      .eq('owner_id', user.id)
      .gte('logged_date', dateStringDaysAgo(days));

    const next = new Map<string, DogMood['mood']>();
    (data ?? []).forEach(row => next.set(row.logged_date, row.mood));
    setHistoryByDate(next);
    setLoading(false);
  }

  return { historyByDate, loading, refetch };
}
