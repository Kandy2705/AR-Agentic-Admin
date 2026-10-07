import { describe, expect, it } from 'vitest';
import type { User } from '@/types/api';
import { canAccess, sessionExpiryMs, sessionStore } from './session';

const admin: User = {
  id: 'a',
  name: 'A',
  email: 'a@x.test',
  phone: null,
  birthday: null,
  gender: null,
  role: 'Admin',
  isActive: true,
};

const jwt = (payload: object) => `h.${btoa(JSON.stringify(payload)).replace(/=+$/, '')}.s`;

describe('session', () => {
  it('only active admins with an id can access', () => {
    expect(canAccess(admin)).toBe(true);
    expect(canAccess({ ...admin, isActive: false })).toBe(false);
    expect(canAccess({ ...admin, role: 'Employee' })).toBe(false);
    expect(canAccess({ ...admin, id: '' })).toBe(false);
    expect(canAccess(null)).toBe(false);
  });

  it('prefers JWT exp and treats zone-less backend dates as UTC', () => {
    expect(sessionExpiryMs({ accessToken: jwt({ exp: 2_000_000_000 }), expiresAt: null })).toBe(
      2_000_000_000_000,
    );
    expect(sessionExpiryMs({ accessToken: 'opaque', expiresAt: '2030-01-01T00:00:00' })).toBe(
      Date.parse('2030-01-01T00:00:00Z'),
    );
    expect(sessionExpiryMs({ accessToken: 'opaque', expiresAt: null })).toBeNull();
  });

  it('stores only the access token and expiry', () => {
    sessionStore.save({ accessToken: 't', expiresAt: null });
    expect(sessionStore.load()).toEqual({ accessToken: 't', expiresAt: null });
    sessionStore.clear();
    expect(sessionStore.load()).toBeNull();
  });
});
