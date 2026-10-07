import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/i18n/context';
import { cn } from '@/lib/cn';
import { ToastContext, type ToastApi, type ToastTone } from './toast-context';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

const DURATION_MS = 5000;

/** Lightweight toast queue (no third-party CSS injection, so it works under a strict CSP). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const { t } = useI18n();

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = ++nextId.current;
      setItems((current) => [...current.slice(-3), { id, tone, message }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
      dismissAll: () => setItems([]),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6"
      >
        {items.map((item) => {
          const Icon = item.tone === 'error' ? AlertTriangle : CheckCircle2;
          return (
            <div
              key={item.id}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border bg-white px-4 py-3 text-[13px] shadow-pop',
                item.tone === 'error' ? 'border-rose-200' : 'border-emerald-200',
              )}
            >
              <Icon
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  item.tone === 'error' ? 'text-rose-500' : 'text-emerald-500',
                )}
                aria-hidden
              />
              <p className="flex-1 text-ink">{item.message}</p>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="text-muted hover:text-ink"
                aria-label={t('Dismiss')}
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
