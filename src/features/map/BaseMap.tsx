import 'leaflet/dist/leaflet.css';
import './map.css';
import type L from 'leaflet';
import { LocateFixed } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { LayersControl, MapContainer, TileLayer, useMap } from 'react-leaflet';
import { useI18n } from '@/i18n/context';
import { cn } from '@/lib/cn';
import type { LatLng } from '@/lib/geo';
import { CAMPUSES, DEFAULT_CAMPUS, TILE_LAYERS } from './campus';

/** Keeps Leaflet's size in sync with its container (dialogs, collapsible sidebar, resize). */
function AutoResize() {
  const map = useMap();
  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    const frame = requestAnimationFrame(() => map.invalidateSize());
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [map]);
  return null;
}

interface BaseMapProps {
  center?: LatLng;
  zoom?: number;
  className?: string;
  /** Extra controls rendered above the map (outside Leaflet). */
  toolbar?: ReactNode;
  onReady?: (map: L.Map) => void;
  children?: ReactNode;
}

/**
 * Leaflet map with street/satellite layers and quick jumps to the HCMUT campuses.
 * `isolate` keeps Leaflet's z-indexes from covering the app's sticky header and sidebar.
 */
export function BaseMap({
  center = DEFAULT_CAMPUS.center,
  zoom = DEFAULT_CAMPUS.zoom,
  className,
  toolbar,
  onReady,
  children,
}: BaseMapProps) {
  const { t } = useI18n();
  const [map, setMap] = useState<L.Map | null>(null);

  useEffect(() => {
    if (map) onReady?.(map);
  }, [map, onReady]);

  return (
    <div className="isolate flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {CAMPUSES.map((campus) => (
          <button
            key={campus.id}
            type="button"
            onClick={() => map?.flyTo([campus.center.lat, campus.center.lng], campus.zoom)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-xs font-medium text-ink hover:border-brand-200 hover:bg-brand-50"
          >
            <LocateFixed className="size-3.5 text-brand-500" aria-hidden />
            {t(campus.label)}
          </button>
        ))}
        {toolbar}
      </div>
      <MapContainer
        ref={setMap}
        center={[center.lat, center.lng]}
        zoom={zoom}
        maxZoom={20}
        scrollWheelZoom
        className={cn('h-80 w-full overflow-hidden rounded-xl border border-line', className)}
      >
        <LayersControl position="topright">
          {TILE_LAYERS.map(({ id, label, ...layer }, index) => (
            <LayersControl.BaseLayer key={id} checked={index === 0} name={t(label)}>
              <TileLayer {...layer} maxZoom={20} />
            </LayersControl.BaseLayer>
          ))}
        </LayersControl>
        <AutoResize />
        {children}
      </MapContainer>
    </div>
  );
}
