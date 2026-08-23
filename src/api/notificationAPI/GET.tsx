import { apiService } from '../../service/apiService';

export const notificationGetAPI = {
  getUserNotifications: async (params: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}) => {
    return apiService.get('Notifications', params);
  },

  getUnreadCount: async () => {
    return apiService.get('Notifications/unread-count');
  },

  getStatus: async () => {
    return apiService.get<{ revision: number; unreadCount: number }>('Notifications/status');
  },
};
