import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Bell, Sparkles, ChevronRight, ArrowRight, Clock } from 'lucide-react';
import type { User } from '../../../types/models/User';
import type { UiNotification } from '../hooks/useUserNotifications';
import { useNotificationsContext } from '../providers/NotificationsProvider';
import { getNotificationDesignRule } from '../utils/notificationDesignRules';
import { useTranslation } from '../../../hooks/useTranslation';

export interface TopNavNotificationDropdownProps {
  user: User | null;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

/**
 * Utility helper to format relative time ago ("X minutes ago" / "X phút trước")
 */
export function formatRelativeTimeAgo(value?: string, isVi = true): string {
  if (!value) return '';
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';
  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(0, Math.floor(diffMs / 60_000));
  if (minutes < 1) return isVi ? 'Vừa xong' : 'Just now';
  if (minutes < 60) return isVi ? `${minutes} phút trước` : `${minutes} mins ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isVi ? `${hours} giờ trước` : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return isVi ? `${days} ngày trước` : `${days} days ago`;
  const months = Math.floor(days / 30);
  return isVi ? `${months} tháng trước` : `${months} months ago`;
}

export function TopNavNotificationDropdown({
  user,
  isOpen,
  onToggle,
  onClose,
}: TopNavNotificationDropdownProps) {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { notifications, unreadCount, markAsRead } = useNotificationsContext();

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Bell Button */}
      <button
        type="button"
        onClick={onToggle}
        className="p-2.5 rounded-2xl transition-all relative glass-button hover:bg-white/10 dark:hover:bg-white/5 active:scale-95 cursor-pointer flex items-center justify-center"
        title={t('notifications.title', { defaultValue: 'Thông báo' })}
        aria-label={t('notifications.title', { defaultValue: 'Thông báo' })}
      >
        <Bell size={17} className={unreadCount > 0 ? 'text-[var(--brand)] animate-bounce' : 'text-muted'} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center bg-[var(--brand)] text-white shadow-md shadow-[var(--brand)]/30 border border-card">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Redesigned Glass Dropdown Container */}
      {isOpen && (
        <div className="absolute right-0 top-13 w-80 sm:w-96 rounded-3xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden z-50 transition-all animate-in zoom-in-95 duration-200">
          {/* Top Decorative Gradient Accent Bar */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[var(--brand)] via-indigo-500 to-amber-500 shrink-0" />

          {/* Dropdown Header */}
          <div className="p-4 pb-3 border-b border-border/50 flex items-center justify-between gap-3 bg-card/80 shrink-0">
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[var(--brand)]">
                <Sparkles size={11} className="animate-pulse" />
                <span>{isVi ? 'HỘP THƯ & THÔNG BÁO' : 'NOTIFICATIONS & ALERTS'}</span>
              </div>
              <h4 className="text-sm font-black text-foreground tracking-tight flex items-center gap-2">
                <span>{isVi ? 'Thông báo mới' : 'Latest Notifications'}</span>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-[var(--brand)]/15 text-[var(--brand)] text-[10px] font-black">
                    {unreadCount} {isVi ? 'mới' : 'new'}
                  </span>
                )}
              </h4>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/notifications');
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-[var(--brand)] hover:underline cursor-pointer shrink-0"
            >
              <span>{t('notifications.seeAll', { defaultValue: 'Xem tất cả' })}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Scrollable Notification List */}
          <div className="p-2 space-y-1.5 max-h-80 overflow-y-auto custom-scrollbar">
            {notifications.length > 0 ? (
              notifications.slice(0, 6).map((n: UiNotification) => {
                const rule = getNotificationDesignRule(n.type);
                const timeAgoStr = formatRelativeTimeAgo(n.createdAt, isVi);

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      void markAsRead(n.id);
                      onClose();
                      navigate(n.actionUrl || '/notifications');
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer relative group flex items-start gap-3 ${n.isRead
                        ? 'border-border/40 bg-card/40 hover:bg-muted/30 hover:border-border/70'
                        : 'border-[var(--brand)]/35 bg-[color-mix(in_srgb,var(--brand)_6%,var(--card))] shadow-sm hover:border-[var(--brand)]/60'
                      }`}
                  >
                    {/* Category Icon Badge */}
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${rule.iconBgClass}`}>
                      {rule.icon}
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[9px] px-2 py-0.5 rounded-md border font-black uppercase tracking-wider ${rule.badgeClass}`}>
                          {isVi ? rule.categoryLabelVi : rule.categoryLabelEn}
                        </span>

                        {/* Top-Right Relative Time Ago & Unread Dot */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {timeAgoStr && (
                            <span className="text-[10px] font-extrabold text-muted-foreground/80 group-hover:text-foreground transition-colors whitespace-nowrap">
                              {timeAgoStr}
                            </span>
                          )}
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full bg-[var(--brand)] shrink-0 animate-ping" />
                          )}
                        </div>
                      </div>

                      <h5 className="text-xs font-extrabold text-foreground line-clamp-1 group-hover:text-[var(--brand)] transition-colors leading-snug">
                        {n.title}
                      </h5>

                      {n.body && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {n.body}
                        </p>
                      )}

                      {n.schedule && (
                        <p className="text-[10px] text-[var(--brand)] font-bold flex items-center gap-1 mt-1">
                          <Clock size={11} />
                          <span>
                            {new Intl.DateTimeFormat('vi-VN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            }).format(new Date(n.schedule.scheduledAtUtc))}{' '}
                            · {n.schedule.actorName}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-muted/40 text-muted-foreground flex items-center justify-center mx-auto border border-border/60">
                  <Bell size={22} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-extrabold text-foreground">
                    {t('notifications.noNotifications', { defaultValue: 'Không có thông báo mới' })}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-medium">
                    {t('notifications.caughtUp', { defaultValue: 'Bạn đã đọc tất cả thông báo!' })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation Button */}
          <div className="p-2 border-t border-border/50 bg-card/80 text-center shrink-0">
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/notifications');
              }}
              className="w-full py-2.5 px-3 rounded-2xl bg-surface-muted hover:bg-border/60 text-foreground text-xs font-black transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>{isVi ? 'Xem Trung Tâm Thông Báo' : 'View Notification Center'}</span>
              <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform text-[var(--brand)]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
