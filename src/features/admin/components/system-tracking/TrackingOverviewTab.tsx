import {
  Activity,
  ArrowDown,
  ArrowUp,
  SlidersHorizontal,
  Zap,
  Copy,
  Check,
} from 'lucide-react';
import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { AdminTablePageSize, AdminTablePagination } from '../AdminTableControls';
import { useTranslation } from '../../../../hooks/useTranslation';
import {
  type ApiLog,
  getStatusClass,
  getDurationClass,
  formatTimestamp,
} from '../../utils/systemTrackingUtils';

export interface TrackingOverviewTabProps {
  apiLogs: ApiLog[];
  filteredApiLogs: ApiLog[];
  paginatedApiLogs: ApiLog[];
  apiLogFilters: {
    startDate: string;
    endDate: string;
    username: string;
    url: string;
    minDuration: string;
    maxDuration: string;
    method: string;
    status: string;
  };
  setApiLogFilters: React.Dispatch<React.SetStateAction<TrackingOverviewTabProps['apiLogFilters']>>;
  apiLogSortOrder: 'asc' | 'desc';
  setApiLogSortOrder: (order: 'asc' | 'desc') => void;
  apiLogPage: number;
  setApiLogPage: (page: number) => void;
  apiLogsPerPage: number;
  setApiLogsPerPage: (size: number) => void;
  totalApiLogPages: number;
  showAdvancedFilters: boolean;
  setShowAdvancedFilters: React.Dispatch<React.SetStateAction<boolean>>;
  isLoadingTracking: boolean;
  handleCopy: (text: string, id: string) => void;
  copiedId: string | null;
}

export function TrackingOverviewTab({
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
  isLoadingTracking,
  handleCopy,
  copiedId,
}: TrackingOverviewTabProps) {
  const { t } = useTranslation(['admin', 'common']);

  return (
    <div className="space-y-6">
      {/* API Logs Table Panel */}
      <div className="tracking-panel">
        <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-primary">{t('adminSystemTracking.apiLogsTitle', 'Live API Request Logs')}</h3>
            <p className="text-xs text-secondary mt-0.5">{t('adminSystemTracking.apiLogsSubtitle', 'Chi tiết các cuộc gọi API thực tế qua Gateway trong phiên làm việc')}</p>
          </div>
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`tracking-btn ${showAdvancedFilters ? 'active' : ''}`}
          >
            <SlidersHorizontal size={14} />
            <span>{t('adminSystemTracking.advancedFilters', 'Bộ lọc')}</span>
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 sm:p-5 border-b border-border space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder={t('adminSystemTracking.filterUsernamePlaceholder', 'Lọc theo Username...')}
              value={apiLogFilters.username}
              onChange={e => {
                setApiLogFilters(prev => ({ ...prev, username: e.target.value }));
                setApiLogPage(1);
              }}
              className="tracking-input"
            />
            <input
              type="text"
              placeholder={t('adminSystemTracking.filterUrlPlaceholder', 'Lọc theo URL / Endpoint...')}
              value={apiLogFilters.url}
              onChange={e => {
                setApiLogFilters(prev => ({ ...prev, url: e.target.value }));
                setApiLogPage(1);
              }}
              className="tracking-input"
            />
            <select
              value={apiLogFilters.method}
              onChange={e => {
                setApiLogFilters(prev => ({ ...prev, method: e.target.value }));
                setApiLogPage(1);
              }}
              className="tracking-input cursor-pointer"
            >
              <option value="">{t('adminSystemTracking.allMethods', 'Tất cả Methods')}</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="OPTIONS">OPTIONS</option>
            </select>
          </div>

          {/* Advanced Filters Drawer */}
          {showAdvancedFilters && (
            <div className="pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in duration-200">
              <input
                type="datetime-local"
                value={apiLogFilters.startDate}
                onChange={e => {
                  setApiLogFilters(prev => ({ ...prev, startDate: e.target.value }));
                  setApiLogPage(1);
                }}
                className="tracking-input text-xs"
                title={t('adminSystemTracking.startDate', 'Từ ngày')}
              />
              <input
                type="datetime-local"
                value={apiLogFilters.endDate}
                onChange={e => {
                  setApiLogFilters(prev => ({ ...prev, endDate: e.target.value }));
                  setApiLogPage(1);
                }}
                className="tracking-input text-xs"
                title={t('adminSystemTracking.endDate', 'Đến ngày')}
              />
              <input
                type="text"
                placeholder={t('adminSystemTracking.filterStatusPlaceholder', 'Lọc status (vd: 2, 4, 5)...')}
                value={apiLogFilters.status}
                onChange={e => {
                  setApiLogFilters(prev => ({ ...prev, status: e.target.value }));
                  setApiLogPage(1);
                }}
                className="tracking-input"
              />
            </div>
          )}
        </div>

        {/* Table Toolbar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 bg-surface-muted border-b border-border text-xs">
          <span className="text-secondary font-semibold">
            {t('adminSystemTracking.found', 'Tìm thấy')} <strong className="text-primary">{filteredApiLogs.length}</strong> {t('adminSystemTracking.requests', 'yêu cầu')}
          </span>
          <AdminTablePageSize
            pageSize={apiLogsPerPage}
            totalEntries={filteredApiLogs.length}
            disabled={isLoadingTracking}
            onPageSizeChange={value => { setApiLogsPerPage(value); setApiLogPage(1); }}
          />
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full table-fixed">
            <thead className="border-b border-border bg-surface-muted">
              <tr>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider w-12">#</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider w-[30%]">{t('adminSystemTracking.thMethodUrl', 'Method / Endpoint')}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider w-24">{t('adminSystemTracking.thStatus', 'Status')}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider w-40">{t('adminSystemTracking.thUser', 'User')}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider w-36">
                  <button
                    onClick={() => setApiLogSortOrder(apiLogSortOrder === 'desc' ? 'asc' : 'desc')}
                    className="inline-flex items-center gap-1 hover:text-brand transition-colors font-bold"
                  >
                    {t('adminSystemTracking.thTime', 'Thời gian')}
                    {apiLogSortOrder === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                  </button>
                </th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider w-24">{t('adminSystemTracking.thLatency', 'Độ trễ')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedApiLogs.map((log, index) => (
                <tr key={log.id} className="hover:bg-surface-muted/60 transition-colors">
                  <td className="px-4 py-3.5">
                    <span className="tracking-index-badge">
                      #{((apiLogPage - 1) * apiLogsPerPage) + index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 overflow-hidden">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`method-pill method-${log.method} flex-shrink-0`}>
                        {log.method}
                      </span>
                      <div className="tracking-url-box group/url min-w-0">
                        <span className="truncate font-bold font-mono" title={log.url}>
                          {log.url}
                        </span>
                        <button
                          onClick={() => handleCopy(log.url, log.id)}
                          className="p-1 hover:bg-surface rounded text-muted hover:text-primary transition-all flex-shrink-0"
                          title={t('adminSystemTracking.copyUrl', 'Sao chép URL')}
                        >
                          {copiedId === log.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`status-pill ${getStatusClass(log.status)}`}>
                      <span className="status-dot"></span>
                      <span>{log.status}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5 overflow-hidden">
                    <div className="tracking-user-chip min-w-0">
                      <UserAvatar
                        name={log.user || 'Guest'}
                        size="sm"
                        className="!w-7 !h-7 !text-[11px] flex-shrink-0"
                      />
                      <span className="text-xs text-primary font-bold truncate" title={log.user || 'Guest'}>{log.user || 'Guest'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-secondary font-mono whitespace-nowrap">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`latency-pill ${getDurationClass(log.duration)}`}>
                      <Zap size={11} className="opacity-80" />
                      <span>{log.duration}ms</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Stack (< 768px) */}
        <div className="md:hidden divide-y divide-border">
          {paginatedApiLogs.map((log, index) => (
            <div key={log.id} className="p-4 space-y-2 hover:bg-surface-muted transition-colors">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="tracking-index-badge">
                    #{((apiLogPage - 1) * apiLogsPerPage) + index + 1}
                  </span>
                  <span className={`method-pill method-${log.method}`}>
                    {log.method}
                  </span>
                </div>
                <span className={`status-pill ${getStatusClass(log.status)}`}>
                  <span className="status-dot"></span>
                  <span>{log.status}</span>
                </span>
              </div>

              <div className="tracking-url-box group/url">
                <span className="truncate font-mono font-bold text-xs" title={log.url}>
                  {log.url}
                </span>
                <button
                  onClick={() => handleCopy(log.url, log.id)}
                  className="p-1 hover:bg-surface rounded text-muted hover:text-primary transition-all flex-shrink-0"
                >
                  {copiedId === log.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-secondary pt-1">
                <div className="tracking-user-chip">
                  <UserAvatar
                    name={log.user || 'Guest'}
                    size="sm"
                    className="!w-5 !h-5 !text-[9px] flex-shrink-0"
                  />
                  <span>{log.user || 'Guest'}</span>
                </div>
                <span className={`latency-pill ${getDurationClass(log.duration)}`}>
                  <span>{log.duration}ms</span>
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredApiLogs.length === 0 && (
          <div className="text-center py-12 px-4">
            <Activity size={40} className="mx-auto mb-3 text-muted" />
            <p className="text-primary font-semibold mb-1">{t('adminSystemTracking.noLogsFound', 'Không tìm thấy API log phù hợp')}</p>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              {t('adminSystemTracking.noLogsHelp', 'Thử điều chỉnh lại bộ lọc hoặc khoảng thời gian tìm kiếm')}
            </p>
          </div>
        )}

        {/* Pagination */}
        {filteredApiLogs.length > 0 && (
          <div className="px-4 sm:px-5 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-muted">
            <p className="text-xs text-secondary">
              {t('adminSystemTracking.showingRange', 'Hiển thị')} <span className="text-primary font-bold">{((apiLogPage - 1) * apiLogsPerPage) + 1}</span> {t('adminSystemTracking.to', 'đến')} <span className="text-primary font-bold">{Math.min(apiLogPage * apiLogsPerPage, filteredApiLogs.length)}</span> {t('adminSystemTracking.inTotal', 'trong tổng')} <span className="text-primary font-bold">{filteredApiLogs.length}</span> {t('adminSystemTracking.requests', 'yêu cầu')}
            </p>
            {totalApiLogPages > 1 && (
              <AdminTablePagination
                currentPage={apiLogPage}
                totalPages={totalApiLogPages}
                disabled={isLoadingTracking}
                onPageChange={setApiLogPage}
                ariaLabel={t('adminSystemTracking.apiLogPagination', 'Phân trang API Logs')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
