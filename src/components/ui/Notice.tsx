import { AlertTriangle, Info } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Notice({
  tone = 'info',
  children,
  className,
}: {
  tone?: 'info' | 'danger';
  children: ReactNode;
  className?: string;
}) {
  const Icon = tone === 'danger' ? AlertTriangle : Info;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'note'}
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 text-[13px]',
        tone === 'danger'
          ? 'border-rose-200 bg-rose-50 text-rose-700'
          : 'border-brand-100 bg-brand-50/60 text-brand-800',
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
