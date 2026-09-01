import { Fragment } from 'react';
import {
  AlertTriangle,
  Search,
  ArrowDown,
  ArrowUp,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
  Copy,
  Check,
  Code2,
} from 'lucide-react';
import { AdminTablePageSize, AdminTablePagination } from '../AdminTableControls';
import { useTranslation } from '../../../../hooks/useTranslation';
import {
  type ErrorLogEntry,
  type LogLevel,
  formatTimestamp,
} from '../../utils/systemTrackingUtils';
import type { SystemTrackingSnapshot } from '../../../../types/systemTracking';

export interface TrackingErrorsTabProps {
  errorMonitoring: SystemTrackingSnapshot['errorMonitoring'] | null;
  errorLogs: ErrorLogEntry[];
  filteredErrorLogs: ErrorLogEntry[];
  paginatedErrorLogs: ErrorLogEntry[];
  errorSearchQuery: string;
  setErrorSearchQuery: (query: string) => void;
  errorLevelFilter: LogLevel | 'all';
  setErrorLevelFilter: (level: LogLevel | 'all') => void;
  errorSortOrder: 'asc' | 'desc';
  setErrorSortOrder: (order: 'asc' | 'desc') => void;
  errorLogPage: number;
  setErrorLogPage: (page: number) => void;
  errorLogsPerPage: number;
  setErrorLogsPerPage: (size: number) => void;
  totalErrorLogPages: number;
  expandedErrorIds: Set<string>;
  toggleErrorExpand: (id: string) => void;
  toggleAllErrorExpand: () => void;
  isLoadingTracking: boolean;
  handleCopy: (text: string, id: string) => void;
  copiedId: string | null;
}

export function TrackingErrorsTab({
  errorMonitoring,
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
  isLoadingTracking,
  handleCopy,
  copiedId,
}: TrackingErrorsTabProps) {
  const { t } = useTranslation(['admin', 'common']);

  return (
    <div className="space-y-6">
      {/* Error Logs Table Panel */}
      <div className="tracking-panel">
        {/* Table Header with Integrated Sentry Status & Action */}
        <div className="p-4 sm:p-5 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="stat-card-icon bg-red-600 text-white shadow-sm flex-shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-black text-primary">
                  {t('adminSystemTracking.errorStreamTitle', 'Runtime Error Logs & Issues')}
                </h3>
                {errorMonitoring && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-extrabold text-white shadow-sm ${
                      errorMonitoring.available ? 'bg-emerald-600' : 'bg-amber-600'
                    }`}
                  >
                    {errorMonitoring.available ? <CheckCircle size={12} className="text-white" /> : <XCircle size={12} className="text-white" />}
                    <span>{errorMonitoring.provider} ({errorMonitoring.available ? (t('adminSystemTracking.connected', 'Connected') || 'Connected') : (t('adminSystemTracking.degraded', 'Degraded') || 'Degraded')})</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-secondary mt-0.5">
                {errorMonitoring?.message || t('adminSystemTracking.errorStreamSubtitle', 'Danh sách các ngoại lệ, lỗi API 4xx/5xx và lỗi runtime thu thập từ Sentry telemetry')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
            {errorMonitoring && (
              <a
                href="https://sentry.io"
                target="_blank"
                rel="noopener noreferrer"
                className="tracking-btn text-xs font-bold inline-flex items-center gap-1.5"
                title="Mở bảng điều khiển sự cố trên Sentry"
              >
                <span>{t('adminSystemTracking.openInSentry', 'Mở trên Sentry')}</span>
                <ExternalLink size={13} />
              </a>
            )}

            <button
              onClick={toggleAllErrorExpand}
              className="tracking-btn text-xs font-bold"
              title={t('adminSystemTracking.toggleExpandAll', 'Mở rộng / Thu gọn toàn bộ')}
            >
              {expandedErrorIds.size === paginatedErrorLogs.length && paginatedErrorLogs.length > 0 ? (
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
        </div>

        {/* Quick Filters */}
        <div className="p-4 sm:p-5 border-b border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative sm:col-span-2">
              <Search size={15} className="tracking-search-icon" />
              <input
                type="text"
                placeholder={t('adminSystemTracking.searchErrorsPlaceholder', 'Tìm kiếm lỗi (message, service, platform, requestId)...')}
                value={errorSearchQuery}
                onChange={e => {
                  setErrorSearchQuery(e.target.value);
                  setErrorLogPage(1);
                }}
                className="tracking-input tracking-search-input"
              />
            </div>

            <div>
              <select
                value={errorLevelFilter}
                onChange={e => {
                  setErrorLevelFilter(e.target.value as LogLevel | 'all');
                  setErrorLogPage(1);
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
            {t('adminSystemTracking.found', 'Tìm thấy')} <strong className="text-primary">{filteredErrorLogs.length}</strong> {t('adminSystemTracking.errors', 'lỗi runtime')}
          </span>
          <AdminTablePageSize
            pageSize={errorLogsPerPage}
            totalEntries={filteredErrorLogs.length}
            disabled={isLoadingTracking}
            onPageSizeChange={value => { setErrorLogsPerPage(value); setErrorLogPage(1); }}
          />
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-surface-muted">
              <tr>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider w-16">#</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider">{t('adminSystemTracking.thLevel', 'Level')}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider">{t('adminSystemTracking.thService', 'Service / Scope')}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider">{t('adminSystemTracking.thErrorDetails', 'Thông điệp lỗi')}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider">{t('adminSystemTracking.thOccurrences', 'Số lần')}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider">
                  <button
                    onClick={() => setErrorSortOrder(errorSortOrder === 'desc' ? 'asc' : 'desc')}
                    className="inline-flex items-center gap-1 hover:text-brand transition-colors font-bold"
                  >
                    {t('adminSystemTracking.thTime', 'Thời gian')}
                    {errorSortOrder === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                  </button>
                </th>
                <th className="text-right px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider w-28">{t('adminSystemTracking.thDetails', 'Chi tiết')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedErrorLogs.map((log, index) => {
                const isExpanded = expandedErrorIds.has(log.id);
                return (
                  <Fragment key={log.id}>
                    <tr
                      onClick={() => toggleErrorExpand(log.id)}
                      className={`hover:bg-surface-muted/60 transition-colors cursor-pointer group ${isExpanded ? 'bg-red-500/5 dark:bg-red-500/10' : ''}`}
                    >
                      <td className="px-4 py-3.5">
                        <span className="tracking-index-badge">
                          #{((errorLogPage - 1) * errorLogsPerPage) + index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`log-level-badge level-${log.level}`}>
                          {log.level.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-surface-muted text-primary border border-border">
                          {log.service}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="tracking-url-box max-w-md">
                          <span className="font-bold text-primary truncate block font-mono text-xs" title={log.message}>
                            {log.message}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold text-white bg-red-600 shadow-sm">
                          {log.count || 1} {t('adminSystemTracking.occurrences', 'lần')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-secondary font-mono whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleErrorExpand(log.id);
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
                        <td colSpan={7} className="p-4 sm:p-5">
                          <div className="activity-expanded-drawer space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-3">
                                <span className="text-secondary"><strong>Platform:</strong> <code className="font-mono text-primary">{log.platform || 'Backend .NET / Node'}</code></span>
                                <span>•</span>
                                <span className="text-secondary"><strong>First seen:</strong> <span className="font-mono">{log.firstObservedAt ? formatTimestamp(log.firstObservedAt) : formatTimestamp(log.timestamp)}</span></span>
                              </div>
                              {log.externalUrl && (
                                <a
                                  href={log.externalUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-brand hover:underline font-bold"
                                >
                                  <span>{t('adminSystemTracking.openInSentry', 'Mở trên Sentry')}</span>
                                  <ExternalLink size={12} />
                                </a>
                              )}
                            </div>

                            {/* Stack Trace / Error Payload */}
                            <div className="activity-json-box">
                              <div className="activity-json-bar">
                                <div className="flex items-center gap-1.5">
                                  <Code2 size={12} className="text-red-400" />
                                  <span>{t('adminSystemTracking.viewStackTrace', 'Stack Trace & Error Payload')}</span>
                                </div>
                                <button
                                  onClick={() => handleCopy(log.stackTrace || log.message, `err_${log.id}`)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-white transition-all font-semibold"
                                >
                                  {copiedId === `err_${log.id}` ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                                  <span>{copiedId === `err_${log.id}` ? t('adminSystemTracking.copied', 'Đã chép') : t('adminSystemTracking.copyText', 'Sao chép')}</span>
                                </button>
                              </div>
                              <pre className="activity-json-code text-red-300">
                                {log.stackTrace || log.message}
                              </pre>
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
          {paginatedErrorLogs.map((log, index) => {
            const isExpanded = expandedErrorIds.has(log.id);
            return (
              <div key={log.id} className="p-4 space-y-2 hover:bg-surface-muted/50 transition-colors">
                <div
                  onClick={() => toggleErrorExpand(log.id)}
                  className="flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="tracking-index-badge">
                      #{((errorLogPage - 1) * errorLogsPerPage) + index + 1}
                    </span>
                    <span className={`log-level-badge level-${log.level}`}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-surface-muted text-primary border border-border">
                      {log.service}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleErrorExpand(log.id);
                    }}
                    className={`activity-expand-btn ${isExpanded ? 'is-expanded' : ''}`}
                  >
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                <div className="text-xs font-mono font-bold text-primary p-2 bg-surface-muted rounded-lg border border-border">
                  {log.message}
                </div>

                <div className="flex items-center justify-between text-xs text-secondary">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white bg-red-600 shadow-sm">
                    {log.count || 1} {t('adminSystemTracking.occurrences', 'lần')}
                  </span>
                  <span className="font-mono text-[11px]">{formatTimestamp(log.timestamp)}</span>
                </div>

                {isExpanded && (
                  <div className="pt-2">
                    <div className="activity-expanded-drawer space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                      <pre className="activity-json-code text-red-300 text-[11px] p-2.5">
                        {log.stackTrace || log.message}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredErrorLogs.length === 0 && (
          <div className="text-center py-12 px-4">
            <AlertTriangle size={40} className="mx-auto mb-3 text-muted" />
            <p className="text-primary font-semibold mb-1">{t('adminSystemTracking.systemHealthy', 'Hệ thống hoạt động ổn định')}</p>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              {t('adminSystemTracking.noErrorsHelp', 'Không phát hiện lỗi runtime hoặc sự cố bất thường nào trong phiên theo dõi')}
            </p>
          </div>
        )}

        {/* Pagination */}
        {filteredErrorLogs.length > 0 && (
          <div className="px-4 sm:px-5 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-muted">
            <p className="text-xs text-secondary">
              {t('adminSystemTracking.showingRange', 'Hiển thị')} <span className="text-primary font-bold">{((errorLogPage - 1) * errorLogsPerPage) + 1}</span> {t('adminSystemTracking.to', 'đến')} <span className="text-primary font-bold">{Math.min(errorLogPage * errorLogsPerPage, filteredErrorLogs.length)}</span> {t('adminSystemTracking.inTotal', 'trong tổng')} <span className="text-primary font-bold">{filteredErrorLogs.length}</span> {t('adminSystemTracking.errors', 'lỗi')}
            </p>
            {totalErrorLogPages > 1 && (
              <AdminTablePagination
                currentPage={errorLogPage}
                totalPages={totalErrorLogPages}
                disabled={isLoadingTracking}
                onPageChange={setErrorLogPage}
                ariaLabel={t('adminSystemTracking.errorLogPagination', 'Phân trang lỗi runtime')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
