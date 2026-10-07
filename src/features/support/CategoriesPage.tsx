import { Download, FolderTree, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useConfirmedAction } from '@/components/feedback/useConfirmedAction';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { IconButton } from '@/components/ui/IconButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { Pagination } from '@/components/ui/Pagination';
import { SearchBox } from '@/components/ui/SearchBox';
import { QueryView } from '@/components/ui/states';
import { useLocalTable } from '@/hooks/useLocalTable';
import { useI18n } from '@/i18n/context';
import { datedFilename, downloadCsv } from '@/lib/csv';
import { idOf } from '@/lib/utils';
import type { Category } from '@/types/api';
import { useCategories, useDeleteCategory, useQuestions } from './api';
import { CategoryDialog } from './dialogs';

const searchFields = (category: Category) => [category.name];

export default function CategoriesPage() {
  const { t, formatNumber } = useI18n();
  const categories = useCategories();
  const questions = useQuestions('');
  const table = useLocalTable(categories.data, searchFields);
  const remove = useDeleteCategory();
  const runConfirmed = useConfirmedAction();
  const [editing, setEditing] = useState<{ category?: Category } | null>(null);

  /** Usage count per category (Activity diagram 4.8: check constraints before deleting). */
  const usage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const question of questions.data ?? []) {
      if (question.categoryId)
        counts.set(question.categoryId, (counts.get(question.categoryId) ?? 0) + 1);
    }
    return counts;
  }, [questions.data]);

  const confirmDelete = (category: Category) => {
    const inUse = usage.get(idOf(category)) ?? 0;
    void runConfirmed({
      title: t('Delete category?'),
      description: `${category.name ?? ''}. ${
        inUse
          ? t('{count} questions use this category; the server may reject the deletion.', {
              count: inUse,
            })
          : t('Existing references may prevent deletion.')
      }`,
      run: () => remove.mutateAsync(idOf(category)),
    });
  };

  const columns: Column<Category>[] = [
    {
      header: t('Name'),
      cell: (c) => (
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <FolderTree className="size-4" aria-hidden />
          </span>
          <strong className="font-medium">{c.name || '—'}</strong>
        </div>
      ),
    },
    {
      header: t('Questions'),
      cell: (c) =>
        c.id ? (
          <Link
            to={`/questions?category=${encodeURIComponent(c.id)}`}
            className="font-medium text-brand-600 tabular-nums hover:underline"
          >
            {questions.data ? formatNumber(usage.get(c.id) ?? 0) : '…'}
          </Link>
        ) : (
          '—'
        ),
    },
    { header: 'ID', cell: (c) => <code className="text-xs text-muted">{c.id || '—'}</code> },
    {
      header: t('Actions'),
      className: 'w-px text-right',
      cell: (c) =>
        c.id && (
          <div className="flex justify-end gap-1">
            <IconButton
              label={t('Edit category')}
              icon={<Pencil />}
              onClick={() => setEditing({ category: c })}
            />
            <IconButton
              label={t('Delete')}
              icon={<Trash2 />}
              tone="danger"
              onClick={() => confirmDelete(c)}
            />
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('Categories')}
        description={t('Organize the topics used for student support.')}
        actions={
          <>
            <Button
              icon={<Download />}
              disabled={!table.filtered.length}
              onClick={() =>
                downloadCsv(datedFilename('categories'), table.filtered, [
                  { header: 'ID', value: (c) => c.id },
                  { header: t('Name'), value: (c) => c.name },
                  { header: t('Questions'), value: (c) => (c.id ? (usage.get(c.id) ?? 0) : 0) },
                ])
              }
            >
              {t('Export CSV')}
            </Button>
            <Button
              icon={<RefreshCw />}
              loading={categories.isFetching}
              onClick={() => void categories.refetch()}
            >
              {t('Refresh')}
            </Button>
            <Button variant="primary" icon={<Plus />} onClick={() => setEditing({})}>
              {t('Add category')}
            </Button>
          </>
        }
      />
      <Card>
        <div className="border-b border-line p-5">
          <SearchBox value={table.search} onChange={table.setSearch} />
        </div>
        <QueryView query={categories}>
          {() => (
            <>
              <DataTable
                caption={t('Categories')}
                columns={columns}
                rows={table.page.items}
                rowKey={(c, i) => c.id ?? `row-${i}`}
              />
              <Pagination
                page={table.page.page}
                totalPages={table.page.totalPages}
                totalItems={table.page.totalItems}
                onPageChange={table.setPage}
              />
            </>
          )}
        </QueryView>
      </Card>
      {editing && <CategoryDialog category={editing.category} onClose={() => setEditing(null)} />}
    </>
  );
}
