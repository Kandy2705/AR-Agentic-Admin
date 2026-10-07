import { useQuery } from '@tanstack/react-query';
import { PAGE_SIZE } from '@/config/env';
import { newest } from '@/lib/utils';
import { chatsService } from '@/services/chats.service';
import { dashboardService } from '@/services/dashboard.service';
import { queryKeys } from '@/services/query-keys';
import { questionsService } from '@/services/support.service';

export function useDashboardSummary() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: ({ signal }) => dashboardService.summary(signal),
  });
}

export function useRecentQuestions(limit = 6) {
  return useQuery({
    queryKey: queryKeys.questions.list(''),
    queryFn: ({ signal }) => questionsService.list(undefined, signal),
    select: (rows) => newest(rows, (row) => row.createDate).slice(0, limit),
  });
}

export function useRecentConversations(limit = 5) {
  const params = { page: 1, pageSize: Math.min(limit, PAGE_SIZE) };
  return useQuery({
    queryKey: queryKeys.chats.list(params),
    queryFn: ({ signal }) => chatsService.histories(params, signal),
  });
}
