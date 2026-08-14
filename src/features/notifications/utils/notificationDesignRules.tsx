import type { ReactNode } from 'react';
import {
  AlertTriangle,
  Bell,
  Bot,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Crown,
  FileCheck2,
  FileText,
  MessageSquare,
  ShieldAlert,
  Star,
  Wallet,
  Zap,
} from 'lucide-react';
import type { UiNotificationType } from '../hooks/useUserNotifications';

export type NotificationCategoryGroup =
  | 'all'
  | 'unread'
  | 'work_contracts'
  | 'payments'
  | 'receipts'
  | 'messages_schedule'
  | 'alerts_ai'
  | 'system';

export interface NotificationDesignRule {
  type: UiNotificationType;
  group: NotificationCategoryGroup;
  icon: ReactNode;
  categoryLabelVi: string;
  categoryLabelEn: string;
  badgeClass: string;
  accentClass: string;
  iconBgClass: string;
}

export const NOTIFICATION_DESIGN_RULES: Record<UiNotificationType, NotificationDesignRule> = {
  job: {
    type: 'job',
    group: 'work_contracts',
    icon: <Briefcase size={18} className="text-brand" />,
    categoryLabelVi: 'Công việc',
    categoryLabelEn: 'Job',
    badgeClass: 'bg-brand/10 border-brand/20 text-brand font-extrabold',
    accentClass: 'border-l-brand',
    iconBgClass: 'bg-brand/10 border-brand/20 text-brand',
  },
  proposal: {
    type: 'proposal',
    group: 'work_contracts',
    icon: <FileText size={18} className="text-brand" />,
    categoryLabelVi: 'Đề xuất',
    categoryLabelEn: 'Proposal',
    badgeClass: 'bg-brand/10 border-brand/20 text-brand font-extrabold',
    accentClass: 'border-l-brand',
    iconBgClass: 'bg-brand/10 border-brand/20 text-brand',
  },
  contract: {
    type: 'contract',
    group: 'work_contracts',
    icon: <FileText size={18} className="text-brand" />,
    categoryLabelVi: 'Hợp đồng',
    categoryLabelEn: 'Contract',
    badgeClass: 'bg-brand/10 border-brand/20 text-brand font-extrabold',
    accentClass: 'border-l-brand',
    iconBgClass: 'bg-brand/10 border-brand/20 text-brand',
  },
  milestone: {
    type: 'milestone',
    group: 'work_contracts',
    icon: <CheckCircle2 size={18} className="text-brand" />,
    categoryLabelVi: 'Cột mốc',
    categoryLabelEn: 'Milestone',
    badgeClass: 'bg-brand/10 border-brand/20 text-brand font-extrabold',
    accentClass: 'border-l-brand',
    iconBgClass: 'bg-brand/10 border-brand/20 text-brand',
  },
  payment: {
    type: 'payment',
    group: 'payments',
    icon: <Wallet size={18} className="text-brand" />,
    categoryLabelVi: 'Thanh toán',
    categoryLabelEn: 'Payment',
    badgeClass: 'bg-brand/10 border-brand/20 text-brand font-extrabold',
    accentClass: 'border-l-brand',
    iconBgClass: 'bg-brand/10 border-brand/20 text-brand',
  },
  receipt: {
    type: 'receipt',
    group: 'receipts',
    icon: <FileCheck2 size={18} className="text-brand" />,
    categoryLabelVi: 'Biên nhận',
    categoryLabelEn: 'Receipt',
    badgeClass: 'bg-brand/10 border-brand/20 text-brand font-extrabold',
    accentClass: 'border-l-brand',
    iconBgClass: 'bg-brand/10 border-brand/20 text-brand',
  },
  message: {
    type: 'message',
    group: 'messages_schedule',
    icon: <MessageSquare size={18} className="text-brand" />,
    categoryLabelVi: 'Tin nhắn',
    categoryLabelEn: 'Message',
    badgeClass: 'bg-brand/10 border-brand/20 text-brand font-extrabold',
    accentClass: 'border-l-brand',
    iconBgClass: 'bg-brand/10 border-brand/20 text-brand',
  },
  schedule: {
    type: 'schedule',
    group: 'messages_schedule',
    icon: <CalendarDays size={18} className="text-brand" />,
    categoryLabelVi: 'Lịch họp',
    categoryLabelEn: 'Schedule',
    badgeClass: 'bg-brand/10 border-brand/20 text-brand font-extrabold',
    accentClass: 'border-l-brand',
    iconBgClass: 'bg-brand/10 border-brand/20 text-brand',
  },
  ai_suggestion: {
    type: 'ai_suggestion',
    group: 'alerts_ai',
    icon: <Bot size={18} className="text-brand" />,
    categoryLabelVi: 'Gợi ý AI',
    categoryLabelEn: 'AI Insight',
    badgeClass: 'bg-brand/10 border-brand/20 text-brand font-extrabold',
    accentClass: 'border-l-brand',
    iconBgClass: 'bg-brand/10 border-brand/20 text-brand',
  },
  dispute: {
    type: 'dispute',
    group: 'alerts_ai',
    icon: <AlertTriangle size={18} className="text-brand" />,
    categoryLabelVi: 'Tranh chấp',
    categoryLabelEn: 'Dispute',
    badgeClass: 'bg-brand/10 border-brand/20 text-brand font-extrabold',
    accentClass: 'border-l-brand',
    iconBgClass: 'bg-brand/10 border-brand/20 text-brand',
  },
  report: {
    type: 'report',
    group: 'alerts_ai',
    icon: <ShieldAlert size={18} className="text-brand" />,
    categoryLabelVi: 'Báo cáo',
    categoryLabelEn: 'Report',
    badgeClass: 'bg-brand/10 border-brand/20 text-brand font-extrabold',
    accentClass: 'border-l-brand',
    iconBgClass: 'bg-brand/10 border-brand/20 text-brand',
  },
  review: {
    type: 'review',
    group: 'system',
    icon: <Star size={18} className="text-text-muted" />,
    categoryLabelVi: 'Đánh giá',
    categoryLabelEn: 'Review',
    badgeClass: 'bg-surface-muted border-border text-text-muted font-bold',
    accentClass: 'border-l-border',
    iconBgClass: 'bg-surface-muted border-border text-text-muted',
  },
  subscription: {
    type: 'subscription',
    group: 'system',
    icon: <Crown size={18} className="text-text-muted" />,
    categoryLabelVi: 'Premium',
    categoryLabelEn: 'Premium',
    badgeClass: 'bg-surface-muted border-border text-text-muted font-bold',
    accentClass: 'border-l-border',
    iconBgClass: 'bg-surface-muted border-border text-text-muted',
  },
  promotion: {
    type: 'promotion',
    group: 'system',
    icon: <Zap size={18} className="text-text-muted" />,
    categoryLabelVi: 'Ưu đãi',
    categoryLabelEn: 'Promotion',
    badgeClass: 'bg-surface-muted border-border text-text-muted font-bold',
    accentClass: 'border-l-border',
    iconBgClass: 'bg-surface-muted border-border text-text-muted',
  },
  rank_protection: {
    type: 'rank_protection',
    group: 'system',
    icon: <Crown size={18} className="text-text-muted" />,
    categoryLabelVi: 'Bảo vệ hạng',
    categoryLabelEn: 'Rank Guard',
    badgeClass: 'bg-surface-muted border-border text-text-muted font-bold',
    accentClass: 'border-l-border',
    iconBgClass: 'bg-surface-muted border-border text-text-muted',
  },
  system: {
    type: 'system',
    group: 'system',
    icon: <Bell size={18} className="text-text-muted" />,
    categoryLabelVi: 'Hệ thống',
    categoryLabelEn: 'System',
    badgeClass: 'bg-surface-muted border-border text-text-muted font-bold',
    accentClass: 'border-l-border',
    iconBgClass: 'bg-surface-muted border-border text-text-muted',
  },
};

export const CATEGORY_GROUP_ICONS: Record<NotificationCategoryGroup, ReactNode> = {
  all: <Bell size={15} className="text-brand" />,
  unread: <Bell size={15} className="text-brand" />,
  work_contracts: <Briefcase size={15} className="text-brand" />,
  payments: <Wallet size={15} className="text-brand" />,
  receipts: <FileCheck2 size={15} className="text-brand" />,
  messages_schedule: <CalendarDays size={15} className="text-brand" />,
  alerts_ai: <Bot size={15} className="text-brand" />,
  system: <Bell size={15} className="text-text-muted" />,
};

export const getNotificationDesignRule = (type: UiNotificationType): NotificationDesignRule => {
  return NOTIFICATION_DESIGN_RULES[type] ?? NOTIFICATION_DESIGN_RULES.system;
};

export const getNotificationCategoryGroup = (type: UiNotificationType): NotificationCategoryGroup => {
  return NOTIFICATION_DESIGN_RULES[type]?.group ?? 'system';
};
