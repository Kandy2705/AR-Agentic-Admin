import { MessagesSquare, RefreshCw, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useConfirmedAction } from '@/components/feedback/useConfirmedAction';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Field, Input } from '@/components/ui/form';
import { IconButton } from '@/components/ui/IconButton';
import { Notice } from '@/components/ui/Notice';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowLink } from '@/components/ui/RowLink';
import { Pagination } from '@/components/ui/Pagination';
import { QueryView } from '@/components/ui/states';
import { PAGE_SIZE } from '@/config/env';
import { useI18n } from '@/i18n/context';
import { dateRange, idOf } from '@/lib/utils';
import type { History } from '@/types/api';
import { useDeleteHistory, useHistories } from './api';

export default function ChatsPage() {
  const { t, formatDate } = useI18n();
  const [params, setParams] = useSearchParams();
  const [filterError, setFilterError] = useState<string | null>(null);
  const userId = params.get('user') ?? '';
  const from = params.get('from') ?? '';
  const to = params.get('to') ?? '';
  const page = Math.max(1, Math.floor(Number(params.get('page'))) || 1);

  let range: ReturnType<typeof dateRange> = {};
  try {
    range = dateRange(from, to);
  } catch {
    /* invalid range in URL → ignore it */
  }
  const histories = useHistories({ page, pageSize: PAGE_SIZE, userId, ...range });
  const remove = useDeleteHistory();
  const runConfirmed = useConfirmedAction();

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = {
      user: String(data.get('user') ?? '').trim(),
      from: String(data.get('from') ?? ''),
      to: String(data.get('to') ?? ''),
    };
    try {
      dateRange(next.from, next.to);
    } catch (error) {
      setFilterError((error as Error).message);
      return;
    }
    setFilterError(null);
    setParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value)));
  };

  const columns: Column<History>[] = [
    {
      header: t('Conversation'),
      cell: (row) => (
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <MessagesSquare className="size-4" aria-hidden />
          </span>
          {row.id ? (
            <Link
              to={`/chats/${encodeURIComponent(row.id)}`}
              className="line-clamp-1 max-w-md font-medium hover:text-brand-600"
            >
              {row.header || row.id}
            </Link>
          ) : (
            <span>{row.header || '—'}</span>
          )}
        </div>
      ),
    },
    {
      header: t('User ID'),
      cell: (row) =>
        row.userId ? (
          <button
            type="button"
            title={t('Filter by this user')}
            onClick={() => setParams({ user: row.userId! })}
            className="font-mono text-xs text-muted hover:text-brand-600 hover:underline"
          >
            {row.userId}
          </button>
        ) : (
          '—'
        ),
    },
    {
      header: t('Created'),
      cell: (row) => (
        <span className="whitespace-nowrap text-muted">{formatDate(row.create_date)}</span>
      ),
    },
    {
      header: t('Actions'),
      className: 'w-px text-right',
      cell: (row) =>
        row.id && (
          <div className="flex items-center justify-end gap-1">
            <IconButton
              label={t('Delete conversation')}
              icon={<Trash2 />}
              tone="danger"
              onClick={() =>
                void runConfirmed({
                  title: t('Delete conversation?'),
                  description: t('All messages in this conversation will be deleted.'),
                  run: () => remove.mutateAsync(idOf(row)),
                })
              }
            />
            <RowLink to={`/chats/${encodeURIComponent(row.id)}`}>{t('View')}</RowLink>
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('Chat histories')}
        description={t('Review conversations across the campus platform.')}
        actions={
          <Button
            icon={<RefreshCw />}
            loading={histories.isFetching}
            onClick={() => void histories.refetch()}
          >
            {t('Refresh')}
          </Button>
        }
      />
      <Notice className="mb-4">
        {t(
          'Chat content may contain personal information. Access it only for authorized support tasks.',
        )}
      </Notice>
      <Card>
        <form
          key={`${userId}|${from}|${to}`}
          onSubmit={applyFilters}
          className="grid gap-3 border-b border-line p-5 md:grid-cols-[2fr_1fr_1fr_auto] md:items-end"
        >
          <Field label={t('User ID')}>
            {({ id }) => <Input id={id} name="user" defaultValue={userId} maxLength={100} />}
          </Field>
          <Field label={t('From date')}>
            {({ id }) => <Input id={id} name="from" type="date" defaultValue={from} />}
          </Field>
          <Field label={t('To date')}>
            {({ id }) => <Input id={id} name="to" type="date" defaultValue={to} />}
          </Field>
          <Button type="submit" variant="primary">
            {t('Apply filters')}
          </Button>
          {filterError && (
            <Notice tone="danger" className="md:col-span-4">
              {t(filterError)}
            </Notice>
          )}
        </form>
        <QueryView query={histories}>
          {(data) => (
            <>
              <DataTable
                caption={t('Chat histories')}
                columns={columns}
                rows={data.items}
                rowKey={(row, i) => row.id ?? `row-${i}`}
              />
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                totalItems={data.totalItems}
                disabled={histories.isFetching}
                onPageChange={(next) =>
                  setParams((current) => {
                    const merged = new URLSearchParams(current);
                    merged.set('page', String(next));
                    return merged;
                  })
                }
              />
            </>
          )}
        </QueryView>
      </Card>
    </>
  );
}
