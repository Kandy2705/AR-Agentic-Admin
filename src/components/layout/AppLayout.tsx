import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { useI18n } from '@/i18n/context';
import { cn } from '@/lib/cn';
import { pageTitle } from './navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const COLLAPSE_KEY = 'agentic-admin-collapsed';
const DESKTOP_QUERY = '(min-width: 1024px)';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === 'true';
  } catch {
    return false;
  }
}

/** Protected application shell: sidebar + top bar + routed page. */
export function AppLayout() {
  const { t } = useI18n();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);
  const title = pageTitle(pathname);

  useEffect(() => {
    document.title = `${t(title)} | Agentic AR`;
  }, [t, title]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setMobileOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  const toggleMenu = () => {
    if (window.matchMedia(DESKTOP_QUERY).matches) {
      setCollapsed((value) => {
        try {
          localStorage.setItem(COLLAPSE_KEY, String(!value));
        } catch {
          /* optional preference */
        }
        return !value;
      });
    } else {
      setMobileOpen((value) => !value);
    }
  };

  return (
    <div className="flex min-h-dvh">
      <a
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t('Skip to content')}
      </a>
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />
      <button
        type="button"
        aria-label={t('Close navigation')}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-[1px] lg:hidden',
          mobileOpen ? 'block animate-fade-in' : 'hidden',
        )}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} menuExpanded={mobileOpen || !collapsed} onToggleMenu={toggleMenu} />
        <main
          id="main-content"
          tabIndex={-1}
          className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8"
        >
          <Outlet />
        </main>
        <footer className="flex justify-between border-t border-line px-6 py-4 text-xs tracking-wider text-muted">
          <span>AGENTIC AR</span>
          <span>{t('Admin workspace')}</span>
        </footer>
      </div>
    </div>
  );
}
