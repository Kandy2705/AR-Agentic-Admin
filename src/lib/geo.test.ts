import { describe, expect, it } from 'vitest';
import {
  distanceMeters,
  enuToUnity,
  fromEnu,
  latLngOf,
  polygonArea,
  polygonCentroid,
  toEnu,
  unityToEnu,
} from './geo';

const HCMUT = { lat: 10.77297, lng: 106.6587 };

describe('geo (WGS 84 / ENU)', () => {
  it('origin maps to zero and ENU round-trips', () => {
    const zero = toEnu(HCMUT, HCMUT);
    expect(Math.abs(zero.east) + Math.abs(zero.north)).toBe(0);
    const enu = { east: 120.5, north: -42.25, up: 0 };
    const back = toEnu(fromEnu(enu, HCMUT), HCMUT);
    expect(back.east).toBeCloseTo(enu.east, 3);
    expect(back.north).toBeCloseTo(enu.north, 3);
  });

  it('east/north follow the compass', () => {
    const north = toEnu({ lat: HCMUT.lat + 0.001, lng: HCMUT.lng }, HCMUT);
    expect(north.north).toBeGreaterThan(110);
    expect(north.north).toBeLessThan(111);
    expect(Math.abs(north.east)).toBeLessThan(0.01);
    const east = toEnu({ lat: HCMUT.lat, lng: HCMUT.lng + 0.001 }, HCMUT);
    expect(east.east).toBeGreaterThan(109);
    expect(east.east).toBeLessThan(110);
  });

  it('maps ENU to Unity axes as in report §2.1.4', () => {
    expect(enuToUnity({ east: 1, north: 2, up: 3 })).toEqual({ x: 1, y: 3, z: 2 });
    expect(unityToEnu({ x: 1, y: 3, z: 2 })).toEqual({ east: 1, north: 2, up: 3 });
  });

  it('computes the centroid and area of a drawn square (~100 m)', () => {
    const square = [
      fromEnu({ east: 0, north: 0, up: 0 }, HCMUT),
      fromEnu({ east: 100, north: 0, up: 0 }, HCMUT),
      fromEnu({ east: 100, north: 100, up: 0 }, HCMUT),
      fromEnu({ east: 0, north: 100, up: 0 }, HCMUT),
    ];
    const center = toEnu(polygonCentroid(square)!, HCMUT);
    expect(center.east).toBeCloseTo(50, 1);
    expect(center.north).toBeCloseTo(50, 1);
    expect(polygonArea(square)).toBeCloseTo(10_000, -1);
    expect(distanceMeters(square[0], square[1])).toBeCloseTo(100, 1);
  });

  it('validates nullable API coordinates', () => {
    expect(latLngOf(null, 1)).toBeNull();
    expect(latLngOf(91, 1)).toBeNull();
    expect(latLngOf(0, 0)).toEqual({ lat: 0, lng: 0 });
  });
});
