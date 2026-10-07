import { cn } from '@/lib/cn';

export function Brand({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img src="./mark.svg" alt="" width={34} height={34} className="shrink-0" />
      {!compact && (
        <span className="text-[15px] font-semibold tracking-[0.18em]">
          AGENTIC<strong className="ml-1 text-brand-300">AR</strong>
        </span>
      )}
    </span>
  );
}
