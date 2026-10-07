import type { ReactNode } from 'react';

export function DetailList({ items }: { items: [label: string, value: ReactNode][] }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <dt className="text-xs font-medium tracking-wide text-muted uppercase">{label}</dt>
          <dd className="mt-1 break-words text-ink">{value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
