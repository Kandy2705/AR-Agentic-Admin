import { Navigate, useLocation } from 'react-router';
import { AppLayout } from '@/components/layout/AppLayout';
import { Brand } from '@/components/layout/Brand';
import { useAuth } from '@/features/auth/auth-context';

export function BootScreen() {
  return (
    <div
      role="status"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-sidebar text-white"
    >
      <Brand className="animate-pulse" />
      <span className="text-xs tracking-[0.3em] text-slate-400">LOADING…</span>
    </div>
  );
}

/** Protected area: only a verified, active Admin gets the application shell. */
export function RequireAdmin() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'restoring') return <BootScreen />;
  if (status === 'signed-out') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <AppLayout />;
}

/** Login page is only for signed-out visitors. */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'restoring') return <BootScreen />;
  if (status === 'signed-in') {
    const from = (location.state as { from?: string } | null)?.from;
    return <Navigate to={from && from !== '/login' ? from : '/dashboard'} replace />;
  }
  return <>{children}</>;
}
