import { useState } from 'react';
import * as Location from 'expo-location';
import { VetResult } from '../../types';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const SEARCH_RADIUS_METERS = 5000;

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
  lat: number;
  lon: number;
  tags?: Record<string, string>;
};

function addressFromTags(tags: Record<string, string> | undefined): string | null {
  if (!tags) return null;
  const parts = [tags['addr:housenumber'], tags['addr:street'], tags['addr:city']].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : null;
}

export async function fetchVetsNear(center: Coords): Promise<VetResult[]> {
  const query = `[out:json];node["amenity"="veterinary"](around:${SEARCH_RADIUS_METERS},${center.lat},${center.lon});out body;`;
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!response.ok) throw new Error('Overpass request failed');
  const json = await response.json();
  const elements: OverpassElement[] = json.elements ?? [];

  return elements
    .map(el => ({
      id: String(el.id),
      name: el.tags?.name ?? 'Veterinary clinic',
      lat: el.lat,
      lon: el.lon,
      address: addressFromTags(el.tags),
      phone: el.tags?.phone ?? el.tags?.['contact:phone'] ?? null,
      openingHours: el.tags?.opening_hours ?? null,
      distanceKm: haversineKm(center, { lat: el.lat, lon: el.lon }),
    }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

async function geocodeAddress(query: string): Promise<Coords | null> {
  const url = `${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=1`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Bisco/1.0 (bisco app; vet finder)' },
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
      const position = await Location.getCurrentPositionAsync({});
      const center = { lat: position.coords.latitude, lon: position.coords.longitude };
      setUserLocation(center);
      const results = await fetchVetsNear(center);
      setVets(results);
    } catch {
      setError('Could not load nearby vets. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function searchByAddress(query: string) {
    setLoading(true);
    setError(null);
    try {
      const center = await geocodeAddress(query);
      if (!center) {
        setError('Could not find that address. Try a different search.');
        setLoading(false);
        return;
      }
      setUserLocation(center);
      const results = await fetchVetsNear(center);
      setVets(results);
    } catch {
      setError('Could not load nearby vets. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return { vets, userLocation, loading, error, permissionDenied, searchNearMe, searchByAddress };
}
