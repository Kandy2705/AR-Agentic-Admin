import {
  Building2,
  Download,
  List,
  Map as MapIcon,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
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
import { BuildingsMap } from '@/features/map';
import { useLocalTable } from '@/hooks/useLocalTable';
import { cn } from '@/lib/cn';
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
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'map' ? 'map' : 'list';

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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-5">
          <div className="min-w-60 flex-1">
            <SearchBox value={table.search} onChange={table.setSearch} />
          </div>
          <div
            role="group"
            aria-label={t('View')}
            className="inline-flex rounded-xl border border-line bg-slate-50 p-1"
          >
            {(
              [
                ['list', 'List', List],
                ['map', 'Map', MapIcon],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => setParams(value === 'map' ? { view: 'map' } : {})}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium',
                  view === value
                    ? 'bg-white text-brand-600 shadow-sm'
                    : 'text-muted hover:text-ink',
                )}
              >
                <Icon className="size-4" aria-hidden />
                {t(label)}
              </button>
            ))}
          </div>
        </div>
        <QueryView query={buildings}>
          {() =>
            view === 'map' ? (
              <BuildingsMap buildings={table.filtered} />
            ) : (
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
            )
          }
        </QueryView>
      </Card>
      <p className="mt-3 text-xs text-muted">
        {t('Search and pagination on this page apply to the list returned by the existing API.')}
      </p>
      {editing && <BuildingDialog building={editing.building} onClose={() => setEditing(null)} />}
    </>
  );
}
