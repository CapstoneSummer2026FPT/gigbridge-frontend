import { apiService } from '../../service/apiService';

export interface GoogleMeetConnectionStatus {
  isConnected: boolean;
  googleEmail?: string | null;
  connectedAt?: string | null;
  needsReconnect: boolean;
}

export interface AuthorizationUrlResult {
  authorizationUrl: string;
  expiresAt: string;
  flowId: string;
}

export const googleMeetAPI = {
  getAuthorizationUrl: () =>
    apiService.post<AuthorizationUrlResult>('integrations/google-meet/authorization-url'),

  completeCallback: (state: string, code?: string | null, error?: string | null) =>
    apiService.post<{ result: string }>('integrations/google-meet/callback', { state, code, error }),

  getStatus: () =>
    apiService.get<GoogleMeetConnectionStatus>('integrations/google-meet/status'),

  disconnect: () =>
    apiService.delete<void>('integrations/google-meet'),
};
