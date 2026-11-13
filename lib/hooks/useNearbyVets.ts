import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { VetResult } from '../../types';
import { i18n } from '../i18n';

const VET_CACHE_KEY = '@pawcare/vet_results_cache';
const VET_CACHE_TTL_MS = 10 * 60 * 1000;

const OVERPASS_ENDPOINTS = [
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const SEARCH_RADIUS_METERS = 5000;
const OVERPASS_TIMEOUT_MS = 4500;
const USER_AGENT = 'BiscoPetCare/1.0 (https://bisco.app; contact@bisco.app)';

export type Coords = { lat: number; lon: number };

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = OVERPASS_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function haversineKm(a: Coords, b: Coords): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

type OverpassElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

function addressFromTags(tags: Record<string, string> | undefined): string | null {
  if (!tags) return null;
  if (tags['addr:full']) return tags['addr:full'].trim();

  const streetLine = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  const neighborhood =
    tags['addr:suburb'] ??
    tags['addr:neighbourhood'] ??
    tags['addr:quarter'] ??
    tags['addr:district'];
  const city =
    tags['addr:city'] ??
    tags['addr:town'] ??
    tags['addr:village'] ??
    tags['addr:municipality'];
  const postcode = tags['addr:postcode'];

  const citySection = [postcode, city].filter(Boolean).join(' ');
  const parts = [streetLine, neighborhood, citySection].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : null;
}

export async function reverseGeocodeAddress(coords: Coords): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lon}&format=json&zoom=18&addressdetails=1`;
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': USER_AGENT } }, OVERPASS_TIMEOUT_MS);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data) return null;
    if (data.address) {
      const addr = data.address;
      const street = [addr.road, addr.house_number].filter(Boolean).join(' ');
      const neighborhood = addr.suburb || addr.neighbourhood || addr.quarter || addr.district;
      const city = addr.city || addr.town || addr.village || addr.municipality || addr.county;
      const parts = [street, neighborhood, city].filter(Boolean);
      if (parts.length > 0) return parts.join(', ');
    }
    return data.display_name ?? null;
  } catch {
    return null;
  }
}

export async function fetchVetsNear(center: Coords): Promise<VetResult[]> {
  const query = `[out:json][timeout:6];(
    node["amenity"="veterinary"](around:${SEARCH_RADIUS_METERS},${center.lat},${center.lon});
    way["amenity"="veterinary"](around:${SEARCH_RADIUS_METERS},${center.lat},${center.lon});
    node["healthcare"="veterinary"](around:${SEARCH_RADIUS_METERS},${center.lat},${center.lon});
    way["healthcare"="veterinary"](around:${SEARCH_RADIUS_METERS},${center.lat},${center.lon});
    node["amenity"="animal_hospital"](around:${SEARCH_RADIUS_METERS},${center.lat},${center.lon});
    way["amenity"="animal_hospital"](around:${SEARCH_RADIUS_METERS},${center.lat},${center.lon});
  );out center 40;`;

  let anyEndpointRespondedOk = false;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetchWithTimeout(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': USER_AGENT,
          },
          body: `data=${encodeURIComponent(query)}`,
        },
        OVERPASS_TIMEOUT_MS
      );

      if (response.ok) {
        anyEndpointRespondedOk = true;
        const json = await response.json();
        const elements: OverpassElement[] = json.elements ?? [];
        if (elements.length > 0) {
          return elements
            .map(el => {
              const lat = el.lat ?? el.center?.lat ?? center.lat;
              const lon = el.lon ?? el.center?.lon ?? center.lon;
              const isEmergency =
                el.tags?.emergency === 'yes' ||
                el.tags?.['veterinary:emergency'] === 'yes' ||
                el.tags?.amenity === 'animal_rescue' ||
                (el.tags?.opening_hours && el.tags.opening_hours.toLowerCase().includes('24/7'));

              const phone =
                el.tags?.phone ??
                el.tags?.['contact:phone'] ??
                el.tags?.telephone ??
                el.tags?.mobile ??
                el.tags?.['contact:mobile'] ??
                null;

              const website =
                el.tags?.website ??
                el.tags?.['contact:website'] ??
                el.tags?.url ??
                el.tags?.facebook ??
                el.tags?.['contact:facebook'] ??
                el.tags?.instagram ??
                el.tags?.['contact:instagram'] ??
                null;

              const email =
                el.tags?.email ??
                el.tags?.['contact:email'] ??
                null;

              return {
                id: String(el.id),
                name: el.tags?.name ?? String(i18n.t('vetFinder.defaultName')),
                lat,
                lon,
                address: addressFromTags(el.tags),
                phone,
                openingHours: el.tags?.opening_hours ?? null,
                website,
                email,
                isEmergency: !!isEmergency,
                distanceKm: haversineKm(center, { lat, lon }),
              };
            })
            .sort((a, b) => a.distanceKm - b.distanceKm);
        }
      }
    } catch {
      // Abort timeout or HTTP/network error -> try next mirror immediately
    }
  }

  // Resilient fallback to Nominatim search around the center if Overpass is temporarily busy
  try {
    const delta = 0.08;
    const minLon = center.lon - delta;
    const maxLon = center.lon + delta;
    const minLat = center.lat - delta;
    const maxLat = center.lat + delta;
    const nomUrl = `${NOMINATIM_URL}?amenity=veterinary&viewbox=${minLon},${maxLat},${maxLon},${minLat}&bounded=1&format=json&limit=15`;
    const res = await fetchWithTimeout(nomUrl, { headers: { 'User-Agent': USER_AGENT } }, OVERPASS_TIMEOUT_MS);
    if (res.ok) {
      anyEndpointRespondedOk = true;
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        return items
          .map((item: any) => {
            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);
            return {
              id: String(item.place_id || item.osm_id),
              name: item.name || item.display_name?.split(',')[0] || String(i18n.t('vetFinder.defaultName')),
              lat,
              lon,
              address: item.display_name ?? null,
              phone: null,
              openingHours: null,
              website: null,
              email: null,
              isEmergency: false,
              distanceKm: haversineKm(center, { lat, lon }),
            };
          })
          .sort((a, b) => a.distanceKm - b.distanceKm);
      }
    }
  } catch {
    // fallback failed
  }

  if (!anyEndpointRespondedOk) {
    throw new Error('All map directory servers timed out or are temporarily unavailable.');
  }

  return [];
}

async function geocodeAddress(query: string): Promise<Coords | null> {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const response = await fetchWithTimeout(
    url,
    {
      headers: { 'User-Agent': USER_AGENT },
    },
    OVERPASS_TIMEOUT_MS
  );
  if (!response.ok) throw new Error('Address lookup failed');
  const json = await response.json();
  if (!Array.isArray(json) || json.length === 0) return null;
  return { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) };
}

export function useNearbyVets() {
  const [vets, setVets] = useState<VetResult[]>([]);
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  async function searchNearMe() {
    setError(null);
    setPermissionDenied(false);

    // 1. Instant render from cached vet preview if fresh (< 10 min)
    let usedCache = false;
    try {
      const cachedRaw = await AsyncStorage.getItem(VET_CACHE_KEY);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw) as {
          timestamp: number;
          userLocation: Coords;
          vets: VetResult[];
        };
        if (Date.now() - cached.timestamp < VET_CACHE_TTL_MS && cached.userLocation) {
          setUserLocation(cached.userLocation);
          setVets(cached.vets ?? []);
          setLoading(false);
          usedCache = true;
        }
      }
    } catch {
      // ignore corrupt cache
    }

    if (!usedCache) {
      setLoading(true);
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!usedCache) {
          setPermissionDenied(true);
          setLoading(false);
        }
        return;
      }

      // 2. If no cache yet, resolve lastKnown immediately so map appears fast
      if (!usedCache) {
        const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
        if (lastKnown) {
          const fastCenter = { lat: lastKnown.coords.latitude, lon: lastKnown.coords.longitude };
          setUserLocation(fastCenter);
          try {
            const fastResults = await fetchVetsNear(fastCenter);
            setVets(fastResults);
            setLoading(false);
            AsyncStorage.setItem(
              VET_CACHE_KEY,
              JSON.stringify({ timestamp: Date.now(), userLocation: fastCenter, vets: fastResults })
            ).catch(() => {});
            // Quietly refine GPS in background without blocking UI
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
              .then(async (pos) => {
                const exact = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                if (haversineKm(fastCenter, exact) > 0.4) {
                  setUserLocation(exact);
                  const fresh = await fetchVetsNear(exact);
                  setVets(fresh);
                  AsyncStorage.setItem(
                    VET_CACHE_KEY,
                    JSON.stringify({ timestamp: Date.now(), userLocation: exact, vets: fresh })
                  ).catch(() => {});
                }
              })
              .catch(() => {});
            return;
          } catch {
            // Fall through to fresh GPS position
          }
        }

        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const center = { lat: position.coords.latitude, lon: position.coords.longitude };
        setUserLocation(center);
        const results = await fetchVetsNear(center);
        setVets(results);
        AsyncStorage.setItem(
          VET_CACHE_KEY,
          JSON.stringify({ timestamp: Date.now(), userLocation: center, vets: results })
        ).catch(() => {});
      }
    } catch {
      if (!usedCache) {
        setError(i18n.t('vetFinder.loadFailed'));
      }
    } finally {
      setLoading(false);
    }
  }

  async function searchByAddress(address: string) {
    const trimmed = address.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);
    try {
      const coords = await geocodeAddress(trimmed);
      if (!coords) {
        setError(i18n.t('vetFinder.addressNotFound'));
        return;
      }
      setUserLocation(coords);
      const results = await fetchVetsNear(coords);
      setVets(results);
    } catch {
      setError(i18n.t('vetFinder.loadFailed'));
    } finally {
      setLoading(false);
    }
  }

  return {
    vets,
    userLocation,
    loading,
    error,
    permissionDenied,
    searchNearMe,
    searchByAddress,
  };
}
