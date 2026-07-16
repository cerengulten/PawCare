import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { VaccineRecord } from '../../types';

export function useVaccines(dogId: string | null) {
  const [vaccines, setVaccines] = useState<VaccineRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchVaccines();
  }, [dogId]);

  async function fetchVaccines() {
    if (!dogId) { setVaccines([]); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setVaccines([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('vaccine_records')
      .select('*')
      .eq('dog_id', dogId)
      .eq('owner_id', user.id)
      .order('next_due_date');
    if (!error && data) setVaccines(data);
    setLoading(false);
  }

  async function addVaccine(vaccine: Omit<VaccineRecord, 'id' | 'dog_id' | 'owner_id' | 'created_at'>) {
    if (!dogId) return { data: null, error: new Error('No dog selected') };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('vaccine_records')
      .insert({ ...vaccine, dog_id: dogId, owner_id: user.id })
      .select()
      .single();
    if (!error && data) setVaccines(prev => [...prev, data].sort((a, b) => a.next_due_date.localeCompare(b.next_due_date)));
    return { data, error };
  }

  async function updateVaccine(id: string, updates: Partial<Omit<VaccineRecord, 'id' | 'dog_id' | 'owner_id' | 'created_at'>>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('vaccine_records')
      .update(updates)
      .eq('id', id)
      .eq('owner_id', user.id);
    if (!error) {
      setVaccines(prev =>
        prev.map(v => v.id === id ? { ...v, ...updates } : v)
          .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
      );
    }
    return { error };
  }

  async function deleteVaccine(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('vaccine_records')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id);
    if (!error) setVaccines(prev => prev.filter(v => v.id !== id));
    return { error };
  }

  const overdue = vaccines.filter(v => v.next_due_date < today);
  const upcoming = vaccines.filter(v => v.next_due_date >= today);

  return { vaccines, loading, upcoming, overdue, addVaccine, updateVaccine, deleteVaccine, refetch: fetchVaccines };
}
