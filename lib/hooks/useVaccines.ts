import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { VaccineRecord } from '../../types';
import { scheduleVaccineReminder, cancelVaccineReminder } from '../notifications';

function parseDateOnly(s: string): Date {
  const [y, m, day] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, day);
}

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

  async function addVaccine(vaccine: Omit<VaccineRecord, 'id' | 'dog_id' | 'owner_id' | 'created_at' | 'notification_id'>) {
    if (!dogId) return { data: null, error: new Error('No dog selected') };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('Not authenticated') };
    const { data, error } = await supabase
      .from('vaccine_records')
      .insert({ ...vaccine, dog_id: dogId, owner_id: user.id })
      .select()
      .single();
    if (!error && data) {
      if (data.reminder_enabled) {
        const notificationId = await scheduleVaccineReminder(data.vaccine_name, parseDateOnly(data.next_due_date));
        if (notificationId) {
          await supabase.from('vaccine_records').update({ notification_id: notificationId }).eq('id', data.id);
          data.notification_id = notificationId;
        }
      }
      setVaccines(prev => [...prev, data].sort((a, b) => a.next_due_date.localeCompare(b.next_due_date)));
    }
    return { data, error };
  }

  async function updateVaccine(id: string, updates: Partial<Omit<VaccineRecord, 'id' | 'dog_id' | 'owner_id' | 'created_at' | 'notification_id'>>) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };

    const existing = vaccines.find(v => v.id === id);
    const reminderAffected = 'reminder_enabled' in updates || 'next_due_date' in updates || 'vaccine_name' in updates;
    let notificationId = existing?.notification_id ?? null;
    let finalUpdates: Partial<VaccineRecord> = updates;

    if (reminderAffected) {
      await cancelVaccineReminder(notificationId);
      const nextEnabled = updates.reminder_enabled ?? existing?.reminder_enabled ?? false;
      const nextDueDate = updates.next_due_date ?? existing?.next_due_date;
      const nextName = updates.vaccine_name ?? existing?.vaccine_name;
      notificationId = nextEnabled && nextDueDate && nextName
        ? await scheduleVaccineReminder(nextName, parseDateOnly(nextDueDate))
        : null;
      finalUpdates = { ...updates, notification_id: notificationId };
    }

    const { error } = await supabase
      .from('vaccine_records')
      .update(finalUpdates)
      .eq('id', id)
      .eq('owner_id', user.id);
    if (!error) {
      setVaccines(prev =>
        prev.map(v => v.id === id ? { ...v, ...finalUpdates } : v)
          .sort((a, b) => a.next_due_date.localeCompare(b.next_due_date))
      );
    }
    return { error };
  }

  async function deleteVaccine(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('Not authenticated') };
    const existing = vaccines.find(v => v.id === id);
    if (existing?.notification_id) await cancelVaccineReminder(existing.notification_id);
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
