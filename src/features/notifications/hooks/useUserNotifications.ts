import { useCallback, useEffect, useRef, useState } from 'react';
import { notificationGetAPI, notificationPutAPI } from '../../../api/notificationAPI';
import type { User } from '../../../types/models/User';
import * as signalR from '@microsoft/signalr';
import { getNotificationHubUrl } from '../../../service/apiService';
import { toast } from 'sonner';

const surfacedMeetingAlerts = new Set<string>();

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
  | 'system'
  | 'schedule'
  | 'subscription'
  | 'promotion'
  | 'rank_protection'
  | 'report';

export interface UiNotification {
  id: string;
  source: 'personal' | 'broadcast';
  readTargetId: string;
  userId?: string;
  type: UiNotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
  referenceType?: string;
  revision?: number;
  schedule?: {
    schemaVersion: number; scheduleId: string; conversationId: string; scheduleMessageId: string;
    title: string; scheduledAtUtc: string; actorName: string; eventType: number; status: number;
  };
}

interface PaginatedNotificationResponse {
  items?: unknown[];
  Items?: unknown[];
}

interface UnreadCountResponse {
  unreadCount?: number;
  UnreadCount?: number;
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
      12: 'subscription',
      13: 'schedule',
      14: 'subscription',
      15: 'subscription',
      16: 'promotion',
      17: 'promotion',
      18: 'rank_protection',
      19: 'rank_protection',
      20: 'report',
    };

    return numericTypes[type] ?? 'system';
  }

  const normalized = String(type ?? '').trim().toLowerCase();

  if (normalized.includes('proposal')) return 'proposal';
  if (normalized.includes('contract')) return 'contract';
  if (normalized.includes('milestone')) return 'milestone';
  if (normalized.includes('payment')) return 'payment';
  if (normalized.includes('chat') || normalized.includes('message')) return 'message';
  if (normalized.includes('dispute')) return 'dispute';
  if (normalized.includes('review')) return 'review';
  if (normalized.includes('ai')) return 'ai_suggestion';
  if (normalized.includes('job')) return 'job';
  if (normalized.includes('schedule')) return 'schedule';
  if (normalized.includes('subscription')) return 'subscription';
  if (normalized.includes('promotion')) return 'promotion';
  if (normalized.includes('rankprotection') || normalized.includes('rank_protection')) {
    return 'rank_protection';
  }
  if (normalized.includes('report')) return 'report';

  return normalized === 'custom' || normalized === 'system' ? 'system' : 'system';
};

const getActionUrl = (
  notification: any,
  type: UiNotificationType,
  userRole?: number,
): string | undefined => {
  const explicitUrl = getField<string>(notification, 'actionUrl', 'ActionUrl');
  if (explicitUrl) return explicitUrl;

  const referenceId = getField<string>(notification, 'referenceId', 'ReferenceId');
  const referenceType = String(
    getField<string>(notification, 'referenceType', 'ReferenceType') ?? '',
  ).toLowerCase();
  const metadataRaw = getField<any>(notification, 'metadata', 'Metadata');
  let metadata: any;
  try { metadata = typeof metadataRaw === 'string' ? JSON.parse(metadataRaw) : metadataRaw; } catch { metadata = null; }

  switch (type) {
    case 'job':
      return referenceId ? `/jobs/${referenceId}` : '/jobs/browse';
    case 'proposal':
      return '/proposals';
    case 'contract':
      return referenceId ? `/contracts/${referenceId}` : '/contracts';
    case 'milestone':
      return referenceId && referenceType === 'contract'
        ? `/contracts/${referenceId}`
        : '/contracts';
    case 'payment':
      return '/wallet/history';
    case 'message':
      return referenceId ? `/workspace/${referenceId}` : '/projects';
    case 'dispute':
      return userRole === 2 ? '/admin/disputes' : '/contracts';
    case 'review':
      return referenceId ? `/reviews/create?contractId=${referenceId}` : '/reviews/create';
    case 'schedule':
      return metadata?.schemaVersion >= 1 && metadata.conversationId && metadata.scheduleMessageId
        ? `/messages?conversationId=${metadata.conversationId}&messageId=${metadata.scheduleMessageId}`
        : '/messages';
    case 'subscription':
      return userRole === 0 ? '/premium/client' : '/premium/freelancer';
    case 'promotion':
      return '/premium/freelancer/promotions';
    case 'rank_protection':
      return '/premium/freelancer/rank-protection';
    case 'report':
      return userRole === 2
        ? '/admin/reports'
        : referenceId
          ? `/contracts/${referenceId}`
          : '/contracts';
    default:
      return '/notifications';
  }
};

export const normalizeNotification = (notification: any, userRole?: number): UiNotification => {
  const type = normalizeType(getField(notification, 'type', 'Type'));
  const id = String(
    getField(notification, 'id', 'Id', 'notificationId', 'NotificationId')
      ?? crypto.randomUUID(),
  );
  const broadcastRecipientId = getField<string>(
    notification,
    'broadcastRecipientId',
    'BroadcastRecipientId',
  );
  const sourceValue = String(getField(notification, 'source', 'Source') ?? '').toLowerCase();
  const source = sourceValue === 'broadcast' || broadcastRecipientId
    ? 'broadcast'
    : 'personal';
  const readTargetId = String(
    getField(notification, 'readTargetId', 'ReadTargetId')
      ?? broadcastRecipientId
      ?? getField(notification, 'notificationId', 'NotificationId')
      ?? id,
  );
  let title = getField<string>(notification, 'title', 'Title') ?? 'Notification';
  let body = getField<string>(notification, 'body', 'message', 'content', 'Message', 'Content') ?? '';
  if (title.trim().toLowerCase() === 'freelancer premium activated') {
    const endDate = body.match(/\d{4}-\d{2}-\d{2}/)?.[0];
    title = endDate ? `Freelancer Premium activated through ${endDate}` : title;
    body = '';
  }
  const createdAt = getField<string>(notification, 'createdAt', 'CreatedAt') ?? new Date().toISOString();
  const metadataRaw = getField<any>(notification, 'metadata', 'Metadata');
  let schedule: UiNotification['schedule'];
  try {
    const parsed = typeof metadataRaw === 'string' ? JSON.parse(metadataRaw) : metadataRaw;
    if (type === 'schedule' && parsed?.schemaVersion >= 1 && parsed.scheduleId && parsed.conversationId) schedule = parsed;
  } catch { schedule = undefined; }

  return {
    id,
    source,
    readTargetId,
    userId: getField<string>(notification, 'userId', 'user_id', 'UserId'),
    type,
    title,
    body,
    isRead: Boolean(getField<boolean>(notification, 'isRead', 'is_read', 'IsRead')),
    createdAt,
    actionUrl: getActionUrl(notification, type, userRole),
    referenceType: getField<string>(notification, 'referenceType', 'ReferenceType'),
    revision: getField<number>(notification, 'revision', 'Revision'),
    schedule,
  };
};

export function useUserNotifications(user: User | null, options: { pageSize?: number; pollMs?: number } = {}) {
  const { pageSize = 20, pollMs = 60000 } = options;
  const [notifications, setNotifications] = useState<UiNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenNotificationIds = useRef(new Set<string>());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      seenNotificationIds.current.clear();
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    const [response, unreadResponse] = await Promise.all([
      notificationGetAPI.getUserNotifications({ page: 1, pageSize }),
      notificationGetAPI.getUnreadCount(),
    ]);

    if (response.success && response.data) {
      const data = response.data as PaginatedNotificationResponse;
      const items = data.items ?? data.Items ?? [];
      const normalizedItems = items.map(item => normalizeNotification(item, user.role));
      seenNotificationIds.current = new Set(normalizedItems.map(item => item.id));
      setNotifications(normalizedItems);
      setError(null);
    } else {
      setNotifications([]);
      setError(response.message || 'Notifications could not be loaded.');
    }

    if (unreadResponse.success && unreadResponse.data) {
      const unreadData = unreadResponse.data as UnreadCountResponse;
      setUnreadCount(unreadData.unreadCount ?? unreadData.UnreadCount ?? 0);
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

  useEffect(() => {
    if (!user || !localStorage.getItem('access_token')) return;
    const connection = new signalR.HubConnectionBuilder()
      .configureLogging(signalR.LogLevel.Warning)
      .withUrl(getNotificationHubUrl(), {
      accessTokenFactory: () => localStorage.getItem('access_token') ?? '',
    }).withAutomaticReconnect().build();
    connection.on('ReceiveNotification', raw => {
      const incoming = normalizeNotification(raw, user.role);
      const isNew = !seenNotificationIds.current.has(incoming.id);
      seenNotificationIds.current.add(incoming.id);
      if (isNew && !incoming.isRead) setUnreadCount(count => count + 1);
      setNotifications(previous => [incoming, ...previous.filter(item => item.id !== incoming.id)]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      if (incoming.type === 'schedule' && incoming.title.toLowerCase().includes('meeting time reached') &&
          !surfacedMeetingAlerts.has(incoming.id)) {
        surfacedMeetingAlerts.add(incoming.id);
        toast.success(incoming.title, {
          description: incoming.body || 'Your scheduled meeting is starting now.',
          duration: 12000,
          action: {
            label: 'View schedule',
            onClick: () => { window.location.href = incoming.actionUrl || '/messages'; },
          },
        });
      }
    });
    void connection.start().catch(() => undefined);
    return () => { void connection.stop(); };
  }, [user]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const target = notifications.find(notification => notification.id === notificationId);
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === notificationId ? { ...notification, isRead: true } : notification
      )
    );

    if (!target) return;
    if (!target.isRead) setUnreadCount(previous => Math.max(0, previous - 1));

    const result = target.source === 'broadcast'
      ? await notificationPutAPI.markBroadcastNotificationRead(target.readTargetId)
      : await notificationPutAPI.markNotificationRead(target.readTargetId, target.revision);

    if (!result.success) await loadNotifications();
  }, [notifications, loadNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!user) return;

    setNotifications(prev => prev.map(notification => ({ ...notification, isRead: true })));
    setUnreadCount(0);
    const result = await notificationPutAPI.markAllRead();
    if (!result.success) await loadNotifications();
  }, [user, loadNotifications]);

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
