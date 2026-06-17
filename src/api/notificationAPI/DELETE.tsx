import { apiService } from '../../service/apiService';

export const notificationDeleteAPI = {
  deleteNotification: async (notificationId: string) => {
    return apiService.delete(`Notifications/${notificationId}`);
  },

  deleteBroadcastNotification: async (recipientId: string) => {
    return apiService.delete(`Notifications/broadcast-recipients/${recipientId}`);
  },
};
