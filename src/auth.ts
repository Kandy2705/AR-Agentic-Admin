import { api, ApiError, client } from './api.js';
import type { User } from './types.js';
const KEY = 'agentic-admin-session';
export function canAccess(user: User | null | undefined): boolean { return !!user && user.role === 'Admin' && user.isActive === true && typeof user.id === 'string' && user.id.length > 0; }

function jwtExpiryMs(accessToken: string): number | null {
  try {
    const parts = accessToken.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const payload = JSON.parse(atob(padded)) as { exp?: unknown };
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp) ? payload.exp * 1000 : null;
  } catch { return null; }
}

function fallbackExpiryMs(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  let value = expiresAt.trim();
  if (!value) return null;
  // ASP.NET may serialize DateTime without a zone. Supabase expiry is UTC, so normalize
  // a zone-less ISO value to UTC instead of letting the browser interpret it as local time.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) && !/(Z|[+-]\d{2}:\d{2})$/i.test(value)) value += 'Z';
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function expiryMs(accessToken: string, expiresAt: string | null): number | null {
  return jwtExpiryMs(accessToken) ?? fallbackExpiryMs(expiresAt);
}

export class Session {
  user: User | null = null;
  message = '';
  private expiry: ReturnType<typeof setTimeout> | undefined;
  private listener = () => {};
  onChange(listener: () => void): void { this.listener = listener; }
  private remember(accessToken: string, expiresAt: string | null): void {
    try { sessionStorage.setItem(KEY, JSON.stringify({ accessToken, expiresAt })); } catch { /* In-memory session still works when storage is blocked. */ }
    clearTimeout(this.expiry);
    const absoluteExpiry = expiryMs(accessToken, expiresAt);
    if (absoluteExpiry !== null) {
      const remaining = absoluteExpiry - Date.now();
      if (remaining > 0) this.expiry = setTimeout(() => this.clear('Your session has expired. Please sign in again.'), Math.min(remaining, 2147483647));
    }
  }
  async restore(): Promise<void> {
    let saved: { accessToken?: unknown; expiresAt?: unknown } | null = null;
    try { saved = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { /* invalid session */ }
    if (!saved || typeof saved.accessToken !== 'string') return;
    const expiresAt = typeof saved.expiresAt === 'string' ? saved.expiresAt : null;
    const absoluteExpiry = expiryMs(saved.accessToken, expiresAt);
    if (absoluteExpiry !== null && absoluteExpiry <= Date.now()) { this.clear('Your session has expired. Please sign in again.'); return; }
    client.setToken(saved.accessToken);
    try { await this.refresh(); this.remember(saved.accessToken, expiresAt); } catch { this.clear('Please sign in to verify your account.'); }
  }
  async login(email: string, password: string): Promise<void> {
    const result = await api.login(email, password);
    if (!result || typeof result.accessToken !== 'string' || !result.accessToken) throw new ApiError(500, 'NO_TOKEN', 'Login response did not include an access token.');
    client.setToken(result.accessToken);
    try {
      await this.refresh();
      this.remember(result.accessToken, result.expiresAt);
      this.message = ''; this.listener();
    } catch (error) { this.clear(this.message || (error instanceof Error ? error.message : 'Please sign in again.')); throw error; }
  }
  async refresh(): Promise<void> {
    const user = await api.me();
    if (!canAccess(user)) { this.clear('This account does not have active Admin access.'); throw new ApiError(403, 'ADMIN_REQUIRED', 'This account does not have active Admin access.'); }
    this.user = user;
  }
  clear(message = ''): void {
    this.user = null; this.message = message; client.setToken(null); clearTimeout(this.expiry);
    try { sessionStorage.removeItem(KEY); } catch { /* no persistent secret to clear */ }
    this.listener();
  }
}
export const session = new Session();
client.onUnauthorized = status => session.clear(status === 403 ? 'Your account no longer has permission for this page.' : 'Your session has expired or your account is disabled. Please sign in again.');
