import { useEffect, useState } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { supabase } from '../supabase';
import { VaccineRecord } from '../../types';
import { checkAndCreateVaccineAlert } from '../notificationService';
import { daysAway } from '../vaccineDisplay';
import { toLocalDateString } from '../dateUtils';

export type VaccineWithDog = VaccineRecord & { dogName: string };

export function useAllVaccines() {
  const [vaccines, setVaccines] = useState<VaccineWithDog[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();

  const today = toLocalDateString();

  useEffect(() => {
    if (!isFocused) return;
    refetch();
  }, [isFocused]);

  async function refetch() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
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

    // Fire-and-forget: one check per pet that has a vaccine due within the alert window,
    // not per vaccine row — checkAndCreateVaccineAlert re-queries that pet's vaccines
    // itself and dedupes on the soonest one.
    const petsDueSoon = new Set((vaccineRows ?? []).filter(v => daysAway(v.next_due_date) <= 7 && daysAway(v.next_due_date) >= 0).map(v => v.dog_id));
    petsDueSoon.forEach(dogId => checkAndCreateVaccineAlert(dogId, user.id));
  }

  const overdue = vaccines.filter(v => v.next_due_date < today);
  const upcoming = vaccines.filter(v => v.next_due_date >= today);

  return { vaccines, loading, upcoming, overdue, refetch };
}
