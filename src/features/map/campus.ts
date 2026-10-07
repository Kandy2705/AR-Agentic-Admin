import type { LatLng } from '@/lib/geo';

export interface Campus {
  id: string;
  /** English key, translated in the UI. */
  label: string;
  center: LatLng;
  zoom: number;
}

/**
 * HCMUT campuses. CS1 centre is the middle of the Lý Thường Kiệt campus on OpenStreetMap;
 * CS2 is an approximate centre of the Dĩ An campus — admins refine positions on the map.
 */
export const CAMPUSES: Campus[] = [
  {
    id: 'cs1',
    label: 'Campus 1 · Ly Thuong Kiet',
    center: { lat: 10.7731, lng: 106.6598 },
    zoom: 17,
  },
  { id: 'cs2', label: 'Campus 2 · Di An', center: { lat: 10.8805, lng: 106.8053 }, zoom: 16 },
];

export const DEFAULT_CAMPUS = CAMPUSES[0];

/**
 * Base layers — all key-free. Tiles are requested with the page origin as Referer because
 * the app sets `<meta name="referrer" content="no-referrer">` and OpenStreetMap answers
 * referrer-less tile requests with a 403 "Access blocked" image. (CARTO now requires an API key.)
 */
const tileDefaults = {
  maxNativeZoom: 19,
  referrerPolicy: 'strict-origin-when-cross-origin',
} as const;

export const TILE_LAYERS = [
  {
    id: 'osm',
    label: 'Street map',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    ...tileDefaults,
  },
  {
    id: 'esri-street',
    label: 'Street map (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    ...tileDefaults,
  },
  {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics',
    ...tileDefaults,
  },
] as const;
