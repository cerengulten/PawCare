import { useCallback, useEffect, useState } from 'react';
import {
  VetAppointment,
  loadAppointments,
  getUpcomingAppointments,
  createVetAppointment,
  updateVetAppointment,
  deleteVetAppointment,
  completeVetAppointment,
} from '../vetAppointments';

export function useVetAppointments(petId?: string) {
  const [appointments, setAppointments] = useState<VetAppointment[]>([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState<VetAppointment[]>([]);
  const [nextAppointment, setNextAppointment] = useState<VetAppointment | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refresh = useCallback(async () => {
    try {
      const all = await loadAppointments();
      const upcoming = await getUpcomingAppointments(petId);
      setAppointments(petId ? all.filter((a) => a.petId === petId) : all);
      setUpcomingAppointments(upcoming);
      setNextAppointment(upcoming[0] ?? null);
    } catch (err) {
      console.warn('Failed to refresh vet appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [petId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addAppointment = useCallback(
    async (data: Omit<VetAppointment, 'id' | 'createdAt' | 'status'>) => {
      const created = await createVetAppointment(data);
      await refresh();
      return created;
    },
    [refresh]
  );

  const editAppointment = useCallback(
    async (appointment: VetAppointment) => {
      const updated = await updateVetAppointment(appointment);
      await refresh();
      return updated;
    },
    [refresh]
  );

  const removeAppointment = useCallback(
    async (id: string) => {
      await deleteVetAppointment(id);
      await refresh();
    },
    [refresh]
  );

  const markCompleted = useCallback(
    async (id: string) => {
      await completeVetAppointment(id);
      await refresh();
    },
    [refresh]
  );

  return {
    appointments,
    upcomingAppointments,
    nextAppointment,
    loading,
    refresh,
    addAppointment,
    editAppointment,
    removeAppointment,
    markCompleted,
  };
}
