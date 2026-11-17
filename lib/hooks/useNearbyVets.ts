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
const PHOTON_URL = 'https://photon.komoot.io/api/';
const PRIMARY_RADIUS_METERS = 5000;
const EXPANDED_RADIUS_METERS = 15000;
const OVERPASS_RACE_TIMEOUT_MS = 8000;
const GENERAL_TIMEOUT_MS = 6000;
const USER_AGENT = 'BiscoPetCare/1.0 (https://bisco.app; contact@bisco.app)';

export type Coords = { lat: number; lon: number };

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = GENERAL_TIMEOUT_MS
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
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': USER_AGENT } }, GENERAL_TIMEOUT_MS);
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

function parseOverpassElements(elements: OverpassElement[], center: Coords): VetResult[] {
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

async function queryOverpassMirror(
  endpoint: string,
  query: string,
  signal: AbortSignal
): Promise<OverpassElement[]> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': USER_AGENT,
    },
    body: `data=${encodeURIComponent(query)}`,
    signal,
  });
  if (!response.ok) {
    throw new Error(`Overpass error: ${response.status}`);
  }
  const json = await response.json();
  return (json.elements ?? []) as OverpassElement[];
}

async function queryOverpassFast(center: Coords, radius: number): Promise<VetResult[]> {
  const query = `[out:json][timeout:6];nwr["amenity"="veterinary"](around:${radius},${center.lat},${center.lon});out center 40;`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OVERPASS_RACE_TIMEOUT_MS);

  try {
    const elements = await Promise.any(
      OVERPASS_ENDPOINTS.map(ep => queryOverpassMirror(ep, query, controller.signal))
    );
    return parseOverpassElements(elements, center);
  } finally {
    clearTimeout(timer);
  }
}

function getLocalizedVetKeywords(): string[] {
  const currentLang = (i18n.locale || '').toLowerCase();
  if (currentLang.startsWith('tr')) {
    return ['veteriner', 'veterinary'];
  }
  if (currentLang.startsWith('it')) {
    return ['veterinario', 'veterinary'];
  }
  return ['veterinary', 'veterinario', 'veteriner'];
}

function normalizeVetName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function deduplicateVets(list: VetResult[]): VetResult[] {
  const seen = new Set<string>();
  const out: VetResult[] = [];
  for (const v of list) {
    const key = `${v.lat.toFixed(4)}_${v.lon.toFixed(4)}`;
    const nameKey = normalizeVetName(v.name);
    const compositeKey = nameKey ? `${key}_${nameKey.slice(0, 8)}` : key;
    if (!seen.has(compositeKey)) {
      seen.add(compositeKey);
      out.push(v);
    }
  }
  return out;
}

async function queryPhotonFallback(center: Coords, keyword: string): Promise<VetResult[]> {
  try {
    const url = `${PHOTON_URL}?q=${encodeURIComponent(keyword)}&lat=${center.lat}&lon=${center.lon}&limit=15`;
    const res = await fetchWithTimeout(url, { headers: { 'User-Agent': USER_AGENT } }, GENERAL_TIMEOUT_MS);
    if (!res.ok) return [];
    const data = await res.json();
    const features: any[] = data.features ?? [];
    const results: VetResult[] = [];

    for (const f of features) {
      const coords = f.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) continue;
      const lon = coords[0];
      const lat = coords[1];
      const dist = haversineKm(center, { lat, lon });
      if (dist > 25) continue;

      const p = f.properties || {};
      const street = [p.street, p.housenumber].filter(Boolean).join(' ');
      const neighborhood = p.locality || p.district;
      const city = p.city || p.state;
      const addressParts = [street, neighborhood, city, p.country].filter(Boolean);
      const address = addressParts.length > 0 ? addressParts.join(', ') : null;

      results.push({
        id: `photon_${p.osm_id || Math.random().toString(36).slice(2)}`,
        name: p.name || String(i18n.t('vetFinder.defaultName')),
        lat,
        lon,
        address,
        phone: null,
        openingHours: null,
        website: null,
        email: null,
        isEmergency: false,
        distanceKm: dist,
      });
    }
    return results;
  } catch {
    return [];
  }
}

async function queryNominatimFallback(center: Coords, keyword: string): Promise<VetResult[]> {
  try {
    const delta = 0.22; // ~24 km box
    const minLon = center.lon - delta;
    const maxLon = center.lon + delta;
    const minLat = center.lat - delta;
    const maxLat = center.lat + delta;
    const nomUrl = `${NOMINATIM_URL}?q=${encodeURIComponent(keyword)}&viewbox=${minLon},${maxLat},${maxLon},${minLat}&bounded=1&format=json&limit=15`;
    const res = await fetchWithTimeout(nomUrl, { headers: { 'User-Agent': USER_AGENT } }, GENERAL_TIMEOUT_MS);
    if (!res.ok) return [];
    const items = await res.json();
    if (!Array.isArray(items)) return [];

    const results: VetResult[] = [];
    for (const item of items) {
      const lat = parseFloat(item.lat);
      const lon = parseFloat(item.lon);
      if (isNaN(lat) || isNaN(lon)) continue;
      const dist = haversineKm(center, { lat, lon });
      if (dist > 25) continue;

      results.push({
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
        distanceKm: dist,
      });
    }
    return results;
  } catch {
    return [];
  }
}

export async function fetchVetsNear(center: Coords): Promise<VetResult[]> {
  let anyEndpointRespondedOk = false;

  // 1. Fast Overpass in parallel (5 km radius)
  try {
    const vets5km = await queryOverpassFast(center, PRIMARY_RADIUS_METERS);
    anyEndpointRespondedOk = true;
    if (vets5km.length > 0) {
      return vets5km;
    }

    // Radius expansion to 15 km if 5 km returned 0
    const vets15km = await queryOverpassFast(center, EXPANDED_RADIUS_METERS);
    if (vets15km.length > 0) {
      return vets15km;
    }
  } catch {
    // Overpass failed / timed out across all mirrors -> proceed to fallback
  }

  // 2. Fallback: Fast Photon Geocoder + Localized Nominatim
  const keywords = getLocalizedVetKeywords();
  const fallbackPromises: Promise<VetResult[]>[] = [];

  for (const kw of keywords) {
    fallbackPromises.push(queryPhotonFallback(center, kw));
    fallbackPromises.push(queryNominatimFallback(center, kw));
  }

  const fallbackResults = await Promise.all(fallbackPromises);
  const combined = fallbackResults.flat();

  if (combined.length > 0) {
    anyEndpointRespondedOk = true;
    const deduplicated = deduplicateVets(combined).filter(v => v.distanceKm <= 25);
    deduplicated.sort((a, b) => a.distanceKm - b.distanceKm);
    if (deduplicated.length > 0) {
      return deduplicated;
    }
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
    GENERAL_TIMEOUT_MS
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
            if (fastResults.length > 0) {
              AsyncStorage.setItem(
                VET_CACHE_KEY,
                JSON.stringify({ timestamp: Date.now(), userLocation: fastCenter, vets: fastResults })
              ).catch(() => {});
            }
            // Quietly refine GPS in background without blocking UI
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
              .then(async (pos) => {
                const exact = { lat: pos.coords.latitude, lon: pos.coords.longitude };
                if (haversineKm(fastCenter, exact) > 0.4) {
                  setUserLocation(exact);
                  const fresh = await fetchVetsNear(exact);
                  setVets(fresh);
                  if (fresh.length > 0) {
                    AsyncStorage.setItem(
                      VET_CACHE_KEY,
                      JSON.stringify({ timestamp: Date.now(), userLocation: exact, vets: fresh })
                    ).catch(() => {});
                  }
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
        if (results.length > 0) {
          AsyncStorage.setItem(
            VET_CACHE_KEY,
            JSON.stringify({ timestamp: Date.now(), userLocation: center, vets: results })
          ).catch(() => {});
        }
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
