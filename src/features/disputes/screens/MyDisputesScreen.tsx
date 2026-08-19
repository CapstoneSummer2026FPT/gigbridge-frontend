import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  Copy,
  Check,
  Eye,
  Loader2,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { disputeGetAPI } from '../../../api/disputeAPI';
import { DisputeStatus, type MyDisputeSummary } from '../../../types/models/Dispute';
import type { PostJobRouteJobData } from '../../jobs/hooks/usePostJob';
import { useTranslation } from '../../../hooks/useTranslation';
import { CustomSelect, type SelectOption } from '../../../shared/components/CustomSelect';
import '../styles/dispute-detail-screen.css';

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MyDisputesScreen() {
  const { t } = useTranslation(['common']);
  const navigate = useNavigate();

  const [items, setItems] = useState<MyDisputeSummary[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [recreatingDisputeId, setRecreatingDisputeId] = useState<string | null>(null);
  const [recreateErrorText, setRecreateErrorText] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  const statusLabels: Record<DisputeStatus, string> = useMemo(() => ({
    [DisputeStatus.WaitingAdmin]: t('myDisputes.statusWaitingAdmin', 'Chờ Admin'),
    [DisputeStatus.InProgress]: t('myDisputes.statusInProgress', 'Đang xử lý'),
    [DisputeStatus.Resolved]: t('myDisputes.statusResolved', 'Đã giải quyết'),
    [DisputeStatus.Closed]: t('myDisputes.statusClosed', 'Đã đóng'),
  }), [t]);

  const statusSelectOptions: SelectOption[] = useMemo(() => [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: String(DisputeStatus.WaitingAdmin), label: 'Chờ Admin xử lý' },
    { value: String(DisputeStatus.InProgress), label: 'Đang giải quyết' },
    { value: String(DisputeStatus.Resolved), label: 'Đã hoàn tất (Resolved)' },
    { value: String(DisputeStatus.Closed), label: 'Đã đóng (Closed)' },
  ], []);

  const sortSelectOptions: SelectOption[] = useMemo(() => [
    { value: 'newest', label: 'Mới nhất trước' },
    { value: 'oldest', label: 'Cũ nhất trước' },
  ], []);

  const pageSizeSelectOptions: SelectOption[] = useMemo(() => [
    { value: '10', label: '10 tranh chấp/trang' },
    { value: '20', label: '20 tranh chấp/trang' },
    { value: '50', label: '50 tranh chấp/trang' },
  ], []);

  const loadDisputes = useCallback(async (targetPage: number, targetSize: number) => {
    setLoading(true);
    setErrorText(null);
    try {
      const response = await disputeGetAPI.getMyDisputes(targetPage, targetSize);
      if (response.success && response.data) {
        setItems(response.data.items);
        setTotalItems(response.data.totalItems);
      } else {
        setErrorText(response.message || t('myDisputes.errorFallback', 'Không thể tải danh sách tranh chấp.'));
      }
    } catch (err) {
      setErrorText(err instanceof Error ? err.message : t('myDisputes.errorGeneric', 'Có lỗi xảy ra khi tải danh sách tranh chấp.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadDisputes(page, pageSize);
  }, [loadDisputes, page, pageSize]);

  // Statistics for Overview Cards
  const stats = useMemo(() => {
    const total = totalItems;
    const waitingAdmin = items.filter(i => i.status === DisputeStatus.WaitingAdmin).length;
    const inProgress = items.filter(i => i.status === DisputeStatus.InProgress).length;
    const resolved = items.filter(i => i.status === DisputeStatus.Resolved || i.status === DisputeStatus.Closed).length;
    return { total, waitingAdmin, inProgress, resolved };
  }, [items, totalItems]);

  // Client-side filtering & sorting
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.projectName?.toLowerCase().includes(q);
        const matchId = item.disputeId?.toLowerCase().includes(q);
        const matchContract = item.contractId?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchContract) return false;
      }
      if (statusFilter !== 'all') {
        if (String(item.status) !== statusFilter) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [items, searchQuery, statusFilter, sortBy]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (statusFilter !== 'all') count++;
    return count;
  }, [searchQuery, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    void navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSortBy('newest');
  };

  const handleCreateJobPostFromRemainingMilestones = useCallback(async (disputeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (recreatingDisputeId) return;
    setRecreatingDisputeId(disputeId);
    setRecreateErrorText(null);
    try {
      const response = await disputeGetAPI.getRemainingJobPostPlan(disputeId);
      if (!response.success || !response.data) {
        setRecreateErrorText(response.message || t('myDisputes.recreateError', 'Không thể tạo lại bài đăng việc làm.'));
        return;
      }

      const plan = response.data;
      const jobData: PostJobRouteJobData = {
        title: plan.title,
        description: plan.description,
        majorCategoryId: plan.majorCategoryId,
        budgetMin: plan.totalRemainingBudget,
        budgetMax: plan.totalRemainingBudget,
        currency: plan.currency,
        estimatedDuration: plan.estimatedDuration,
        visibility: plan.visibility,
        endDate: plan.endDate,
        skillIds: plan.skillIds,
        customSkillNames: plan.customSkillNames,
        milestonePlans: plan.remainingMilestones.map((milestone, index) => ({
          title: milestone.title,
          description: milestone.description ?? undefined,
          amount: milestone.amount,
          estimatedDuration: milestone.estimatedDuration ?? undefined,
          dueDate: milestone.dueDate ?? undefined,
          deliverables: milestone.deliverables ?? undefined,
          acceptanceCriteria: milestone.acceptanceCriteria ?? undefined,
          orderIndex: index,
          workItems: [],
        })),
      };

      navigate('/jobs/post', { state: { jobData } });
    } catch (err) {
      setRecreateErrorText(err instanceof Error ? err.message : t('myDisputes.recreateError', 'Không thể tạo lại bài đăng việc làm.'));
    } finally {
      setRecreatingDisputeId(null);
    }
  }, [navigate, recreatingDisputeId, t]);

  const getStatusBadge = (status: DisputeStatus) => {
    switch (status) {
      case DisputeStatus.WaitingAdmin:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-bold shadow-2xs">
            <Clock3 size={12} />
            {statusLabels[status]}
          </span>
        );
      case DisputeStatus.InProgress:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20 text-xs font-bold shadow-2xs">
            <RefreshCw size={12} className="animate-spin" />
            {statusLabels[status]}
          </span>
        );
      case DisputeStatus.Resolved:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold shadow-2xs">
            <CheckCircle2 size={12} />
            {statusLabels[status]}
          </span>
        );
      case DisputeStatus.Closed:
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-muted text-text-muted border border-border text-xs font-bold">
            {statusLabels[status] ?? `Status ${status}`}
          </span>
        );
    }
  };

  return (
    <AppLayout fullWidth>
      <div className="min-h-[calc(100vh-4rem)] bg-background text-text-primary">
        {/* Header Bar */}
        <header className="border-b border-border bg-background/80 px-4 py-6 backdrop-blur-md lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-1.5">
            <div className="flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[var(--brand)]">
              <Scale size={15} />
              {t('myDisputes.kicker', 'Tranh Chấp & Trọng Tài')}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
              {t('myDisputes.title', 'Danh Sách Tranh Chấp')}
            </h1>
            <p className="text-xs font-semibold text-text-muted max-w-2xl">
              {t('myDisputes.subtitle', 'Theo dõi, tra cứu và xử lý các khiếu nại liên quan đến hợp đồng làm việc trên sàn GigBridge.')}
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 lg:px-8">
          {/* Top Summary Overview Cards (Matching /wallet/history) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Disputes Card */}
            <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-xl backdrop-blur-xl flex items-center justify-between hover:border-[var(--brand)]/40 transition-all">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider block">Tổng Tranh Chấp</span>
                <div className="text-2xl font-black text-text-primary">{stats.total}</div>
                <p className="text-[11px] font-semibold text-text-muted">Tất cả các hồ sơ khiếu nại</p>
              </div>
              <div className="p-3 rounded-2xl bg-[var(--brand)]/10 text-[var(--brand)] shrink-0 border border-[var(--brand)]/20 shadow-xs">
                <Scale size={24} />
              </div>
            </div>

            {/* Waiting Admin Card */}
            <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-xl backdrop-blur-xl flex items-center justify-between hover:border-amber-500/40 transition-all">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider block">Chờ Admin Xử Lý</span>
                <div className="text-2xl font-black text-amber-500">{stats.waitingAdmin}</div>
                <p className="text-[11px] font-semibold text-text-muted">Cần phản hồi hoặc xem xét</p>
              </div>
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 shrink-0 border border-amber-500/20 shadow-xs">
                <Clock3 size={24} />
              </div>
            </div>

            {/* In Progress Card */}
            <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-xl backdrop-blur-xl flex items-center justify-between hover:border-blue-500/40 transition-all">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider block">Đang Giải Quyết</span>
                <div className="text-2xl font-black text-blue-500">{stats.inProgress}</div>
                <p className="text-[11px] font-semibold text-text-muted">Đang trao đổi chứng cứ</p>
              </div>
              <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500 shrink-0 border border-blue-500/20 shadow-xs">
                <RefreshCw size={24} />
              </div>
            </div>

            {/* Resolved Card */}
            <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-xl backdrop-blur-xl flex items-center justify-between hover:border-emerald-500/40 transition-all">
              <div className="space-y-1">
                <span className="text-[11px] font-extrabold text-text-muted uppercase tracking-wider block">Đã Hoàn Tất</span>
                <div className="text-2xl font-black text-emerald-500">{stats.resolved}</div>
                <p className="text-[11px] font-semibold text-text-muted">Đã ra phán quyết & hoàn tiền</p>
              </div>
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0 border border-emerald-500/20 shadow-xs">
                <CheckCircle2 size={24} />
              </div>
            </div>
          </div>

          {/* Smart Search & Filter Control Bar (Matching /wallet/history) */}
          <div className="rounded-2xl border border-border/80 bg-surface/90 p-5 shadow-xl space-y-4 backdrop-blur-xl">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Search Bar */}
              <div className="sm:col-span-6 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên dự án, mã tranh chấp, mã hợp đồng..."
                  className="w-full h-[50px] pl-11 pr-4 rounded-xl bg-surface-muted border border-border text-xs font-bold text-text-primary outline-none focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 transition-all placeholder:text-text-muted/60"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Status CustomSelect Filter */}
              <div className="sm:col-span-3">
                <CustomSelect
                  value={statusFilter}
                  options={statusSelectOptions}
                  onChange={setStatusFilter}
                  placeholder="Tất cả trạng thái"
                  searchable={false}
                  ariaLabel="Lọc theo trạng thái tranh chấp"
                />
              </div>

              {/* Sort CustomSelect */}
              <div className="sm:col-span-3">
                <CustomSelect
                  value={sortBy}
                  options={sortSelectOptions}
                  onChange={setSortBy}
                  searchable={false}
                  ariaLabel="Sắp xếp danh sách tranh chấp"
                />
              </div>
            </div>

            {/* Active Filter Badges Bar */}
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border text-xs">
                <span className="text-text-muted font-bold text-[11px] uppercase tracking-wider">Đang lọc:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[var(--brand)]/10 text-[var(--brand)] border border-[var(--brand)]/20 font-bold">
                    Từ khóa: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:text-text-primary"><X size={12} /></button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                    Trạng thái: {statusSelectOptions.find(o => o.value === statusFilter)?.label}
                    <button onClick={() => setStatusFilter('all')} className="hover:text-text-primary"><X size={12} /></button>
                  </span>
                )}
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-rose-500 hover:underline inline-flex items-center gap-1 ml-auto"
                >
                  <RotateCcw size={12} />
                  Xóa tất cả bộ lọc
                </button>
              </div>
            )}
          </div>

          {/* Recreate Job Post Notice Error */}
          {recreateErrorText && (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/10 px-5 py-4 text-xs font-bold text-rose-500 shadow-md">
              <AlertTriangle size={18} />
              {recreateErrorText}
            </div>
          )}

          {/* Main Interactive Table Container */}
          {loading ? (
            <div className="rounded-2xl border border-border bg-surface/90 p-12 text-center flex flex-col items-center justify-center shadow-xl">
              <Loader2 size={40} className="text-[var(--brand)] animate-spin mb-4" />
              <p className="text-text-secondary text-sm font-bold">{t('myDisputes.loading', 'Đang tải danh sách tranh chấp...')}</p>
            </div>
          ) : errorText ? (
            <div className="rounded-2xl p-8 border border-rose-500/25 bg-rose-500/5 text-center shadow-xl">
              <AlertTriangle size={40} className="mx-auto mb-3 text-rose-500" />
              <p className="text-rose-500 font-bold mb-3">{errorText}</p>
              <button
                type="button"
                onClick={() => void loadDisputes(page, pageSize)}
                className="px-5 py-2.5 rounded-xl bg-[var(--brand)] text-white font-bold text-xs shadow-md"
              >
                {t('myDisputes.retry', 'Thử lại')}
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface/90 p-12 text-center shadow-xl">
              <Scale size={48} className="mx-auto mb-4 text-text-muted opacity-50" />
              <p className="text-lg font-black text-text-primary mb-2">{t('myDisputes.emptyTitle', 'Không có tranh chấp nào')}</p>
              <p className="text-xs font-semibold text-text-muted mb-4">{t('myDisputes.emptySubtitle', 'Các khiếu nại liên quan đến hợp đồng của bạn sẽ hiển thị tại đây.')}</p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl bg-[var(--brand)] text-white text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-brand/20"
                >
                  <RotateCcw size={14} />
                  Xóa tất cả bộ lọc
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-surface/90 shadow-xl overflow-hidden backdrop-blur-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[780px]">
                    <thead>
                      <tr className="border-b border-border bg-surface-muted/90 text-[11px] text-text-muted uppercase font-black tracking-wider">
                        <th className="py-4 px-5">STT</th>
                        <th className="py-4 px-5">Tên Dự Án / Mã Tranh Chấp</th>
                        <th className="py-4 px-5">Ngày Tạo</th>
                        <th className="py-4 px-5">Trạng Thái</th>
                        <th className="py-4 px-5 text-right">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 text-sm">
                      {filteredItems.map((item, index) => (
                        <tr
                          key={item.disputeId}
                          onClick={() => navigate(`/contracts/${item.contractId}/disputes/${item.disputeId}`)}
                          className="hover:bg-brand-soft/15 transition-all cursor-pointer group"
                        >
                          {/* STT */}
                          <td className="py-4 px-5 font-mono text-xs font-bold text-text-muted">
                            {(page - 1) * pageSize + index + 1}
                          </td>

                          {/* Project Name & Dispute ID */}
                          <td className="py-4 px-5">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-surface-muted border border-border flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:border-[var(--brand)]/40 transition-colors shadow-xs text-[var(--brand)]">
                                <Scale size={18} />
                              </div>
                              <div className="min-w-0">
                                <span className="font-extrabold text-text-primary text-sm group-hover:text-[var(--brand)] transition-colors block mb-0.5 truncate max-w-md">
                                  {item.projectName}
                                </span>
                                <div className="flex items-center gap-2 text-[11px] text-text-muted font-medium">
                                  <span className="font-mono">ID: {item.disputeId.substring(0, 12)}...</span>
                                  <button
                                    onClick={(e) => handleCopyId(item.disputeId, e)}
                                    className="p-1 hover:text-[var(--brand)] text-text-muted"
                                    title="Sao chép ID tranh chấp"
                                  >
                                    {copiedId === item.disputeId ? (
                                      <Check size={13} className="text-emerald-500" />
                                    ) : (
                                      <Copy size={13} />
                                    )}
                                  </button>
                                  {item.contractId && (
                                    <span className="truncate max-w-[140px] text-[var(--brand)] font-bold">
                                      HD: {item.contractId.substring(0, 8)}...
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="py-4 px-5 whitespace-nowrap text-xs">
                            <p className="text-text-primary font-bold">{formatDate(item.createdAt)}</p>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {getStatusBadge(item.status)}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-5 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-2">
                              {item.status === DisputeStatus.Resolved && item.canCreateJobPostFromRemainingMilestones && (
                                <button
                                  type="button"
                                  disabled={recreatingDisputeId === item.disputeId}
                                  onClick={(e) => void handleCreateJobPostFromRemainingMilestones(item.disputeId, e)}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--brand)] bg-[var(--brand)]/10 px-3.5 py-1.5 text-xs font-extrabold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60 shadow-xs"
                                >
                                  <Sparkles size={14} />
                                  {recreatingDisputeId === item.disputeId
                                    ? t('myDisputes.recreating', 'Đang xử lý...')
                                    : t('myDisputes.recreateJobPost', 'Tạo lại bài đăng từ mốc còn lại')}
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => navigate(`/contracts/${item.contractId}/disputes/${item.disputeId}`)}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[var(--brand)] bg-[var(--brand)]/10 hover:bg-[var(--brand)] hover:text-white transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Eye size={14} />
                                {t('myDisputes.viewDetail', 'Xem chi tiết')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Complete Pagination Controls with CustomSelect (Matching /wallet/history) */}
              <div className="relative z-20 rounded-2xl border border-border bg-surface/90 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                {/* Summary Info & Page Size */}
                <div className="flex items-center gap-4 text-xs font-bold text-text-secondary flex-wrap">
                  <span>
                    Hiển thị <strong className="text-text-primary">{startIndex + 1}</strong> –{' '}
                    <strong className="text-text-primary">{endIndex}</strong> trên tổng số{' '}
                    <strong className="text-[var(--brand)]">{totalItems}</strong> tranh chấp
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted font-semibold">Xem:</span>
                    <CustomSelect
                      value={String(pageSize)}
                      options={pageSizeSelectOptions}
                      onChange={val => { setPageSize(Number(val)); setPage(1); }}
                      searchable={false}
                      className="w-40 cs-compact"
                      ariaLabel="Chọn số hàng trên mỗi trang"
                    />
                  </div>
                </div>

                {/* Page Navigation Buttons */}
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="p-2 rounded-xl border border-border hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary transition-colors"
                    title="Trang đầu"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-xl border border-border hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary transition-colors"
                    title="Trang trước"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  {/* Page Numbers */}
                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .map((p, idx, arr) => {
                        const prevP = arr[idx - 1];
                        const showEllipsis = prevP && p - prevP > 1;
                        return (
                          <span key={p} className="flex items-center">
                            {showEllipsis && <span className="px-1 text-text-muted font-bold">...</span>}
                            <button
                              onClick={() => setPage(p)}
                              className={`w-9 h-9 rounded-xl font-black transition-all text-xs ${
                                page === p
                                  ? 'bg-[var(--brand)] text-white shadow-md shadow-brand/30 ring-2 ring-[var(--brand)]/50 scale-105'
                                  : 'hover:bg-surface-muted text-text-secondary border border-border'
                              }`}
                            >
                              {p}
                            </button>
                          </span>
                        );
                      })}
                  </div>

                  <button
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-xl border border-border hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary transition-colors"
                    title="Trang sau"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="p-2 rounded-xl border border-border hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary transition-colors"
                    title="Trang cuối"
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  );
}
