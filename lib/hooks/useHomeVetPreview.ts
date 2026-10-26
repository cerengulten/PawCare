import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { VetResult } from '../../types';
import { fetchVetsNear, Coords } from './useNearbyVets';

const CACHE_KEY = '@pawcare/vet_results_cache';
const CACHE_TTL_MS = 10 * 60 * 1000;

export async function clearHomeVetCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore
  }
}

// A cold first launch is exactly when GPS/network are least likely to be ready — a single
// failed attempt used to fall straight into the dead-end "Tap to find vets near you"
// placeholder, which looks identical to an actual permission denial and needs a manual tap
// to recover from. Retry a couple of times (with a short delay) before giving up, so a
// transient hiccup on the very first launch resolves itself while the skeleton is still
// showing instead of landing on the placeholder.
const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [1500, 3000];

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

type Cache = { timestamp: number; userLocation: Coords; vets: VetResult[] };

export function useHomeVetPreview() {
  const [vets, setVets] = useState<VetResult[]>([]);
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const cachedRaw = await AsyncStorage.getItem(CACHE_KEY).catch(() => null);
      if (cachedRaw) {
        try {
          const cached: Cache = JSON.parse(cachedRaw);
          if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            if (cancelled) return;
            setUserLocation(cached.userLocation);
            setVets(cached.vets);
            setAvailable(true);
            setLoading(false);
            return;
          }
        } catch {
          // corrupt cache entry — fall through to a fresh fetch
        }
      }

      // Prompts for location on first load so the map/list preview is
      // populated right away — a no-op if permission was already
      // granted/denied previously (the OS only shows the dialog once).
      const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' as const }));
      if (status !== 'granted') {
        if (!cancelled) setLoading(false);
        return;
      }

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        try {
          const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
          const position = lastKnown ?? await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const center = { lat: position.coords.latitude, lon: position.coords.longitude };
          const results = await fetchVetsNear(center);
          if (cancelled) return;
          setUserLocation(center);
          setVets(results);
          setAvailable(true);
          setLoading(false);
          await AsyncStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ timestamp: Date.now(), userLocation: center, vets: results })
          );
          return;
        } catch {
          if (attempt < MAX_ATTEMPTS - 1) await delay(RETRY_DELAYS_MS[attempt]);
        }
      }
      // Every attempt failed (no signal / Overpass unreachable) — fall back to the
      // placeholder; tapping it opens VetFinderScreen, which has its own retry UI.
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  return { vets, userLocation, loading, available };
}
