import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Dog } from '../../types';

// Takes the already-resolved user id from the caller (AuthedApp's `session.user.id`)
// instead of each mount independently calling supabase.auth.getSession(). getSession()
// isn't a pure local read — per supabase-js, it can refresh a near-expiry token over the
// network before resolving, which can race a cold app launch (flaky network right after
// process start) and leave dogs stuck empty for the rest of the session. Passing the id
// down removes that race entirely for the initial fetch; write calls below still read the
// session fresh since they're triggered by a user action well after mount, not a cold start.
export function useDogs(userId: string) {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDogs();
  }, [userId]);

  async function fetchDogs() {
    setLoading(true);
    const { data, error } = await supabase
      .from('dogs')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at');
    if (!error && data) setDogs(data);
    setLoading(false);
  }

  async function addDog(dog: Omit<Dog, 'id' | 'owner_id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('dogs')
      .insert({ ...dog, owner_id: userId })
      .select()
      .single();
    if (!error && data) setDogs(prev => [...prev, data]);
    return { data, error };
  }

  async function updateDog(id: string, updates: Partial<Omit<Dog, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>) {
    const { error } = await supabase
      .from('dogs')
      .update(updates)
      .eq('id', id)
      .eq('owner_id', userId);
    if (!error) setDogs(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    return { error };
  }

  async function deleteDog(id: string) {
    const { error } = await supabase
      .from('dogs')
      .delete()
      .eq('id', id)
      .eq('owner_id', userId);
    if (!error) setDogs(prev => prev.filter(d => d.id !== id));
    return { error };
  }

  return { dogs, loading, addDog, updateDog, deleteDog, refetch: fetchDogs };
}
