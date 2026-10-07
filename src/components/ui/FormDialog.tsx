import { Check } from 'lucide-react';
import { useId, type FormEvent, type ReactNode } from 'react';
import { useI18n } from '@/i18n/context';
import { Button } from './Button';
import { Dialog } from './Dialog';
import { Notice } from './Notice';

interface FormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  /** Server/validation error shown above the footer. */
  error?: string | null;
  submitLabel?: string;
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

/** Dialog + <form> + Cancel/Save footer used by every create/edit form. */
export function FormDialog({
  open,
  onClose,
  title,
  description,
  onSubmit,
  submitting,
  error,
  submitLabel,
  size,
  children,
}: FormDialogProps) {
  const { t } = useI18n();
  const formId = useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
      busy={submitting}
      footer={
        <>
          <Button onClick={onClose} disabled={submitting}>
            {t('Cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            loading={submitting}
            icon={<Check />}
          >
            {submitLabel ?? t('Save changes')}
          </Button>
        </>
      }
    >
      <form id={formId} noValidate onSubmit={onSubmit} aria-busy={submitting || undefined}>
        <fieldset disabled={submitting} className="flex flex-col gap-4">
          {children}
        </fieldset>
        {error && (
          <Notice tone="danger" className="mt-4">
            {error}
          </Notice>
        )}
      </form>
    </Dialog>
  );
}
