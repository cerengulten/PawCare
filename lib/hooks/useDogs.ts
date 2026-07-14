import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

export type Dog = {
  id: string;
  name: string;
  breed: string;
  birth_date: string;
  weight_kg: number;
  sex: 'male' | 'female';
  is_neutered: boolean;
  avatar_emoji: string;
};

export function useDogs() {
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDogs();
  }, []);

  async function fetchDogs() {
    const { data, error } = await supabase
      .from('dogs')
      .select('*')
      .order('created_at');
    if (!error && data) setDogs(data);
    setLoading(false);
  }

  async function addDog(dog: Omit<Dog, 'id'>) {
    const { data, error } = await supabase
      .from('dogs')
      .insert(dog)
      .select()
      .single();
    if (!error && data) setDogs(prev => [...prev, data]);
    return { data, error };
  }

  async function updateDog(id: string, updates: Partial<Dog>) {
    const { error } = await supabase.from('dogs').update(updates).eq('id', id);
    if (!error) setDogs(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    return { error };
  }

  return { dogs, loading, addDog, updateDog, refetch: fetchDogs };
}