import { Building2, Download, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useConfirmedAction } from '@/components/feedback/useConfirmedAction';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { IconButton } from '@/components/ui/IconButton';
import { PageHeader } from '@/components/ui/PageHeader';
import { RowLink } from '@/components/ui/RowLink';
import { Pagination } from '@/components/ui/Pagination';
import { SearchBox } from '@/components/ui/SearchBox';
import { QueryView } from '@/components/ui/states';
import { useLocalTable } from '@/hooks/useLocalTable';
import { useI18n } from '@/i18n/context';
import { datedFilename, downloadCsv } from '@/lib/csv';
import { idOf } from '@/lib/utils';
import type { Building } from '@/types/api';
import { useBuildings, useDeleteBuilding } from './api';
import { BuildingDialog } from './dialogs';

const searchFields = (building: Building) => [building.name, building.content];

type Editing = { building?: Building } | null;

export default function BuildingsPage() {
  const { t } = useI18n();
  const buildings = useBuildings();
  const table = useLocalTable(buildings.data, searchFields);
  const remove = useDeleteBuilding();
  const runConfirmed = useConfirmedAction();
  const [editing, setEditing] = useState<Editing>(null);

  const exportCsv = () =>
    downloadCsv(datedFilename('buildings'), table.filtered, [
      { header: 'ID', value: (b) => b.id },
      { header: t('Name'), value: (b) => b.name },
      { header: t('Description'), value: (b) => b.content },
      { header: t('Latitude'), value: (b) => b.latitude },
      { header: t('Longitude'), value: (b) => b.longitude },
    ]);

  const columns: Column<Building>[] = [
    {
      header: t('Name'),
      cell: (b) => (
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Building2 className="size-4" aria-hidden />
          </span>
          <div className="min-w-0">
            {b.id ? (
              <Link
                to={`/buildings/${encodeURIComponent(b.id)}`}
                className="font-medium hover:text-brand-600"
              >
                {b.name || b.id}
              </Link>
            ) : (
              <span className="font-medium">{b.name || '—'}</span>
            )}
            <span className="line-clamp-1 max-w-md text-xs text-muted">{b.content || '—'}</span>
          </div>
        </div>
      ),
    },
    {
      header: t('Coordinates'),
      cell: (b) => (
        <code className="text-[13px] text-muted">
          {b.latitude ?? '—'}, {b.longitude ?? '—'}
        </code>
      ),
    },
    {
      header: t('Actions'),
      className: 'w-px text-right',
      cell: (b) =>
        b.id && (
          <div className="flex items-center justify-end gap-1">
            <IconButton
              label={t('Edit building')}
              icon={<Pencil />}
              onClick={() => setEditing({ building: b })}
            />
            <IconButton
              label={t('Delete')}
              icon={<Trash2 />}
              tone="danger"
              onClick={() =>
                void runConfirmed({
                  title: t('Delete building?'),
                  description: `${b.name ?? ''}. ${t('This action cannot be undone.')}`,
                  run: () => remove.mutateAsync(idOf(b)),
                })
              }
            />
            <RowLink to={`/buildings/${encodeURIComponent(b.id)}`}>{t('Details')}</RowLink>
          </div>
        ),
    },
  ];

  return (
    <>
      <PageHeader
        title={t('Buildings')}
        description={t('Manage campus destinations, floors, rooms and geographical coordinates.')}
        actions={
          <>
            <Button icon={<Download />} disabled={!table.filtered.length} onClick={exportCsv}>
              {t('Export CSV')}
            </Button>
            <Button
              icon={<RefreshCw />}
              loading={buildings.isFetching}
              onClick={() => void buildings.refetch()}
            >
              {t('Refresh')}
            </Button>
            <Button variant="primary" icon={<Plus />} onClick={() => setEditing({})}>
              {t('Add building')}
            </Button>
          </>
        }
      />
      <Card>
        <div className="border-b border-line p-5">
          <SearchBox value={table.search} onChange={table.setSearch} />
        </div>
        <QueryView query={buildings}>
          {() => (
            <>
              <DataTable
                caption={t('Buildings')}
                columns={columns}
                rows={table.page.items}
                rowKey={(b, i) => b.id ?? `row-${i}`}
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
      <p className="mt-3 text-xs text-muted">
        {t('Search and pagination on this page apply to the list returned by the existing API.')}
      </p>
      {editing && <BuildingDialog building={editing.building} onClose={() => setEditing(null)} />}
    </>
  );
}
