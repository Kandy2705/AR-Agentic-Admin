// Fictional fixtures. Loaded only by the browser test harness; never shipped in dist/.
const storage = () => { const map = new Map(); return { getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, String(value)), removeItem: key => map.delete(key), clear: () => map.clear() }; };
Object.defineProperty(window, 'sessionStorage', { value: storage() });
Object.defineProperty(window, 'localStorage', { value: storage() });
localStorage.setItem('agentic-admin-language', 'en');
window.fixture = {
  admin: { id: 'admin-1', name: 'Test Admin', email: 'admin@example.test', phone: '0900000000', birthday: '2000-01-01T00:00:00Z', gender: '', role: 'Admin', isActive: true },
  users: Array.from({ length: 45 }, (_, i) => ({ id: 'user-' + (i + 1), name: 'Student ' + (i + 1), email: `student${i + 1}@example.test`, phone: '', birthday: null, gender: '', role: 'Customer', isActive: true })),
  buildings: [{ id: 'b-1', name: 'B9', content: 'Campus building', latitude: 10.773479, longitude: 106.660469 }],
  categories: [{ id: 'c-1', name: 'Campus navigation' }, { id: 'c-2', name: 'Account support' }],
  questions: [{ id: 'q-1', content: 'Where is the B9 laboratory?', name: 'Student Example', email: 'student@example.test', createDate: '2026-09-01T10:00:00Z', categoryId: 'c-1', userId: 'user-1' }],
  answers: [],
  histories: [{ id: 'h-1', header: 'Finding the B9 laboratory', create_date: '2026-09-01T10:00:00Z', userId: 'user-1' }],
  messages: [{ id: 'm-1', content: 'How do I get to B9?', contact_time: '2026-09-01T10:00:00Z', contact_person: 'Student' }, { id: 'm-2', content: 'Follow the campus route to B9.', contact_time: '2026-09-01T10:00:01Z', contact_person: 'Assistant' }],
  requests: [], failPath: '', failStatus: 500,
};
window.fetch = async (url, init = {}) => {
  const f = window.fixture, u = new URL(url), path = u.pathname.replace('/api/v1', ''), method = init.method || 'GET', body = init.body ? JSON.parse(init.body) : null;
  if (init.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  f.requests.push({ path, method, body, query: Object.fromEntries(u.searchParams), headers: init.headers });
  const response = (data, status = 200, message = 'ok') => new Response(JSON.stringify({ success: status < 400, data, message, errorCode: status < 400 ? null : 'FIXTURE_ERROR' }), { status, headers: { 'Content-Type': 'application/json' } });
  if (f.failPath === path) return response(null, f.failStatus, 'Sensitive database details MUST NOT appear');
  if (path === '/users/login') return response({ accessToken: 'fixture-access-token', refreshToken: 'fixture-refresh-token', expiresAt: '2099-01-01T00:00:00Z' });
  if (path === '/users/me') return response(f.admin);
  if (path === '/users/update-customer') { Object.assign(f.admin, body); return response(f.admin); }
  if (path === '/users/request-password-change') return response(true);
  if (path === '/users/change-password') return response(f.admin);
  if (path === '/admin/dashboard/summary') return response({ totalUsers: 46, activeUsers: 43, disabledUsers: 3, totalBuildings: f.buildings.length, totalQuestions: f.questions.length, totalAnswers: f.answers.length, totalCategories: f.categories.length, totalHistories: f.histories.length, totalChatboxes: f.messages.length });
  const paginate = rows => { const page = Number(u.searchParams.get('page') || 1), pageSize = Number(u.searchParams.get('pageSize') || 20); return response({ items: rows.slice((page - 1) * pageSize, page * pageSize), page, pageSize, totalItems: rows.length, totalPages: Math.ceil(rows.length / pageSize) }); };
  if (path === '/admin/users') {
    let rows = [f.admin, ...f.users]; const search = u.searchParams.get('search'), role = u.searchParams.get('role'), active = u.searchParams.get('isActive');
    if (search) rows = rows.filter(r => (r.name + ' ' + r.email).toLowerCase().includes(search.toLowerCase()));
    if (role) rows = rows.filter(r => r.role === role); if (active) rows = rows.filter(r => r.isActive === (active === 'true')); return paginate(rows);
  }
  if (path.startsWith('/admin/users/')) {
    const id = path.split('/')[3], user = [f.admin, ...f.users].find(r => r.id === id); if (!user) return response(null, 404);
    if (method === 'PUT') Object.assign(user, body); if (method === 'PATCH') user.isActive = body.isActive;
    return response(user);
  }
  if (path === '/admin/chat/histories') return paginate(f.histories);
  if (path.startsWith('/chat/chatboxes/history/')) return response(f.messages);
  if (path.startsWith('/chat/chatboxes/') && method === 'DELETE') { f.messages = f.messages.filter(r => r.id !== path.split('/').at(-1)); return response(true); }
  if (path.startsWith('/chat/histories/') && method === 'DELETE') { f.histories = f.histories.filter(r => r.id !== path.split('/').at(-1)); return response(true); }
  if (path === '/contacts/questions/q-1/answers') return response(f.answers);
  if (path.startsWith('/contacts/questions/categories/')) return response(f.questions.filter(q => q.categoryId === path.split('/').at(-1)));
  for (const [prefix, key] of [['/buildings', 'buildings'], ['/contacts/categories', 'categories'], ['/contacts/questions', 'questions'], ['/contacts/answers', 'answers']]) {
    if (path !== prefix && !path.startsWith(prefix + '/')) continue;
    const id = path.slice(prefix.length + 1);
    if (method === 'GET') return response(id ? f[key].find(r => r.id === id) : f[key]);
    if (method === 'POST') { const record = { ...body, id: key + '-' + (f[key].length + 1) }; if (key === 'answers') { record.createDate = record.createdDate; delete record.createdDate; } f[key].push(record); return response(record); }
    if (method === 'PUT') { const record = f[key].find(r => r.id === id); Object.assign(record, body); if (key === 'answers') { record.createDate = record.createdDate; delete record.createdDate; } return response(record); }
    if (method === 'DELETE') { f[key] = f[key].filter(r => r.id !== id); return response(true); }
  }
  return response(null, 404, 'Unknown endpoint in strict fixture router: ' + path);
};
