import {
  Activity,
  AlertTriangle,
  FileText,
  Zap,
  Clock,
  RefreshCw,
  Download,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAdminSystemTracking } from '../hooks/useAdminSystemTracking';
import { TrackingOverviewTab } from '../components/system-tracking/TrackingOverviewTab';
import { TrackingAuditTab } from '../components/system-tracking/TrackingAuditTab';
import { TrackingErrorsTab } from '../components/system-tracking/TrackingErrorsTab';
import { TrackingAlertsTab } from '../components/system-tracking/TrackingAlertsTab';
import type { TabType } from '../utils/systemTrackingUtils';
import '../styles/admin-system-tracking.css';

export default function AdminSystemTrackingScreen() {
  const { t } = useTranslation(['admin', 'common']);

  const {
    activeTab,
    setActiveTab,
    stats,
    isLoadingTracking,
    isLiveConnected,
    copiedId,
    handleCopy,
    handleExportAllJson,
    loadSystemTrackingData,
    errorMonitoring,
    userMap,

    // Tab 1: API Logs
    apiLogs,
    filteredApiLogs,
    paginatedApiLogs,
    apiLogFilters,
    setApiLogFilters,
    apiLogSortOrder,
    setApiLogSortOrder,
    apiLogPage,
    setApiLogPage,
    apiLogsPerPage,
    setApiLogsPerPage,
    totalApiLogPages,
    showAdvancedFilters,
    setShowAdvancedFilters,

    // Tab 2: Recent Activity
    auditLogs,
    filteredAuditLogs,
    paginatedAuditLogs,
    auditSearchQuery,
    setAuditSearchQuery,
    auditCategoryFilter,
    setAuditCategoryFilter,
    auditSortOrder,
    setAuditSortOrder,
    auditLogPage,
    setAuditLogPage,
    auditLogsPerPage,
    setAuditLogsPerPage,
    totalAuditLogPages,
    expandedAuditIds,
    toggleAuditExpand,
    toggleAllAuditExpand,
    globalAuditViewMode,
    setGlobalAuditViewMode,

    // Tab 3: Error Logs
    errorLogs,
    filteredErrorLogs,
    paginatedErrorLogs,
    errorSearchQuery,
    setErrorSearchQuery,
    errorLevelFilter,
    setErrorLevelFilter,
    errorSortOrder,
    setErrorSortOrder,
    errorLogPage,
    setErrorLogPage,
    errorLogsPerPage,
    setErrorLogsPerPage,
    totalErrorLogPages,
    expandedErrorIds,
    toggleErrorExpand,
    toggleAllErrorExpand,

    // Tab 4: System Alerts
    alerts,
    filteredAlerts,
    paginatedAlerts,
    alertSearchQuery,
    setAlertSearchQuery,
    alertSeverityFilter,
    setAlertSeverityFilter,
    alertSortOrder,
    setAlertSortOrder,
    alertLogPage,
    setAlertLogPage,
    alertsPerPage,
    setAlertsPerPage,
    totalAlertLogPages,
    expandedAlertIds,
    toggleAlertExpand,
    toggleAllAlertExpand,
  } = useAdminSystemTracking();

  const tabs: { id: TabType; label: string; icon: typeof Activity; badge?: number }[] = [
    { id: 'overview', label: t('adminSystemTracking.tabOverview', 'Gateway & API Logs'), icon: Activity, badge: apiLogs.length },
    { id: 'audit', label: t('adminSystemTracking.tabAudit', 'Recent Activity'), icon: FileText, badge: auditLogs.length },
    { id: 'errors', label: t('adminSystemTracking.tabErrors', 'Error Logs'), icon: AlertTriangle, badge: errorLogs.length },
    { id: 'alerts', label: t('adminSystemTracking.tabAlerts', 'System Alerts'), icon: Zap, badge: alerts.length },
  ];

  return (
    <AppLayout>
      <div className="admin-system-tracking-container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-primary tracking-tight">
                {t('adminSystemTracking.pageTitle', 'System Tracking & Health')}
              </h1>
              <span className={`live-status-pill ${isLiveConnected ? 'is-live' : 'is-stale'}`}>
                <span className="live-dot"></span>
                <span>{isLiveConnected ? t('adminSystemTracking.liveTelemetry', 'Live Telemetry') : t('adminSystemTracking.pollingMode', 'Polling Mode')}</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-secondary">
              {t('adminSystemTracking.pageSubtitle', 'Giám sát thời gian thực các sự kiện hệ thống, API gateway, log hoạt động quản trị và phát hiện lỗi')}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => loadSystemTrackingData()}
              disabled={isLoadingTracking}
              className="tracking-btn text-xs font-bold"
              title={t('adminSystemTracking.refreshTooltip', 'Tải lại dữ liệu')}
            >
              <RefreshCw size={14} className={isLoadingTracking ? 'animate-spin' : ''} />
              <span>{isLoadingTracking ? t('adminSystemTracking.refreshing', 'Đang tải...') : t('adminSystemTracking.refresh', 'Làm mới')}</span>
            </button>

            <button
              onClick={handleExportAllJson}
              className="tracking-btn text-xs font-bold"
              title={t('adminSystemTracking.exportJsonTooltip', 'Xuất toàn bộ dữ liệu ra file JSON')}
            >
              <Download size={14} />
              <span>{t('adminSystemTracking.exportJson', 'Xuất JSON')}</span>
            </button>
          </div>
        </div>

        {/* Global KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="stat-card group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                {t('adminSystemTracking.statTotalRequests', 'Tổng Requests')}
              </span>
              <div className="stat-card-icon bg-brand text-white shadow-sm">
                <Activity size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-primary font-mono">
              {stats.totalRequests.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted mt-1">
              {t('adminSystemTracking.statTrackingSession', 'Phiên theo dõi hiện tại')}
            </div>
          </div>

          <div className="stat-card group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                {t('adminSystemTracking.statAvgLatency', 'Độ trễ trung bình')}
              </span>
              <div className="stat-card-icon bg-sky-600 text-white shadow-sm">
                <Clock size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-primary font-mono">
              {stats.avgDuration} <span className="text-xs font-normal text-muted">ms</span>
            </div>
            <div className="text-[11px] text-muted mt-1">
              P95: <span className="font-bold text-primary font-mono">{stats.p95Duration}ms</span>
            </div>
          </div>

          <div className="stat-card group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                {t('adminSystemTracking.statErrorRate', 'Tỷ lệ lỗi (4xx/5xx)')}
              </span>
              <div className={`stat-card-icon ${stats.errorRate > 5 ? 'bg-red-600' : 'bg-emerald-600'} text-white shadow-sm`}>
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className={`text-xl sm:text-2xl font-black font-mono ${stats.errorRate > 5 ? 'text-red-600' : 'text-emerald-600'}`}>
              {stats.errorRate}%
            </div>
            <div className="text-[11px] text-muted mt-1">
              {stats.errorRequests} {t('adminSystemTracking.statErrorsOccurred', 'lỗi ghi nhận')}
            </div>
          </div>

          <div className="stat-card group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                {t('adminSystemTracking.statAuditActivities', 'Nhật ký hoạt động')}
              </span>
              <div className="stat-card-icon bg-indigo-600 text-white shadow-sm">
                <FileText size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-primary font-mono">
              {stats.auditCount.toLocaleString()}
            </div>
            <div className="text-[11px] text-muted mt-1">
              {t('adminSystemTracking.statSystemAuditLogs', 'Sự kiện kiểm toán quản trị')}
            </div>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="tracking-tab-bar">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`tracking-tab-item ${isActive ? 'active' : ''}`}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span className={`tracking-tab-badge ${isActive ? 'active' : ''}`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview & API Request Logs */}
        {activeTab === 'overview' && (
          <TrackingOverviewTab
            apiLogs={apiLogs}
            filteredApiLogs={filteredApiLogs}
            paginatedApiLogs={paginatedApiLogs}
            apiLogFilters={apiLogFilters}
            setApiLogFilters={setApiLogFilters}
            apiLogSortOrder={apiLogSortOrder}
            setApiLogSortOrder={setApiLogSortOrder}
            apiLogPage={apiLogPage}
            setApiLogPage={setApiLogPage}
            apiLogsPerPage={apiLogsPerPage}
            setApiLogsPerPage={setApiLogsPerPage}
            totalApiLogPages={totalApiLogPages}
            showAdvancedFilters={showAdvancedFilters}
            setShowAdvancedFilters={setShowAdvancedFilters}
            isLoadingTracking={isLoadingTracking}
            handleCopy={handleCopy}
            copiedId={copiedId}
          />
        )}

        {/* Tab 2: Recent Activity / Audit Trail */}
        {activeTab === 'audit' && (
          <TrackingAuditTab
            auditLogs={auditLogs}
            filteredAuditLogs={filteredAuditLogs}
            paginatedAuditLogs={paginatedAuditLogs}
            auditSearchQuery={auditSearchQuery}
            setAuditSearchQuery={setAuditSearchQuery}
            auditCategoryFilter={auditCategoryFilter}
            setAuditCategoryFilter={setAuditCategoryFilter}
            auditSortOrder={auditSortOrder}
            setAuditSortOrder={setAuditSortOrder}
            auditLogPage={auditLogPage}
            setAuditLogPage={setAuditLogPage}
            auditLogsPerPage={auditLogsPerPage}
            setAuditLogsPerPage={setAuditLogsPerPage}
            totalAuditLogPages={totalAuditLogPages}
            expandedAuditIds={expandedAuditIds}
            toggleAuditExpand={toggleAuditExpand}
            toggleAllAuditExpand={toggleAllAuditExpand}
            globalAuditViewMode={globalAuditViewMode}
            setGlobalAuditViewMode={setGlobalAuditViewMode}
            isLoadingTracking={isLoadingTracking}
            handleCopy={handleCopy}
            copiedId={copiedId}
            userMap={userMap}
          />
        )}

        {/* Tab 3: Error Logs */}
        {activeTab === 'errors' && (
          <TrackingErrorsTab
            errorMonitoring={errorMonitoring}
            errorLogs={errorLogs}
            filteredErrorLogs={filteredErrorLogs}
            paginatedErrorLogs={paginatedErrorLogs}
            errorSearchQuery={errorSearchQuery}
            setErrorSearchQuery={setErrorSearchQuery}
            errorLevelFilter={errorLevelFilter}
            setErrorLevelFilter={setErrorLevelFilter}
            errorSortOrder={errorSortOrder}
            setErrorSortOrder={setErrorSortOrder}
            errorLogPage={errorLogPage}
            setErrorLogPage={setErrorLogPage}
            errorLogsPerPage={errorLogsPerPage}
            setErrorLogsPerPage={setErrorLogsPerPage}
            totalErrorLogPages={totalErrorLogPages}
            expandedErrorIds={expandedErrorIds}
            toggleErrorExpand={toggleErrorExpand}
            toggleAllErrorExpand={toggleAllErrorExpand}
            isLoadingTracking={isLoadingTracking}
            handleCopy={handleCopy}
            copiedId={copiedId}
          />
        )}

        {/* Tab 4: System Alerts */}
        {activeTab === 'alerts' && (
          <TrackingAlertsTab
            alerts={alerts}
            filteredAlerts={filteredAlerts}
            paginatedAlerts={paginatedAlerts}
            alertSearchQuery={alertSearchQuery}
            setAlertSearchQuery={setAlertSearchQuery}
            alertSeverityFilter={alertSeverityFilter}
            setAlertSeverityFilter={setAlertSeverityFilter}
            alertSortOrder={alertSortOrder}
            setAlertSortOrder={setAlertSortOrder}
            alertLogPage={alertLogPage}
            setAlertLogPage={setAlertLogPage}
            alertsPerPage={alertsPerPage}
            setAlertsPerPage={setAlertsPerPage}
            totalAlertLogPages={totalAlertLogPages}
            expandedAlertIds={expandedAlertIds}
            toggleAlertExpand={toggleAlertExpand}
            toggleAllAlertExpand={toggleAllAlertExpand}
            isLoadingTracking={isLoadingTracking}
          />
        )}
      </div>
    </AppLayout>
  );
}
