import { Globe } from 'lucide-react';
import { useI18n } from '@/i18n/context';
import { cn } from '@/lib/cn';

export function LanguageSwitcher({ className }: { className?: string }) {
  const { language, setLanguage } = useI18n();
  return (
    <label
      className={cn(
        'inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-white px-3 text-[13px] text-ink',
        className,
      )}
    >
      <Globe className="size-4 text-muted" aria-hidden />
      <span className="sr-only">Language / Ngôn ngữ</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value === 'en' ? 'en' : 'vi')}
        className="cursor-pointer bg-transparent outline-none"
      >
        <option value="vi">Tiếng Việt</option>
        <option value="en">English</option>
      </select>
    </label>
  );
}
