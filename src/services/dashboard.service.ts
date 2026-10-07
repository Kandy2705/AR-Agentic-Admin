import type { DashboardSummary } from '@/types/api';
import { http } from './http';

export const dashboardService = {
  summary: (signal?: AbortSignal) => http.get<DashboardSummary>('/admin/dashboard/summary', signal),
};
