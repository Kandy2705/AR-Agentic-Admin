import { REQUEST_TIMEOUT_MS } from '@/config/env';

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/** Builds `?a=1&b=false`. Keeps `0` and `false`, drops empty/absent values. */
export function queryString(params: QueryParams = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== '') query.set(key, String(value));
  }
  return query.size ? `?${query.toString()}` : '';
}

/** Encodes a path segment and rejects empty identifiers. */
export function safeId(id: string): string {
  if (!id.trim()) throw new ApiError(400, 'INVALID_ID', 'Resource ID is required.');
  return encodeURIComponent(id);
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

const abortError = (message = 'Aborted') => new DOMException(message, 'AbortError');

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: QueryParams;
  signal?: AbortSignal;
  /** Public endpoints never receive the bearer token. */
  public?: boolean;
}

/**
 * Remote API client (Persistence layer). The only place that knows the wire envelope
 * `{ success, data, message, errorCode }`, authentication headers, timeouts and error mapping.
 */
export class ApiClient {
  private token: string | null = null;
  /** Incremented on every token change so stale responses cannot affect a newer session. */
  private generation = 0;
  onUnauthorized: (status: 401 | 403) => void = () => {};

  constructor(
    readonly baseUrl: string,
    private readonly fetcher: typeof fetch = (...args) => fetch(...args),
  ) {}

  setToken(token: string | null): void {
    if (token === this.token) return;
    this.token = token;
    this.generation += 1;
  }

  hasToken(): boolean {
    return this.token !== null;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//')) {
      throw new Error('Only relative API paths are allowed.');
    }
    const { token, generation } = this;
    const isPublic = options.public === true;
    if (!isPublic && !token) throw new ApiError(401, 'UNAUTHORIZED', 'Please sign in.');
    if (options.signal?.aborted) throw abortError();

    const control = new AbortController();
    const abort = () => control.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, REQUEST_TIMEOUT_MS);
    const stale = () => !isPublic && generation !== this.generation;

    try {
      const hasBody = options.body !== undefined;
      const response = await this.fetcher(this.baseUrl + path + queryString(options.params), {
        method: options.method ?? 'GET',
        signal: control.signal,
        credentials: 'omit',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
          ...(!isPublic && token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: hasBody ? JSON.stringify(options.body) : undefined,
      });

      if (stale()) throw abortError('Session changed');
      if (!isPublic && (response.status === 401 || response.status === 403)) {
        this.onUnauthorized(response.status);
      }
      if (response.status === 204 && response.ok) return undefined as T;

      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw new ApiError(
          response.status,
          'INVALID_RESPONSE',
          'API did not return JSON. Check the API URL and deployment.',
        );
      }
      if (stale()) throw abortError('Session changed');
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        throw new ApiError(response.status, 'INVALID_RESPONSE', 'Unexpected API response.');
      }

      const envelope = payload as Record<string, unknown>;
      if (!response.ok || envelope.success === false) {
        const status = response.ok ? 400 : response.status;
        // Never surface raw server exception text for 5xx responses.
        const message =
          status >= 500
            ? 'The server could not complete this request. Please try again.'
            : typeof envelope.message === 'string'
              ? envelope.message.slice(0, 350)
              : 'Request failed.';
        const code = typeof envelope.errorCode === 'string' ? envelope.errorCode : 'API_ERROR';
        throw new ApiError(status, code, message);
      }
      if (envelope.success !== true || !Object.hasOwn(envelope, 'data')) {
        throw new ApiError(
          response.status,
          'CONTRACT_MISMATCH',
          'API response does not match the expected contract.',
        );
      }
      return envelope.data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (options.signal?.aborted || stale()) throw abortError();
      if (control.signal.aborted) {
        throw new ApiError(408, 'TIMEOUT', 'The API took too long to respond.');
      }
      if (isAbortError(error)) throw error;
      throw new ApiError(
        0,
        'NETWORK',
        'Cannot connect to the API. Check network, backend deployment and CORS.',
      );
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }
  }

  get<T>(path: string, signal?: AbortSignal, params?: QueryParams): Promise<T> {
    return this.request<T>(path, { signal, params });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'POST', body });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body });
  }

  /** DELETE endpoints return `data: boolean`; `false` is not a completed deletion. */
  async remove(path: string): Promise<void> {
    const result = await this.request<boolean | undefined>(path, { method: 'DELETE' });
    if (result === false) {
      throw new ApiError(409, 'NOT_DELETED', 'The server did not delete the record.');
    }
  }
}
