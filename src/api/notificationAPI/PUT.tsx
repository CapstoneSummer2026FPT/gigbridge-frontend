import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';

const notificationsUrl = 'Notifications';

export const notificationPutAPI = {
  markNotificationRead: async (notificationId: string): Promise<ApiResponse<object>> => {
    return apiService.put<object>(`${notificationsUrl}/${notificationId}/read`);
  },

  markBroadcastNotificationRead: async (recipientId: string): Promise<ApiResponse<object>> => {
    return apiService.put<object>(`${notificationsUrl}/broadcast-recipients/${recipientId}/read`);
  },

  markRead: async (notification: { source?: string; notificationId?: string | null; broadcastRecipientId?: string | null; readTargetId?: string }): Promise<ApiResponse<object>> => {
    if (notification.source === 'Broadcast' || notification.broadcastRecipientId) {
      const recipientId = notification.broadcastRecipientId || notification.readTargetId;
      if (!recipientId) {
        return { success: false, statusCode: 400, message: 'Missing broadcast recipient id' };
      }

      return notificationPutAPI.markBroadcastNotificationRead(recipientId);
    }

    const notificationId = notification.notificationId || notification.readTargetId;
    if (!notificationId) {
      return { success: false, statusCode: 400, message: 'Missing notification id' };
    }

    return notificationPutAPI.markNotificationRead(notificationId);
  },

  markAllRead: async (_userId?: string): Promise<ApiResponse<object>> => {
    return apiService.put<object>(`${notificationsUrl}/read-all`);
  },
};
