import AsyncStorage from '@react-native-async-storage/async-storage';

// One-time per-tab tooltip tour flags. Not a React hook despite the folder — plain async
// helpers consumed by components/TabTour.tsx. Keys are stored as the string 'true';
// absence means "not seen yet".
export type TourTab = 'home' | 'pets' | 'more';

const KEY: Record<TourTab, string> = {
  home: 'tour_home_done',
  pets: 'tour_pets_done',
  more: 'tour_more_done',
};

/** Whether this tab's tour has already been completed or skipped. Fails closed. */
export async function hasSeenTour(tab: TourTab): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(KEY[tab])) === 'true';
  } catch {
    return true; // never spam the tour if storage is unavailable
  }
}

export async function markTourSeen(tab: TourTab): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY[tab], 'true');
  } catch {
    /* ignore */
  }
}

/** Clears all tour flags so every tab shows its guide again — used by "Replay app tour". */
export async function resetAllTours(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(KEY));
  } catch {
    /* ignore */
  }
}
