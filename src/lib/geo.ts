/**
 * Geodetic helpers (WGS 84) following the report, §2.1.3–2.1.4:
 * Geodetic → ECEF → ENU, and the Unity mapping (x, y, z)_Unity = (east, up, north).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Enu {
  east: number;
  north: number;
  up: number;
}

/** WGS 84 semi-major axis (m) and first eccentricity squared. */
const A = 6_378_137;
const E2 = 6.69437999014e-3;
const toRad = (deg: number) => (deg * Math.PI) / 180;
const toDeg = (rad: number) => (rad * 180) / Math.PI;

export function isLatLng(value: Partial<LatLng> | null | undefined): value is LatLng {
  return (
    !!value &&
    typeof value.lat === 'number' &&
    typeof value.lng === 'number' &&
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng) &&
    Math.abs(value.lat) <= 90 &&
    Math.abs(value.lng) <= 180
  );
}

/** Builds a LatLng from nullable numbers (API fields) or returns null. */
export function latLngOf(lat: number | null | undefined, lng: number | null | undefined) {
  const point = { lat: lat ?? NaN, lng: lng ?? NaN };
  return isLatLng(point) ? point : null;
}

export function geodeticToEcef({ lat, lng }: LatLng, height = 0): [number, number, number] {
  const phi = toRad(lat);
  const lambda = toRad(lng);
  const n = A / Math.sqrt(1 - E2 * Math.sin(phi) ** 2);
  return [
    (n + height) * Math.cos(phi) * Math.cos(lambda),
    (n + height) * Math.cos(phi) * Math.sin(lambda),
    ((1 - E2) * n + height) * Math.sin(phi),
  ];
}

/** ECEF → geodetic (Bowring iteration, sub-millimetre at campus scale). */
export function ecefToGeodetic([x, y, z]: [number, number, number]): LatLng & { height: number } {
  const lng = Math.atan2(y, x);
  const p = Math.hypot(x, y);
  let phi = Math.atan2(z, p * (1 - E2));
  let height = 0;
  for (let i = 0; i < 6; i += 1) {
    const n = A / Math.sqrt(1 - E2 * Math.sin(phi) ** 2);
    height = p / Math.cos(phi) - n;
    phi = Math.atan2(z, p * (1 - (E2 * n) / (n + height)));
  }
  return { lat: toDeg(phi), lng: toDeg(lng), height };
}

/** Position of `point` in the local ENU frame whose origin is `origin` (metres). */
export function toEnu(point: LatLng, origin: LatLng, height = 0, originHeight = 0): Enu {
  const [x, y, z] = geodeticToEcef(point, height);
  const [xr, yr, zr] = geodeticToEcef(origin, originHeight);
  const [dx, dy, dz] = [x - xr, y - yr, z - zr];
  const phi = toRad(origin.lat);
  const lambda = toRad(origin.lng);
  return {
    east: -Math.sin(lambda) * dx + Math.cos(lambda) * dy,
    north:
      -Math.sin(phi) * Math.cos(lambda) * dx -
      Math.sin(phi) * Math.sin(lambda) * dy +
      Math.cos(phi) * dz,
    up:
      Math.cos(phi) * Math.cos(lambda) * dx +
      Math.cos(phi) * Math.sin(lambda) * dy +
      Math.sin(phi) * dz,
  };
}

/** Inverse of {@link toEnu}: ENU offset (metres) around `origin` → latitude/longitude. */
export function fromEnu({ east, north, up }: Enu, origin: LatLng, originHeight = 0): LatLng {
  const phi = toRad(origin.lat);
  const lambda = toRad(origin.lng);
  const dx =
    -Math.sin(lambda) * east -
    Math.sin(phi) * Math.cos(lambda) * north +
    Math.cos(phi) * Math.cos(lambda) * up;
  const dy =
    Math.cos(lambda) * east -
    Math.sin(phi) * Math.sin(lambda) * north +
    Math.cos(phi) * Math.sin(lambda) * up;
  const dz = Math.cos(phi) * north + Math.sin(phi) * up;
  const [xr, yr, zr] = geodeticToEcef(origin, originHeight);
  const { lat, lng } = ecefToGeodetic([xr + dx, yr + dy, zr + dz]);
  return { lat, lng };
}

/** Unity is left-handed: (x, y, z)_Unity = (east, up, north) — report §2.1.4. */
export const enuToUnity = ({ east, north, up }: Enu) => ({ x: east, y: up, z: north });
export const unityToEnu = ({ x, y, z }: { x: number; y: number; z: number }): Enu => ({
  east: x,
  north: z,
  up: y,
});

/** Straight-line distance in metres (via ENU; accurate for campus distances). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const { east, north } = toEnu(b, a);
  return Math.hypot(east, north);
}

/**
 * Area-weighted centroid of a polygon drawn on the map. Computed in a local ENU plane,
 * so it is correct for campus-sized shapes. Degenerate shapes fall back to the vertex mean.
 */
export function polygonCentroid(points: readonly LatLng[]): LatLng | null {
  if (!points.length) return null;
  const origin = points[0];
  const local = points.map((point) => toEnu(point, origin));
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < local.length; i += 1) {
    const a = local[i];
    const b = local[(i + 1) % local.length];
    const cross = a.east * b.north - b.east * a.north;
    area += cross;
    cx += (a.east + b.east) * cross;
    cy += (a.north + b.north) * cross;
  }
  if (Math.abs(area) < 1e-6) {
    const mean = local.reduce(
      (sum, p) => ({
        east: sum.east + p.east / local.length,
        north: sum.north + p.north / local.length,
      }),
      { east: 0, north: 0 },
    );
    return fromEnu({ ...mean, up: 0 }, origin);
  }
  area /= 2;
  return fromEnu({ east: cx / (6 * area), north: cy / (6 * area), up: 0 }, origin);
}

/** Polygon area in m² (local plane). */
export function polygonArea(points: readonly LatLng[]): number {
  if (points.length < 3) return 0;
  const local = points.map((point) => toEnu(point, points[0]));
  let sum = 0;
  for (let i = 0; i < local.length; i += 1) {
    const a = local[i];
    const b = local[(i + 1) % local.length];
    sum += a.east * b.north - b.east * a.north;
  }
  return Math.abs(sum) / 2;
}

/** Rounds to a fixed number of decimals without trailing float noise. */
export const round = (value: number, decimals: number) => Number(value.toFixed(decimals));
