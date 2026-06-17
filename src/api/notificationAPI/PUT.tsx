import { apiService } from '../../service/apiService';

export const notificationPutAPI = {
  markNotificationRead: async (notificationId: string) => {
    return apiService.put(`Notifications/${notificationId}/read`);
  },

  markBroadcastNotificationRead: async (recipientId: string) => {
    return apiService.put(`Notifications/broadcast-recipients/${recipientId}/read`);
  },

  markAllRead: async () => {
    return apiService.put('Notifications/read-all');
  },
};
