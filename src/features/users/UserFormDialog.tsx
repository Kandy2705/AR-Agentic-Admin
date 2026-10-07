import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useConfirm } from '@/components/feedback/confirm-context';
import { useNotify } from '@/components/feedback/useNotify';
import { Field, Input, Select } from '@/components/ui/form';
import { FormDialog } from '@/components/ui/FormDialog';
import { useI18n } from '@/i18n/context';
import { errorMessageKey } from '@/lib/errors';
import { ROLES, type User } from '@/types/api';
import { toUserForm, userFormSchema, type UserFormValues } from './schema';

interface UserFormDialogProps {
  open: boolean;
  onClose: () => void;
  user: User;
  /** Show the role selector (admin editing another account). */
  withRole: boolean;
  /** Disable role editing (e.g. the signed-in admin editing themselves). */
  roleLocked?: boolean;
  title: string;
  submit: (values: UserFormValues) => Promise<unknown>;
}

/** Shared by "Edit user" (admin) and "Edit profile" (self-service). */
export function UserFormDialog({
  open,
  onClose,
  user,
  withRole,
  roleLocked = false,
  title,
  submit,
}: UserFormDialogProps) {
  const { t } = useI18n();
  const notify = useNotify();
  const confirm = useConfirm();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: toUserForm(user),
  });

  useEffect(() => {
    if (open) reset(toUserForm(user));
  }, [open, user, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (withRole && values.role !== user.role) {
      const ok = await confirm({
        title: t('Change role?'),
        description: `${user.email ?? ''}: ${t(user.role ?? '—')} → ${t(values.role)}. ${t('Changing a role changes access permissions.')}`,
        confirmLabel: t('Continue'),
      });
      if (!ok) return;
    }
    try {
      await submit(values);
      notify.saved();
      onClose();
    } catch (error) {
      setError('root', { message: errorMessageKey(error) });
    }
  });

  const err = (message?: string) => (message ? t(message) : undefined);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      title={title}
      onSubmit={onSubmit}
      submitting={isSubmitting}
      error={err(errors.root?.message)}
    >
      <Field label={t('Name')} required error={err(errors.name?.message)}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            maxLength={200}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            {...register('name')}
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t('Phone')} error={err(errors.phone?.message)}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              type="tel"
              maxLength={30}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              {...register('phone')}
            />
          )}
        </Field>
        <Field label={t('Gender')} error={err(errors.gender?.message)}>
          {({ id, describedBy }) => (
            <Input id={id} maxLength={80} aria-describedby={describedBy} {...register('gender')} />
          )}
        </Field>
      </div>
      <Field
        label={t('Birthday')}
        error={err(errors.birthday?.message)}
        help={t('An empty birthday keeps the current value in this backend.')}
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            type="date"
            max={today}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            {...register('birthday')}
          />
        )}
      </Field>
      {withRole && (
        <Field
          label={t('Role')}
          help={
            roleLocked
              ? t('Self role changes are disabled in this portal.')
              : t('Changing a role changes access permissions.')
          }
        >
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              {...(roleLocked
                ? { disabled: true, value: user.role ?? 'Customer', onChange: () => {} }
                : register('role'))}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {t(role)}
                </option>
              ))}
            </Select>
          )}
        </Field>
      )}
    </FormDialog>
  );
}
