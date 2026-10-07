import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { EmptyState } from './states';

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  caption: string;
  empty?: ReactNode;
}

export function DataTable<T>({ columns, rows, rowKey, caption, empty }: DataTableProps<T>) {
  if (!rows.length) return <>{empty ?? <EmptyState />}</>;
  return (
    <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={caption}>
      <table className="w-full min-w-[640px] border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line bg-slate-50/70">
            {columns.map((column) => (
              <th
                key={column.header}
                scope="col"
                className={cn(
                  'px-5 py-3 text-xs font-semibold tracking-wide text-muted uppercase',
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)} className="transition-colors hover:bg-brand-50/40">
              {columns.map((column) => (
                <td
                  key={column.header}
                  className={cn('px-5 py-3.5 align-middle', column.className)}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
