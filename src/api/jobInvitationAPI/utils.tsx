import type { ApiResponse } from '../../types/common';

export const unwrapJobInvitationResponse = <T,>(
  response: ApiResponse<T>,
  fallback: T,
  fallbackMessage: string
): T => {
  if (!response.success) {
    throw new Error(response.message || fallbackMessage);
  }

  return response.data ?? fallback;
};
