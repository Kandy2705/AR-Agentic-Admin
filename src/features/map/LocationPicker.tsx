import type L from 'leaflet';
import { Crosshair, Hexagon, Loader2, MapPin, Search, Undo2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  CircleMarker,
  Marker,
  Polygon,
  Polyline,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/form';
import { useI18n } from '@/i18n/context';
import { cn } from '@/lib/cn';
import { errorMessageKey } from '@/lib/errors';
import { polygonArea, polygonCentroid, toEnu, type LatLng } from '@/lib/geo';
import { searchPlaces, type Place } from '@/services/geocoding.service';
import { BaseMap } from './BaseMap';
import { DEFAULT_CAMPUS } from './campus';
import { dotIcon, pinIcon } from './icons';

export interface MapReference {
  id: string;
  position: LatLng;
  label: string;
}

export interface LocationPickerProps {
  value: LatLng | null;
  onChange: (point: LatLng) => void;
  /** When set, the readout shows East/North metres from this origin (ENU, report §2.1.3). */
  origin?: LatLng | null;
  originLabel?: string;
  /** Other known points shown for orientation (other buildings / rooms). */
  references?: MapReference[];
}

type Mode = 'pin' | 'area';

const toLeaflet = (p: LatLng): [number, number] => [p.lat, p.lng];

function ClickCapture({ onClick }: { onClick: (point: LatLng) => void }) {
  useMapEvents({ click: (event) => onClick({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

/** Pans to the selected point when it leaves the viewport (e.g. typed into the fields). */
function KeepInView({ point }: { point: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    if (point && !map.getBounds().contains(toLeaflet(point))) {
      map.panTo(toLeaflet(point));
    }
  }, [map, point]);
  return null;
}

/**
 * Pick a coordinate by clicking/dragging a pin, drawing an area (its centroid is used),
 * searching an address, or using the device's GPS.
 */
export default function LocationPicker({
  value,
  onChange,
  origin,
  originLabel,
  references = [],
}: LocationPickerProps) {
  const { t, formatNumber } = useI18n();
  const [map, setMap] = useState<L.Map | null>(null);
  const [mode, setMode] = useState<Mode>('pin');
  const [vertices, setVertices] = useState<LatLng[]>([]);
  const [area, setArea] = useState<LatLng[] | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const searchControl = useRef<AbortController | null>(null);

  useEffect(() => () => searchControl.current?.abort(), []);
  useEffect(() => {
    map?.getContainer().classList.toggle('picking', true);
  }, [map]);

  const select = useCallback(
    (point: LatLng, zoom?: number) => {
      onChange(point);
      if (map && zoom) map.flyTo(toLeaflet(point), Math.max(map.getZoom(), zoom));
    },
    [map, onChange],
  );

  const handleMapClick = (point: LatLng) => {
    if (mode === 'pin') onChange(point);
    else setVertices((current) => [...current, point]);
  };

  const finishArea = () => {
    const center = polygonCentroid(vertices);
    if (!center) return;
    setArea(vertices);
    setVertices([]);
    setMode('pin');
    onChange(center);
  };

  const search = async (event?: { preventDefault: () => void }) => {
    event?.preventDefault();
    const text = query.trim();
    if (!text) return;
    searchControl.current?.abort();
    const control = new AbortController();
    searchControl.current = control;
    setSearching(true);
    setMessage(null);
    try {
      const center = map ? map.getCenter() : DEFAULT_CAMPUS.center;
      setResults(await searchPlaces(text, { lat: center.lat, lng: center.lng }, control.signal));
    } catch (error) {
      if (!control.signal.aborted) setMessage(errorMessageKey(error));
    } finally {
      if (!control.signal.aborted) setSearching(false);
    }
  };

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setMessage('This browser cannot share its location.');
      return;
    }
    setLocating(true);
    setMessage(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocating(false);
        select({ lat: coords.latitude, lng: coords.longitude }, 19);
        if (coords.accuracy > 30) {
          setMessage(
            t('GPS accuracy is about {meters} m — adjust the pin if needed.', {
              meters: Math.round(coords.accuracy),
            }),
          );
        }
      },
      () => {
        setLocating(false);
        setMessage('Location permission was denied or unavailable.');
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  const offset = value && origin ? toEnu(value, origin) : null;
  const drawing = mode === 'area';
  const center = value ?? origin ?? references[0]?.position ?? DEFAULT_CAMPUS.center;

  return (
    <div className="flex flex-col gap-3">
      {/* Search (a <div>, not a <form>, because the picker lives inside the dialog's form). */}
      <div className="relative">
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">{t('Search an address or place')}</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') void search(event);
              }}
              placeholder={t('Search an address or place (e.g. Bach Khoa B4)')}
              maxLength={200}
              className="pl-9"
            />
          </label>
          <Button type="button" loading={searching} onClick={(event) => void search(event)}>
            {t('Search')}
          </Button>
        </div>
        {results && (
          <ul className="absolute inset-x-0 top-full z-[1000] mt-1 max-h-60 overflow-y-auto rounded-xl border border-line bg-white py-1 shadow-pop">
            {results.length ? (
              results.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setResults(null);
                      select(place.position, 18);
                    }}
                    className="flex w-full items-start gap-2 px-3 py-2 text-left text-[13px] hover:bg-brand-50"
                  >
                    <MapPin className="mt-0.5 size-4 shrink-0 text-brand-500" aria-hidden />
                    <span className="line-clamp-2">{place.name}</span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-[13px] text-muted">
                {t('No places found. Try another name or pick on the map.')}
              </li>
            )}
            <li className="border-t border-line px-3 pt-1.5 pb-1 text-right">
              <button
                type="button"
                className="text-xs text-muted hover:text-ink"
                onClick={() => setResults(null)}
              >
                {t('Close')}
              </button>
            </li>
          </ul>
        )}
      </div>

      <BaseMap
        center={center}
        zoom={value || origin ? 18 : DEFAULT_CAMPUS.zoom}
        onReady={setMap}
        toolbar={
          <div className="ml-auto flex flex-wrap gap-2">
            <ModeButton active={!drawing} icon={<MapPin />} onClick={() => setMode('pin')}>
              {t('Drop pin')}
            </ModeButton>
            <ModeButton
              active={drawing}
              icon={<Hexagon />}
              onClick={() => {
                setMode('area');
                setVertices([]);
              }}
            >
              {t('Draw area')}
            </ModeButton>
            <ModeButton
              active={false}
              icon={locating ? <Loader2 className="animate-spin" /> : <Crosshair />}
              onClick={locate}
            >
              {t('My location')}
            </ModeButton>
          </div>
        }
      >
        <ClickCapture onClick={handleMapClick} />
        <KeepInView point={value} />
        {origin && (
          <Marker position={toLeaflet(origin)} icon={pinIcon('brand')} interactive={false}>
            <Tooltip permanent direction="top" className="map-label">
              {originLabel ?? t('Building origin')}
            </Tooltip>
          </Marker>
        )}
        {references.map((reference) => (
          <Marker
            key={reference.id}
            position={toLeaflet(reference.position)}
            icon={dotIcon('muted')}
            interactive
          >
            <Tooltip direction="top" className="map-label">
              {reference.label}
            </Tooltip>
          </Marker>
        ))}
        {area && (
          <Polygon
            positions={area.map(toLeaflet)}
            pathOptions={{ color: '#7658df', weight: 2, fillOpacity: 0.12 }}
          />
        )}
        {drawing && vertices.length > 0 && (
          <>
            {vertices.length >= 3 ? (
              <Polygon
                positions={vertices.map(toLeaflet)}
                pathOptions={{ color: '#e11d48', weight: 2, dashArray: '6 4', fillOpacity: 0.1 }}
              />
            ) : (
              <Polyline
                positions={vertices.map(toLeaflet)}
                pathOptions={{ color: '#e11d48', weight: 2, dashArray: '6 4' }}
              />
            )}
            {vertices.map((vertex, index) => (
              <CircleMarker
                key={index}
                center={toLeaflet(vertex)}
                radius={5}
                pathOptions={{ color: '#fff', weight: 2, fillColor: '#e11d48', fillOpacity: 1 }}
              />
            ))}
          </>
        )}
        {value && (
          <Marker
            position={toLeaflet(value)}
            icon={pinIcon('selected')}
            draggable={!drawing}
            eventHandlers={{
              dragend: (event) => {
                const { lat, lng } = (event.target as L.Marker).getLatLng();
                onChange({ lat, lng });
              },
            }}
          />
        )}
      </BaseMap>

      {drawing ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-[13px] text-rose-700">
          <span className="flex-1">
            {t('Click around the building outline. {count} points', { count: vertices.length })}
            {vertices.length >= 3 && ` · ≈ ${formatNumber(Math.round(polygonArea(vertices)))} m²`}
          </span>
          <Button
            size="sm"
            icon={<Undo2 />}
            disabled={!vertices.length}
            onClick={() => setVertices((v) => v.slice(0, -1))}
          >
            {t('Undo')}
          </Button>
          <Button
            size="sm"
            icon={<X />}
            onClick={() => {
              setVertices([]);
              setMode('pin');
            }}
          >
            {t('Cancel')}
          </Button>
          <Button size="sm" variant="primary" disabled={vertices.length < 3} onClick={finishArea}>
            {t('Use area centre')}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted">
          {t(
            'Click the map or drag the red pin. Coordinates are estimates — refine them on site if needed.',
          )}
          {area && (
            <button
              type="button"
              className="ml-2 font-medium text-brand-600 hover:underline"
              onClick={() => setArea(null)}
            >
              {t('Clear area')}
            </button>
          )}
        </p>
      )}

      <div
        className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-ink"
        aria-live="polite"
      >
        {value ? (
          <>
            <span>
              lat {value.lat.toFixed(6)} · lng {value.lng.toFixed(6)}
            </span>
            {offset && (
              <span>
                {t('East')} {offset.east.toFixed(2)} m · {t('North')} {offset.north.toFixed(2)} m
              </span>
            )}
          </>
        ) : (
          <span className="font-sans text-muted">{t('No point selected yet.')}</span>
        )}
      </div>
      {message && <p className="text-xs text-rose-600">{t(message)}</p>}
    </div>
  );
}

function ModeButton({
  active,
  icon,
  onClick,
  children,
}: {
  active: boolean;
  icon: ReactNode;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium [&_svg]:size-3.5',
        active
          ? 'border-brand-500 bg-brand-500 text-white'
          : 'border-line bg-white text-ink hover:border-brand-200 hover:bg-brand-50',
      )}
    >
      {icon}
      {children}
    </button>
  );
}
