import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { VetResult } from '../../types';
import { fetchVetsNear, Coords } from './useNearbyVets';

const CACHE_KEY = '@pawcare/vet_results_cache';
const CACHE_TTL_MS = 10 * 60 * 1000;

type Cache = { timestamp: number; userLocation: Coords; vets: VetResult[] };

export function useHomeVetPreview() {
  const [vets, setVets] = useState<VetResult[]>([]);
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(true);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cachedRaw = await AsyncStorage.getItem(CACHE_KEY);
        if (cachedRaw) {
          const cached: Cache = JSON.parse(cachedRaw);
          if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
            setUserLocation(cached.userLocation);
            setVets(cached.vets);
            setAvailable(true);
            setLoading(false);
            return;
          }
        }

        // Prompts for location on first load so the map/list preview is
        // populated right away — a no-op if permission was already
        // granted/denied previously (the OS only shows the dialog once).
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLoading(false);
          return;
        }

        const position = await Location.getCurrentPositionAsync({});
        const center = { lat: position.coords.latitude, lon: position.coords.longitude };
        const results = await fetchVetsNear(center);
        setUserLocation(center);
        setVets(results);
        setAvailable(true);
        await AsyncStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ timestamp: Date.now(), userLocation: center, vets: results })
        );
      } catch {
        // Silently fall back to the placeholder state — VetFinderScreen owns
        // real error/retry UI, this is just a lightweight Home preview.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { vets, userLocation, loading, available };
}
