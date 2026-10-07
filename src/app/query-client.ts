import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '@/lib/http/api-client';

/**
 * TanStack Query cache = the "Cache Operation / Local Cache" of the layered design (Hình 5.1):
 * cached reads are served first, the remote API is called on miss/stale/invalidation.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        // Retry once for network/5xx errors only; 4xx answers are final.
        retry: (failureCount, error) =>
          failureCount < 1 &&
          !(error instanceof ApiError && error.status >= 400 && error.status < 500),
      },
      mutations: { retry: false },
    },
  });
}
