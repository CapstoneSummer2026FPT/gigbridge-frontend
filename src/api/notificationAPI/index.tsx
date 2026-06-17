export { notificationGetAPI } from './GET';
export { notificationPutAPI } from './PUT';
export { notificationDeleteAPI } from './DELETE';

import { notificationGetAPI } from './GET';
import { notificationPutAPI } from './PUT';
import { notificationDeleteAPI } from './DELETE';

export const notificationAPI = {
  getUserNotifications: notificationGetAPI.getUserNotifications,
  getUnreadCount: notificationGetAPI.getUnreadCount,
  markNotificationRead: notificationPutAPI.markNotificationRead,
  markBroadcastNotificationRead: notificationPutAPI.markBroadcastNotificationRead,
  markAllRead: notificationPutAPI.markAllRead,
  deleteNotification: notificationDeleteAPI.deleteNotification,
  deleteBroadcastNotification: notificationDeleteAPI.deleteBroadcastNotification,
};
