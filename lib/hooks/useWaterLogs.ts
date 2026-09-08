import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { WaterLog } from '../../types';

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export function useWaterLogs(dogId: string | null, days: number) {
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [dogId, days]);

  async function fetchLogs() {
    if (!dogId) { setLogs([]); setLoading(false); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLogs([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('water_logs')
      .select('*')
      .eq('dog_id', dogId)
      .eq('owner_id', user.id)
      .gte('logged_at', isoDaysAgo(days))
      .order('logged_at', { ascending: false });
    if (!error && data) setLogs(data);
    setLoading(false);
  }

  return { logs, loading, refetch: fetchLogs };
}
