import { apiService } from '../../service/apiService';

export interface AuthorizationUrlResult {
  authorizationUrl: string;
  expiresAt: string;
  flowId: string;
}

export const googleMeetPostAPI = {
  getAuthorizationUrl: () =>
    apiService.post<AuthorizationUrlResult>('integrations/google-meet/authorization-url'),

  completeCallback: (state: string, code?: string | null, error?: string | null) =>
    apiService.post<{ result: string }>('integrations/google-meet/callback', { state, code, error }),
};
