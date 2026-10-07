import { safeId } from '@/lib/http/api-client';
import type { Chatbox, History, HistoryListParams, Page } from '@/types/api';
import { http } from './http';

export const chatsService = {
  histories: (params: HistoryListParams, signal?: AbortSignal) =>
    http.get<Page<History>>('/admin/chat/histories', signal, { ...params }),
  messages: (historyId: string, signal?: AbortSignal) =>
    http.get<Chatbox[]>(`/chat/chatboxes/history/${safeId(historyId)}`, signal),
  /** Deletes the conversation and all of its messages. */
  removeHistory: (id: string) => http.remove(`/chat/histories/${safeId(id)}`),
  removeMessage: (id: string) => http.remove(`/chat/chatboxes/${safeId(id)}`),
};
