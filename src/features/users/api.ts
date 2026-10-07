import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-context';
import { queryKeys } from '@/services/query-keys';
import { usersService } from '@/services/users.service';
import type { User, UserListParams, UserUpdate } from '@/types/api';

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: ({ signal }) => usersService.list(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: ({ signal }) => usersService.get(id, signal),
  });
}

const isUser = (value: unknown): value is User & { id: string } =>
  !!value && typeof value === 'object' && typeof (value as User).id === 'string';

/**
 * Writes the updated record into the caches (including the signed-in Admin when editing
 * oneself) and refreshes lists + dashboard counters. Falls back to refetching when the
 * response is not a user object.
 */
function useSyncUser() {
  const queryClient = useQueryClient();
  const { user: me, setUser } = useAuth();
  return (result: unknown, { id }: { id: string }) => {
    if (isUser(result)) {
      queryClient.setQueryData(queryKeys.users.detail(result.id), result);
      if (result.id === me?.id && result.role === 'Admin' && result.isActive) {
        setUser(result);
        queryClient.setQueryData(queryKeys.me, result);
      }
    } else {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) });
    }
    void queryClient.invalidateQueries({ queryKey: ['users', 'list'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
  };
}

export function useUpdateUser() {
  const sync = useSyncUser();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UserUpdate }) => usersService.update(id, body),
    onSuccess: sync,
  });
}

export function useSetUserStatus() {
  const sync = useSyncUser();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      usersService.setStatus(id, isActive),
    onSuccess: sync,
  });
}

/** Loads every page for the current filters (used by CSV export). */
export async function fetchAllUsers(params: Omit<UserListParams, 'page' | 'pageSize'>) {
  const pageSize = 100;
  const first = await usersService.list({ ...params, page: 1, pageSize });
  const rest = await Promise.all(
    Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) =>
      usersService.list({ ...params, page: index + 2, pageSize }),
    ),
  );
  return [first, ...rest].flatMap((page) => page.items);
}
