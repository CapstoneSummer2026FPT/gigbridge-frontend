import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { VerifyEmailRequest } from '../../types/models/Auth';

const authUrl = '/auth';

export const authGetAPI = {
  /**
   * Verify email with token
   * GET /v1/auth/verify-email?token=xxx
   */
  verifyEmail: async (params: VerifyEmailRequest): Promise<ApiResponse<null>> => {
    return apiService.get<null>(`${authUrl}/verify-email`, params);
  },

  /**
   * Test auth endpoint (requires authorization)
   * GET /v1/auth/test-auth
   */
  testAuth: async (): Promise<ApiResponse<any>> => {
    return apiService.get<any>(`${authUrl}/test-auth`);
  },
};
