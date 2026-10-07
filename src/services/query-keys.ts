import type { HistoryListParams, UserListParams } from '@/types/api';

/** Central query-key factory so invalidation stays consistent across features. */
export const queryKeys = {
  me: ['me'] as const,
  dashboard: ['dashboard'] as const,
  users: {
    all: ['users'] as const,
    list: (params: UserListParams) => ['users', 'list', params] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },
  buildings: {
    all: ['buildings'] as const,
    list: () => ['buildings', 'list'] as const,
    detail: (id: string) => ['buildings', 'detail', id] as const,
    structure: (id: string) => ['buildings', 'structure', id] as const,
  },
  categories: {
    all: ['categories'] as const,
  },
  questions: {
    all: ['questions'] as const,
    list: (categoryId: string) => ['questions', 'list', categoryId] as const,
    detail: (id: string) => ['questions', 'detail', id] as const,
    answers: (id: string) => ['questions', 'answers', id] as const,
  },
  chats: {
    all: ['chats'] as const,
    list: (params: HistoryListParams) => ['chats', 'list', params] as const,
    messages: (id: string) => ['chats', 'messages', id] as const,
  },
};
