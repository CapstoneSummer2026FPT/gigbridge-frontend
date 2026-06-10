import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import { NotificationTarget, NotificationType } from '../../types/models/Notification';

const adminNotificationsUrl = 'admin/notifications';

const notificationTypeMap: Record<NotificationType, number> = {
  [NotificationType.System]: 10,
  [NotificationType.Message]: 7,
  [NotificationType.JobUpdate]: 0,
  [NotificationType.ProposalUpdate]: 2,
  [NotificationType.PaymentUpdate]: 6,
  [NotificationType.AccountUpdate]: 10,
  [NotificationType.Custom]: 10,
};

const notificationTargetMap: Record<NotificationTarget, number> = {
  [NotificationTarget.AllUsers]: 0,
  [NotificationTarget.AllClients]: 1,
  [NotificationTarget.AllFreelancers]: 2,
  [NotificationTarget.Individual]: 4,
  [NotificationTarget.Custom]: 0,
};

export type CreateBroadcastNotificationRequest = {
  type: NotificationType;
  target: NotificationTarget;
  targetUserId?: string;
  title: string;
  content: string;
  referenceId?: string;
  referenceType?: string;
  expiresAt?: string;
  sendEmail?: boolean;
};

export const adminNotificationAPI = {
  createBroadcast: async (request: CreateBroadcastNotificationRequest): Promise<ApiResponse<object>> => {
    const payload = {
      target: notificationTargetMap[request.target],
      targetUserId: request.target === NotificationTarget.Individual ? request.targetUserId || null : null,
      type: notificationTypeMap[request.type],
      title: request.title,
      content: request.content,
      referenceId: request.referenceId || null,
      referenceType: request.referenceType || null,
      expiresAt: request.expiresAt || null,
      sendEmail: request.sendEmail ?? false,
    };

    return apiService.post<object>(`${adminNotificationsUrl}/broadcast`, payload);
  },
};
