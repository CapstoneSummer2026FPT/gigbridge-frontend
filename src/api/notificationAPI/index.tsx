export { notificationGetAPI } from './GET';
export { notificationPutAPI } from './PUT';

import { notificationGetAPI } from './GET';
import { notificationPutAPI } from './PUT';

export const notificationAPI = {
  getUserNotifications: notificationGetAPI.getUserNotifications,
  getUnreadCount: notificationGetAPI.getUnreadCount,
  markNotificationRead: notificationPutAPI.markNotificationRead,
  markAllRead: notificationPutAPI.markAllRead,
};
