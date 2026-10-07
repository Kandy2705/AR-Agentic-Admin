import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SESSION_REVALIDATE_MS } from '@/config/env';
import { errorMessageKey } from '@/lib/errors';
import { ApiError, isAbortError } from '@/lib/http/api-client';
import { authService } from '@/services/auth.service';
import { http } from '@/services/http';
import type { User } from '@/types/api';
import { AuthContext, type AuthContextValue, type AuthStatus } from './auth-context';
import { canAccess, sessionExpiryMs, sessionStore, type StoredSession } from './session';

const MESSAGES = {
  expired: 'Your session has expired. Please sign in again.',
  noAdmin: 'This account does not have active Admin access.',
  forbidden: 'Your account no longer has permission for this page.',
  unauthorized: 'Your session has expired or your account is disabled. Please sign in again.',
} as const;

const MAX_TIMEOUT = 2_147_483_647;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('restoring');
  const [user, setUserState] = useState<User | null>(null);
  const [message, setMessage] = useState('');
  const expiryTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const logout = useCallback(
    (reason = '') => {
      clearTimeout(expiryTimer.current);
      http.setToken(null);
      sessionStore.clear();
      queryClient.clear();
      setUserState(null);
      setMessage(reason);
      setStatus('signed-out');
    },
    [queryClient],
  );

  /** Fetches `/users/me` with the installed token and enforces Admin access. */
  const verify = useCallback(async (): Promise<User> => {
    const me = await authService.me();
    if (!canAccess(me)) {
      logout(MESSAGES.noAdmin);
      throw new ApiError(403, 'ADMIN_REQUIRED', MESSAGES.noAdmin);
    }
    return me;
  }, [logout]);

  const start = useCallback(
    (session: StoredSession, me: User) => {
      sessionStore.save(session);
      clearTimeout(expiryTimer.current);
      const expiry = sessionExpiryMs(session);
      if (expiry !== null) {
        const remaining = expiry - Date.now();
        if (remaining > 0) {
          expiryTimer.current = setTimeout(
            () => logout(MESSAGES.expired),
            Math.min(remaining, MAX_TIMEOUT),
          );
        }
      }
      setUserState(me);
      setMessage('');
      setStatus('signed-in');
    },
    [logout],
  );

  // 401/403 from any request ends the session centrally.
  useEffect(() => {
    http.onUnauthorized = (code) =>
      logout(code === 403 ? MESSAGES.forbidden : MESSAGES.unauthorized);
    return () => {
      http.onUnauthorized = () => {};
    };
  }, [logout]);

  // Restore the tab session once on startup.
  useEffect(() => {
    const saved = sessionStore.load();
    if (!saved) {
      setStatus('signed-out');
      return;
    }
    const expiry = sessionExpiryMs(saved);
    if (expiry !== null && expiry <= Date.now()) {
      logout(MESSAGES.expired);
      return;
    }
    // StrictMode runs this effect twice in development: ignore the cancelled run.
    let cancelled = false;
    http.setToken(saved.accessToken);
    verify()
      .then((me) => {
        if (!cancelled) start(saved, me);
      })
      .catch((error: unknown) => {
        if (cancelled || isAbortError(error)) return;
        // 401/403 and "not an Admin" already ended the session with a specific message.
        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) return;
        // Network/5xx: keep the stored session so a reload can retry.
        http.setToken(null);
        setMessage(errorMessageKey(error));
        setStatus('signed-out');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  // Re-validate role/active state on focus and periodically (no refresh-token endpoint exists).
  useEffect(() => {
    if (status !== 'signed-in') return;
    let running = false;
    const revalidate = async () => {
      if (running || document.hidden) return;
      running = true;
      try {
        setUserState(await verify());
      } catch {
        /* 401/403 is handled centrally; transient errors keep current data */
      } finally {
        running = false;
      }
    };
    const interval = setInterval(() => void revalidate(), SESSION_REVALIDATE_MS);
    window.addEventListener('focus', revalidate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', revalidate);
    };
  }, [status, verify]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authService.login(email, password);
      if (!result || typeof result.accessToken !== 'string' || !result.accessToken) {
        throw new ApiError(500, 'NO_TOKEN', 'Login response did not include an access token.');
      }
      http.setToken(result.accessToken);
      try {
        const me = await verify();
        start({ accessToken: result.accessToken, expiresAt: result.expiresAt }, me);
      } catch (error) {
        http.setToken(null);
        sessionStore.clear();
        throw error;
      }
    },
    [start, verify],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, message, login, logout, setUser: setUserState }),
    [status, user, message, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
