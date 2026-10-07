import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  /** Accessible name; also shown as tooltip. */
  label: string;
  icon: ReactNode;
  tone?: 'default' | 'danger';
}

export function IconButton({
  label,
  icon,
  tone = 'default',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex size-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-4',
        tone === 'danger'
          ? 'text-rose-500 hover:bg-rose-50 hover:text-rose-600'
          : 'text-muted hover:bg-brand-50 hover:text-brand-600',
        className,
      )}
      {...props}
    >
      {icon}
    </button>
  );
}
