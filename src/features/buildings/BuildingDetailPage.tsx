import { ArrowLeft, ExternalLink, Layers, MapPinned, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useConfirmedAction } from '@/components/feedback/useConfirmedAction';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { buttonClasses } from '@/components/ui/button-styles';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { DetailList } from '@/components/ui/DetailList';
import { IconButton } from '@/components/ui/IconButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState, QueryView } from '@/components/ui/states';
import { useI18n } from '@/i18n/context';
import { idOf, safeHttpUrl } from '@/lib/utils';
import type { Building, Floor, Room } from '@/types/api';
import {
  useBuilding,
  useBuildingStructure,
  useDeleteBuilding,
  useDeleteFloor,
  useDeleteRoom,
  type FloorWithRooms,
} from './api';
import { BuildingDialog, FloorDialog, RoomDialog } from './dialogs';

type Editing =
  | { kind: 'building'; building: Building }
  | { kind: 'floor'; floor?: Floor }
  | { kind: 'room'; floorId: string; room?: Room }
  | null;

export default function BuildingDetailPage() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const building = useBuilding(id);
  const structure = useBuildingStructure(id);
  const [editing, setEditing] = useState<Editing>(null);
  const close = () => setEditing(null);

  return (
    <>
      <PageHeader
        title={t('Building details')}
        description={t('Campus destination, floor and room information.')}
        actions={
          <Link to="/buildings" className={buttonClasses()}>
            <ArrowLeft /> {t('Back')}
          </Link>
        }
      />

      <QueryView query={building}>
        {(data) => (
          <BuildingInfo
            id={id}
            building={data}
            onEdit={() => setEditing({ kind: 'building', building: data })}
          />
        )}
      </QueryView>

      <Card className="mt-6">
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Layers className="size-5 text-brand-500" aria-hidden />
              {t('Floors & rooms')}
            </span>
          }
          description={t('Indoor navigation structure and AR local coordinates.')}
          actions={
            <Button variant="primary" icon={<Plus />} onClick={() => setEditing({ kind: 'floor' })}>
              {t('Add floor')}
            </Button>
          }
        />
        <QueryView query={structure}>
          {(entries) =>
            entries.length ? (
              <div className="divide-y divide-line">
                {entries.map((entry) => (
                  <FloorSection
                    key={entry.floor.id ?? entry.floor.floorNumber}
                    buildingId={id}
                    entry={entry}
                    onEditFloor={(floor) => setEditing({ kind: 'floor', floor })}
                    onEditRoom={(floorId, room) => setEditing({ kind: 'room', floorId, room })}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No floors yet"
                description="No floors have been added for this building yet."
              />
            )
          }
        </QueryView>
      </Card>

      {editing?.kind === 'building' && (
        <BuildingDialog building={editing.building} onClose={close} />
      )}
      {editing?.kind === 'floor' && (
        <FloorDialog buildingId={id} floor={editing.floor} onClose={close} />
      )}
      {editing?.kind === 'room' && (
        <RoomDialog buildingId={id} floorId={editing.floorId} room={editing.room} onClose={close} />
      )}
    </>
  );
}

function BuildingInfo({
  id,
  building,
  onEdit,
}: {
  id: string;
  building: Building;
  onEdit: () => void;
}) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const remove = useDeleteBuilding();
  const runConfirmed = useConfirmedAction();
  const { latitude: lat, longitude: lng } = building;
  const hasCoordinates =
    lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);

  return (
    <Card>
      <CardHeader title={building.name || t('Building details')} />
      <CardBody className="space-y-6">
        <DetailList
          items={[
            ['ID', <code className="text-[13px]">{id}</code>],
            [t('Name'), building.name || '—'],
            [t('Latitude'), lat ?? '—'],
            [t('Longitude'), lng ?? '—'],
          ]}
        />
        <div>
          <h3 className="text-xs font-medium tracking-wide text-muted uppercase">
            {t('Description')}
          </h3>
          <p className="mt-1 whitespace-pre-wrap">{building.content || '—'}</p>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line pt-5">
          <Button variant="primary" icon={<Pencil />} onClick={onEdit}>
            {t('Edit building')}
          </Button>
          <Button
            variant="danger-outline"
            icon={<Trash2 />}
            onClick={() =>
              void runConfirmed({
                title: t('Delete building?'),
                description: `${building.name ?? ''}. ${t('This action cannot be undone.')}`,
                run: () => remove.mutateAsync(id),
                onDone: () => navigate('/buildings'),
              })
            }
          >
            {t('Delete')}
          </Button>
          {hasCoordinates ? (
            <a
              className={buttonClasses()}
              href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MapPinned /> {t('Open map')}
            </a>
          ) : (
            <span className="self-center text-[13px] text-muted">
              {t('Coordinates are not available.')}
            </span>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function SourceLink({ url, label }: { url: string | null; label: string }) {
  const href = safeHttpUrl(url);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[13px] font-medium text-brand-600 hover:underline"
    >
      {label}
      <ExternalLink className="size-3.5" aria-hidden />
    </a>
  );
}

function VerifiedBadge({ verified }: { verified: boolean }) {
  const { t } = useI18n();
  return (
    <Badge tone={verified ? 'success' : 'neutral'}>{t(verified ? 'Verified' : 'Unverified')}</Badge>
  );
}

function FloorSection({
  buildingId,
  entry: { floor, rooms },
  onEditFloor,
  onEditRoom,
}: {
  buildingId: string;
  entry: FloorWithRooms;
  onEditFloor: (floor: Floor) => void;
  onEditRoom: (floorId: string, room?: Room) => void;
}) {
  const { t } = useI18n();
  const runConfirmed = useConfirmedAction();
  const deleteFloor = useDeleteFloor(buildingId);
  const deleteRoom = useDeleteRoom(buildingId);
  const floorId = idOf(floor);
  const floorName = floor.name || t('Floor {number}', { number: floor.floorNumber });

  const columns: Column<Room>[] = [
    {
      header: t('Room'),
      cell: (room) => (
        <div>
          <strong className="font-semibold">{room.roomCode || '—'}</strong>
          <span className="block text-xs text-muted">{room.name || '—'}</span>
        </div>
      ),
    },
    { header: t('Type'), cell: (room) => room.roomType || '—' },
    {
      header: t('AR local position'),
      cell: (room) => (
        <code className="text-[13px] text-muted">
          {room.localX === null && room.localY === null && room.localZ === null
            ? '—'
            : `${room.localX ?? '—'}, ${room.localY ?? '—'}, ${room.localZ ?? '—'}`}
        </code>
      ),
    },
    {
      header: t('Verification'),
      cell: (room) => (
        <div className="flex items-center gap-2">
          <VerifiedBadge verified={room.verified} />
          <SourceLink url={room.sourceUrl} label={t('Source')} />
        </div>
      ),
    },
    {
      header: t('Actions'),
      className: 'w-px text-right',
      cell: (room) =>
        room.id && (
          <div className="flex justify-end gap-1">
            <IconButton
              label={t('Edit room')}
              icon={<Pencil />}
              onClick={() => onEditRoom(floorId, room)}
            />
            <IconButton
              label={t('Delete room')}
              icon={<Trash2 />}
              tone="danger"
              onClick={() =>
                void runConfirmed({
                  title: t('Delete room?'),
                  description: `${room.roomCode ?? ''}. ${t('This action cannot be undone.')}`,
                  run: () => deleteRoom.mutateAsync(idOf(room)),
                })
              }
            />
          </div>
        ),
    },
  ];

  return (
    <section aria-label={floorName}>
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-xl bg-brand-100 text-sm font-semibold text-brand-700 tabular-nums">
            {floor.floorNumber}
          </span>
          <div>
            <h3 className="font-semibold">{floorName}</h3>
            <p className="text-xs text-muted">{t('{count} rooms', { count: rooms.length })}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <VerifiedBadge verified={floor.verified} />
          <SourceLink url={floor.floorPlanUrl} label={t('Floor plan')} />
          <SourceLink url={floor.sourceUrl} label={t('Source')} />
          <Button size="sm" icon={<Plus />} onClick={() => onEditRoom(floorId)}>
            {t('Add room')}
          </Button>
          <IconButton
            label={t('Edit floor')}
            icon={<Pencil />}
            onClick={() => onEditFloor(floor)}
          />
          <IconButton
            label={t('Delete floor')}
            icon={<Trash2 />}
            tone="danger"
            onClick={() =>
              void runConfirmed({
                title: t('Delete floor?'),
                description: `${floorName}. ${t('This also deletes rooms on this floor.')}`,
                run: () => deleteFloor.mutateAsync(floorId),
              })
            }
          />
        </div>
      </div>
      <DataTable
        caption={t('Rooms')}
        columns={columns}
        rows={rooms}
        rowKey={(room, i) => room.id ?? `room-${i}`}
        empty={
          <p className="px-5 py-4 text-[13px] text-muted">{t('No rooms on this floor yet.')}</p>
        }
      />
    </section>
  );
}
