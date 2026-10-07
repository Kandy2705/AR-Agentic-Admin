import type { LoginResponse, PasswordChange, ProfileUpdate, User } from '@/types/api';
import { http } from './http';

export const authService = {
  login: (email: string, password: string) =>
    http.request<LoginResponse>('/users/login', {
      method: 'POST',
      body: { email, password },
      public: true,
    }),
  me: (signal?: AbortSignal) => http.get<User>('/users/me', signal),
  updateProfile: (body: ProfileUpdate) => http.put<User>('/users/update-customer', body),
  requestOtp: (email: string) =>
    http.request<boolean>('/users/request-password-change', {
      method: 'POST',
      body: { email },
      public: true,
    }),
  changePassword: (body: PasswordChange) =>
    http.request<User>('/users/change-password', { method: 'POST', body, public: true }),
};
