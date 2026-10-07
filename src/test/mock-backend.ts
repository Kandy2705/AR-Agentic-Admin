/**
 * In-memory fake of the Agentic AR API used by integration tests and screenshots.
 * Fictional data only — never shipped (tests are excluded from the build).
 */
import type {
  Building,
  Category,
  Chatbox,
  Floor,
  History,
  Question,
  Room,
  User,
} from '@/types/api';

export interface MockState {
  admin: User;
  users: User[];
  buildings: Building[];
  floors: Floor[];
  rooms: Room[];
  categories: Category[];
  questions: Question[];
  answers: {
    id: string;
    content: string;
    createDate: string;
    questionId: string;
    userId: string;
  }[];
  histories: History[];
  messages: Chatbox[];
  requests: { method: string; path: string; body: unknown; query: Record<string, string> }[];
}

export function createMockState(): MockState {
  const admin: User = {
    id: 'admin-1',
    name: 'Test Admin',
    email: 'admin@example.test',
    phone: '0900000000',
    birthday: '2000-01-01T00:00:00Z',
    gender: '',
    role: 'Admin',
    isActive: true,
  };
  return {
    admin,
    users: Array.from({ length: 45 }, (_, i) => ({
      id: `user-${i + 1}`,
      name: `Student ${i + 1}`,
      email: `student${i + 1}@example.test`,
      phone: '',
      birthday: null,
      gender: '',
      role: i % 9 === 0 ? 'Employee' : 'Customer',
      isActive: i % 7 !== 3,
    })),
    buildings: [
      {
        id: 'b-1',
        name: 'B9',
        content: 'Computer Science building',
        latitude: 10.773479,
        longitude: 106.660469,
      },
      { id: 'b-2', name: 'A4', content: 'Library', latitude: 10.7726, longitude: 106.6594 },
      { id: 'b-3', name: 'C6', content: 'Lecture hall', latitude: null, longitude: null },
    ],
    floors: [
      {
        id: 'f-1',
        buildingId: 'b-1',
        floorNumber: 1,
        name: 'Ground floor',
        floorPlanUrl: null,
        sourceUrl: 'https://example.test/b9',
        verified: true,
      },
      {
        id: 'f-2',
        buildingId: 'b-1',
        floorNumber: 2,
        name: null,
        floorPlanUrl: null,
        sourceUrl: null,
        verified: false,
      },
    ],
    rooms: [
      {
        id: 'r-1',
        floorId: 'f-1',
        roomCode: '101',
        name: 'Lab 1',
        description: null,
        roomType: 'Computer room',
        localX: 1.5,
        localY: 0,
        localZ: 4,
        sourceUrl: null,
        verified: true,
      },
      {
        id: 'r-2',
        floorId: 'f-1',
        roomCode: '102',
        name: 'Lab 2',
        description: null,
        roomType: 'Computer room',
        localX: null,
        localY: null,
        localZ: null,
        sourceUrl: null,
        verified: false,
      },
    ],
    categories: [
      { id: 'c-1', name: 'Campus navigation' },
      { id: 'c-2', name: 'Account support' },
    ],
    questions: [
      {
        id: 'q-1',
        content: 'Where is the B9 laboratory?',
        name: 'Student Example',
        email: 'student@example.test',
        createDate: '2026-09-01T10:00:00Z',
        categoryId: 'c-1',
        userId: 'user-1',
      },
      {
        id: 'q-2',
        content: 'How do I reset my password?',
        name: 'Student Two',
        email: 'two@example.test',
        createDate: '2026-09-03T08:30:00Z',
        categoryId: 'c-2',
        userId: 'user-2',
      },
    ],
    answers: [],
    histories: [
      {
        id: 'h-1',
        header: 'Finding the B9 laboratory',
        create_date: '2026-09-01T10:00:00Z',
        userId: 'user-1',
      },
      {
        id: 'h-2',
        header: 'Library opening hours',
        create_date: '2026-09-02T09:00:00Z',
        userId: 'user-2',
      },
    ],
    messages: [
      {
        id: 'm-1',
        content: 'How do I get to B9?',
        contact_time: '2026-09-01T10:00:00Z',
        contact_person: 'Student',
      },
      {
        id: 'm-2',
        content: 'Follow the campus route to B9.',
        contact_time: '2026-09-01T10:00:01Z',
        contact_person: 'Assistant',
      },
    ],
    requests: [],
  };
}

const json = (data: unknown, status = 200, message = 'ok') =>
  new Response(
    JSON.stringify({
      success: status < 400,
      data,
      message,
      errorCode: status < 400 ? null : 'MOCK',
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );

let seq = 100;

/** Returns a `fetch` implementation backed by `state`. */
export function createMockFetch(state: MockState): typeof fetch {
  return async (input, init = {}) => {
    const url = new URL(String(input), 'http://localhost');
    const path = url.pathname.replace(/^.*\/api\/v1/, '');
    const method = (init.method ?? 'GET').toUpperCase();
    const body = init.body ? JSON.parse(String(init.body)) : null;
    state.requests.push({ method, path, body, query: Object.fromEntries(url.searchParams) });
    const seg = path.split('/').filter(Boolean);
    const all = () => [state.admin, ...state.users];
    const paginate = <T>(rows: T[]) => {
      const page = Number(url.searchParams.get('page') ?? 1);
      const pageSize = Number(url.searchParams.get('pageSize') ?? 20);
      return json({
        items: rows.slice((page - 1) * pageSize, page * pageSize),
        page,
        pageSize,
        totalItems: rows.length,
        totalPages: Math.ceil(rows.length / pageSize),
      });
    };

    if (path === '/users/login') {
      return body?.password === 'wrong'
        ? json(null, 400, 'Invalid email or password.')
        : json({ accessToken: 'mock-token', refreshToken: 'r', expiresAt: '2099-01-01T00:00:00Z' });
    }
    if (path === '/users/me') return json(state.admin);
    if (path === '/users/update-customer') return json(Object.assign(state.admin, body));
    if (path === '/users/request-password-change') return json(true);
    if (path === '/users/change-password') return json(state.admin);
    if (path === '/admin/dashboard/summary') {
      const users = all();
      return json({
        totalUsers: users.length,
        activeUsers: users.filter((u) => u.isActive).length,
        disabledUsers: users.filter((u) => !u.isActive).length,
        totalBuildings: state.buildings.length,
        totalQuestions: state.questions.length,
        totalAnswers: state.answers.length,
        totalCategories: state.categories.length,
        totalHistories: state.histories.length,
        totalChatboxes: state.messages.length,
      });
    }
    if (path === '/admin/users') {
      const search = (url.searchParams.get('search') ?? '').toLowerCase();
      const role = url.searchParams.get('role');
      const active = url.searchParams.get('isActive');
      return paginate(
        all().filter(
          (u) =>
            `${u.name} ${u.email}`.toLowerCase().includes(search) &&
            (!role || u.role === role) &&
            (!active || u.isActive === (active === 'true')),
        ),
      );
    }
    if (seg[0] === 'admin' && seg[1] === 'users' && seg[2]) {
      const user = all().find((u) => u.id === decodeURIComponent(seg[2]));
      if (!user) return json(null, 404, 'Not found');
      if (method === 'PUT') Object.assign(user, body);
      if (method === 'PATCH') user.isActive = body.isActive;
      return json(user);
    }
    if (path === '/admin/chat/histories') {
      const userId = url.searchParams.get('userId');
      return paginate(state.histories.filter((h) => !userId || h.userId === userId));
    }
    if (seg[0] === 'chat' && seg[1] === 'chatboxes' && seg[2] === 'history')
      return json(state.messages);
    if (seg[0] === 'chat' && seg[1] === 'chatboxes' && method === 'DELETE') {
      state.messages = state.messages.filter((m) => m.id !== seg[2]);
      return json(true);
    }
    if (seg[0] === 'chat' && seg[1] === 'histories' && method === 'DELETE') {
      state.histories = state.histories.filter((h) => h.id !== seg[2]);
      return json(true);
    }
    if (seg[0] === 'buildings' && seg[2] === 'floors') {
      if (method === 'POST') {
        const floor = { ...body, id: `f-${++seq}`, buildingId: seg[1] };
        state.floors.push(floor);
        return json(floor);
      }
      return json(state.floors.filter((f) => f.buildingId === seg[1]));
    }
    if (seg[0] === 'floors' && seg[2] === 'rooms') {
      if (method === 'POST') {
        const room = { ...body, id: `r-${++seq}`, floorId: seg[1] };
        state.rooms.push(room);
        return json(room);
      }
      return json(state.rooms.filter((r) => r.floorId === seg[1]));
    }
    if (seg[0] === 'contacts' && seg[1] === 'questions' && seg[2] === 'categories') {
      return json(state.questions.filter((q) => q.categoryId === seg[3]));
    }
    if (seg[0] === 'contacts' && seg[1] === 'questions' && seg[3] === 'answers') {
      return json(state.answers.filter((a) => a.questionId === seg[2]));
    }

    const collections: [string, keyof MockState][] = [
      ['/buildings', 'buildings'],
      ['/floors', 'floors'],
      ['/rooms', 'rooms'],
      ['/contacts/categories', 'categories'],
      ['/contacts/questions', 'questions'],
      ['/contacts/answers', 'answers'],
    ];
    for (const [prefix, key] of collections) {
      if (path !== prefix && !path.startsWith(`${prefix}/`)) continue;
      const rows = state[key] as { id: string | null }[];
      const id = decodeURIComponent(path.slice(prefix.length + 1));
      if (method === 'GET')
        return id
          ? json(rows.find((r) => r.id === id) ?? null, rows.some((r) => r.id === id) ? 200 : 404)
          : json(rows);
      if (method === 'POST') {
        const record = { ...body, id: `${key}-${++seq}` };
        if (key === 'answers') {
          record.createDate = record.createdDate;
          delete record.createdDate;
        }
        rows.push(record);
        return json(record);
      }
      if (method === 'PUT') {
        const record = rows.find((r) => r.id === id);
        Object.assign(record ?? {}, body);
        return json(record);
      }
      if (method === 'DELETE') {
        (state[key] as unknown) = rows.filter((r) => r.id !== id);
        return json(true);
      }
    }
    return json(null, 404, `Unknown mock endpoint: ${method} ${path}`);
  };
}
