import type { User } from '@/types/api';

const STORAGE_KEY = 'agentic-admin-session';

export interface StoredSession {
  accessToken: string;
  expiresAt: string | null;
}

/** Only an active Admin with an ID may use this portal. The backend remains the security boundary. */
export function canAccess(user: User | null | undefined): user is User & { id: string } {
  return (
    !!user &&
    user.role === 'Admin' &&
    user.isActive === true &&
    typeof user.id === 'string' &&
    user.id.length > 0
  );
}

function jwtExpiryMs(accessToken: string): number | null {
  try {
    const [, payload] = accessToken.split('.');
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const { exp } = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : null;
  } catch {
    return null;
  }
}

function fallbackExpiryMs(expiresAt: string | null): number | null {
  let value = expiresAt?.trim();
  if (!value) return null;
  // ASP.NET may serialize DateTime without a zone; Supabase expiry is UTC.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) && !/(Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    value += 'Z';
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Absolute expiry (ms since epoch): JWT `exp` first, backend `expiresAt` as fallback. */
export function sessionExpiryMs(session: StoredSession): number | null {
  return jwtExpiryMs(session.accessToken) ?? fallbackExpiryMs(session.expiresAt);
}

/** Tab-scoped storage. Passwords and refresh tokens are never persisted. */
export const sessionStore = {
  load(): StoredSession | null {
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? 'null') as {
        accessToken?: unknown;
        expiresAt?: unknown;
      } | null;
      if (!saved || typeof saved.accessToken !== 'string' || !saved.accessToken) return null;
      return {
        accessToken: saved.accessToken,
        expiresAt: typeof saved.expiresAt === 'string' ? saved.expiresAt : null,
      };
    } catch {
      return null;
    }
  },
  save(session: StoredSession): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* in-memory session still works when storage is blocked */
    }
  },
  clear(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nothing persisted */
    }
  },
};
