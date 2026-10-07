import { Download, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useConfirmedAction } from '@/components/feedback/useConfirmedAction';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Select } from '@/components/ui/form';
import { IconButton } from '@/components/ui/IconButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowLink } from '@/components/ui/RowLink';
import { Pagination } from '@/components/ui/Pagination';
import { SearchBox } from '@/components/ui/SearchBox';
import { QueryView } from '@/components/ui/states';
import { useLocalTable } from '@/hooks/useLocalTable';
import { useI18n } from '@/i18n/context';
import { datedFilename, downloadCsv } from '@/lib/csv';
import { idOf, newest } from '@/lib/utils';
import type { Question } from '@/types/api';
import { useCategories, useDeleteQuestion, useQuestions } from './api';
import { QuestionDialog } from './dialogs';

const searchFields = (q: Question) => [q.content, q.name, q.email];

export default function QuestionsPage() {
  const { t, formatDate } = useI18n();
  const [params, setParams] = useSearchParams();
  const categoryId = params.get('category') ?? '';
  const categories = useCategories();
  const questions = useQuestions(categoryId);
  const sorted = useMemo(
    () => (questions.data ? newest(questions.data, (q) => q.createDate) : undefined),
    [questions.data],
  );
  const table = useLocalTable(sorted, searchFields);
  const remove = useDeleteQuestion();
  const runConfirmed = useConfirmedAction();
  const [editing, setEditing] = useState<{ question?: Question } | null>(null);

  const categoryName = (id: string | null) =>
    categories.data?.find((category) => category.id === id)?.name ?? id ?? t('Uncategorized');

  const exportCsv = () =>
    downloadCsv(datedFilename('questions'), table.filtered, [
      { header: 'ID', value: (q) => q.id },
      { header: t('Content'), value: (q) => q.content },
      { header: t('Name'), value: (q) => q.name },
      { header: t('Email'), value: (q) => q.email },
      { header: t('Category'), value: (q) => categoryName(q.categoryId) },
      { header: t('Created'), value: (q) => q.createDate },
    ]);

  const columns: Column<Question>[] = [
    {
      header: t('Content'),
      cell: (q) =>
        q.id ? (
          <Link
            to={`/questions/${encodeURIComponent(q.id)}`}
            className="line-clamp-2 max-w-md font-medium hover:text-brand-600"
          >
            {q.content || q.id}
          </Link>
        ) : (
          <span className="line-clamp-2">{q.content || '—'}</span>
        ),
    },
    {
      header: t('Name'),
      cell: (q) => (
        <div className="min-w-0">
          <span className="block truncate">{q.name || '—'}</span>
          <span className="block truncate text-xs text-muted">{q.email || '—'}</span>
        </div>
      ),
    },
    {
      header: t('Category'),
      cell: (q) => <Badge tone="brand">{categoryName(q.categoryId)}</Badge>,
    },
    {
      header: t('Created'),
      cell: (q) => <span className="whitespace-nowrap text-muted">{formatDate(q.createDate)}</span>,
    },
    {
      header: t('Actions'),
      className: 'w-px text-right',
      cell: (q) =>
        q.id && (
          <div className="flex items-center justify-end gap-1">
            <IconButton
              label={t('Edit question')}
              icon={<Pencil />}
              disabled={!categories.data}
              onClick={() => setEditing({ question: q })}
            />
            <IconButton
              label={t('Delete')}
              icon={<Trash2 />}
              tone="danger"
              onClick={() =>
                void runConfirmed({
                  title: t('Delete question?'),
                  run: () => remove.mutateAsync(idOf(q)),
                })
              }
            />
            <RowLink to={`/questions/${encodeURIComponent(q.id)}`}>{t('View')}</RowLink>
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('Questions')}
        description={t('Review student questions and manage their answers.')}
        actions={
          <>
            <Button icon={<Download />} disabled={!table.filtered.length} onClick={exportCsv}>
              {t('Export CSV')}
            </Button>
            <Button
              icon={<RefreshCw />}
              loading={questions.isFetching}
              onClick={() => void questions.refetch()}
            >
              {t('Refresh')}
            </Button>
            <Button
              variant="primary"
              icon={<Plus />}
              disabled={!categories.data}
              onClick={() => setEditing({})}
            >
              {t('Add question')}
            </Button>
          </>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-5">
          <div className="min-w-60 flex-1">
            <SearchBox value={table.search} onChange={table.setSearch} />
          </div>
          <label className="w-full sm:w-64">
            <span className="sr-only">{t('Category')}</span>
            <Select
              value={categoryId}
              disabled={!categories.data}
              onChange={(event) =>
                setParams(event.target.value ? { category: event.target.value } : {})
              }
            >
              <option value="">{t('All categories')}</option>
              {categories.data
                ?.filter((category) => category.id)
                .map((category) => (
                  <option key={category.id} value={idOf(category)}>
                    {category.name || category.id}
                  </option>
                ))}
            </Select>
          </label>
        </div>
        <QueryView query={questions}>
          {() => (
            <>
              <DataTable
                caption={t('Questions')}
                columns={columns}
                rows={table.page.items}
                rowKey={(q, i) => q.id ?? `row-${i}`}
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
      {editing && categories.data && (
        <QuestionDialog
          question={editing.question}
          categories={categories.data}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}
