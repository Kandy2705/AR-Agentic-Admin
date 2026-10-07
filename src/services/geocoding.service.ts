import { isLatLng, type LatLng } from '@/lib/geo';

/** OpenStreetMap Nominatim — free geocoder; search on submit only (no autocomplete), per its usage policy. */
const ENDPOINT = 'https://nominatim.openstreetmap.org/search';

export interface Place {
  id: string;
  name: string;
  position: LatLng;
}

interface NominatimRow {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

/** Searches addresses/places, preferring results around `near` (≈ 3 km box). */
export async function searchPlaces(
  query: string,
  near: LatLng,
  signal?: AbortSignal,
): Promise<Place[]> {
  const d = 0.03;
  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    limit: '6',
    countrycodes: 'vn',
    'accept-language': 'vi',
    viewbox: `${near.lng - d},${near.lat + d},${near.lng + d},${near.lat - d}`,
    bounded: '0',
  });
  let response: Response;
  try {
    response = await fetch(`${ENDPOINT}?${params.toString()}`, {
      signal,
      credentials: 'omit',
      // Nominatim identifies browser apps by origin; the page itself sends no referrer.
      referrerPolicy: 'strict-origin-when-cross-origin',
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new Error('Address search is unavailable right now.');
  }
  if (!response.ok) throw new Error('Address search is unavailable right now.');
  const rows = (await response.json()) as NominatimRow[];
  return rows
    .map((row) => ({
      id: String(row.place_id),
      name: row.display_name,
      position: { lat: Number(row.lat), lng: Number(row.lon) },
    }))
    .filter((place) => isLatLng(place.position));
}
