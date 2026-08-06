import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../supabase';
import { VaccineRecord } from '../../types';

export type VaccineWithDog = VaccineRecord & { dogName: string };

export function useAllVaccines() {
  const [vaccines, setVaccines] = useState<VaccineWithDog[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!isFocused) return;
    refetch();
  }, [isFocused]);

  async function refetch() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setVaccines([]); setLoading(false); return; }

    const [{ data: dogRows }, { data: vaccineRows }] = await Promise.all([
      supabase.from('dogs').select('id, name').eq('owner_id', user.id),
      supabase.from('vaccine_records').select('*').eq('owner_id', user.id).order('next_due_date'),
    ]);

    const dogNames = new Map((dogRows ?? []).map(d => [d.id, d.name as string]));
    const withNames: VaccineWithDog[] = (vaccineRows ?? []).map(v => ({
      ...v,
      dogName: dogNames.get(v.dog_id) ?? '',
    }));

    setVaccines(withNames);
    setLoading(false);
  }

  const overdue = vaccines.filter(v => v.next_due_date < today);
  const upcoming = vaccines.filter(v => v.next_due_date >= today);

  return { vaccines, loading, upcoming, overdue, refetch };
}
