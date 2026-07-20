import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const VACCINE_REMINDER_HOUR = 9;
const ANDROID_CHANNEL_ID = 'vaccine-reminders';

async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Vaccine reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  await ensureAndroidChannel();
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleVaccineReminder(
  vaccineName: string,
  dueDate: Date
): Promise<string | null> {
  const trigger = new Date(dueDate);
  trigger.setHours(VACCINE_REMINDER_HOUR, 0, 0, 0);
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Vaccine due today',
        body: `${vaccineName} is due today.`,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: trigger,
      },
    });
  } catch {
    return null;
  }
}

export async function cancelVaccineReminder(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // already fired or cancelled — nothing to do
  }
}
