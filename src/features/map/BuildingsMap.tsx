import { latLngBounds } from 'leaflet';
import { useEffect, useMemo } from 'react';
import { Marker, Popup, Tooltip, useMap } from 'react-leaflet';
import { Link } from 'react-router';
import { useI18n } from '@/i18n/context';
import { latLngOf, type LatLng } from '@/lib/geo';
import type { Building } from '@/types/api';
import { BaseMap } from './BaseMap';
import { pinIcon } from './icons';

interface Located {
  building: Building;
  position: LatLng;
}

function FitToMarkers({ points }: { points: LatLng[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 1) map.setView([points[0].lat, points[0].lng], 18);
    if (points.length > 1) {
      map.fitBounds(latLngBounds(points.map((p) => [p.lat, p.lng])), {
        padding: [40, 40],
        maxZoom: 18,
      });
    }
  }, [map, points]);
  return null;
}

/** Overview of every building that has coordinates. */
export default function BuildingsMap({ buildings }: { buildings: Building[] }) {
  const { t } = useI18n();
  const located = useMemo<Located[]>(
    () =>
      buildings.flatMap((building) => {
        const position = latLngOf(building.latitude, building.longitude);
        return position ? [{ building, position }] : [];
      }),
    [buildings],
  );
  const missing = buildings.length - located.length;
  const points = useMemo(() => located.map((item) => item.position), [located]);

  return (
    <div className="space-y-2 p-5">
      <BaseMap className="h-[520px]">
        <FitToMarkers points={points} />
        {located.map(({ building, position }, index) => (
          <Marker
            key={building.id ?? index}
            position={[position.lat, position.lng]}
            icon={pinIcon('brand')}
          >
            <Tooltip permanent direction="top" className="map-label">
              {building.name || '—'}
            </Tooltip>
            <Popup>
              <strong className="block text-sm">{building.name || '—'}</strong>
              <span className="block font-mono text-xs text-muted">
                {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
              </span>
              {building.id && (
                <Link
                  to={`/buildings/${encodeURIComponent(building.id)}`}
                  className="mt-1 inline-block text-xs font-medium text-brand-600"
                >
                  {t('Details')} →
                </Link>
              )}
            </Popup>
          </Marker>
        ))}
      </BaseMap>
      {missing > 0 && (
        <p className="text-xs text-muted">
          {t('{count} buildings have no coordinates yet — open them and pick a point on the map.', {
            count: missing,
          })}
        </p>
      )}
    </div>
  );
}
