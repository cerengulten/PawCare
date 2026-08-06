import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Allergen } from '../../types';

export function useAllergens(dogId: string) {
  const [allergens, setAllergens] = useState<Allergen[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllergens();
  }, [dogId]);

  async function fetchAllergens() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setAllergens([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('dog_allergens')
      .select('*')
      .eq('dog_id', dogId)
      .eq('owner_id', user.id)
      .order('created_at');
    if (!error && data) setAllergens(data);
    setLoading(false);
  }

  async function addAllergen(allergen: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('dog_allergens')
      .insert({ dog_id: dogId, owner_id: user.id, allergen })
      .select()
      .single();
    if (!error && data) setAllergens(prev => [...prev, data]);
    return { data, error };
  }

  async function updateAllergen(id: string, allergen: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('dog_allergens')
      .update({ allergen })
      .eq('id', id)
      .eq('owner_id', user.id);
    if (!error) setAllergens(prev => prev.map(a => a.id === id ? { ...a, allergen } : a));
    return { error };
  }

  async function deleteAllergen(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('dog_allergens')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id);
    if (!error) setAllergens(prev => prev.filter(a => a.id !== id));
    return { error };
  }

  return { allergens, loading, addAllergen, updateAllergen, deleteAllergen, refetch: fetchAllergens };
}
