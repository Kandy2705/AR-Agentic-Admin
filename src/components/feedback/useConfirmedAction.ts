import { useCallback, useRef } from 'react';
import { useI18n } from '@/i18n/context';
import { useConfirm, type ConfirmOptions } from './confirm-context';
import { useNotify } from './useNotify';

interface ConfirmedAction extends ConfirmOptions {
  run: () => Promise<unknown>;
  /** Toast shown on success (English key). Defaults to "Deleted successfully.". */
  successMessage?: string;
  onDone?: () => void;
}

/**
 * Confirm → run → toast pattern used by every destructive action
 * (matches the "Xác nhận xóa" branch of the sequence diagrams).
 */
export function useConfirmedAction() {
  const confirm = useConfirm();
  const notify = useNotify();
  const { t } = useI18n();
  /** Ignores repeated clicks while a confirmed action is still running. */
  const running = useRef(false);
  return useCallback(
    async ({ run, successMessage, onDone, ...options }: ConfirmedAction): Promise<boolean> => {
      if (running.current) return false;
      const ok = await confirm({ confirmLabel: t('Delete'), ...options });
      if (!ok) return false;
      running.current = true;
      try {
        await run();
        notify.success(successMessage ?? 'Deleted successfully.');
        onDone?.();
        return true;
      } catch (error) {
        notify.error(error);
        return false;
      } finally {
        running.current = false;
      }
    },
    [confirm, notify, t],
  );
}
