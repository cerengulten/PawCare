import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabase';
import { CycleRecord, CycleSymptom, CycleSpecies, CycleIntensity } from '../../types';
import { predictPhases, predictNextCycleStart, getCurrentPhase } from '../cycleLogic';

function toDateOnlyString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDateOnly(s: string): Date {
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, m - 1, day);
}

export function useCycleTracking(dogId: string | null) {
  const [cycles, setCycles] = useState<CycleRecord[]>([]);
  const [symptoms, setSymptoms] = useState<CycleSymptom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, [dogId]);

  async function fetchAll() {
    setLoading(true);
    if (!dogId) {
      setCycles([]);
      setSymptoms([]);
      setLoading(false);
      return;
    }
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) {
      setCycles([]);
      setSymptoms([]);
      setLoading(false);
      return;
    }
    const [cyclesRes, symptomsRes] = await Promise.all([
      supabase
        .from('cycle_records')
        .select('*')
        .eq('dog_id', dogId)
        .eq('owner_id', user.id)
        .order('start_date', { ascending: false }),
      supabase
        .from('cycle_symptoms')
        .select('*')
        .eq('dog_id', dogId)
        .eq('owner_id', user.id)
        .order('logged_date', { ascending: false }),
    ]);
    if (!cyclesRes.error && cyclesRes.data) setCycles(cyclesRes.data);
    if (!symptomsRes.error && symptomsRes.data) setSymptoms(symptomsRes.data);
    setLoading(false);
  }

  async function startCycle(species: CycleSpecies, startDate: Date, notes?: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user || !dogId) return { data: null, error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('cycle_records')
      .insert({
        dog_id: dogId,
        owner_id: user.id,
        species,
        start_date: toDateOnlyString(startDate),
        notes: notes ?? null,
      })
      .select()
      .single();
    if (!error && data) setCycles(prev => [data, ...prev]);
    return { data, error };
  }

  async function endCycle(cycleId: string, endDate: Date) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return { error: new Error('Not authenticated') };
    const endDateStr = toDateOnlyString(endDate);
    const { error } = await supabase
      .from('cycle_records')
      .update({ end_date: endDateStr })
      .eq('id', cycleId)
      .eq('owner_id', user.id);
    if (!error) {
      setCycles(prev => prev.map(c => (c.id === cycleId ? { ...c, end_date: endDateStr } : c)));
    }
    return { error };
  }

  async function logSymptoms(
    cycleId: string,
    dogIdParam: string,
    date: Date,
    symptomKeys: string[],
    intensity: CycleIntensity | null,
    notes?: string
  ) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return { data: null, error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('cycle_symptoms')
      .upsert(
        {
          cycle_id: cycleId,
          dog_id: dogIdParam,
          owner_id: user.id,
          logged_date: toDateOnlyString(date),
          symptoms: symptomKeys,
          intensity,
          notes: notes ?? null,
        },
        { onConflict: 'cycle_id,logged_date' }
      )
      .select()
      .single();
    if (!error && data) {
      setSymptoms(prev => {
        const existingIndex = prev.findIndex(s => s.id === data.id);
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = data;
          return next;
        }
        return [data, ...prev];
      });
    }
    return { data, error };
  }

  async function deleteSymptomLog(id: string) {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;
    if (!user) return { error: new Error('Not authenticated') };
    const { error } = await supabase
      .from('cycle_symptoms')
      .delete()
      .eq('id', id)
      .eq('owner_id', user.id);
    if (!error) setSymptoms(prev => prev.filter(s => s.id !== id));
    return { error };
  }

  const mostRecentCycle = cycles[0] ?? null;
  const activeCycle = mostRecentCycle && !mostRecentCycle.end_date ? mostRecentCycle : null;

  const currentPhase = useMemo(() => {
    if (!activeCycle) return null;
    return getCurrentPhase(parseDateOnly(activeCycle.start_date), new Date(), activeCycle.species);
  }, [activeCycle]);

  const predictedPhases = useMemo(() => {
    if (!activeCycle) return null;
    return predictPhases(parseDateOnly(activeCycle.start_date), activeCycle.species);
  }, [activeCycle]);

  const nextCycleDate = useMemo(() => {
    if (activeCycle || !mostRecentCycle) return null;
    const closedCycles = cycles.filter(c => c.end_date);
    if (closedCycles.length === 0) return null;
    return predictNextCycleStart(closedCycles, mostRecentCycle.species);
  }, [cycles, activeCycle, mostRecentCycle]);

  return {
    cycles,
    symptoms,
    loading,
    mostRecentCycle,
    activeCycle,
    startCycle,
    endCycle,
    logSymptoms,
    deleteSymptomLog,
    currentPhase,
    predictedPhases,
    nextCycleDate,
    refetch: fetchAll,
  };
}
