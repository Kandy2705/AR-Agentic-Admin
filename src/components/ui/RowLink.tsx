import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** "Details ›" link shown in the actions column of tables. */
export function RowLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-0.5 rounded-lg px-2 py-1 text-[13px] font-medium whitespace-nowrap text-brand-600 hover:bg-brand-50"
    >
      {children}
      <ChevronRight className="size-4" aria-hidden />
    </Link>
  );
}
