import { useCallback, useEffect, useMemo, useState } from 'react';
import { notificationGetAPI, notificationPutAPI } from '../../../api/notificationAPI';
import { DB } from '../../../mock_backend';
import { MOCK_TOP_NAV_NOTIFICATIONS } from '../mock/data-for-TopNav';
import type { User } from '../../../types/models/User';

export type UiNotificationType =
  | 'job'
  | 'proposal'
  | 'contract'
  | 'milestone'
  | 'payment'
  | 'message'
  | 'dispute'
  | 'review'
  | 'ai_suggestion'
  | 'system';

export interface UiNotification {
  id: string;
  userId?: string;
  type: UiNotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

interface PaginatedNotificationResponse {
  items?: unknown[];
  Items?: unknown[];
}

const getField = <T,>(source: any, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null) {
      return source[key] as T;
    }
  }

  return undefined;
};

const normalizeType = (type: unknown): UiNotificationType => {
  if (typeof type === 'number') {
    const numericTypes: Record<number, UiNotificationType> = {
      0: 'job',
      1: 'proposal',
      2: 'proposal',
      3: 'contract',
      4: 'milestone',
      5: 'payment',
      6: 'payment',
      7: 'message',
      8: 'dispute',
      9: 'review',
      10: 'system',
      11: 'ai_suggestion',
      12: 'payment',
    };

    return numericTypes[type] ?? 'system';
  }

  const normalized = String(type ?? '').trim().toLowerCase();

  if (normalized.includes('proposal')) return 'proposal';
  if (normalized.includes('contract')) return 'contract';
  if (normalized.includes('milestone')) return 'milestone';
  if (normalized.includes('payment') || normalized.includes('subscription')) return 'payment';
  if (normalized.includes('chat') || normalized.includes('message')) return 'message';
  if (normalized.includes('dispute')) return 'dispute';
  if (normalized.includes('review')) return 'review';
  if (normalized.includes('ai')) return 'ai_suggestion';
  if (normalized.includes('job')) return 'job';

  return normalized === 'custom' || normalized === 'system' ? 'system' : 'system';
};

const getActionUrl = (notification: any, type: UiNotificationType): string | undefined => {
  const explicitUrl = getField<string>(notification, 'actionUrl', 'ActionUrl');
  if (explicitUrl) return explicitUrl;

  const referenceId = getField<string>(notification, 'referenceId', 'ReferenceId');

  switch (type) {
    case 'job':
      return referenceId ? `/jobs/${referenceId}` : '/jobs/browse';
    case 'proposal':
      return '/proposals';
    case 'contract':
    case 'milestone':
      return referenceId ? `/contracts/${referenceId}` : '/contracts';
    case 'payment':
      return '/wallet/history';
    case 'message':
      return referenceId ? `/workspace/${referenceId}` : '/projects';
    case 'dispute':
      return '/admin/disputes';
    case 'review':
      return '/reviews/create';
    default:
      return '/notifications';
  }
};

const normalizeNotification = (notification: any): UiNotification => {
  const type = normalizeType(getField(notification, 'type', 'Type'));
  const title = getField<string>(notification, 'title', 'Title') ?? 'Notification';
  const body = getField<string>(notification, 'body', 'message', 'content', 'Message', 'Content') ?? '';
  const createdAt = getField<string>(notification, 'createdAt', 'CreatedAt') ?? new Date().toISOString();

  return {
    id: String(getField(notification, 'id', 'Id', 'notificationId', 'NotificationId') ?? crypto.randomUUID()),
    userId: getField<string>(notification, 'userId', 'user_id', 'UserId'),
    type,
    title,
    body,
    isRead: Boolean(getField<boolean>(notification, 'isRead', 'is_read', 'IsRead')),
    createdAt,
    actionUrl: getActionUrl(notification, type),
  };
};

const getMockNotifications = (userId: string): UiNotification[] => {
  const dbNotifications = DB.getNotificationsByUser(userId).map(normalizeNotification);
  const topNavNotifications = MOCK_TOP_NAV_NOTIFICATIONS
    .filter(notification => notification.userId === userId)
    .map(normalizeNotification);

  const notifications = dbNotifications.length > 0 ? dbNotifications : topNavNotifications;

  return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export function useUserNotifications(user: User | null, options: { pageSize?: number; pollMs?: number } = {}) {
  const { pageSize = 20, pollMs = 60000 } = options;
  const [notifications, setNotifications] = useState<UiNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    const response = await notificationGetAPI.getUserNotifications({ page: 1, pageSize });

    if (response.success && response.data) {
      const data = response.data as PaginatedNotificationResponse;
      const items = data.items ?? data.Items ?? [];
      setNotifications(items.map(normalizeNotification));
      setError(null);
    } else {
      setNotifications(getMockNotifications(user.id));
      setError(response.message || 'Notifications are using local demo data.');
    }

    setIsLoading(false);
  }, [pageSize, user]);

  useEffect(() => {
    void loadNotifications();

    if (!user || pollMs <= 0) return undefined;

    const intervalId = window.setInterval(() => {
      void loadNotifications();
    }, pollMs);

    return () => window.clearInterval(intervalId);
  }, [loadNotifications, pollMs, user]);

  const unreadCount = useMemo(
    () => notifications.filter(notification => !notification.isRead).length,
    [notifications]
  );

  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId ? { ...notification, isRead: true } : notification
      )
    );

    await notificationPutAPI.markNotificationRead(notificationId);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    setNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })));
    await notificationPutAPI.markAllRead();
  }, [user]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh: loadNotifications,
    markAsRead,
    markAllAsRead,
  };
}
