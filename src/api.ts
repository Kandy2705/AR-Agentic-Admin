import { API_BASE } from './config.js';
import type { Answer, AnswerInput, Building, BuildingInput, Category, Chatbox, Dashboard, Floor, FloorInput, FloorUpdate, History, LoginResponse, Page, Params, Question, QuestionInput, Room, RoomInput, RoomUpdate, User, UserUpdate } from './types.js';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); this.name = 'ApiError'; }
}
export function queryString(params: Params = {}): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== null && value !== undefined && value !== '') query.set(key, String(value));
  return query.size ? '?' + query.toString() : '';
}
export function safeId(id: string): string {
  if (!id.trim()) throw new ApiError(400, 'INVALID_ID', 'Resource ID is required.');
  return encodeURIComponent(id);
}
export class ApiClient {
  private token: string | null = null;
  private generation = 0;
  onUnauthorized: (status: number) => void = () => {};
  constructor(public readonly baseUrl: string, private fetcher: typeof fetch = (...args) => fetch(...args)) {}
  setToken(token: string | null): void { this.token = token; this.generation++; }
  async request<T>(path: string, options: { method?: string; body?: unknown; params?: Params; signal?: AbortSignal; public?: boolean } = {}): Promise<T> {
    if (!path.startsWith('/') || path.startsWith('//')) throw new Error('Only relative API paths are allowed.');
    const token = this.token, generation = this.generation;
    if (!options.public && !token) throw new ApiError(401, 'UNAUTHORIZED', 'Please sign in.');
    const control = new AbortController();
    const abort = () => control.abort();
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    options.signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 20000);
    try {
      const response = await this.fetcher(this.baseUrl + path + queryString(options.params), {
        method: options.method || 'GET', signal: control.signal, credentials: 'omit', cache: 'no-store',
        headers: { Accept: 'application/json', ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(!options.public && token ? { Authorization: `Bearer ${token}` } : {}) },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      });
      if (!options.public && generation !== this.generation) throw new DOMException('Session changed', 'AbortError');
      if ((response.status === 401 || response.status === 403) && !options.public) this.onUnauthorized(response.status);
      if (response.status === 204 && response.ok) return undefined as T;
      let payload: Record<string, unknown>;
      try { payload = await response.json(); } catch { throw new ApiError(response.status, 'INVALID_RESPONSE', 'API did not return JSON. Check the API URL and deployment.'); }
      if (!options.public && response.status !== 401 && response.status !== 403 && generation !== this.generation) throw new DOMException('Session changed', 'AbortError');
      if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new ApiError(response.status, 'INVALID_RESPONSE', 'Unexpected API response.');
      if (!response.ok || payload.success === false) {
        const status = response.ok ? 400 : response.status;
        const message = status >= 500 ? 'The server could not complete this request. Please try again.' : typeof payload.message === 'string' ? payload.message.slice(0, 350) : 'Request failed.';
        throw new ApiError(status, typeof payload.errorCode === 'string' ? payload.errorCode : 'API_ERROR', message);
      }
      if (payload.success !== true || !Object.hasOwn(payload, 'data')) throw new ApiError(response.status, 'CONTRACT_MISMATCH', 'API response does not match the expected contract.');
      return payload.data as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (options.signal?.aborted || generation !== this.generation) throw new DOMException('Aborted', 'AbortError');
      if (control.signal.aborted) throw new ApiError(408, 'TIMEOUT', 'The API took too long to respond.');
      throw new ApiError(0, 'NETWORK', 'Cannot connect to the API. Check network, backend deployment and CORS.');
    } finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
  }
}
export const client = new ApiClient(API_BASE);
const get = <T>(path: string, signal?: AbortSignal, params?: Params) => client.request<T>(path, { signal, params });
const send = <T>(path: string, method: string, body?: unknown) => client.request<T>(path, { method, body });
const remove = async (path: string) => { const result = await send<boolean>(path, 'DELETE'); if (result === false) throw new ApiError(409, 'NOT_DELETED', 'The server did not delete the record.'); };
/** The only module that knows endpoint paths and wire payloads. */
export const api = {
  login: (email: string, password: string) => client.request<LoginResponse>('/users/login', { method: 'POST', body: { email, password }, public: true }),
  me: (signal?: AbortSignal) => get<User>('/users/me', signal),
  summary: (signal?: AbortSignal) => get<Dashboard>('/admin/dashboard/summary', signal),
  users: (params: Params, signal?: AbortSignal) => get<Page<User>>('/admin/users', signal, params),
  user: (id: string, signal?: AbortSignal) => get<User>(`/admin/users/${safeId(id)}`, signal),
  updateUser: (id: string, body: UserUpdate) => send<User>(`/admin/users/${safeId(id)}`, 'PUT', body),
  setStatus: (id: string, isActive: boolean) => send<User>(`/admin/users/${safeId(id)}/status`, 'PATCH', { isActive }),
  updateProfile: (body: Omit<UserUpdate, 'role'>) => send<User>('/users/update-customer', 'PUT', body),
  sendOtp: (email: string) => client.request<boolean>('/users/request-password-change', { method: 'POST', body: { email }, public: true }),
  changePassword: (body: { email: string; oldPassword: string; newPassword: string; otpCode: string }) => client.request<User>('/users/change-password', { method: 'POST', body, public: true }),
  buildings: (signal?: AbortSignal) => get<Building[]>('/buildings', signal),
  building: (id: string, signal?: AbortSignal) => get<Building>(`/buildings/${safeId(id)}`, signal),
  createBuilding: (body: BuildingInput & { userId: string }) => send<Building>('/buildings', 'POST', body),
  updateBuilding: (id: string, body: BuildingInput) => send<Building>(`/buildings/${safeId(id)}`, 'PUT', body),
  deleteBuilding: (id: string) => remove(`/buildings/${safeId(id)}`),
  floors: (buildingId: string, signal?: AbortSignal) => get<Floor[]>(`/buildings/${safeId(buildingId)}/floors`, signal),
  floor: (floorId: string, signal?: AbortSignal) => get<Floor>(`/floors/${safeId(floorId)}`, signal),
  createFloor: (buildingId: string, body: FloorInput) => send<Floor>(`/buildings/${safeId(buildingId)}/floors`, 'POST', body),
  updateFloor: (floorId: string, body: FloorUpdate) => send<Floor>(`/floors/${safeId(floorId)}`, 'PUT', body),
  deleteFloor: (floorId: string) => remove(`/floors/${safeId(floorId)}`),
  rooms: (floorId: string, signal?: AbortSignal) => get<Room[]>(`/floors/${safeId(floorId)}/rooms`, signal),
  room: (roomId: string, signal?: AbortSignal) => get<Room>(`/rooms/${safeId(roomId)}`, signal),
  createRoom: (floorId: string, body: RoomInput) => send<Room>(`/floors/${safeId(floorId)}/rooms`, 'POST', body),
  updateRoom: (roomId: string, body: RoomUpdate) => send<Room>(`/rooms/${safeId(roomId)}`, 'PUT', body),
  deleteRoom: (roomId: string) => remove(`/rooms/${safeId(roomId)}`),
  categories: (signal?: AbortSignal) => get<Category[]>('/contacts/categories', signal),
  createCategory: (name: string) => send<Category>('/contacts/categories', 'POST', { name }),
  updateCategory: (id: string, name: string) => send<Category>(`/contacts/categories/${safeId(id)}`, 'PUT', { name }),
  deleteCategory: (id: string) => remove(`/contacts/categories/${safeId(id)}`),
  questions: (categoryId?: string, signal?: AbortSignal) => get<Question[]>(categoryId ? `/contacts/questions/categories/${safeId(categoryId)}` : '/contacts/questions', signal),
  question: (id: string, signal?: AbortSignal) => get<Question>(`/contacts/questions/${safeId(id)}`, signal),
  createQuestion: (body: QuestionInput) => send<Question>('/contacts/questions', 'POST', body),
  updateQuestion: (id: string, body: QuestionInput) => send<Question>(`/contacts/questions/${safeId(id)}`, 'PUT', body),
  deleteQuestion: (id: string) => remove(`/contacts/questions/${safeId(id)}`),
  answers: (questionId: string, signal?: AbortSignal) => get<Answer[]>(`/contacts/questions/${safeId(questionId)}/answers`, signal),
  createAnswer: (body: AnswerInput) => send<Answer>('/contacts/answers', 'POST', body),
  updateAnswer: (id: string, body: AnswerInput) => send<Answer>(`/contacts/answers/${safeId(id)}`, 'PUT', body),
  deleteAnswer: (id: string) => remove(`/contacts/answers/${safeId(id)}`),
  histories: (params: Params, signal?: AbortSignal) => get<Page<History>>('/admin/chat/histories', signal, params),
  messages: (historyId: string, signal?: AbortSignal) => get<Chatbox[]>(`/chat/chatboxes/history/${safeId(historyId)}`, signal),
  deleteHistory: (id: string) => remove(`/chat/histories/${safeId(id)}`),
  deleteMessage: (id: string) => remove(`/chat/chatboxes/${safeId(id)}`),
};
