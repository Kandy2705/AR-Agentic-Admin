import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError, queryString, safeId } from './api-client';

const ok = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data, message: 'ok', errorCode: null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
const failure = (status: number, message = 'rejected') =>
  new Response(JSON.stringify({ success: false, data: null, message }), { status });

const client = (fetcher: typeof fetch, token: string | null = 'fixture-token') => {
  const c = new ApiClient('https://api.example.test/api/v1', fetcher);
  c.setToken(token);
  return c;
};

describe('queryString', () => {
  it('keeps false and zero but omits absent filters', () => {
    expect(
      queryString({ page: 1, isActive: false, empty: '', nothing: null, missing: undefined, n: 0 }),
    ).toBe('?page=1&isActive=false&n=0');
  });
});

describe('safeId', () => {
  it('encodes path segments and rejects empty ids', () => {
    expect(safeId('id/with?chars')).toBe('id%2Fwith%3Fchars');
    expect(() => safeId(' ')).toThrow(ApiError);
  });
});

describe('ApiClient', () => {
  it('unwraps the envelope and attaches only the bearer token', async () => {
    const fetcher = vi.fn(async () => ok({ id: '1' }));
    await expect(client(fetcher).request('/users/me')).resolves.toEqual({ id: '1' });
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.example.test/api/v1/users/me');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer fixture-token');
    expect(init.credentials).toBe('omit');
    expect(init.cache).toBe('no-store');
  });

  it('never attaches a previous bearer token to public endpoints', async () => {
    const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
      return ok(true);
    });
    await client(fetcher as typeof fetch).request('/users/login', { public: true });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('fails unauthenticated requests without a network call', async () => {
    const fetcher = vi.fn();
    await expect(client(fetcher, null).request('/admin/users')).rejects.toMatchObject({
      status: 401,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([401, 403] as const)('notifies the auth boundary on HTTP %i', async (status) => {
    const c = client(async () => failure(status));
    const onUnauthorized = vi.fn();
    c.onUnauthorized = onUnauthorized;
    await expect(c.request('/admin/users')).rejects.toMatchObject({ status });
    expect(onUnauthorized).toHaveBeenCalledWith(status);
  });

  it('ignores stale responses after the session changed', async () => {
    let resolve!: (response: Response) => void;
    const c = client(() => new Promise((r) => (resolve = r)), 'old-token');
    const onUnauthorized = vi.fn();
    c.onUnauthorized = onUnauthorized;
    const pending = c.request('/admin/users');
    c.setToken('new-token');
    resolve(failure(401));
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('never exposes raw 5xx server messages', async () => {
    const c = client(async () => failure(500, 'Sensitive database connection details'));
    const error = await c.request('/admin/users').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(500);
    expect((error as ApiError).message).not.toContain('Sensitive');
  });

  it('treats HTTP 200 with success:false as an error', async () => {
    const c = client(
      async () =>
        new Response(
          JSON.stringify({ success: false, data: null, message: 'Duplicate', errorCode: 'DUP' }),
        ),
    );
    await expect(c.request('/buildings')).rejects.toMatchObject({
      code: 'DUP',
      message: 'Duplicate',
    });
  });

  it('rejects HTML and malformed envelopes', async () => {
    for (const body of ['<html>Error</html>', JSON.stringify({ items: [] }), JSON.stringify([1])]) {
      const c = client(async () => new Response(body));
      await expect(c.request('/admin/users')).rejects.toBeInstanceOf(ApiError);
    }
  });

  it('maps network failures to a friendly error', async () => {
    const c = client(async () => {
      throw new TypeError('Failed to fetch');
    });
    await expect(c.request('/admin/users')).rejects.toMatchObject({ status: 0, code: 'NETWORK' });
  });

  it('does not treat a DELETE returning false as success', async () => {
    const c = client(async () => ok(false));
    await expect(c.remove('/buildings/1')).rejects.toMatchObject({ code: 'NOT_DELETED' });
    const d = client(async () => ok(true));
    await expect(d.remove('/buildings/1')).resolves.toBeUndefined();
  });

  it('only accepts relative API paths', async () => {
    await expect(client(vi.fn()).request('https://evil.test')).rejects.toThrow();
    await expect(client(vi.fn()).request('//evil.test')).rejects.toThrow();
  });
});
