import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  Bell,
  Bot,
  Briefcase,
  CalendarDays,
  CheckCircle,
  FileText,
  MessageSquare,
  Star,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { useApp } from '../../../app/providers/AppProvider';
import { useUserNotifications } from '../hooks/useUserNotifications';
import '../styles/notifications-screen.css';

const notificationIcons: Record<string, ReactNode> = {
  job: <Briefcase size={16} className="text-cyan" />,
  proposal: <Briefcase size={16} className="text-cyan" />,
  contract: <FileText size={16} className="text-cyan" />,
  message: <MessageSquare size={16} className="text-purple" />,
  milestone: <CheckCircle size={16} className="text-green" />,
  payment: <GCoinIcon size={16} />,
  review: <Star size={16} className="text-amber" />,
  dispute: <AlertTriangle size={16} className="text-red" />,
  ai_suggestion: <Bot size={16} className="text-purple" />,
  system: <Bell size={16} className="text-secondary" />,
  schedule: <CalendarDays size={16} className="text-cyan" />,
};

type NotificationTab = 'all' | 'unread';

const relativeTime = (value: string) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const hours = Math.max(0, Math.floor((Date.now() - timestamp) / 3_600_000));
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const { user } = useApp();
  const [activeTab, setActiveTab] = useState<NotificationTab>('all');
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  } = useUserNotifications(user, { pageSize: 20, pollMs: 45_000 });

  const visibleNotifications = activeTab === 'unread'
    ? notifications.filter(notification => !notification.isRead)
    : notifications;

  return (
    <AppLayout>
      <main className="notifications-screen mx-auto max-w-4xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="mb-1 text-3xl font-bold tracking-tight text-foreground">Notifications</h1>
            <p className="text-secondary">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </p>
          </div>
          <button
            type="button"
            disabled={unreadCount === 0}
            onClick={() => void markAllAsRead()}
            className="text-sm text-secondary transition-all disabled:opacity-50"
          >
            Mark all as read
          </button>
        </header>

        <div className="mb-6 flex gap-2" role="tablist" aria-label="Notification filters">
          {([
            { id: 'all' as const, label: 'All', count: notifications.length },
            { id: 'unread' as const, label: 'Unread', count: unreadCount },
          ]).map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium ${
                activeTab === tab.id
                  ? 'border-[var(--gb-cyan)]/30 bg-[var(--gb-cyan)]/10 text-[var(--gb-cyan)]'
                  : 'border-border text-secondary'
              }`}
            >
              {tab.label}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs font-bold">{tab.count}</span>
            </button>
          ))}
        </div>

        <section className="space-y-2" aria-live="polite">
          {visibleNotifications.map(notification => (
            <button
              key={notification.id}
              type="button"
              className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-colors ${
                notification.isRead
                  ? 'border-border bg-card/30'
                  : 'border-[var(--gb-cyan)]/20 bg-[var(--gb-cyan)]/5'
              }`}
              onClick={() => {
                void markAsRead(notification.id);
                if (notification.actionUrl) navigate(notification.actionUrl);
              }}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
                {notificationIcons[notification.type] ?? <Bell size={16} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-start justify-between gap-3">
                  <strong className="text-sm text-primary">{notification.title}</strong>
                  <span className="shrink-0 text-xs text-secondary">{relativeTime(notification.createdAt)}</span>
                </span>
                {notification.body && (
                  <span className="mt-1 block text-sm leading-relaxed text-secondary">{notification.body}</span>
                )}
                {notification.schedule && (
                  <span className="mt-2 block rounded-lg border border-cyan/10 bg-cyan/5 p-2 text-xs">
                    <strong>{notification.schedule.title}</strong>
                    <span className="block text-secondary">
                      {new Intl.DateTimeFormat('en-GB', {
                        timeZone: 'Asia/Ho_Chi_Minh',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      }).format(new Date(notification.schedule.scheduledAtUtc))}
                      {' ICT · '}
                      {notification.schedule.actorName}
                    </span>
                  </span>
                )}
              </span>
              {!notification.isRead && <span className="notif-dot mt-2" aria-label="Unread" />}
            </button>
          ))}

          {visibleNotifications.length === 0 && (
            <div className="py-16 text-center">
              <Bell size={40} className="mx-auto mb-3 text-secondary opacity-20" />
              <p className="font-medium text-primary">
                {isLoading ? 'Loading notifications…' : 'No notifications'}
              </p>
              <p className="mt-1 text-sm text-secondary">
                {isLoading ? 'Checking your inbox.' : 'New activity will appear here.'}
              </p>
            </div>
          )}
        </section>
      </main>
    </AppLayout>
  );
}
