import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { Notification, NotificationDto, NotificationPage } from '../../types/models/Notification';

const notificationsUrl = 'Notifications';

const notificationTypeToKey: Record<number, string> = {
  0: 'job_match',
  1: 'proposal',
  2: 'proposal',
  3: 'milestone',
  4: 'milestone',
  5: 'payment',
  6: 'payment',
  7: 'message',
  8: 'system',
  9: 'review',
  10: 'system',
  11: 'ai_suggestion',
  12: 'payment',
};

const normalizeString = (value: unknown): string => String(value || '').toLowerCase();

const getField = <T,>(source: any, camelCaseKey: string, pascalCaseKey: string): T | undefined =>
  source?.[camelCaseKey] ?? source?.[pascalCaseKey];

const toNotificationTypeKey = (value: number | string): string => {
  if (typeof value === 'number') {
    return notificationTypeToKey[value] || 'system';
  }

  const normalized = normalizeString(value);
  if (normalized.includes('job')) return 'job_match';
  if (normalized.includes('proposal')) return 'proposal';
  if (normalized.includes('contract') || normalized.includes('milestone')) return 'milestone';
  if (normalized.includes('payment') || normalized.includes('subscription')) return 'payment';
  if (normalized.includes('chat') || normalized.includes('message')) return 'message';
  if (normalized.includes('review')) return 'review';
  if (normalized.includes('ai')) return 'ai_suggestion';
  return 'system';
};

const toActionUrl = (referenceType?: string | null, referenceId?: string | null): string | undefined => {
  if (!referenceType || !referenceId) return undefined;

  const normalized = referenceType.toLowerCase();
  if (normalized.includes('job')) return `/jobs/${referenceId}`;
  if (normalized.includes('proposal')) return '/proposals';
  if (normalized.includes('contract') || normalized.includes('milestone')) return `/contracts/${referenceId}`;
  if (normalized.includes('message') || normalized.includes('chat')) return `/workspace/${referenceId}`;
  return undefined;
};

export const mapNotificationDto = (raw: NotificationDto | any): Notification => {
  const id = String(getField<string>(raw, 'id', 'Id') || '');
  const notificationId = getField<string | null>(raw, 'notificationId', 'NotificationId') ?? null;
  const broadcastNotificationId = getField<string | null>(raw, 'broadcastNotificationId', 'BroadcastNotificationId') ?? null;
  const broadcastRecipientId = getField<string | null>(raw, 'broadcastRecipientId', 'BroadcastRecipientId') ?? null;
  const readTargetId = getField<string>(raw, 'readTargetId', 'ReadTargetId') || id;
  const title = getField<string>(raw, 'title', 'Title') || 'Notification';
  const content = getField<string | null>(raw, 'content', 'Content') || '';
  const referenceId = getField<string | null>(raw, 'referenceId', 'ReferenceId') ?? null;
  const referenceType = getField<string | null>(raw, 'referenceType', 'ReferenceType') ?? null;
  const isRead = Boolean(getField<boolean>(raw, 'isRead', 'IsRead'));
  const createdAt = getField<string>(raw, 'createdAt', 'CreatedAt') || new Date().toISOString();
  const type = toNotificationTypeKey(getField<number | string>(raw, 'type', 'Type') ?? 'system');
  const source = getField<string>(raw, 'source', 'Source') || 'Personal';

  return {
    id,
    user_id: '',
    source,
    notificationId,
    broadcastNotificationId,
    broadcastRecipientId,
    readTargetId,
    title,
    message: content,
    body: content,
    type,
    referenceId,
    referenceType,
    is_read: isRead,
    isRead,
    readAt: getField<string | null>(raw, 'readAt', 'ReadAt') ?? null,
    createdAt,
    actionUrl: toActionUrl(referenceType, referenceId),
  };
};

const normalizePage = (page: NotificationPage | any): NotificationPage => ({
  items: (getField<NotificationDto[]>(page, 'items', 'Items') || []),
  pageNumber: getField<number>(page, 'pageNumber', 'PageNumber') || 1,
  totalPages: getField<number>(page, 'totalPages', 'TotalPages') || 0,
  totalCount: getField<number>(page, 'totalCount', 'TotalCount') || 0,
  hasPreviousPage: Boolean(getField<boolean>(page, 'hasPreviousPage', 'HasPreviousPage')),
  hasNextPage: Boolean(getField<boolean>(page, 'hasNextPage', 'HasNextPage')),
});

export const notificationGetAPI = {
  getNotificationsPage: async (params: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}): Promise<ApiResponse<NotificationPage>> => {
    const response = await apiService.get<NotificationPage>(notificationsUrl, params);
    return {
      ...response,
      data: response.data ? normalizePage(response.data) : undefined,
    };
  },

  getCurrentUserNotifications: async (params: { page?: number; pageSize?: number; unreadOnly?: boolean } = {}): Promise<Notification[]> => {
    const response = await notificationGetAPI.getNotificationsPage(params);
    return response.success && response.data
      ? response.data.items.map(mapNotificationDto)
      : [];
  },

  getUserNotifications: async (_userId: string): Promise<Notification[]> => {
    return notificationGetAPI.getCurrentUserNotifications();
  },

  getUnreadCount: async (_userId?: string): Promise<number> => {
    const response = await apiService.get<{ unreadCount?: number; UnreadCount?: number }>(`${notificationsUrl}/unread-count`);
    return response.success && response.data
      ? response.data.unreadCount ?? response.data.UnreadCount ?? 0
      : 0;
  },
};
