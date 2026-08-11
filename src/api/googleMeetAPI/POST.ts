import { apiService } from '../../service/apiService';
import type { MessageResponse } from '../messageAPI/GET';

export interface AuthorizationUrlResult {
  authorizationUrl: string;
  expiresAt: string;
  flowId: string;
}

export interface CreateGoogleMeetMessageRequest {
  conversationId: string;
  clientMessageId: string;
}

export const googleMeetPostAPI = {
  getAuthorizationUrl: () =>
    apiService.post<AuthorizationUrlResult>('integrations/google-meet/authorization-url'),

  completeCallback: (state: string, code?: string | null, error?: string | null) =>
    apiService.post<{ result: string }>('integrations/google-meet/callback', { state, code, error }),

  createRoomAndSendMessage: (payload: CreateGoogleMeetMessageRequest) =>
    apiService.post<MessageResponse>('integrations/google-meet/rooms', payload),
};
