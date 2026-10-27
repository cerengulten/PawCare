import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { requestNotificationPermissions } from './notifications';

export const VET_APPOINTMENTS_STORAGE_KEY = '@pawcare_vet_appointments';

export type VetAppointment = {
  id: string;
  petId: string;
  petName: string;
  title: string;
  clinicName: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  notes?: string | null;
  reminderEnabled: boolean;
  notificationId?: string | null;
  status: 'upcoming' | 'completed' | 'cancelled';
  createdAt: string;
};

/**
 * Calculates a Date object from YYYY-MM-DD and HH:mm strings.
 */
export function getAppointmentDateTime(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = (timeStr || '09:00').split(':').map(Number);
  return new Date(year, (month || 1) - 1, day || 1, hours || 9, minutes || 0, 0);
}

/**
 * Schedules a local OS notification for an upcoming vet appointment.
 * Default fires 2 hours before the appointment.
 */
export async function scheduleVetAppointmentReminder(
  appointment: Omit<VetAppointment, 'id' | 'createdAt' | 'status'>
): Promise<string | null> {
  if (!appointment.reminderEnabled) return null;
  const granted = await requestNotificationPermissions();
  if (!granted) return null;

  const apptDate = getAppointmentDateTime(appointment.appointmentDate, appointment.appointmentTime);
  // Trigger 2 hours before, or at appointment time if less than 2h away
  const triggerTime = apptDate.getTime() - 2 * 60 * 60 * 1000;
  if (triggerTime <= Date.now()) {
    // If the 2-hour-prior window has already passed, check if the appointment itself is in the future
    if (apptDate.getTime() <= Date.now()) return null;
  }

  const triggerDate = new Date(Math.max(triggerTime, Date.now() + 60 * 1000));

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: `🩺 Vet Visit Today: ${appointment.petName}`,
        body: `${appointment.title} at ${appointment.clinicName || 'Clinic'} (${appointment.appointmentTime})`,
        data: { petId: appointment.petId, type: 'vet_appointment' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  } catch (err) {
    console.warn('Failed to schedule vet appointment notification:', err);
    return null;
  }
}

export async function cancelAppointmentReminder(notificationId: string | null | undefined): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // Already cancelled or fired
  }
}

export async function loadAppointments(): Promise<VetAppointment[]> {
  try {
    const raw = await AsyncStorage.getItem(VET_APPOINTMENTS_STORAGE_KEY);
    if (!raw) return [];
    const list: VetAppointment[] = JSON.parse(raw);
    return list;
  } catch (err) {
    console.warn('Error reading vet appointments from storage:', err);
    return [];
  }
}

async function persistAppointments(list: VetAppointment[]): Promise<void> {
  await AsyncStorage.setItem(VET_APPOINTMENTS_STORAGE_KEY, JSON.stringify(list));
}

export async function getUpcomingAppointments(petId?: string): Promise<VetAppointment[]> {
  const all = await loadAppointments();
  const now = Date.now();
  return all
    .filter((a) => {
      if (a.status !== 'upcoming') return false;
      if (petId && a.petId !== petId) return false;
      const apptTime = getAppointmentDateTime(a.appointmentDate, a.appointmentTime).getTime();
      return apptTime >= now - 60 * 60 * 1000; // Keep visible for 1h past appointment
    })
    .sort((a, b) => {
      const timeA = getAppointmentDateTime(a.appointmentDate, a.appointmentTime).getTime();
      const timeB = getAppointmentDateTime(b.appointmentDate, b.appointmentTime).getTime();
      return timeA - timeB;
    });
}

export async function getNextUpcomingAppointment(petId?: string): Promise<VetAppointment | null> {
  const list = await getUpcomingAppointments(petId);
  return list[0] ?? null;
}

export async function createVetAppointment(
  data: Omit<VetAppointment, 'id' | 'createdAt' | 'status'>
): Promise<VetAppointment> {
  let notificationId: string | null = null;
  if (data.reminderEnabled) {
    notificationId = await scheduleVetAppointmentReminder(data);
  }

  const newAppt: VetAppointment = {
    ...data,
    id: `vet_appt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    status: 'upcoming',
    notificationId,
    createdAt: new Date().toISOString(),
  };

  const current = await loadAppointments();
  const updated = [...current, newAppt];
  await persistAppointments(updated);
  return newAppt;
}

export async function updateVetAppointment(
  appointment: VetAppointment
): Promise<VetAppointment> {
  const current = await loadAppointments();

  // Handle notification reschedule
  let notificationId = appointment.notificationId ?? null;
  if (appointment.reminderEnabled) {
    if (notificationId) {
      await cancelAppointmentReminder(notificationId);
    }
    notificationId = await scheduleVetAppointmentReminder(appointment);
  } else if (notificationId) {
    await cancelAppointmentReminder(notificationId);
    notificationId = null;
  }

  const updatedAppt: VetAppointment = {
    ...appointment,
    notificationId,
  };

  const updatedList = current.map((item) => (item.id === appointment.id ? updatedAppt : item));
  await persistAppointments(updatedList);
  return updatedAppt;
}

export async function deleteVetAppointment(id: string): Promise<void> {
  const current = await loadAppointments();
  const target = current.find((a) => a.id === id);
  if (target?.notificationId) {
    await cancelAppointmentReminder(target.notificationId);
  }
  const filtered = current.filter((a) => a.id !== id);
  await persistAppointments(filtered);
}

export async function completeVetAppointment(id: string): Promise<void> {
  const current = await loadAppointments();
  const target = current.find((a) => a.id === id);
  if (target?.notificationId) {
    await cancelAppointmentReminder(target.notificationId);
  }
  const updatedList = current.map((item) =>
    item.id === id ? { ...item, status: 'completed' as const, notificationId: null } : item
  );
  await persistAppointments(updatedList);
}
