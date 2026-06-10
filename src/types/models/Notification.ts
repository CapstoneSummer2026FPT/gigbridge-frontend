/**
 * Notification Models - NOTIFICATIONS table
 */

export enum NotificationType {
  System = 'system',
  Message = 'message',
  JobUpdate = 'job_update',
  ProposalUpdate = 'proposal_update',
  PaymentUpdate = 'payment_update',
  AccountUpdate = 'account_update',
  Custom = 'custom',
}

export enum NotificationPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Urgent = 'urgent',
}

export enum NotificationStatus {
  Scheduled = 'scheduled',
  Sent = 'sent',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export enum NotificationTarget {
  Individual = 'individual',
  AllUsers = 'all_users',
  AllClients = 'all_clients',
  AllFreelancers = 'all_freelancers',
  Custom = 'custom',
}

export interface Notification {
  id: string;
  user_id: string;
  source?: 'Personal' | 'Broadcast' | string;
  notificationId?: string | null;
  broadcastNotificationId?: string | null;
  broadcastRecipientId?: string | null;
  readTargetId?: string;
  title: string;
  message: string;
  body: string;
  type: string;
  referenceId?: string | null;
  referenceType?: string | null;
  is_read: boolean;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
  actionUrl?: string;
}

export interface NotificationDto {
  id: string;
  source: 'Personal' | 'Broadcast' | string;
  notificationId?: string | null;
  broadcastNotificationId?: string | null;
  broadcastRecipientId?: string | null;
  readTargetId: string;
  type: number | string;
  title: string;
  content?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface NotificationPage {
  items: NotificationDto[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface AdminNotification {
  notif_NotificationId: string;
  Type: NotificationType;
  Target: NotificationTarget;
  TargetUserId?: string; // For individual notifications
  TargetUserIds?: string[]; // For custom target list
  Title: string;
  Message: string;
  Priority: NotificationPriority;
  Status: NotificationStatus;
  ScheduledFor?: string; // ISO timestamp for scheduled notifications
  SentAt?: string;
  ReadBy?: string[]; // User IDs who have read this notification
  ActionUrl?: string; // Optional URL for notification action
  CreatedBy: string; // Admin user ID
  CreatedAt: string;
  UpdatedAt: string;
}
