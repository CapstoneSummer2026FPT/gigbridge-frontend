import { Fragment } from 'react';
import {
  FileText,
  Search,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Eye,
  Code2,
} from 'lucide-react';
import { UserAvatar } from '../../../../shared/components/UserAvatar';
import { AdminTablePageSize, AdminTablePagination } from '../AdminTableControls';
import { useTranslation } from '../../../../hooks/useTranslation';
import type { AdminUserDto } from '../../../../types/models/User';
import {
  type AuditLog,
  getActionTheme,
  formatActionTitle,
  formatResourceText,
  formatTimestamp,
} from '../../utils/systemTrackingUtils';
import { AuditActivityDetailView } from './AuditActivityDetailView';

export interface TrackingAuditTabProps {
  auditLogs: AuditLog[];
  filteredAuditLogs: AuditLog[];
  paginatedAuditLogs: AuditLog[];
  auditSearchQuery: string;
  setAuditSearchQuery: (query: string) => void;
  auditCategoryFilter: string;
  setAuditCategoryFilter: (cat: string) => void;
  auditSortOrder: 'asc' | 'desc';
  setAuditSortOrder: (order: 'asc' | 'desc') => void;
  auditLogPage: number;
  setAuditLogPage: (page: number) => void;
  auditLogsPerPage: number;
  setAuditLogsPerPage: (size: number) => void;
  totalAuditLogPages: number;
  expandedAuditIds: Set<string>;
  toggleAuditExpand: (id: string) => void;
  toggleAllAuditExpand: () => void;
  globalAuditViewMode: 'visual' | 'json';
  setGlobalAuditViewMode: (mode: 'visual' | 'json') => void;
  isLoadingTracking: boolean;
  handleCopy: (text: string, id: string) => void;
  copiedId: string | null;
  userMap?: Map<string, AdminUserDto>;
}

export function TrackingAuditTab({
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
  isLoadingTracking,
  handleCopy,
  copiedId,
  userMap,
}: TrackingAuditTabProps) {
  const { t } = useTranslation(['admin', 'common']);

  return (
    <div className="space-y-6">
      <div className="tracking-panel">
        <div className="p-4 sm:p-5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-primary">{t('adminSystemTracking.auditTitle', 'System Activity Trail')}</h3>
            <p className="text-xs text-secondary mt-0.5">{t('adminSystemTracking.auditSubtitle', 'Ghi nhận chi tiết mọi hoạt động quản trị, cập nhật người dùng, duyệt công việc và phán quyết tranh chấp')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View switcher: Visual vs JSON */}
            <div className="activity-view-switcher">
              <button
                onClick={() => setGlobalAuditViewMode('visual')}
                className={globalAuditViewMode === 'visual' ? 'active' : ''}
                title={t('adminSystemTracking.viewVisual', 'Xem giao diện trực quan')}
              >
                <Eye size={13} />
                <span>{t('adminSystemTracking.visual', 'Trực quan')}</span>
              </button>
              <button
                onClick={() => setGlobalAuditViewMode('json')}
                className={globalAuditViewMode === 'json' ? 'active' : ''}
                title={t('adminSystemTracking.viewJson', 'Xem mã JSON')}
              >
                <Code2 size={13} />
                <span>JSON</span>
              </button>
            </div>

            <button
              onClick={toggleAllAuditExpand}
              className="tracking-btn text-xs"
              title={t('adminSystemTracking.toggleExpandAll', 'Mở rộng / Thu gọn toàn bộ')}
            >
              {expandedAuditIds.size === paginatedAuditLogs.length && paginatedAuditLogs.length > 0 ? (
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
                placeholder={t('adminSystemTracking.searchActivityPlaceholder', 'Tìm kiếm nhật ký (action, admin, correlation, resource)...')}
                value={auditSearchQuery}
                onChange={e => {
                  setAuditSearchQuery(e.target.value);
                  setAuditLogPage(1);
                }}
                className="tracking-input tracking-search-input"
              />
            </div>

            <div>
              <select
                value={auditCategoryFilter}
                onChange={e => {
                  setAuditCategoryFilter(e.target.value);
                  setAuditLogPage(1);
                }}
                className="tracking-input cursor-pointer"
              >
                <option value="all">{t('adminSystemTracking.allCategories', 'Tất cả danh mục')}</option>
                <option value="dispute">{t('adminSystemTracking.categoryDispute', 'Tranh chấp & Báo cáo')}</option>
                <option value="user">{t('adminSystemTracking.categoryUser', 'Người dùng')}</option>
                <option value="job">{t('adminSystemTracking.categoryJob', 'Việc làm')}</option>
                <option value="contract">{t('adminSystemTracking.categoryContract', 'Hợp đồng')}</option>
                <option value="financial">{t('adminSystemTracking.categoryFinancial', 'Tài chính & Ví')}</option>
                <option value="system">{t('adminSystemTracking.categorySystem', 'Hệ thống')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table Toolbar */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 bg-surface-muted border-b border-border text-xs">
          <span className="text-secondary font-semibold">
            {t('adminSystemTracking.found', 'Tìm thấy')} <strong className="text-primary">{filteredAuditLogs.length}</strong> {t('adminSystemTracking.activities', 'hoạt động')}
          </span>
          <AdminTablePageSize
            pageSize={auditLogsPerPage}
            totalEntries={filteredAuditLogs.length}
            disabled={isLoadingTracking}
            onPageSizeChange={value => { setAuditLogsPerPage(value); setAuditLogPage(1); }}
          />
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-surface-muted">
              <tr>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider w-16">#</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider">{t('adminSystemTracking.thAction', 'Hành động / Danh mục')}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider">{t('adminSystemTracking.thResource', 'Tài nguyên / Đối tượng')}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider">{t('adminSystemTracking.thPerformer', 'Người thực hiện')}</th>
                <th className="text-left px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider">
                  <button
                    onClick={() => setAuditSortOrder(auditSortOrder === 'desc' ? 'asc' : 'desc')}
                    className="inline-flex items-center gap-1 hover:text-brand transition-colors font-bold"
                  >
                    {t('adminSystemTracking.thTime', 'Thời gian')}
                    {auditSortOrder === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
                  </button>
                </th>
                <th className="text-right px-4 py-3.5 text-[11px] font-bold text-secondary uppercase tracking-wider w-28">{t('adminSystemTracking.thDetails', 'Chi tiết')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedAuditLogs.map((log, index) => {
                const theme = getActionTheme(log.action);
                const isExpanded = expandedAuditIds.has(log.id);
                return (
                  <Fragment key={log.id}>
                    <tr
                      onClick={() => toggleAuditExpand(log.id)}
                      className={`hover:bg-surface-muted/60 transition-colors cursor-pointer group ${isExpanded ? 'bg-brand/5 dark:bg-brand/10' : ''}`}
                    >
                      <td className="px-4 py-3.5">
                        <span className="tracking-index-badge">
                          #{((auditLogPage - 1) * auditLogsPerPage) + index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`activity-category-badge ${theme.category}`}>
                          {theme.icon}
                          <span>{formatActionTitle(log.action, t)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="tracking-url-box">
                          <code className="text-xs font-mono font-bold text-primary truncate max-w-xs block" title={formatResourceText(log, t)}>
                            {formatResourceText(log, t)}
                          </code>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="tracking-user-chip">
                          <UserAvatar
                            name={log.userName || 'Admin'}
                            size="sm"
                            className="!w-7 !h-7 !text-[11px] flex-shrink-0"
                          />
                          <span className="text-xs font-bold text-primary">{log.userName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-secondary font-mono whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleAuditExpand(log.id);
                          }}
                          className={`activity-expand-btn ${isExpanded ? 'is-expanded' : ''}`}
                          title={isExpanded ? t('adminSystemTracking.collapseDetails', 'Thu gọn') : t('adminSystemTracking.expandDetails', 'Mở rộng')}
                        >
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                          <span>{isExpanded ? t('adminSystemTracking.collapseDetails', 'Thu gọn') : t('adminSystemTracking.expandDetails', 'Chi tiết')}</span>
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-surface-muted/40 border-b border-border">
                        <td colSpan={6} className="p-4 sm:p-5">
                          <div className="activity-expanded-drawer animate-in fade-in slide-in-from-top-1 duration-150">
                            <AuditActivityDetailView
                              log={log}
                              globalViewMode={globalAuditViewMode}
                              onCopy={handleCopy}
                              copiedId={copiedId}
                              userMap={userMap}
                            />
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
          {paginatedAuditLogs.map((log, index) => {
            const theme = getActionTheme(log.action);
            const isExpanded = expandedAuditIds.has(log.id);
            return (
              <div key={log.id} className="p-4 space-y-2 hover:bg-surface-muted/50 transition-colors">
                <div
                  onClick={() => toggleAuditExpand(log.id)}
                  className="flex items-center justify-between gap-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="tracking-index-badge">
                      #{((auditLogPage - 1) * auditLogsPerPage) + index + 1}
                    </span>
                    <span className={`activity-category-badge ${theme.category}`}>
                      {theme.icon}
                      <span>{formatActionTitle(log.action, t)}</span>
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAuditExpand(log.id);
                    }}
                    className={`activity-expand-btn ${isExpanded ? 'is-expanded' : ''}`}
                  >
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-secondary">
                  <div className="tracking-user-chip">
                    <UserAvatar
                      name={log.userName || 'Admin'}
                      size="sm"
                      className="!w-5 !h-5 !text-[9px] flex-shrink-0"
                    />
                    <span><strong>{t('adminSystemTracking.byUser', 'bởi')}:</strong> {log.userName}</span>
                  </div>
                  <span className="font-mono text-[11px]">{formatTimestamp(log.timestamp)}</span>
                </div>

                <div className="text-xs text-primary font-mono bg-surface-muted p-2 rounded-lg border border-border">
                  {formatResourceText(log, t)}
                </div>

                {isExpanded && (
                  <div className="pt-2">
                    <div className="activity-expanded-drawer animate-in fade-in slide-in-from-top-1 duration-150">
                      <AuditActivityDetailView
                        log={log}
                        globalViewMode={globalAuditViewMode}
                        onCopy={handleCopy}
                        copiedId={copiedId}
                        userMap={userMap}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredAuditLogs.length === 0 && (
          <div className="text-center py-12 px-4">
            <FileText size={40} className="mx-auto mb-3 text-muted" />
            <p className="text-primary font-semibold mb-1">{t('adminSystemTracking.noAuditFound', 'Chưa có nhật ký hoạt động')}</p>
            <p className="text-xs text-secondary max-w-sm mx-auto">
              {t('adminSystemTracking.noAuditHelp', 'Các hoạt động tạo/sửa người dùng, việc làm, phán quyết tranh chấp sẽ xuất hiện tại đây')}
            </p>
          </div>
        )}

        {/* Pagination */}
        {filteredAuditLogs.length > 0 && (
          <div className="px-4 sm:px-5 py-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 bg-surface-muted">
            <p className="text-xs text-secondary">
              {t('adminSystemTracking.showingRange', 'Hiển thị')} <span className="text-primary font-bold">{((auditLogPage - 1) * auditLogsPerPage) + 1}</span> {t('adminSystemTracking.to', 'đến')} <span className="text-primary font-bold">{Math.min(auditLogPage * auditLogsPerPage, filteredAuditLogs.length)}</span> {t('adminSystemTracking.inTotal', 'trong tổng')} <span className="text-primary font-bold">{filteredAuditLogs.length}</span> {t('adminSystemTracking.activities', 'hoạt động')}
            </p>
            {totalAuditLogPages > 1 && (
              <AdminTablePagination
                currentPage={auditLogPage}
                totalPages={totalAuditLogPages}
                disabled={isLoadingTracking}
                onPageChange={setAuditLogPage}
                ariaLabel={t('adminSystemTracking.auditLogPagination', 'Phân trang nhật ký hoạt động')}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
