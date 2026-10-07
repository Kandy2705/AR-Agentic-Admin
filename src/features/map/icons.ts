import L from 'leaflet';

type PinTone = 'brand' | 'room' | 'selected' | 'muted';

const cache = new Map<string, L.DivIcon>();

/** Teardrop pin. The HTML is a static template — labels are rendered with React tooltips. */
export function pinIcon(tone: PinTone): L.DivIcon {
  const key = `pin-${tone}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      L.divIcon({
        className: '',
        html: `<span class="map-pin map-pin--${tone}"></span>`,
        iconSize: [26, 26],
        iconAnchor: [13, 30],
        tooltipAnchor: [0, -30],
        popupAnchor: [0, -30],
      }),
    );
  }
  return cache.get(key)!;
}

/** Small round marker for rooms / references. */
export function dotIcon(tone: 'room' | 'muted'): L.DivIcon {
  const key = `dot-${tone}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      L.divIcon({
        className: '',
        html: `<span class="map-dot map-dot--${tone}"></span>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        tooltipAnchor: [0, -8],
      }),
    );
  }
  return cache.get(key)!;
}
