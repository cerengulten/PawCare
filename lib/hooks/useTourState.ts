import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../supabase';

// One-time per-tab tooltip tour flags. Not a React hook despite the folder — plain async
// helpers consumed by components/TabTour.tsx. Keys are stored as the string 'true';
// absence means "not seen yet".
//
// Flags are namespaced per user id: AsyncStorage is device-level, so without this a
// second account signing in on the same device would inherit the first account's
// "already seen the tour" state and never get the tour.
export type TourTab = 'home' | 'pets' | 'more';

const TABS: TourTab[] = ['home', 'pets', 'more'];

async function currentUserId(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.user?.id ?? 'anon';
  } catch {
    return 'anon';
  }
}

function keyFor(tab: TourTab, uid: string): string {
  return `tour_${tab}_done_${uid}`;
}

/** Whether this tab's tour has already been completed or skipped. Fails closed. */
export async function hasSeenTour(tab: TourTab): Promise<boolean> {
  try {
    const uid = await currentUserId();
    return (await AsyncStorage.getItem(keyFor(tab, uid))) === 'true';
  } catch {
    return true; // never spam the tour if storage is unavailable
  }
}

export async function markTourSeen(tab: TourTab): Promise<void> {
  try {
    const uid = await currentUserId();
    await AsyncStorage.setItem(keyFor(tab, uid), 'true');
  } catch {
    /* ignore */
  }
}

/** Clears the current user's tour flags so every tab shows its guide again — "Replay app tour". */
export async function resetAllTours(): Promise<void> {
  try {
    const uid = await currentUserId();
    await AsyncStorage.multiRemove(TABS.map((t) => keyFor(t, uid)));
  } catch {
    /* ignore */
  }
}
