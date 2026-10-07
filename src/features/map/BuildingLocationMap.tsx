import { Marker, Tooltip } from 'react-leaflet';
import { useI18n } from '@/i18n/context';
import type { LatLng } from '@/lib/geo';
import { BaseMap } from './BaseMap';
import { dotIcon, pinIcon } from './icons';
import type { MapReference } from './LocationPicker';

/** Building pin plus the estimated positions of its rooms. */
export default function BuildingLocationMap({
  position,
  label,
  rooms,
}: {
  position: LatLng;
  label: string;
  rooms: MapReference[];
}) {
  const { t } = useI18n();
  return (
    <BaseMap center={position} zoom={18}>
      <Marker position={[position.lat, position.lng]} icon={pinIcon('brand')}>
        <Tooltip permanent direction="top" className="map-label">
          {label}
        </Tooltip>
      </Marker>
      {rooms.map((room) => (
        <Marker
          key={room.id}
          position={[room.position.lat, room.position.lng]}
          icon={dotIcon('room')}
        >
          <Tooltip permanent={rooms.length <= 12} direction="top" className="map-label">
            {t('Room')} {room.label}
          </Tooltip>
        </Marker>
      ))}
    </BaseMap>
  );
}
