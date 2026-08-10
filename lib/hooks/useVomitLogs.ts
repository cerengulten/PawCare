import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { HealthLog, VomitLogDetails } from '../../types';

type LogPayload = {
  details: VomitLogDetails;
  notes: string | null;
};

export function useVomitLogs(dogId: string | null) {
  const [logs, setLogs] = useState<HealthLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [dogId]);

  async function fetchLogs() {
    if (!dogId) { setLogs([]); setLoading(false); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLogs([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('health_logs')
      .select('*')
      .eq('dog_id', dogId)
      .eq('owner_id', user.id)
      .eq('type', 'vomit')
      .order('logged_at', { ascending: false });
    if (!error && data) setLogs(data);
    setLoading(false);
  }

  async function addLog(payload: LogPayload) {
    if (!dogId) return { data: null, error: new Error('No dog selected') };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('health_logs')
      .insert({ dog_id: dogId, owner_id: user.id, type: 'vomit', ...payload })
      .select()
      .single();
    if (!error && data) {
      setLogs(prev => [data, ...prev].sort((a, b) => b.logged_at.localeCompare(a.logged_at)));
    }
    return { data, error };
  }

  async function updateLog(id: string, payload: LogPayload) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('health_logs')
      .update(payload)
      .eq('id', id)
      .eq('owner_id', user.id);
    if (!error) {
      setLogs(prev => prev.map(l => l.id === id ? { ...l, ...payload } : l));
    }
    return { error };
  }

  async function deleteLog(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('health_logs')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id);
    if (!error) setLogs(prev => prev.filter(l => l.id !== id));
    return { error };
  }

  return { logs, loading, addLog, updateLog, deleteLog, refetch: fetchLogs };
}
