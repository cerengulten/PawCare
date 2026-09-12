import { supabase } from './supabase';
import { i18n } from './i18n';
import { daysAway } from './vaccineDisplay';
import { mapDogSpeciesToCycleSpecies, predictNextCycleStart } from './cycleLogic';
import { computeStreak } from './streakLogic';
import { NotificationActionType, NotificationType } from '../types';

// Generates rows in the `notifications` table (screens/NotificationsScreen.tsx) — a
// client-created in-app inbox, entirely separate from lib/notifications.ts's
// expo-notifications OS push scheduling. Every check function here is self-contained: it
// takes only a pet/owner id and queries whatever else it needs itself (dog name, mood
// history, cycle prediction, vaccine rows, water total) — so every call site elsewhere in
// the app is a one-line fire-and-forget call. Each function swallows its own errors and
// never throws into the caller.

const HEALTH_ALERT_LOOKBACK_DAYS = 5;
const HEALTH_ALERT_MIN_BAD_DAYS = 2;
const STREAK_ALERT_HOUR = 18; // 6 PM local
const CYCLE_ALERT_WITHIN_DAYS = 5;
const VACCINE_ALERT_WITHIN_DAYS = 7;

type NotifColorKey =
  | 'notifHealthBorder' | 'notifHealthBg'
  | 'notifStreakBorder' | 'notifStreakBg'
  | 'notifCycleBorder' | 'notifCycleBg'
  | 'notifVaccineBorder' | 'notifVaccineBg'
  | 'notifHydrationBorder' | 'notifHydrationBg'
  | 'notifInfoBorder' | 'notifInfoBg';

// Shared UI metadata (icon + theme color-token names) — imported by NotificationCard.tsx
// so the type->appearance mapping isn't duplicated between the generator and the display.
export const NOTIF_META: Record<NotificationType, { emoji: string; borderToken: NotifColorKey; bgToken: NotifColorKey }> = {
  health_alert: { emoji: '⚠️', borderToken: 'notifHealthBorder', bgToken: 'notifHealthBg' },
  streak: { emoji: '🔥', borderToken: 'notifStreakBorder', bgToken: 'notifStreakBg' },
  cycle: { emoji: '🌸', borderToken: 'notifCycleBorder', bgToken: 'notifCycleBg' },
  vaccine: { emoji: '💉', borderToken: 'notifVaccineBorder', bgToken: 'notifVaccineBg' },
  hydration: { emoji: '💧', borderToken: 'notifHydrationBorder', bgToken: 'notifHydrationBg' },
  habit_reminder: { emoji: '🔔', borderToken: 'notifInfoBorder', bgToken: 'notifInfoBg' },
  info: { emoji: 'ℹ️', borderToken: 'notifInfoBorder', bgToken: 'notifInfoBg' },
};

async function insertNotification(row: {
  ownerId: string;
  petId?: string | null;
  type: NotificationType;
  title: string;
  body: string;
  actionType?: NotificationActionType | null;
  actionPayload?: Record<string, string> | null;
}) {
  try {
    await supabase.from('notifications').insert({
      owner_id: row.ownerId,
      pet_id: row.petId ?? null,
      type: row.type,
      title: row.title,
      body: row.body,
      action_type: row.actionType ?? null,
      action_payload: row.actionPayload ?? null,
    });
  } catch {
    // fire-and-forget — a failed insert shouldn't surface anywhere
  }
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Rolling-window dedup: any notification of this type (+pet) created since `days` ago. */
async function hasRecentNotification(
  ownerId: string,
  type: NotificationType,
  petId: string | null,
  days: number
): Promise<boolean> {
  const since = days <= 1 ? startOfTodayIso() : new Date(Date.now() - days * 86400000).toISOString();
  let query = supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('type', type)
    .gte('created_at', since);
  query = petId ? query.eq('pet_id', petId) : query.is('pet_id', null);
  const { count } = await query;
  return (count ?? 0) > 0;
}

/** Exact-match dedup on a key inside `action_payload`, ignoring how long ago it fired. */
async function hasNotificationWithPayload(
  ownerId: string,
  type: NotificationType,
  petId: string,
  key: string,
  value: string,
  withinDays: number
): Promise<boolean> {
  const since = new Date(Date.now() - withinDays * 86400000).toISOString();
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .eq('type', type)
    .eq('pet_id', petId)
    .gte('created_at', since)
    .filter(`action_payload->>${key}`, 'eq', value);
  return (count ?? 0) > 0;
}

async function fetchDogName(petId: string): Promise<string> {
  const { data } = await supabase.from('dogs').select('name').eq('id', petId).maybeSingle();
  return data?.name ?? '';
}

// health_alert — call after a mood is logged for a dog.
export async function checkAndCreateHealthAlert(petId: string, ownerId: string): Promise<void> {
  try {
    if (await hasRecentNotification(ownerId, 'health_alert', petId, 1)) return;

    const since = new Date();
    since.setDate(since.getDate() - HEALTH_ALERT_LOOKBACK_DAYS);
    const sinceStr = since.toISOString().split('T')[0];

    const { data } = await supabase
      .from('dog_moods')
      .select('mood')
      .eq('dog_id', petId)
      .eq('owner_id', ownerId)
      .gte('logged_date', sinceStr);

    const badMoods = (data ?? []).filter(r => r.mood === 'off' || r.mood === 'sick');
    if (badMoods.length < HEALTH_ALERT_MIN_BAD_DAYS) return;

    const name = await fetchDogName(petId);
    const latestMood = badMoods[0]?.mood ?? 'off';
    await insertNotification({
      ownerId,
      petId,
      type: 'health_alert',
      title: i18n.t('notifications.healthAlertTitle', { name }),
      body: i18n.t('notifications.healthAlertBody', {
        name,
        mood: i18n.t('mood.' + latestMood).toLowerCase(),
        days: badMoods.length,
      }),
      actionType: 'open_vet_finder',
      actionPayload: { pet_id: petId },
    });
  } catch {
    /* fire-and-forget */
  }
}

// streak — call from HomeScreen on mount.
export async function checkAndCreateStreakAlert(ownerId: string): Promise<void> {
  try {
    if (new Date().getHours() < STREAK_ALERT_HOUR) return;
    if (await hasRecentNotification(ownerId, 'streak', null, 1)) return;

    const today = new Date().toISOString().split('T')[0];
    const since90 = new Date();
    since90.setDate(since90.getDate() - 90);
    const since90Str = since90.toISOString().split('T')[0];

    const [{ data: habits }, { data: completions }] = await Promise.all([
      supabase.from('habits').select('id, dog_id, times_per_day, habit_type, water_goal_ml').eq('owner_id', ownerId).eq('is_active', true),
      supabase.from('habit_completions').select('habit_id, completed_date, occurrence_count').eq('owner_id', ownerId).gte('completed_date', since90Str),
    ]);
    if (!habits || habits.length === 0) return;

    const activeDates = new Map<string, number>();
    (completions ?? []).forEach(row => {
      if (row.occurrence_count > 0) activeDates.set(row.completed_date, 1);
    });
    const streak = computeStreak(activeDates, 1, today);
    if (streak <= 0) return;

    const todaysCounts = new Map<string, number>();
    (completions ?? []).forEach(row => {
      if (row.completed_date === today) todaysCounts.set(row.habit_id, row.occurrence_count);
    });
    const incomplete = habits.find(h => {
      // Mirrors lib/hooks/useHabits.ts's getHabitTarget() for this partial select shape.
      const target = h.habit_type === 'water'
        ? (h.water_goal_ml ?? 0)
        : (h.times_per_day && h.times_per_day > 0 ? h.times_per_day : 1);
      return (todaysCounts.get(h.id) ?? 0) < target;
    });
    if (!incomplete) return;

    await insertNotification({
      ownerId,
      type: 'streak',
      title: i18n.t('notifications.streakTitle'),
      body: i18n.t('notifications.streakBody', { count: streak }),
      actionType: 'open_pet_habits',
      actionPayload: { pet_id: incomplete.dog_id },
    });
  } catch {
    /* fire-and-forget */
  }
}

// cycle — call when a dog's cycle data loads (useCycleTracking.ts).
export async function checkAndCreateCycleAlert(petId: string, ownerId: string): Promise<void> {
  try {
    const { data: dog } = await supabase.from('dogs').select('name, species, breed').eq('id', petId).maybeSingle();
    if (!dog) return;
    const species = mapDogSpeciesToCycleSpecies(dog.species);
    if (!species) return;

    const { data: cycles } = await supabase
      .from('cycle_records')
      .select('start_date, end_date')
      .eq('dog_id', petId)
      .eq('owner_id', ownerId)
      .order('start_date', { ascending: false });
    if (!cycles || cycles.length === 0) return;

    const { predictedDate } = predictNextCycleStart(cycles, species, dog.breed);
    const daysUntil = Math.round((predictedDate.getTime() - Date.now()) / 86400000);
    if (daysUntil < 0 || daysUntil > CYCLE_ALERT_WITHIN_DAYS) return;

    const predictedDateStr = predictedDate.toISOString().split('T')[0];
    if (await hasNotificationWithPayload(ownerId, 'cycle', petId, 'predicted_date', predictedDateStr, 60)) return;

    await insertNotification({
      ownerId,
      petId,
      type: 'cycle',
      title: i18n.t('notifications.cycleTitle'),
      body: i18n.t('notifications.cycleBody', {
        name: dog.name,
        days: daysUntil,
        date: predictedDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      }),
      actionType: 'open_cycle_history',
      actionPayload: { pet_id: petId, predicted_date: predictedDateStr },
    });
  } catch {
    /* fire-and-forget */
  }
}

// vaccine — call when a dog's vaccines are loaded (useAllVaccines.ts).
export async function checkAndCreateVaccineAlert(petId: string, ownerId: string): Promise<void> {
  try {
    const { data: vaccines } = await supabase
      .from('vaccine_records')
      .select('id, vaccine_name, next_due_date')
      .eq('dog_id', petId)
      .eq('owner_id', ownerId)
      .order('next_due_date');
    if (!vaccines || vaccines.length === 0) return;

    const dueSoon = vaccines.find(v => {
      const days = daysAway(v.next_due_date);
      return days >= 0 && days <= VACCINE_ALERT_WITHIN_DAYS;
    });
    if (!dueSoon) return;
    if (await hasNotificationWithPayload(ownerId, 'vaccine', petId, 'vaccine_id', dueSoon.id, VACCINE_ALERT_WITHIN_DAYS)) return;

    const name = await fetchDogName(petId);
    const days = daysAway(dueSoon.next_due_date);
    await insertNotification({
      ownerId,
      petId,
      type: 'vaccine',
      title: i18n.t('notifications.vaccineTitle'),
      body: i18n.t('notifications.vaccineBody', {
        name,
        vaccine: dueSoon.vaccine_name,
        date: new Date(dueSoon.next_due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        days,
      }),
      actionType: 'open_pet_profile',
      actionPayload: { pet_id: petId, vaccine_id: dueSoon.id },
    });
  } catch {
    /* fire-and-forget */
  }
}

// hydration — call right after a water amount is logged (useHabits.ts's logWaterAmount).
export async function checkAndCreateWaterGoalNotif(petId: string, ownerId: string): Promise<void> {
  try {
    const { data: habit } = await supabase
      .from('habits')
      .select('id, water_goal_ml')
      .eq('dog_id', petId)
      .eq('owner_id', ownerId)
      .eq('habit_type', 'water')
      .eq('is_active', true)
      .maybeSingle();
    if (!habit || !habit.water_goal_ml) return;

    const today = new Date().toISOString().split('T')[0];
    const { data: completion } = await supabase
      .from('habit_completions')
      .select('occurrence_count')
      .eq('habit_id', habit.id)
      .eq('owner_id', ownerId)
      .eq('completed_date', today)
      .maybeSingle();
    const total = completion?.occurrence_count ?? 0;
    if (total < habit.water_goal_ml) return;
    if (await hasRecentNotification(ownerId, 'hydration', petId, 1)) return;

    const name = await fetchDogName(petId);
    await insertNotification({
      ownerId,
      petId,
      type: 'hydration',
      title: i18n.t('notifications.hydrationTitle'),
      body: i18n.t('notifications.hydrationBody', { name, amount: total }),
      actionType: null,
      actionPayload: { pet_id: petId },
    });
  } catch {
    /* fire-and-forget */
  }
}
