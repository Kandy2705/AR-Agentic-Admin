import { useMemo } from 'react';
import { useI18n } from '@/i18n/context';
import { errorMessageKey } from '@/lib/errors';
import { isAbortError } from '@/lib/http/api-client';
import { useToast } from './toast-context';

/** Translated toasts for the common success/error outcomes. */
export function useNotify() {
  const toast = useToast();
  const { t } = useI18n();
  return useMemo(
    () => ({
      success: (key: string) => toast.success(t(key)),
      saved: () => toast.success(t('Saved successfully.')),
      deleted: () => toast.success(t('Deleted successfully.')),
      error: (error: unknown) => {
        if (!isAbortError(error)) toast.error(t(errorMessageKey(error)));
      },
    }),
    [toast, t],
  );
}
