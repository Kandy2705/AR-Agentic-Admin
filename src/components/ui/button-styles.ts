import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline';
export type ButtonSize = 'sm' | 'md';

const base =
  'inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition-colors select-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand-500 text-white shadow-sm hover:bg-brand-600 active:bg-brand-700',
  secondary:
    'border border-line bg-white text-ink shadow-xs hover:border-brand-200 hover:bg-brand-50',
  ghost: 'text-muted hover:bg-brand-50 hover:text-brand-600',
  danger: 'bg-rose-600 text-white shadow-sm hover:bg-rose-700',
  'danger-outline': 'border border-rose-200 bg-white text-rose-600 hover:bg-rose-50',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4',
};

/** Shared classes so router links can look like buttons. */
export function buttonClasses(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md') {
  return cn(base, variants[variant], sizes[size]);
}
