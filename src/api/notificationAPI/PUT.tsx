import { apiService } from '../../service/apiService';

export const notificationPutAPI = {
  markNotificationRead: async (notificationId: string) => {
    return apiService.put(`Notifications/${notificationId}/read`);
  },

  markAllRead: async () => {
    return apiService.put('Notifications/read-all');
  },
};
