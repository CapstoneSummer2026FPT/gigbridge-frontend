import { Fragment } from 'react';
import {
  AlertTriangle,
  Search,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AdminTablePageSize, AdminTablePagination } from '../AdminTableControls';
import { useTranslation } from '../../../../hooks/useTranslation';
import {
  type SystemAlert,
  type LogLevel,
  formatTimestamp,
} from '../../utils/systemTrackingUtils';

export interface TrackingAlertsTabProps {
  alerts: SystemAlert[];
  filteredAlerts: SystemAlert[];
  paginatedAlerts: SystemAlert[];
  alertSearchQuery: string;
  setAlertSearchQuery: (query: string) => void;
  alertSeverityFilter: LogLevel | 'all';
  setAlertSeverityFilter: (level: LogLevel | 'all') => void;
  alertSortOrder: 'asc' | 'desc';
  setAlertSortOrder: (order: 'asc' | 'desc') => void;
  alertLogPage: number;
  setAlertLogPage: (page: number) => void;
  alertsPerPage: number;
  setAlertsPerPage: (size: number) => void;
  totalAlertLogPages: number;
  expandedAlertIds: Set<string>;
  toggleAlertExpand: (id: string) => void;
  toggleAllAlertExpand: () => void;
  isLoadingTracking: boolean;
}

export function TrackingAlertsTab({
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
  isLoadingTracking,
}: TrackingAlertsTabProps) {
  const { t } = useTranslation(['admin', 'common']);

  return (
    <div className="space-y-6">
      {/* System Alerts Table Panel */}
      <div className="tracking-panel">
        <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-primary">{t('adminSystemTracking.alertsTitle', 'Real-Time System Alerts')}</h3>
            <p className="text-xs text-secondary mt-0.5">{t('adminSystemTracking.alertsSubtitle', 'Cảnh báo tự động khi chỉ số tải, thời gian phản hồi hoặc tỷ lệ lỗi vượt ngưỡng')}</p>
          </div>
          <button
            onClick={toggleAllAlertExpand}
            className="tracking-btn text-xs self-start sm:self-auto"
            title={t('adminSystemTracking.toggleExpandAll', 'Mở rộng / Thu gọn toàn bộ')}
          >
            {expandedAlertIds.size === paginatedAlerts.length && paginatedAlerts.length > 0 ? (
              <>
                <ChevronUp size={13} />
                <span>{t('adminSystemTracking.collapseAll', 'Thu gọn tất cả')}</span>
              </>
            ) : (
              <>
                <ChevronDown size={13} />
                <span>{t('adminSystemTracking.expandAll', 'Mở rộng tất cả')}</span>
              </>
            )}
          </button>
        </div>

        {/* Quick Filters */}
        <div className="p-4 sm:p-5 border-b border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search size={15} className="tracking-search-icon" />
              <input
                type="text"
                placeholder={t('adminSystemTracking.searchAlertsPlaceholder', 'Tìm kiếm cảnh báo (title, metric, service)...')}
                value={alertSearchQuery}
                onChange={e => {
                  setAlertSearchQuery(e.target.value);
                  setAlertLogPage(1);
                }}
                className="tracking-input tracking-search-input"
              />
            </div>

            <div>
              <select
                value={alertSeverityFilter}
                onChange={e => {
                  setAlertSeverityFilter(e.target.value as LogLevel | 'all');
                  setAlertLogPage(1);
                }}
                className="tracking-input cursor-pointer"
              >
                <option value="all">{t('adminSystemTracking.allLevels', 'Tất cả mức độ')}</option>
                <option value="critical">{t('adminSystemTracking.logLevelCritical', 'Critical')}</option>
                <option value="error">{t('adminSystemTracking.logLevelError', 'Error')}</option>
                <option value="warning">{t('adminSystemTracking.logLevelWarning', 'Warning')}</option>
                <option value="info">{t('adminSystemTracking.logLevelInfo', 'Info')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Toolbar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 bg-surface-muted border-b border-border text-xs">
          <span className="text-secondary font-semibold">
            {t('adminSystemTracking.found', 'Tìm thấy')} <strong className="text-primary">{filteredAlerts.length}</strong> {t('adminSystemTracking.alertsCount', 'cảnh báo')}
          </span>
          <AdminTablePageSize
            pageSize={alertsPerPage}
            totalEntries={filteredAlerts.length}
            disabled={isLoadingTracking}
            onPageSizeChange={value => { setAlertsPerPage(value); setAlertLogPage(1); }}
          />
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-surface-muted">
              <tr>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider w-16">#</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider">{t('adminSystemTracking.thSeverity', 'Severity & Scope')}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider">{t('adminSystemTracking.thAlertTitle', 'Tiêu đề cảnh báo & Chỉ số')}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider">{t('adminSystemTracking.thThreshold', 'Thực tế / Ngưỡng')}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider">
                  <button
                    onClick={() => setAlertSortOrder(alertSortOrder === 'desc' ? 'asc' : 'desc')}
                    className="inline-flex items-center gap-1 hover:text-brand transition-colors font-bold"
                  >
                    {t('adminSystemTracking.thTime', 'Thời gian')}
                    {alertSortOrder === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                  </button>
                </th>
                <th className="text-right px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider w-28">{t('adminSystemTracking.thDetails', 'Chi tiết')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedAlerts.map((alert, index) => {
                const isExpanded = expandedAlertIds.has(alert.id);
                return (
                  <Fragment key={alert.id}>
                    <tr
                      onClick={() => toggleAlertExpand(alert.id)}
                      className={`hover:bg-surface-muted/60 transition-colors cursor-pointer group ${isExpanded ? 'bg-amber-500/5 dark:bg-amber-500/10' : ''}`}
                    >
                      <td className="px-4 py-3.5">
                        <span className="tracking-index-badge">
                          #{((alertLogPage - 1) * alertsPerPage) + index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`log-level-badge level-${alert.severity}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-surface-muted text-primary border border-border">
                            {alert.service}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="max-w-md">
                          <div className="font-bold text-primary text-xs truncate" title={alert.title}>
                            {alert.title}
                          </div>
                          <div className="text-[11px] text-muted font-mono mt-0.5">
                            {alert.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-red-500/10 text-red-600 border border-red-500/20">
                            {alert.value}
                          </span>
                          <span className="text-xs text-muted font-mono">/</span>
                          <span className="px-2 py-0.5 rounded text-xs font-mono text-muted bg-surface-muted border border-border">
                            {alert.threshold}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-secondary font-mono whitespace-nowrap">
                        {formatTimestamp(alert.timestamp)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAlertExpand(alert.id);
                          }}
                          className={`activity-expand-btn ${isExpanded ? 'is-expanded' : ''}`}
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          <span>{isExpanded ? t('adminSystemTracking.collapseDetails', 'Thu gọn') : t('adminSystemTracking.expandDetails', 'Chi tiết')}</span>
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-surface-muted/40 border-b border-border">
                        <td colSpan={6} className="p-4 sm:p-5">
                          <div className="activity-expanded-drawer space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="p-3 bg-surface rounded-lg border border-border">
                                <span className="text-[11px] text-muted uppercase font-bold block">{t('adminSystemTracking.metricLabel', 'Chỉ số')}</span>
                                <span className="text-xs font-mono font-bold text-primary mt-1 block">{alert.metric}</span>
                              </div>
                              <div className="p-3 bg-surface rounded-lg border border-border">
                                <span className="text-[11px] text-muted uppercase font-bold block">{t('adminSystemTracking.currentValue', 'Giá trị thực tế')}</span>
                                <span className="text-sm font-mono font-black text-red-600 mt-1 block">{alert.value}</span>
                              </div>
                              <div className="p-3 bg-surface rounded-lg border border-border">
                                <span className="text-[11px] text-muted uppercase font-bold block">{t('adminSystemTracking.threshold', 'Ngưỡng cho phép')}</span>
                                <span className="text-xs font-mono font-bold text-secondary mt-1 block">{alert.threshold}</span>
                              </div>
                            </div>
                            <div className="p-3 bg-surface-muted rounded-lg border border-border text-xs text-secondary leading-relaxed">
                              {alert.description}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Stack (< 768px) */}
        <div className="md:hidden divide-y divide-border">
          {paginatedAlerts.map((alert, index) => {
            const isExpanded = expandedAlertIds.has(alert.id);
            return (
              <div key={alert.id} className="p-4 space-y-2 hover:bg-surface-muted/50 transition-colors">
                <div
                  onClick={() => toggleAlertExpand(alert.id)}
                  className="flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="tracking-index-badge">
                      #{((alertLogPage - 1) * alertsPerPage) + index + 1}
                    </span>
                    <span className={`log-level-badge level-${alert.severity}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-surface-muted text-primary border border-border">
                      {alert.service}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAlertExpand(alert.id);
                    }}
                    className={`activity-expand-btn ${isExpanded ? 'is-expanded' : ''}`}
                  >
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                <div className="text-xs font-bold text-primary">
                  {alert.title}
                </div>
                <div className="text-[11px] text-muted font-mono">
                  {alert.description}
                </div>

                <div className="flex items-center justify-between text-xs text-secondary pt-1">
                  <div className="flex items-center gap-1.5 font-mono text-xs">
                    <span className="font-bold text-red-600">{alert.value}</span>
                    <span>/</span>
                    <span className="text-muted">{alert.threshold}</span>
                  </div>
                  <span className="font-mono text-[11px]">{formatTimestamp(alert.timestamp)}</span>
                </div>

                {isExpanded && (
                  <div className="pt-2">
                    <div className="activity-expanded-drawer p-3 bg-surface-muted rounded-lg border border-border space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="text-xs font-mono text-secondary">
                        <strong>Metric:</strong> {alert.metric}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredAlerts.length === 0 && (
          <div className="text-center py-12 px-4">
            <AlertTriangle size={40} className="mx-auto mb-3 text-muted" />
            <p className="text-primary font-semibold mb-1">{t('adminSystemTracking.noAlertsFound', 'Không có cảnh báo hoạt động')}</p>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              {t('adminSystemTracking.noAlertsHelp', 'Tất cả các dịch vụ đang phản hồi dưới ngưỡng cho phép')}
            </p>
          </div>
        )}

        {/* Pagination */}
        {filteredAlerts.length > 0 && (
          <div className="px-4 sm:px-5 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-muted">
            <p className="text-xs text-secondary">
              {t('adminSystemTracking.showingRange', 'Hiển thị')} <span className="text-primary font-bold">{((alertLogPage - 1) * alertsPerPage) + 1}</span> {t('adminSystemTracking.to', 'đến')} <span className="text-primary font-bold">{Math.min(alertLogPage * alertsPerPage, filteredAlerts.length)}</span> {t('adminSystemTracking.inTotal', 'trong tổng')} <span className="text-primary font-bold">{filteredAlerts.length}</span> {t('adminSystemTracking.alertsCount', 'cảnh báo')}
            </p>
            {totalAlertLogPages > 1 && (
              <AdminTablePagination
                currentPage={alertLogPage}
                totalPages={totalAlertLogPages}
                disabled={isLoadingTracking}
                onPageChange={setAlertLogPage}
                ariaLabel={t('adminSystemTracking.alertLogPagination', 'Phân trang cảnh báo hệ thống')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
