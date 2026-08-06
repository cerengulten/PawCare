import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { DogMood } from '../../types';

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function useDogMood(dogId: string | null) {
  const [mood, setMood] = useState<DogMood | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!dogId) { setMood(null); return; }
    refetch();
  }, [dogId]);

  async function refetch() {
    if (!dogId) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMood(null); setLoading(false); return; }

    const { data } = await supabase
      .from('dog_moods')
      .select('*')
      .eq('dog_id', dogId)
      .eq('owner_id', user.id)
      .eq('logged_date', todayDateString())
      .maybeSingle();
    setMood(data ?? null);
    setLoading(false);
  }

  async function setTodayMood(nextMood: DogMood['mood']) {
    if (!dogId) return { error: new Error('No dog selected') };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('dog_moods')
      .upsert(
        { dog_id: dogId, owner_id: user.id, logged_date: todayDateString(), mood: nextMood },
        { onConflict: 'dog_id,owner_id,logged_date' }
      )
      .select()
      .single();
    if (!error && data) setMood(data);
    return { error };
  }

  return { mood, loading, setTodayMood, refetch };
}
