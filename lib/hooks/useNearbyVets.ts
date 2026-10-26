import { useState } from 'react';
import * as Location from 'expo-location';
import { VetResult } from '../../types';
import { i18n } from '../i18n';

const OVERPASS_ENDPOINTS = [
  'https://overpass.openstreetmap.fr/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass-api.de/api/interpreter',
];
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const SEARCH_RADIUS_METERS = 5000;
const USER_AGENT = 'BiscoPetCare/1.0 (https://bisco.app; contact@bisco.app)';

export type Coords = { lat: number; lon: number };

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
  const parts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

export async function fetchVetsNear(center: Coords): Promise<VetResult[]> {
  const query = `[out:json][timeout:10];(node["amenity"="veterinary"](around:${SEARCH_RADIUS_METERS},${center.lat},${center.lon});way["amenity"="veterinary"](around:${SEARCH_RADIUS_METERS},${center.lat},${center.lon}););out center 25;`;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': USER_AGENT,
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (response.ok) {
        const json = await response.json();
        const elements: OverpassElement[] = json.elements ?? [];
        if (elements.length > 0) {
          return elements
            .map(el => {
              const lat = el.lat ?? el.center?.lat ?? center.lat;
              const lon = el.lon ?? el.center?.lon ?? center.lon;
              return {
                id: String(el.id),
                name: el.tags?.name ?? String(i18n.t('vetFinder.defaultName')),
                lat,
                lon,
                address: addressFromTags(el.tags),
                phone: el.tags?.phone ?? el.tags?.['contact:phone'] ?? null,
                openingHours: el.tags?.opening_hours ?? null,
                distanceKm: haversineKm(center, { lat, lon }),
              };
            })
            .sort((a, b) => a.distanceKm - b.distanceKm);
        }
      }
    } catch {
      // try next mirror
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
    const res = await fetch(nomUrl, { headers: { 'User-Agent': USER_AGENT } });
    if (res.ok) {
      const items = await res.json();
      if (Array.isArray(items) && items.length > 0) {
        return items.map((item: any) => {
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
            distanceKm: haversineKm(center, { lat, lon }),
          };
        }).sort((a, b) => a.distanceKm - b.distanceKm);
      }
    }
  } catch {
    // fallback failed
  }

  return [];
}

async function geocodeAddress(query: string): Promise<Coords | null> {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });
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
    setLoading(true);
    setError(null);
    setPermissionDenied(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }

      // Fast initial check: use last known position immediately if available
      const lastKnown = await Location.getLastKnownPositionAsync().catch(() => null);
      if (lastKnown) {
        const center = { lat: lastKnown.coords.latitude, lon: lastKnown.coords.longitude };
        setUserLocation(center);
        fetchVetsNear(center).then(results => {
          if (results.length > 0) setVets(results);
        }).catch(() => {});
      }

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const center = { lat: position.coords.latitude, lon: position.coords.longitude };
      setUserLocation(center);
      const results = await fetchVetsNear(center);
      setVets(results);
    } catch {
      setError(i18n.t('vetFinder.loadFailed'));
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
