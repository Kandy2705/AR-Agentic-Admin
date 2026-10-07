import { FormDialog } from '@/components/ui/FormDialog';
import { CheckboxField, TextAreaField, TextField } from '@/components/ui/fields';
import { Notice } from '@/components/ui/Notice';
import { useMemo } from 'react';
import { useCurrentUser } from '@/features/auth/auth-context';
import { LocationPicker, type MapReference } from '@/features/map';
import { useDialogForm } from '@/hooks/useDialogForm';
import { useI18n } from '@/i18n/context';
import { fromEnu, latLngOf, round, toEnu, unityToEnu, type LatLng } from '@/lib/geo';
import { idOf } from '@/lib/utils';
import type { Building, Floor, Room } from '@/types/api';
import { useBuildings, useSaveBuilding, useSaveFloor, useSaveRoom } from './api';
import {
  buildingSchema,
  floorSchema,
  roomSchema,
  toBuildingForm,
  toBuildingInput,
  toFloorForm,
  toFloorInput,
  toRoomForm,
  toRoomInput,
} from './schema';

interface DialogBase {
  onClose: () => void;
}

/** Form strings → number, or null when empty/invalid. */
const parseNumber = (value: string | undefined) =>
  value?.trim() && Number.isFinite(Number(value)) ? Number(value) : null;

const setOptions = { shouldDirty: true, shouldValidate: true } as const;

export function BuildingDialog({ building, onClose }: DialogBase & { building?: Building }) {
  const { t } = useI18n();
  const me = useCurrentUser();
  const save = useSaveBuilding();
  const { form, onSubmit } = useDialogForm({
    schema: buildingSchema,
    defaultValues: toBuildingForm(building),
    onClose,
    submit: (values) =>
      save.mutateAsync({
        id: building ? idOf(building) : undefined,
        body: toBuildingInput(values),
        ownerId: me.id,
      }),
  });
  const buildings = useBuildings();
  const [latitude, longitude] = form.watch(['latitude', 'longitude']);
  const point = latLngOf(parseNumber(latitude), parseNumber(longitude));
  const references = useMemo<MapReference[]>(
    () =>
      (buildings.data ?? []).flatMap((other) => {
        const position = latLngOf(other.latitude, other.longitude);
        return position && other.id && other.id !== building?.id
          ? [{ id: other.id, position, label: other.name ?? other.id }]
          : [];
      }),
    [buildings.data, building?.id],
  );
  const pick = ({ lat, lng }: LatLng) => {
    form.setValue('latitude', String(round(lat, 7)), setOptions);
    form.setValue('longitude', String(round(lng, 7)), setOptions);
  };

  return (
    <FormDialog
      open
      size="lg"
      onClose={onClose}
      title={t(building ? 'Edit building' : 'Add building')}
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={form.formState.errors.root?.message && t(form.formState.errors.root.message)}
    >
      <TextField form={form} name="name" label={t('Name')} required maxLength={200} />
      <TextAreaField form={form} name="content" label={t('Description')} maxLength={10000} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          form={form}
          name="latitude"
          label={t('Latitude')}
          type="number"
          step="any"
          min={-90}
          max={90}
          placeholder="10.7725"
        />
        <TextField
          form={form}
          name="longitude"
          label={t('Longitude')}
          type="number"
          step="any"
          min={-180}
          max={180}
          placeholder="106.6580"
        />
      </div>
      <section aria-label={t('Location on map')} className="space-y-2">
        <h3 className="text-[13px] font-medium">{t('Location on map')}</h3>
        <LocationPicker value={point} onChange={pick} references={references} />
      </section>
      <Notice>
        {t(
          'Coordinates are optional. Floors and rooms can be managed from the building detail page.',
        )}
      </Notice>
    </FormDialog>
  );
}

export function FloorDialog({
  buildingId,
  floor,
  onClose,
}: DialogBase & { buildingId: string; floor?: Floor }) {
  const { t } = useI18n();
  const save = useSaveFloor(buildingId);
  const { form, onSubmit } = useDialogForm({
    schema: floorSchema,
    defaultValues: toFloorForm(floor),
    onClose,
    submit: (values) =>
      save.mutateAsync({ id: floor ? idOf(floor) : undefined, body: toFloorInput(values) }),
  });
  return (
    <FormDialog
      open
      onClose={onClose}
      title={t(floor ? 'Edit floor' : 'Add floor')}
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={form.formState.errors.root?.message && t(form.formState.errors.root.message)}
    >
      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <TextField
          form={form}
          name="floorNumber"
          label={t('Floor number')}
          type="number"
          step="1"
          required
        />
        <TextField
          form={form}
          name="name"
          label={t('Name')}
          maxLength={200}
          placeholder={t('Ground floor')}
        />
      </div>
      <TextField
        form={form}
        name="floorPlanUrl"
        label={t('Floor plan URL')}
        type="url"
        maxLength={1000}
      />
      <TextField form={form} name="sourceUrl" label={t('Source URL')} type="url" maxLength={1000} />
      <CheckboxField form={form} name="verified" label={t('Verified')} />
    </FormDialog>
  );
}

export function RoomDialog({
  buildingId,
  floorId,
  room,
  origin,
  originLabel,
  references = [],
  onClose,
}: DialogBase & {
  buildingId: string;
  floorId: string;
  room?: Room;
  /** Building coordinates: the ENU origin of the room's AR local position. */
  origin: LatLng | null;
  originLabel?: string;
  /** Other rooms of the building (for orientation on the map). */
  references?: MapReference[];
}) {
  const { t } = useI18n();
  const save = useSaveRoom(buildingId);
  const { form, onSubmit } = useDialogForm({
    schema: roomSchema,
    defaultValues: toRoomForm(room),
    onClose,
    submit: (values) =>
      save.mutateAsync({ id: room ? idOf(room) : undefined, floorId, body: toRoomInput(values) }),
  });
  const [localX, localZ] = form.watch(['localX', 'localZ']);
  const x = parseNumber(localX);
  const z = parseNumber(localZ);
  const point =
    origin && x !== null && z !== null ? fromEnu(unityToEnu({ x, y: 0, z }), origin) : null;
  /** Report §2.1.4: Unity X = East, Z = North, relative to the building origin. */
  const pick = (target: LatLng) => {
    if (!origin) return;
    const { east, north } = toEnu(target, origin);
    form.setValue('localX', String(round(east, 2)), setOptions);
    form.setValue('localZ', String(round(north, 2)), setOptions);
  };

  return (
    <FormDialog
      open
      size="lg"
      onClose={onClose}
      title={t(room ? 'Edit room' : 'Add room')}
      onSubmit={onSubmit}
      submitting={form.formState.isSubmitting}
      error={form.formState.errors.root?.message && t(form.formState.errors.root.message)}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          form={form}
          name="roomCode"
          label={t('Room code')}
          required
          maxLength={100}
          placeholder="202 / PM1"
        />
        <TextField form={form} name="name" label={t('Name')} maxLength={200} />
        <TextField
          form={form}
          name="roomType"
          label={t('Room type')}
          maxLength={200}
          placeholder={t('Classroom')}
        />
      </div>
      <TextAreaField
        form={form}
        name="description"
        label={t('Description')}
        maxLength={5000}
        rows={3}
      />
      <fieldset className="rounded-xl border border-line p-4">
        <legend className="px-1 text-[13px] font-medium">{t('AR local position')}</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField form={form} name="localX" label={t('X · East (m)')} type="number" step="any" />
          <TextField
            form={form}
            name="localY"
            label={t('Y · Height (m)')}
            type="number"
            step="any"
          />
          <TextField
            form={form}
            name="localZ"
            label={t('Z · North (m)')}
            type="number"
            step="any"
          />
        </div>
        <div className="mt-4">
          {origin ? (
            <LocationPicker
              value={point}
              onChange={pick}
              origin={origin}
              originLabel={originLabel}
              references={references}
            />
          ) : (
            <Notice>{t('Set the building coordinates first to pick this room on the map.')}</Notice>
          )}
        </div>
        <p className="mt-3 text-xs text-muted">
          {t(
            'Picking on the map fills X (east) and Z (north) in metres from the building point, using the ENU → Unity mapping of the report (§2.1.4). Y is the height and stays manual.',
          )}
        </p>
      </fieldset>
      <TextField form={form} name="sourceUrl" label={t('Source URL')} type="url" maxLength={1000} />
      <CheckboxField form={form} name="verified" label={t('Verified')} />
    </FormDialog>
  );
}
