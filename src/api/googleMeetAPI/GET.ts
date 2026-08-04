import { apiService } from '../../service/apiService';

export interface GoogleMeetConnectionStatus {
  isConnected: boolean;
  googleEmail?: string | null;
  connectedAt?: string | null;
  needsReconnect: boolean;
}

export const googleMeetGetAPI = {
  getStatus: () =>
    apiService.get<GoogleMeetConnectionStatus>('integrations/google-meet/status'),
};
