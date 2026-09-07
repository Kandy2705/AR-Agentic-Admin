declare global { interface Window { __ADMIN_CONFIG__?: { apiBaseUrl?: string }; } }
export function normalizeBase(value: string): string {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw new Error('Invalid API base URL');
  return url.href.replace(/\/$/, '').replace(/\/api\/v1$/i, '') + '/api/v1';
}
export const API_BASE = normalizeBase(typeof window !== 'undefined' && window.__ADMIN_CONFIG__?.apiBaseUrl || 'https://ar-agentic-bscygtc7gdf7b4ga.southeastasia-01.azurewebsites.net');
