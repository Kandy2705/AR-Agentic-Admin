import { AlertTriangle, ShieldCheck } from 'lucide-react';
import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useI18n } from '@/i18n/context';
import { cn } from '@/lib/cn';
import { ConfirmContext, type ConfirmOptions } from './confirm-context';

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((next: ConfirmOptions) => {
    resolver.current?.(false);
    setOptions(next);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  const danger = (options?.tone ?? 'danger') === 'danger';
  const Icon = danger ? AlertTriangle : ShieldCheck;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={options !== null}
        onClose={() => settle(false)}
        size="sm"
        title={
          <span className="flex items-center gap-3">
            <span
              className={cn(
                'inline-flex size-9 items-center justify-center rounded-full',
                danger ? 'bg-rose-50 text-rose-600' : 'bg-brand-50 text-brand-600',
              )}
            >
              <Icon className="size-5" aria-hidden />
            </span>
            {options?.title}
          </span>
        }
        footer={
          <>
            <Button onClick={() => settle(false)}>{t('Cancel')}</Button>
            <Button
              variant={danger ? 'danger' : 'primary'}
              onClick={() => settle(true)}
              data-autofocus
            >
              {options?.confirmLabel ?? t('Continue')}
            </Button>
          </>
        }
      >
        <p className="text-muted">{options?.description ?? t('This action cannot be undone.')}</p>
      </Dialog>
    </ConfirmContext.Provider>
  );
}
