import { FormDialog } from '@/components/ui/FormDialog';
import { CheckboxField, TextAreaField, TextField } from '@/components/ui/fields';
import { Notice } from '@/components/ui/Notice';
import { useCurrentUser } from '@/features/auth/auth-context';
import { useDialogForm } from '@/hooks/useDialogForm';
import { useI18n } from '@/i18n/context';
import { idOf } from '@/lib/utils';
import type { Building, Floor, Room } from '@/types/api';
import { useSaveBuilding, useSaveFloor, useSaveRoom } from './api';
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
  return (
    <FormDialog
      open
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
  onClose,
}: DialogBase & { buildingId: string; floorId: string; room?: Room }) {
  const { t } = useI18n();
  const save = useSaveRoom(buildingId);
  const { form, onSubmit } = useDialogForm({
    schema: roomSchema,
    defaultValues: toRoomForm(room),
    onClose,
    submit: (values) =>
      save.mutateAsync({ id: room ? idOf(room) : undefined, floorId, body: toRoomInput(values) }),
  });
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
          <TextField form={form} name="localX" label="X" type="number" step="any" />
          <TextField form={form} name="localY" label="Y" type="number" step="any" />
          <TextField form={form} name="localZ" label="Z" type="number" step="any" />
        </div>
      </fieldset>
      <TextField form={form} name="sourceUrl" label={t('Source URL')} type="url" maxLength={1000} />
      <CheckboxField form={form} name="verified" label={t('Verified')} />
    </FormDialog>
  );
}
