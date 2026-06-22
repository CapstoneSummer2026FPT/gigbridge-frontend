import { apiService } from '../../service/apiService';

export const notificationPutAPI = {
  markNotificationRead: async (notificationId: string, expectedRevision?: number) => {
    const suffix = expectedRevision == null ? '' : `?expectedRevision=${expectedRevision}`;
    return apiService.put(`Notifications/${notificationId}/read${suffix}`);
  },

  markAllRead: async () => {
    return apiService.put('Notifications/read-all');
  },
};
