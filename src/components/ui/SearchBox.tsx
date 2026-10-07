import { Search } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { Input } from './form';

export function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <label className="relative block max-w-md">
      <span className="sr-only">{t('Search')}</span>
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t('Search records')}
        maxLength={200}
        className="pl-9"
      />
    </label>
  );
}
