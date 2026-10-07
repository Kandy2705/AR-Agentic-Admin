import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
  disabled,
}: PaginationProps) {
  const { t, formatNumber } = useI18n();
  return (
    <nav
      aria-label={t('Pagination')}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3"
    >
      <span className="text-[13px] text-muted">
        {t('{count} records', { count: formatNumber(totalItems) })}
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          icon={<ChevronLeft />}
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t('Previous')}
        </Button>
        <span className="min-w-20 text-center text-[13px] text-ink tabular-nums">
          {t('Page')} {page} / {Math.max(1, totalPages)}
        </span>
        <Button
          size="sm"
          disabled={disabled || totalPages <= page}
          onClick={() => onPageChange(page + 1)}
        >
          {t('Next')}
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
