import { LogOut, ShieldCheck } from 'lucide-react';
import { NavLink } from 'react-router';
import { useAuth } from '@/features/auth/auth-context';
import { useI18n } from '@/i18n/context';
import { cn } from '@/lib/cn';
import { Brand } from './Brand';
import { NAVIGATION } from './navigation';

interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onNavigate: () => void;
}

export function Sidebar({ collapsed, mobileOpen, onNavigate }: SidebarProps) {
  const { t } = useI18n();
  const { logout } = useAuth();

  return (
    <aside
      id="sidebar"
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar text-slate-300 transition-[transform,width] duration-200 lg:sticky lg:top-0 lg:h-dvh lg:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed && 'lg:w-[76px]',
      )}
    >
      <NavLink
        to="/dashboard"
        onClick={onNavigate}
        className="flex h-16 shrink-0 items-center px-5 text-white"
        aria-label="Agentic AR"
      >
        <Brand compact={collapsed} className={cn(collapsed && 'lg:mx-auto')} />
      </NavLink>

      <nav aria-label={t('Main navigation')} className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {NAVIGATION.map((group) => (
          <div key={group.label}>
            <h2
              className={cn(
                'mb-2 px-3 text-[11px] font-semibold tracking-[0.12em] text-slate-500 uppercase',
                collapsed && 'lg:sr-only',
              )}
            >
              {t(group.label)}
            </h2>
            <ul className="space-y-1">
              {group.items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    onClick={onNavigate}
                    title={t(label)}
                    className={({ isActive }) =>
                      cn(
                        'group flex h-10 items-center gap-3 rounded-xl px-3 font-medium transition-colors',
                        isActive
                          ? 'bg-brand-500 text-white shadow-lg shadow-brand-900/30'
                          : 'hover:bg-sidebar-hover hover:text-white',
                        collapsed && 'lg:justify-center lg:px-0',
                      )
                    }
                  >
                    <Icon className="size-[18px] shrink-0" aria-hidden />
                    <span className={cn('truncate', collapsed && 'lg:sr-only')}>{t(label)}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-white/5 p-3">
        <div
          className={cn(
            'flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5',
            collapsed && 'lg:hidden',
          )}
        >
          <ShieldCheck className="size-5 shrink-0 text-emerald-400" aria-hidden />
          <span className="leading-tight">
            <span className="block text-[13px] text-white">{t('Session verified')}</span>
            <span className="text-[11px] tracking-wider text-slate-500">ADMIN ACCESS</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          title={t('Logout')}
          className={cn(
            'flex h-10 w-full items-center gap-3 rounded-xl px-3 font-medium text-slate-300 transition-colors hover:bg-rose-500/10 hover:text-rose-300',
            collapsed && 'lg:justify-center lg:px-0',
          )}
        >
          <LogOut className="size-[18px]" aria-hidden />
          <span className={cn(collapsed && 'lg:sr-only')}>{t('Logout')}</span>
        </button>
      </div>
    </aside>
  );
}
