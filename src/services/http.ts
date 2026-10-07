import { API_BASE } from '@/config/env';
import { ApiClient } from '@/lib/http/api-client';

/** Shared API client instance. The auth layer installs the token and 401/403 handler. */
export const http = new ApiClient(API_BASE);
