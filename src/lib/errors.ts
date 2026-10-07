import { ApiError } from './http/api-client';

/**
 * Maps any thrown value to a user-facing message key (translated by the caller).
 * Raw server details are never shown for 5xx responses.
 */
export function errorMessageKey(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0)
      return 'Cannot connect to the API. Check network, backend deployment and CORS.';
    if (error.status === 404)
      return 'Resource or API endpoint not found. Verify the backend deployment.';
    if (error.status >= 500) return 'The server could not complete this request. Please try again.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}
