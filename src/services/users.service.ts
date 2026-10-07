import { safeId } from '@/lib/http/api-client';
import type { Page, User, UserListParams, UserUpdate } from '@/types/api';
import { http } from './http';

export const usersService = {
  list: (params: UserListParams, signal?: AbortSignal) =>
    http.get<Page<User>>('/admin/users', signal, { ...params }),
  get: (id: string, signal?: AbortSignal) => http.get<User>(`/admin/users/${safeId(id)}`, signal),
  update: (id: string, body: UserUpdate) => http.put<User>(`/admin/users/${safeId(id)}`, body),
  setStatus: (id: string, isActive: boolean) =>
    http.patch<User>(`/admin/users/${safeId(id)}/status`, { isActive }),
};
