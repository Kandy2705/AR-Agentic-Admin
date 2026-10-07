import { cn } from '@/lib/cn';
import { initials } from '@/lib/utils';

export function Avatar({
  name,
  size = 'md',
}: {
  name: string | null | undefined;
  size?: 'md' | 'lg';
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 font-semibold text-white',
        size === 'lg' ? 'size-16 text-lg' : 'size-9 text-xs',
      )}
    >
      {initials(name)}
    </span>
  );
}
