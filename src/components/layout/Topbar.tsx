import { ChevronRight, Menu } from 'lucide-react';
import { Link } from 'react-router';
import { Avatar } from '@/components/ui/Avatar';
import { useCurrentUser } from '@/features/auth/auth-context';
import { useI18n } from '@/i18n/context';
import { LanguageSwitcher } from './LanguageSwitcher';

interface TopbarProps {
  title: string;
  menuExpanded: boolean;
  onToggleMenu: () => void;
}

export function Topbar({ title, menuExpanded, onToggleMenu }: TopbarProps) {
  const { t } = useI18n();
  const user = useCurrentUser();
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-white/85 px-4 backdrop-blur sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label={t('Toggle navigation')}
          aria-controls="sidebar"
          aria-expanded={menuExpanded}
          className="inline-flex size-9 items-center justify-center rounded-xl text-muted hover:bg-brand-50 hover:text-brand-600"
        >
          <Menu className="size-5" />
        </button>
        <nav aria-label={t('Breadcrumb')} className="hidden min-w-0 items-center gap-1.5 sm:flex">
          <span className="text-muted">{t('Admin workspace')}</span>
          <ChevronRight className="size-4 text-slate-400" aria-hidden />
          <strong className="truncate font-semibold text-ink">{t(title)}</strong>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <LanguageSwitcher className="hidden sm:inline-flex" />
        <Link
          to="/profile"
          className="flex items-center gap-2.5 rounded-xl py-1 pr-2 pl-1 hover:bg-brand-50"
        >
          <Avatar name={user.name} />
          <span className="hidden leading-tight md:block">
            <strong className="block max-w-40 truncate text-[13px] font-semibold">
              {user.name || 'Admin'}
            </strong>
            <span className="text-xs text-muted">{t('Administrator')}</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
