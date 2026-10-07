import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { chatsService } from '@/services/chats.service';
import { queryKeys } from '@/services/query-keys';
import type { HistoryListParams } from '@/types/api';

export function useHistories(params: HistoryListParams) {
  return useQuery({
    queryKey: queryKeys.chats.list(params),
    queryFn: ({ signal }) => chatsService.histories(params, signal),
    placeholderData: keepPreviousData,
  });
}

export function useMessages(historyId: string) {
  return useQuery({
    queryKey: queryKeys.chats.messages(historyId),
    queryFn: ({ signal }) => chatsService.messages(historyId, signal),
  });
}

export function useDeleteHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: chatsService.removeHistory,
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: queryKeys.chats.messages(id) });
      void queryClient.invalidateQueries({ queryKey: ['chats', 'list'] });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

export function useDeleteMessage(historyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: chatsService.removeMessage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.chats.messages(historyId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
