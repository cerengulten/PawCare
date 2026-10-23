import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { i18n } from './i18n';

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
const HABIT_ANDROID_CHANNEL_ID = 'habit-reminders';

async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: i18n.t('notifications.vaccineChannel'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
    await Notifications.setNotificationChannelAsync(HABIT_ANDROID_CHANNEL_ID, {
      name: i18n.t('notifications.habitChannel'),
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
  const granted = await requestNotificationPermissions();
  if (!granted) return null;
  const trigger = new Date(dueDate);
  trigger.setHours(VACCINE_REMINDER_HOUR, 0, 0, 0);
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.vaccineDueTitle'),
        body: i18n.t('notifications.vaccineDueBody', { name: vaccineName }),
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

export async function scheduleHabitReminder(
  title: string,
  reminderTime: string,
  frequency: 'daily' | 'weekly' | 'custom',
  weekday?: number | null
): Promise<string | null> {
  const granted = await requestNotificationPermissions();
  if (!granted) return null;
  const [hour, minute] = reminderTime.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;

  let trigger: Notifications.NotificationTriggerInput;
  if (frequency === 'daily') {
    trigger = { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute };
  } else if (frequency === 'weekly' && weekday) {
    trigger = { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour, minute };
  } else {
    // 'custom' frequency, or 'weekly' with no weekday chosen — no recurring schedule to fire on.
    return null;
  }

  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.habitReminderTitle'),
        body: title,
      },
      trigger,
    });
  } catch {
    return null;
  }
}

export async function cancelHabitReminder(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // already fired or cancelled — nothing to do
  }
}

export async function cancelAllLocalNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // nothing to do
  }
}
