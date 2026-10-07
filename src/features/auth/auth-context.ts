import { createContext, useContext } from 'react';
import type { User } from '@/types/api';

export type AuthStatus = 'restoring' | 'signed-out' | 'signed-in';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** Reason for the last sign-out (English key, translate when displaying). */
  message: string;
  login: (email: string, password: string) => Promise<void>;
  logout: (message?: string) => void;
  /** Replace the cached current user after a profile update. */
  setUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.');
  return context;
}

/** Current Admin (only valid inside the protected layout). */
export function useCurrentUser(): User & { id: string } {
  const { user } = useAuth();
  if (!user?.id) throw new Error('useCurrentUser requires a signed-in Admin.');
  return user as User & { id: string };
}
