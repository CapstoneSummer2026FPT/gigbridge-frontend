import { useState, useMemo, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from '../../../hooks/useTranslation';
import type { UiNotification } from './useUserNotifications';
import { useNotificationsContext } from '../providers/NotificationsProvider';
import {
  getNotificationDesignRule,
  getNotificationCategoryGroup,
  type NotificationCategoryGroup,
  type NotificationDesignRule,
} from '../utils/notificationDesignRules';

export type PageSizeOption = 10 | 20 | 'all';
export type SortOrderOption = 'desc' | 'asc';
export type LayoutMode = 'grid' | 'compact';

export interface UseNotificationsScreenReturn {
  isVi: boolean;
  activeTab: NotificationCategoryGroup;
  setActiveTab: (tab: NotificationCategoryGroup) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  pageSize: PageSizeOption;
  setPageSize: (size: PageSizeOption) => void;
  sortOrder: SortOrderOption;
  setSortOrder: (order: SortOrderOption) => void;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  totalFilteredCount: number;
  paginatedNotifications: UiNotification[];
  notifications: UiNotification[];
  categoryCounts: Record<NotificationCategoryGroup, number>;
  unreadCount: number;
  readCount: number;
  isLoading: boolean;
  error: string | null;
  tabs: { id: NotificationCategoryGroup; label: string }[];
  refresh: () => Promise<void>;
  handleCardClick: (notification: UiNotification) => void;
  handleToggleReadStatus: (e: React.MouseEvent, notification: UiNotification) => void;
  handleMarkAllAsRead: () => void;
  formatRelativeTime: (value?: string) => string;
  formatScheduleTime: (utcStr?: string) => string;
  getDesignRule: (type: UiNotification['type']) => NotificationDesignRule;
}

export function useNotificationsScreen(): UseNotificationsScreenReturn {
  const navigate = useNavigate();
  const { t: tNotif, i18n } = useTranslation('notifications');
  const isVi = i18n.language === 'vi';

  const [activeTab, setActiveTab] = useState<NotificationCategoryGroup>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState<PageSizeOption>(10);
  const [sortOrder, setSortOrder] = useState<SortOrderOption>('desc');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('grid');
  const [currentPage, setCurrentPage] = useState<number>(1);

  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotificationsContext();

  const readCount = useMemo(() => {
    return Math.max(0, notifications.length - unreadCount);
  }, [notifications.length, unreadCount]);

  // Reset pagination when filter states change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, pageSize, sortOrder]);

  // Compute category counts for tab badges & sidebar breakdown
  const categoryCounts = useMemo(() => {
    const counts: Record<NotificationCategoryGroup, number> = {
      all: notifications.length,
      unread: unreadCount,
      work_contracts: 0,
      payments: 0,
      receipts: 0,
      messages_schedule: 0,
      alerts_ai: 0,
      system: 0,
    };

    notifications.forEach((item) => {
      const group = getNotificationCategoryGroup(item.type);
      if (group in counts) {
        counts[group] += 1;
      }
    });

    return counts;
  }, [notifications, unreadCount]);

  // Filter & sort notifications
  const filteredNotifications = useMemo(() => {
    const list = notifications.filter((notification) => {
      if (activeTab === 'unread' && notification.isRead) return false;
      if (activeTab !== 'all' && activeTab !== 'unread') {
        const group = getNotificationCategoryGroup(notification.type);
        if (group !== activeTab) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = notification.title?.toLowerCase().includes(q);
        const matchBody = notification.body?.toLowerCase().includes(q);
        if (!matchTitle && !matchBody) return false;
      }

      return true;
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    });
  }, [notifications, activeTab, searchQuery, sortOrder]);

  const totalFilteredCount = filteredNotifications.length;

  const totalPages = useMemo(() => {
    if (pageSize === 'all' || totalFilteredCount === 0) return 1;
    return Math.ceil(totalFilteredCount / pageSize);
  }, [totalFilteredCount, pageSize]);

  // Calculate paginated slice
  const paginatedNotifications = useMemo(() => {
    if (pageSize === 'all') return filteredNotifications;
    const startIndex = (currentPage - 1) * pageSize;
    return filteredNotifications.slice(startIndex, startIndex + pageSize);
  }, [filteredNotifications, currentPage, pageSize]);

  const tabs: { id: NotificationCategoryGroup; label: string }[] = useMemo(
    () => [
      { id: 'all', label: tNotif('notifications.tabs.all', { defaultValue: 'Tất cả' }) },
      { id: 'unread', label: tNotif('notifications.tabs.unread', { defaultValue: 'Chưa đọc' }) },
      { id: 'work_contracts', label: tNotif('notifications.tabs.work_contracts', { defaultValue: 'Công việc & Hợp đồng' }) },
      { id: 'payments', label: tNotif('notifications.tabs.payments', { defaultValue: 'Thanh toán' }) },
      { id: 'receipts', label: tNotif('notifications.tabs.receipts', { defaultValue: 'Biên nhận & Hóa đơn' }) },
      { id: 'messages_schedule', label: tNotif('notifications.tabs.messages_schedule', { defaultValue: 'Tin nhắn & Lịch' }) },
      { id: 'alerts_ai', label: tNotif('notifications.tabs.alerts_ai', { defaultValue: 'Cảnh báo & AI' }) },
      { id: 'system', label: tNotif('notifications.tabs.system', { defaultValue: 'Hệ thống' }) },
    ],
    [tNotif],
  );

  const handleCardClick = useCallback(
    (notification: UiNotification) => {
      if (!notification.isRead) {
        void markAsRead(notification.id);
      }
      if (notification.actionUrl) {
        navigate(notification.actionUrl);
      }
    },
    [markAsRead, navigate],
  );

  const handleToggleReadStatus = useCallback(
    (e: React.MouseEvent, notification: UiNotification) => {
      e.stopPropagation();
      void markAsRead(notification.id);
    },
    [markAsRead],
  );

  const handleMarkAllAsRead = useCallback(() => {
    void markAllAsRead();
  }, [markAllAsRead]);

  const formatRelativeTime = useCallback(
    (value?: string) => {
      if (!value) return '';
      const timestamp = new Date(value).getTime();
      if (!Number.isFinite(timestamp)) return '';
      const diffMs = Date.now() - timestamp;
      const minutes = Math.max(0, Math.floor(diffMs / 60_000));
      if (minutes < 1) return isVi ? 'Vừa xong' : 'Just now';
      if (minutes < 60) return isVi ? `${minutes} phút trước` : `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return isVi ? `${hours} giờ trước` : `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return isVi ? `${days} ngày trước` : `${days}d ago`;
    },
    [isVi],
  );

  const formatScheduleTime = useCallback(
    (utcStr?: string) => {
      if (!utcStr) return '';
      const date = new Date(utcStr);
      if (isNaN(date.getTime())) return '';
      try {
        return new Intl.DateTimeFormat(isVi ? 'vi-VN' : 'en-GB', {
          timeZone: 'Asia/Ho_Chi_Minh',
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(date);
      } catch {
        return utcStr;
      }
    },
    [isVi],
  );

  return {
    isVi,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    pageSize,
    setPageSize,
    sortOrder,
    setSortOrder,
    layoutMode,
    setLayoutMode,
    currentPage,
    setCurrentPage,
    totalPages,
    totalFilteredCount,
    paginatedNotifications,
    categoryCounts,
    unreadCount,
    readCount,
    notifications,
    isLoading,
    error,
    tabs,
    refresh,
    handleCardClick,
    handleToggleReadStatus,
    handleMarkAllAsRead,
    formatRelativeTime,
    formatScheduleTime,
    getDesignRule: getNotificationDesignRule,
  };
}
