import type { UseQueryResult } from '@tanstack/react-query';
import { Inbox, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '@/i18n/context';
import { cn } from '@/lib/cn';
import { errorMessageKey } from '@/lib/errors';
import { Button } from './Button';
import { Notice } from './Notice';

export function LoadingState({ rows = 3, className }: { rows?: number; className?: string }) {
  const { t } = useI18n();
  return (
    <div role="status" aria-label={t('Loading')} className={cn('space-y-3 p-5', className)}>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="h-10 animate-pulse rounded-lg bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100"
        />
      ))}
      <span className="sr-only">{t('Loading')}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-start gap-3 p-5">
      <Notice tone="danger">{t(errorMessageKey(error))}</Notice>
      {onRetry && (
        <Button size="sm" icon={<RefreshCw />} onClick={onRetry}>
          {t('Retry')}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title = 'No records found',
  description = 'No records match your filters.',
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
      <span className="mb-1 inline-flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        <Inbox className="size-6" aria-hidden />
      </span>
      <h3 className="font-semibold text-ink">{t(title)}</h3>
      <p className="max-w-sm text-[13px] text-muted">{t(description)}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/**
 * Renders loading → error (with retry) → data for a TanStack Query result.
 * Keeps every page free of repetitive branching.
 */
export function QueryView<T>({
  query,
  children,
  loading,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
  loading?: ReactNode;
}) {
  if (query.isPending) return <>{loading ?? <LoadingState />}</>;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  return <>{children(query.data)}</>;
}
