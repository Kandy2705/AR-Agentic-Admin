import type { ComponentType } from 'react';
import { createHashRouter, Navigate } from 'react-router';
import { LoginPage } from '@/features/auth/LoginPage';
import { NotFoundPage } from './NotFoundPage';
import { BootScreen, GuestOnly, RequireAdmin } from './guards';

/** Code-splits each feature page into its own chunk. */
const page = (load: () => Promise<{ default: ComponentType }>) => async () => ({
  Component: (await load()).default,
});

/**
 * Hash routing keeps deep links working on static hosts (GitHub Pages sub-paths)
 * without server rewrite rules, and matches the previous `#/users/…` URLs.
 */
export const createAppRouter = () =>
  createHashRouter([
    { path: '/', element: <Navigate to="/dashboard" replace /> },
    {
      path: '/login',
      element: (
        <GuestOnly>
          <LoginPage />
        </GuestOnly>
      ),
    },
    {
      element: <RequireAdmin />,
      HydrateFallback: BootScreen,
      children: [
        { path: 'dashboard', lazy: page(() => import('@/features/dashboard/DashboardPage')) },
        { path: 'users', lazy: page(() => import('@/features/users/UsersPage')) },
        { path: 'users/:id', lazy: page(() => import('@/features/users/UserDetailPage')) },
        { path: 'buildings', lazy: page(() => import('@/features/buildings/BuildingsPage')) },
        {
          path: 'buildings/:id',
          lazy: page(() => import('@/features/buildings/BuildingDetailPage')),
        },
        { path: 'questions', lazy: page(() => import('@/features/support/QuestionsPage')) },
        {
          path: 'questions/:id',
          lazy: page(() => import('@/features/support/QuestionDetailPage')),
        },
        { path: 'categories', lazy: page(() => import('@/features/support/CategoriesPage')) },
        { path: 'chats', lazy: page(() => import('@/features/chats/ChatsPage')) },
        { path: 'chats/:id', lazy: page(() => import('@/features/chats/ChatDetailPage')) },
        { path: 'profile', lazy: page(() => import('@/features/account/ProfilePage')) },
        { path: 'password', lazy: page(() => import('@/features/account/PasswordPage')) },
        { path: '*', element: <NotFoundPage /> },
      ],
    },
  ]);
