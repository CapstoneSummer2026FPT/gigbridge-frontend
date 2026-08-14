import {
  Bell,
  CheckCheck,
  Search,
  ExternalLink,
  Calendar,
  Sparkles,
  Circle,
  CheckCircle,
  FileText,
  FileCheck2,
  MessageSquare,
  Star,
  LayoutGrid,
  Rows,
  RotateCw,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  BarChart3,
  Zap,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { CustomSelect, type SelectOption } from '../../../shared/components/CustomSelect';
import { useNotificationsScreen, type NotificationCategoryGroup, type PageSizeOption, type SortOrderOption } from '../hooks/useNotificationsScreen';
import { CATEGORY_GROUP_ICONS } from '../utils/notificationDesignRules';
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
  const {
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
    getDesignRule,
  } = useNotificationsScreen();

  // Category options for CustomSelect dropdown
  const categorySelectOptions: SelectOption[] = tabs.map((tab) => ({
    value: tab.id,
    label: tab.label,
    badge: String(categoryCounts[tab.id as NotificationCategoryGroup] || 0),
  }));

  // Page size options for CustomSelect dropdown
  const pageSizeSelectOptions: SelectOption[] = [
    { value: '10', label: isVi ? '10 / trang' : '10 / page' },
    { value: '20', label: isVi ? '20 / trang' : '20 / page' },
    { value: '50', label: isVi ? '50 / trang' : '50 / page' },
    { value: 'all', label: isVi ? 'Hiển thị tất cả' : 'Show all' },
  ];

  // Sort order options for CustomSelect dropdown
  const sortOrderSelectOptions: SelectOption[] = [
    { value: 'desc', label: isVi ? 'Mới nhất trước' : 'Newest first' },
    { value: 'asc', label: isVi ? 'Cũ nhất trước' : 'Oldest first' },
  ];

  return (
    <AppLayout>
      <div className="notif-page-layout">
        {/* Header Section matching TalentMatchingHeader */}
        <header className="notif-header-flex">
          <div>
            <div className="notif-eyebrow">
              <Sparkles size={14} />
              <span>{isVi ? 'HỘP THƯ & CẬP NHẬT' : 'INBOX & UPDATES'}</span>
            </div>

            <h1 className="notif-h1-title">
              {isVi ? (
                <>Quản lý <span className="notif-h1-accent">thông báo & hoạt động</span> của bạn</>
              ) : (
                <>Manage your <span className="notif-h1-accent">notifications & updates</span></>
              )}
            </h1>

            <p className="notif-header-desc">
              {unreadCount > 0
                ? isVi
                  ? `Bạn đang có ${unreadCount} thông báo chưa đọc cần chú ý.`
                  : `You have ${unreadCount} unread notifications.`
                : isVi
                  ? 'Tất cả thông báo đã được xem và cập nhật hoàn tất.'
                  : 'You are completely caught up.'}
            </p>
          </div>

          {/* Header Category Tabs Bar matching TalentMatchingHeader stage tabs */}
          <div className="notif-tabs-bar-glass" role="tablist">
            {tabs.map((tab) => {
              const count = categoryCounts[tab.id];
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`notif-stage-tab-btn ${isActive ? 'notif-stage-tab-active' : 'notif-stage-tab-inactive'}`}
                >
                  <span>{tab.label}</span>
                  <span className={isActive ? 'notif-stage-badge-active' : 'notif-stage-badge-inactive'}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </header>

        {/* 12-Column Responsive Layout Grid matching Talent Matching */}
        <div className="notif-grid-layout">
          {/* Main Content Area (col-span-12 lg:col-span-9) */}
          <main className="notif-main-col space-y-4">
            {/* Sticky Filter Bar matching TalentMatchingFilterBar */}
            <section className="notif-sticky-filter-bar">
              {/* Header Title & Result Count Row */}
              <div className="notif-filter-header-row">
                <div>
                  <div className="notif-filter-title-group">
                    <h2 className="notif-filter-h2">
                      {tabs.find((t) => t.id === activeTab)?.label || (isVi ? 'Tất cả thông báo' : 'All Notifications')}
                    </h2>
                    <span className="notif-filter-results-pill">
                      {totalFilteredCount} {isVi ? 'kết quả' : 'results'}
                    </span>
                  </div>
                  <p className="notif-filter-desc">
                    {isVi
                      ? 'Lọc theo thể loại, từ khóa, sắp xếp và tùy chỉnh chế độ xem'
                      : 'Filter by category, keyword, sort order and view mode'}
                  </p>
                </div>
              </div>

              {/* Main Filter Controls Row */}
              <div className="notif-controls-flex-row">
                {/* Instant Search Bar */}
                <div className="notif-tb-search-wrapper">
                  <Search size={14} className="notif-tb-search-icon" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={isVi ? 'Tìm kiếm từ khóa...' : 'Search keyword...'}
                    className="notif-tb-search-input"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="notif-tb-search-clear"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* CustomSelect Dropdown 1: Category Filter */}
                <div className="w-48 shrink-0">
                  <CustomSelect
                    value={activeTab}
                    options={categorySelectOptions}
                    onChange={(val) => setActiveTab(val as NotificationCategoryGroup)}
                    leftIcon={<Filter size={13} />}
                    searchable={false}
                  />
                </div>

                {/* CustomSelect Dropdown 2: Page Size */}
                <div className="w-36 shrink-0">
                  <CustomSelect
                    value={String(pageSize)}
                    options={pageSizeSelectOptions}
                    onChange={(val) => setPageSize(val === 'all' ? 'all' : (Number(val) as PageSizeOption))}
                    searchable={false}
                  />
                </div>

                {/* CustomSelect Dropdown 3: Sort Order */}
                <div className="w-40 shrink-0">
                  <CustomSelect
                    value={sortOrder}
                    options={sortOrderSelectOptions}
                    onChange={(val) => setSortOrder(val as SortOrderOption)}
                    leftIcon={<ArrowUpDown size={13} />}
                    searchable={false}
                  />
                </div>

                {/* Layout Mode Switcher (Grid vs Compact List) */}
                <div className="notif-layout-toggle-group">
                  <button
                    type="button"
                    onClick={() => setLayoutMode('grid')}
                    className={`notif-layout-toggle-btn ${layoutMode === 'grid' ? 'notif-layout-toggle-active' : ''}`}
                    title={isVi ? 'Chế độ thẻ (Grid)' : 'Grid view'}
                  >
                    <LayoutGrid size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayoutMode('compact')}
                    className={`notif-layout-toggle-btn ${layoutMode === 'compact' ? 'notif-layout-toggle-active' : ''}`}
                    title={isVi ? 'Chế độ danh sách (List)' : 'List view'}
                  >
                    <Rows size={15} />
                  </button>
                </div>
              </div>
            </section>

            {/* Notifications Cards Bento Container */}
            <section
              className={layoutMode === 'grid' ? 'notif-bento-grid notif-bento-grid-2col' : 'notif-bento-list'}
              aria-live="polite"
            >
              {paginatedNotifications.map((notification) => {
                const rule = getDesignRule(notification.type);

                return (
                  <div
                    key={notification.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleCardClick(notification)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCardClick(notification);
                      }
                    }}
                    className={`notif-bento-card ${
                      notification.isRead ? 'notif-bento-read' : 'notif-bento-unread'
                    }`}
                  >
                    {/* Category Icon Avatar Container */}
                    <div className="notif-bento-avatar-box">
                      {rule.icon}
                    </div>

                    {/* Main Content Area */}
                    <div className="notif-bento-content">
                      {/* Top Header Row */}
                      <div className="notif-bento-header-row">
                        <div className="notif-bento-tag-row">
                          <span className={`notif-bento-category-pill ${rule.badgeClass}`}>
                            {isVi ? rule.categoryLabelVi : rule.categoryLabelEn}
                          </span>
                          <h3
                            className={`notif-bento-title ${
                              notification.isRead ? 'notif-bento-title-read' : 'notif-bento-title-unread'
                            }`}
                          >
                            {notification.title}
                          </h3>
                        </div>

                        <span className="notif-bento-time">
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>

                      {/* Body Text */}
                      {notification.body && (
                        <p className="notif-bento-body">{notification.body}</p>
                      )}

                      {/* Embedded Schedule Meeting Preview Widget */}
                      {notification.schedule && (
                        <div className="notif-bento-widget-schedule">
                          <div className="notif-bento-schedule-info">
                            <Calendar size={16} className="text-brand shrink-0" />
                            <div>
                              <strong className="block text-xs font-black text-text-primary">
                                {notification.schedule.title}
                              </strong>
                              <span className="text-[0.72rem] text-text-muted font-medium">
                                {formatScheduleTime(notification.schedule.scheduledAtUtc)}
                                {' ICT · '}
                                {notification.schedule.actorName}
                              </span>
                            </div>
                          </div>

                          {notification.actionUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCardClick(notification);
                              }}
                              className="notif-bento-btn-join"
                            >
                              <ExternalLink size={13} />
                              <span>{isVi ? 'Tham gia họp' : 'Join meeting'}</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Embedded AI Suggestion Highlight */}
                      {notification.type === 'ai_suggestion' && (
                        <div className="notif-bento-widget-ai">
                          <Sparkles size={15} />
                          <span>
                            {isVi
                              ? 'Gợi ý thông minh từ Trợ lý GigBridge AI'
                              : 'Smart recommendation from GigBridge AI'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Right Side Actions: Unread dot + Quick mark read toggle */}
                    <div className="notif-bento-actions-col">
                      {!notification.isRead ? (
                        <span className="notif-dot-glow" title={isVi ? 'Chưa đọc' : 'Unread'} />
                      ) : (
                        <CheckCircle size={15} className="text-text-muted opacity-40" />
                      )}

                      {!notification.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleToggleReadStatus(e, notification)}
                          title={isVi ? 'Đánh dấu đã đọc' : 'Mark as read'}
                          className="notif-btn-toggle-circle"
                        >
                          <Circle size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Empty State */}
              {paginatedNotifications.length === 0 && (
                <div className="notif-bento-empty-box col-span-full">
                  <div className="notif-bento-empty-icon">
                    <Bell size={26} />
                  </div>
                  <h4 className="text-base font-bold text-text-primary">
                    {isLoading
                      ? isVi
                        ? 'Đang tải thông báo…'
                        : 'Loading notifications…'
                      : error || (isVi ? 'Không có thông báo' : 'No notifications')}
                  </h4>
                  <p className="mt-1 text-xs sm:text-sm font-medium text-text-muted">
                    {isLoading
                      ? isVi
                        ? 'Vui lòng chờ trong giây lát.'
                        : 'Checking your inbox.'
                      : error
                        ? isVi
                          ? 'Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau.'
                          : 'Please check your connection and try again.'
                        : searchQuery
                          ? isVi
                            ? 'Không tìm thấy thông báo khớp với từ khóa.'
                            : 'No notifications match your search keyword.'
                          : isVi
                            ? 'Bạn đã xem hết các thông báo trong mục này.'
                            : 'You are all caught up in this category.'}
                  </p>
                </div>
              )}
            </section>

            {/* Pagination Controls Bar matching Talent Matching */}
            {totalFilteredCount > 0 && pageSize !== 'all' && totalPages > 1 && (
              <nav className="notif-pagination-container" aria-label="Notification pagination">
                <span className="notif-pagination-info-text">
                  {isVi
                    ? `Trang ${currentPage} / ${totalPages} (Hiển thị ${
                        (currentPage - 1) * (pageSize as number) + 1
                      } - ${Math.min(currentPage * (pageSize as number), totalFilteredCount)} trên ${totalFilteredCount} thông báo)`
                    : `Page ${currentPage} of ${totalPages} (Showing ${
                        (currentPage - 1) * (pageSize as number) + 1
                      } - ${Math.min(currentPage * (pageSize as number), totalFilteredCount)} of ${totalFilteredCount} notifications)`}
                </span>

                <div className="notif-pagination-btn-group">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    className="notif-page-btn"
                    title={isVi ? 'Trang trước' : 'Previous page'}
                  >
                    <ChevronLeft size={15} />
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`notif-page-btn ${p === currentPage ? 'notif-page-active' : ''}`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(currentPage + 1)}
                    className="notif-page-btn"
                    title={isVi ? 'Trang sau' : 'Next page'}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </nav>
            )}
          </main>

          {/* Right Sidebar (col-span-12 lg:col-span-3) matching TalentMatchingRightSidebar */}
          <aside className="notif-side-col space-y-4">
            {/* Overview Stats Card */}
            <div className="notif-sidebar-card">
              <h3 className="notif-sidebar-title-h3">
                <BarChart3 size={15} className="text-brand" />
                {isVi ? 'Tổng quan hộp thư' : 'Inbox Overview'}
              </h3>
              
              <div className="notif-side-stat-grid">
                <div className="notif-side-stat-box">
                  <span className="notif-side-stat-label">{isVi ? 'Tổng số' : 'Total'}</span>
                  <div className="notif-side-stat-val">{notifications.length}</div>
                </div>

                <div className="notif-side-stat-box">
                  <span className="notif-side-stat-label">{isVi ? 'Chưa đọc' : 'Unread'}</span>
                  <div className="notif-side-stat-val text-brand">{unreadCount}</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="notif-progress-bg">
                <div
                  className="notif-progress-fill"
                  style={{
                    width: `${notifications.length > 0 ? Math.round((readCount / notifications.length) * 100) : 100}%`,
                  }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] font-extrabold text-text-muted">
                <span>{isVi ? 'Đã xem' : 'Read'}: {readCount}</span>
                <span>
                  {notifications.length > 0
                    ? Math.round((readCount / notifications.length) * 100)
                    : 100}%
                </span>
              </div>
            </div>

            {/* Category Breakdown Card with Lucide Icons from notificationDesignRules */}
            <div className="notif-sidebar-card">
              <h3 className="notif-sidebar-title-h3">
                <Inbox size={15} className="text-brand" />
                {isVi ? 'Phân loại thông báo' : 'Categories'}
              </h3>
              
              <div className="notif-side-dist-list">
                <div className="notif-side-dist-row">
                  <div className="notif-side-dist-label-group">
                    {CATEGORY_GROUP_ICONS.work_contracts}
                    <span>{isVi ? 'Công việc & Hợp đồng' : 'Work & Contracts'}</span>
                  </div>
                  <span className="notif-side-dist-badge">{categoryCounts.work_contracts}</span>
                </div>

                <div className="notif-side-dist-row">
                  <div className="notif-side-dist-label-group">
                    {CATEGORY_GROUP_ICONS.payments}
                    <span>{isVi ? 'Thanh toán & GCoin' : 'Payments & GCoin'}</span>
                  </div>
                  <span className="notif-side-dist-badge">{categoryCounts.payments}</span>
                </div>

                <div className="notif-side-dist-row">
                  <div className="notif-side-dist-label-group">
                    {CATEGORY_GROUP_ICONS.messages_schedule}
                    <span>{isVi ? 'Tin nhắn & Lịch họp' : 'Messages & Schedule'}</span>
                  </div>
                  <span className="notif-side-dist-badge">{categoryCounts.messages_schedule}</span>
                </div>

                <div className="notif-side-dist-row">
                  <div className="notif-side-dist-label-group">
                    {CATEGORY_GROUP_ICONS.alerts_ai}
                    <span>{isVi ? 'Cảnh báo & AI' : 'Alerts & AI Insights'}</span>
                  </div>
                  <span className="notif-side-dist-badge">{categoryCounts.alerts_ai}</span>
                </div>

                <div className="notif-side-dist-row">
                  <div className="notif-side-dist-label-group">
                    {CATEGORY_GROUP_ICONS.system}
                    <span>{isVi ? 'Hệ thống' : 'System'}</span>
                  </div>
                  <span className="notif-side-dist-badge">{categoryCounts.system}</span>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="notif-sidebar-card">
              <h3 className="notif-sidebar-title-h3">
                <Zap size={15} className="text-brand" />
                {isVi ? 'Thao tác nhanh' : 'Quick Actions'}
              </h3>
              
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  disabled={unreadCount === 0}
                  onClick={handleMarkAllAsRead}
                  className="notif-btn-sidebar-primary"
                >
                  <CheckCheck size={14} />
                  <span>{isVi ? 'Đánh dấu tất cả đã đọc' : 'Mark all read'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-muted/60 text-text-primary hover:bg-surface-muted font-bold text-xs py-2.5 px-4 transition-colors"
                >
                  <RotateCw size={14} className={isLoading ? 'animate-spin' : ''} />
                  <span>{isVi ? 'Làm mới dữ liệu' : 'Refresh data'}</span>
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
