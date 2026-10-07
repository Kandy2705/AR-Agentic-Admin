declare const __ADMIN_API_BASE__: string;

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const DEFAULT_API = 'https://ar-agentic-bscygtc7gdf7b4ga.southeastasia-01.azurewebsites.net';

/**
 * Normalizes a configured API origin (or same-origin path) to the versioned base `…/api/v1`.
 * Rejects credentials, query strings, fragments and plain HTTP outside localhost.
 */
export function normalizeBase(value: string): string {
  const raw = value.trim();
  if (raw.startsWith('/') && !raw.startsWith('//')) {
    return `${raw.replace(/\/$/, '').replace(/\/api\/v1$/i, '')}/api/v1`;
  }

  const url = new URL(raw);
  const insecure =
    url.protocol !== 'https:' && !(url.protocol === 'http:' && LOCAL_HOSTS.includes(url.hostname));
  if (url.username || url.password || url.search || url.hash || insecure) {
    throw new Error('Invalid API base URL');
  }
  return `${url.href.replace(/\/$/, '').replace(/\/api\/v1$/i, '')}/api/v1`;
}

export const API_BASE = normalizeBase(
  typeof __ADMIN_API_BASE__ === 'string' && __ADMIN_API_BASE__ ? __ADMIN_API_BASE__ : DEFAULT_API,
);

/** Server-side page size used by paginated admin endpoints. */
export const PAGE_SIZE = 20;
/** Request timeout in milliseconds. */
export const REQUEST_TIMEOUT_MS = 20_000;
/** How often the signed-in account is re-validated (role + active state). */
export const SESSION_REVALIDATE_MS = 60_000;
