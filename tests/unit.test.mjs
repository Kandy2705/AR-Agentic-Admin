import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient, ApiError, queryString, safeId, api, client } from '../dist/app/api.js';
import { normalizeBase } from '../dist/app/config.js';
import { canAccess } from '../dist/app/auth.js';
import { nullableNumber, localPage, newest, dateRange, idOf, initials } from '../dist/app/utils.js';
const ok = data => new Response(JSON.stringify({ success: true, data, message: 'ok', errorCode: null }), { status: 200, headers: { 'Content-Type': 'application/json' } });
const failure = (status, message = 'rejected') => new Response(JSON.stringify({ success: false, data: null, message }), { status });

test('base URL: normalizes a root or an existing API prefix exactly once', () => {
  assert.equal(normalizeBase('https://api.example.test/'), 'https://api.example.test/api/v1');
  assert.equal(normalizeBase('https://api.example.test/api/v1/'), 'https://api.example.test/api/v1');
  assert.equal(normalizeBase('http://localhost:5100'), 'http://localhost:5100/api/v1');
});
test('base URL: rejects unsafe protocols, credentials and non-local HTTP', () => {
  for (const value of ['javascript:alert(1)', 'http://example.test', 'https://user:pass@example.test', 'https://example.test/?secret=x', 'https://example.test/#fragment']) assert.throws(() => normalizeBase(value));
});
test('query builder keeps false and zero but omits absent filters', () => {
  assert.equal(queryString({ page: 1, isActive: false, empty: '', nothing: null, missing: undefined, n: 0 }), '?page=1&isActive=false&n=0');
});
test('path IDs are encoded and empty identifiers are rejected', () => {
  assert.equal(safeId('id/with?chars'), 'id%2Fwith%3Fchars'); assert.throws(() => safeId(' '));
});
test('client unwraps ApiResponse and attaches only the access token', async () => {
  let request;
  const c = new ApiClient('https://api.example.test/api/v1', async (url, init) => { request = { url, init }; return ok({ id: '1' }); });
  c.setToken('fixture-token');
  assert.deepEqual(await c.request('/users/me'), { id: '1' });
  assert.equal(request.init.headers.Authorization, 'Bearer fixture-token');
  assert.equal(request.init.credentials, 'omit'); assert.equal(request.init.cache, 'no-store');
});
test('public login never attaches a previous bearer token', async () => {
  const c = new ApiClient('https://api.example.test/api/v1', async (_url, init) => { assert.equal(init.headers.Authorization, undefined); return ok(true); });
  c.setToken('fixture-token'); await c.request('/users/login', { public: true });
});
test('unauthenticated requests fail without performing fetch', async () => {
  const c = new ApiClient('https://api.example.test', async () => { assert.fail('Unexpected network call'); });
  await assert.rejects(c.request('/admin/users'), error => error.status === 401);
});
test('HTTP 401 and 403 notify the auth boundary', async () => {
  for (const status of [401, 403]) {
    const c = new ApiClient('https://api.example.test', async () => failure(status)); c.setToken('fixture-token');
    let actual; c.onUnauthorized = value => { actual = value; };
    await assert.rejects(c.request('/admin/users'), error => error.status === status); assert.equal(actual, status);
  }
});
test('stale responses cannot log out a newer session', async () => {
  let resolve;
  const c = new ApiClient('https://api.example.test', () => new Promise(r => { resolve = r; }));
  c.setToken('old-fixture'); let notifications = 0; c.onUnauthorized = () => notifications++;
  const pending = c.request('/admin/users'); c.setToken('new-fixture'); resolve(failure(401));
  await assert.rejects(pending, error => error.name === 'AbortError'); assert.equal(notifications, 0);
});
test('5xx errors never expose raw server exception messages', async () => {
  const c = new ApiClient('https://api.example.test', async () => failure(500, 'Sensitive database connection details')); c.setToken('fixture-token');
  await assert.rejects(c.request('/admin/users'), error => error.status === 500 && !error.message.includes('Sensitive'));
});
test('HTML or malformed API envelopes are not accepted as records', async () => {
  for (const response of [new Response('<html>Error</html>'), new Response(JSON.stringify({ items: [] }))]) {
    const c = new ApiClient('https://api.example.test', async () => response); c.setToken('fixture-token');
    await assert.rejects(c.request('/users'), error => error instanceof ApiError);
  }
});
test('success:false on HTTP 200 is an error, not a successful mutation', async () => {
  const c = new ApiClient('https://api.example.test', async () => failure(200)); c.setToken('fixture-token');
  await assert.rejects(c.request('/users', { method: 'PUT' }), error => error.status === 400);
});
test('an already aborted navigation cannot start a request', async () => {
  const c = new ApiClient('https://api.example.test', async () => { assert.fail('fetch called'); }); c.setToken('fixture-token');
  await assert.rejects(c.request('/users', { signal: AbortSignal.abort() }), error => error.name === 'AbortError');
});
test('network failure is distinct from HTTP and auth errors', async () => {
  const c = new ApiClient('https://api.example.test', async () => { throw new TypeError('Failed to fetch'); }); c.setToken('fixture-token');
  await assert.rejects(c.request('/users'), error => error.status === 0 && error.code === 'NETWORK');
});
test('only an identified active Admin can enter the portal', () => {
  const user = { id: 'admin', isActive: true, role: 'Admin' };
  assert.equal(canAccess(user), true);
  for (const candidate of [null, { ...user, id: null }, { ...user, isActive: false }, { ...user, isActive: undefined }, { ...user, role: 'Employee' }, { ...user, role: 'Customer' }]) assert.equal(canAccess(candidate), false);
});
test('coordinate validation preserves zero, rejects out of range and keeps empty as null', () => {
  assert.equal(nullableNumber('0', -90, 90), 0); assert.equal(nullableNumber('', -90, 90), null);
  assert.throws(() => nullableNumber('91', -90, 90)); assert.throws(() => nullableNumber('x', -180, 180));
});
test('client pagination handles deletion of the last row and empty arrays', () => {
  assert.deepEqual(localPage([], 9).items, []); assert.equal(localPage([], 9).page, 1);
  assert.equal(localPage([1, 2, 3], 9, 2).page, 2); assert.deepEqual(localPage([1, 2, 3], 9, 2).items, [3]);
});
test('date sorting is non-mutating and nullable timestamps do not crash', () => {
  const a = [{ date: null }, { date: '2026-01-01' }]; assert.equal(newest(a, x => x.date)[0].date, '2026-01-01'); assert.equal(a[0].date, null);
});
test('date range validates ordering and includes the full final day', () => {
  assert.throws(() => dateRange('2026-09-10', '2026-09-01'));
  assert.deepEqual(dateRange('', ''), {}); assert.match(dateRange('2026-01-01', '2026-01-01').toDate, /999Z$/);
});
test('identity helpers handle missing data without making up IDs', () => {
  assert.throws(() => idOf({ id: null })); assert.equal(idOf({ id: 'id' }), 'id'); assert.equal(initials('Test Admin'), 'TA');
});
test('service wire contract: pagination, precise answer date field and status boolean', async () => {
  const original = globalThis.fetch, requests = [];
  globalThis.fetch = async (url, init) => { requests.push({ url, init }); return ok(true); };
  client.setToken('fixture-token');
  try {
    await api.users({ page: 2, pageSize: 20, isActive: false });
    await api.createAnswer({ content: 'fixture', createdDate: '2026-09-01T00:00:00Z', questionId: 'q/1', userId: 'admin' });
    await api.answers('q/1'); await api.setStatus('user', false); await api.updateProfile({ name: 'Test', phone: '', birthday: null, gender: '' });
    assert.match(requests[0].url, /admin\/users\?page=2&pageSize=20&isActive=false$/);
    assert.equal(JSON.parse(requests[1].init.body).createdDate, '2026-09-01T00:00:00Z'); assert.equal(JSON.parse(requests[1].init.body).createDate, undefined);
    assert.match(requests[2].url, /contacts\/questions\/q%2F1\/answers$/);
    assert.deepEqual(JSON.parse(requests[3].init.body), { isActive: false });
    assert.equal(JSON.parse(requests[4].init.body).role, undefined);
  } finally { globalThis.fetch = original; client.setToken(null); }
});
test('failed DELETE data=false must not display success', async () => {
  const original = globalThis.fetch; globalThis.fetch = async () => ok(false); client.setToken('fixture-token');
  try { await assert.rejects(api.deleteCategory('c'), error => error.status === 409); }
  finally { globalThis.fetch = original; client.setToken(null); }
});
test('a session switch while parsing JSON cannot return private stale data', async () => {
  let release;
  const c = new ApiClient('https://example.test/api/v1', async () => ({ status: 200, ok: true, json: () => new Promise(resolve => { release = resolve; }) }));
  c.setToken('old'); const pending = c.request('/private');
  await new Promise(resolve => setTimeout(resolve, 0));
  c.setToken('new'); release({ success: true, data: { private: 'old user' } });
  await assert.rejects(pending, error => error.name === 'AbortError');
});
