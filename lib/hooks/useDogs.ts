import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Dog } from '../../types';

export function useDogs() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDogs();
  }, []);

  async function fetchDogs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setDogs([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('dogs')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at');
    if (!error && data) setDogs(data);
    setLoading(false);
  }

  async function addDog(dog: Omit<Dog, 'id' | 'owner_id' | 'created_at' | 'updated_at'>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('dogs')
      .insert({ ...dog, owner_id: user.id })
      .select()
      .single();
    if (!error && data) setDogs(prev => [...prev, data]);
    return { data, error };
  }

  async function updateDog(id: string, updates: Partial<Omit<Dog, 'id' | 'owner_id' | 'created_at' | 'updated_at'>>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('dogs')
      .update(updates)
      .eq('id', id)
      .eq('owner_id', user.id);
    if (!error) setDogs(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    return { error };
  }

  async function deleteDog(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('dogs')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id);
    if (!error) setDogs(prev => prev.filter(d => d.id !== id));
    return { error };
  }

  return { dogs, loading, addDog, updateDog, deleteDog, refetch: fetchDogs };
}