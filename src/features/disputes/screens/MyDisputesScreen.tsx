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
        <header className="border-b border-border bg-surface px-4 py-5 sm:py-6 lg:px-8 shadow-xs">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-1 sm:gap-1.5">
            <div className="flex items-center gap-2 text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-brand">
              <Scale size={15} />
              <span>{t('myDisputes.kicker', 'Tranh Chấp & Trọng Tài')}</span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-text-primary">
              {t('myDisputes.title', 'Danh Sách Tranh Chấp')}
            </h1>
            <p className="text-xs font-semibold text-text-muted max-w-2xl leading-relaxed">
              {t('myDisputes.subtitle', 'Theo dõi, tra cứu và xử lý các khiếu nại liên quan đến hợp đồng làm việc trên sàn GigBridge.')}
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] space-y-4 sm:space-y-6 px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          {/* Top Summary Overview Cards (Responsive 2x2 on mobile, 4 on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {/* Total Disputes Card */}
            <div className="rounded-2xl border border-border bg-surface p-3.5 sm:p-5 shadow-sm flex items-center justify-between hover:border-brand/40 transition-all">
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-extrabold text-text-muted uppercase tracking-wider block truncate">Tổng Tranh Chấp</span>
                <div className="text-xl sm:text-2xl font-black text-text-primary">{stats.total}</div>
                <p className="text-[10px] sm:text-[11px] font-semibold text-text-muted truncate hidden xs:block">Tất cả hồ sơ khiếu nại</p>
              </div>
              <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-brand/10 text-brand shrink-0 border border-brand/20 shadow-xs ml-2">
                <Scale size={20} className="sm:w-6 sm:h-6" />
              </div>
            </div>

            {/* Waiting Admin Card */}
            <div className="rounded-2xl border border-border bg-surface p-3.5 sm:p-5 shadow-sm flex items-center justify-between hover:border-amber-500/40 transition-all">
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-extrabold text-text-muted uppercase tracking-wider block truncate">Chờ Admin Xử Lý</span>
                <div className="text-xl sm:text-2xl font-black text-amber-500">{stats.waitingAdmin}</div>
                <p className="text-[10px] sm:text-[11px] font-semibold text-text-muted truncate hidden xs:block">Cần phản hồi / duyệt</p>
              </div>
              <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-amber-500/10 text-amber-500 shrink-0 border border-amber-500/20 shadow-xs ml-2">
                <Clock3 size={20} className="sm:w-6 sm:h-6" />
              </div>
            </div>

            {/* In Progress Card */}
            <div className="rounded-2xl border border-border bg-surface p-3.5 sm:p-5 shadow-sm flex items-center justify-between hover:border-blue-500/40 transition-all">
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-extrabold text-text-muted uppercase tracking-wider block truncate">Đang Giải Quyết</span>
                <div className="text-xl sm:text-2xl font-black text-blue-500">{stats.inProgress}</div>
                <p className="text-[10px] sm:text-[11px] font-semibold text-text-muted truncate hidden xs:block">Đang trao đổi chứng cứ</p>
              </div>
              <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-blue-500/10 text-blue-500 shrink-0 border border-blue-500/20 shadow-xs ml-2">
                <RefreshCw size={20} className="sm:w-6 sm:h-6" />
              </div>
            </div>

            {/* Resolved Card */}
            <div className="rounded-2xl border border-border bg-surface p-3.5 sm:p-5 shadow-sm flex items-center justify-between hover:border-emerald-500/40 transition-all">
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <span className="text-[10px] sm:text-[11px] font-extrabold text-text-muted uppercase tracking-wider block truncate">Đã Hoàn Tất</span>
                <div className="text-xl sm:text-2xl font-black text-emerald-500">{stats.resolved}</div>
                <p className="text-[10px] sm:text-[11px] font-semibold text-text-muted truncate hidden xs:block">Đã có phán quyết</p>
              </div>
              <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-emerald-500/10 text-emerald-500 shrink-0 border border-emerald-500/20 shadow-xs ml-2">
                <CheckCircle2 size={20} className="sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>

          {/* Smart Search & Filter Control Bar */}
          <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 shadow-sm space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Search Bar */}
              <div className="sm:col-span-6 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm theo tên dự án, mã tranh chấp, mã hợp đồng..."
                  className="w-full h-[46px] sm:h-[50px] pl-11 pr-9 rounded-xl bg-background border border-border text-xs font-bold text-text-primary outline-none focus:border-brand transition-all placeholder:text-text-muted/60"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-primary cursor-pointer"
                    aria-label="Xóa tìm kiếm"
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
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-brand/10 text-brand border border-brand/20 font-bold">
                    Từ khóa: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:text-text-primary cursor-pointer"><X size={12} /></button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold">
                    Trạng thái: {statusSelectOptions.find(o => o.value === statusFilter)?.label}
                    <button onClick={() => setStatusFilter('all')} className="hover:text-text-primary cursor-pointer"><X size={12} /></button>
                  </span>
                )}
                <button
                  onClick={handleResetFilters}
                  className="text-xs font-bold text-destructive hover:underline inline-flex items-center gap-1 ml-auto cursor-pointer"
                >
                  <RotateCcw size={12} />
                  <span>Xóa tất cả bộ lọc</span>
                </button>
              </div>
            )}
          </div>

          {/* Recreate Job Post Notice Error */}
          {recreateErrorText && (
            <div className="flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 sm:px-5 sm:py-4 text-xs font-bold text-destructive shadow-sm">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{recreateErrorText}</span>
            </div>
          )}

          {/* Main Interactive Table & Mobile Cards Container */}
          {loading ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center flex flex-col items-center justify-center shadow-xl">
              <Loader2 size={40} className="text-brand animate-spin mb-4" />
              <p className="text-text-secondary text-sm font-bold">{t('myDisputes.loading', 'Đang tải danh sách tranh chấp...')}</p>
            </div>
          ) : errorText ? (
            <div className="rounded-2xl p-8 border border-destructive/25 bg-destructive/5 text-center shadow-xl">
              <AlertTriangle size={40} className="mx-auto mb-3 text-destructive" />
              <p className="text-destructive font-bold mb-3">{errorText}</p>
              <button
                type="button"
                onClick={() => void loadDisputes(page, pageSize)}
                className="px-5 py-2.5 rounded-xl bg-brand text-white font-bold text-xs shadow-md cursor-pointer"
              >
                {t('myDisputes.retry', 'Thử lại')}
              </button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-12 text-center shadow-xl">
              <Scale size={48} className="mx-auto mb-4 text-text-muted opacity-50" />
              <p className="text-base sm:text-lg font-black text-text-primary mb-2">{t('myDisputes.emptyTitle', 'Không có tranh chấp nào')}</p>
              <p className="text-xs font-semibold text-text-muted mb-4">{t('myDisputes.emptySubtitle', 'Các khiếu nại liên quan đến hợp đồng của bạn sẽ hiển thị tại đây.')}</p>
              {activeFiltersCount > 0 && (
                <button
                  onClick={handleResetFilters}
                  className="px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold inline-flex items-center gap-2 shadow-md shadow-brand/20 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Xóa tất cả bộ lọc</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* 1. Mobile Card List (< md) */}
              <div className="block md:hidden space-y-3">
                {filteredItems.map((item, index) => (
                  <div
                    key={item.disputeId}
                    onClick={() => navigate(`/contracts/${item.contractId}/disputes/${item.disputeId}`)}
                    className="p-4 rounded-2xl border border-border bg-surface shadow-md space-y-3 hover:border-brand/40 transition-all cursor-pointer"
                  >
                    {/* Header: Project Name & Status */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-brand/10 text-brand border border-brand/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Scale size={15} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold text-text-primary text-xs sm:text-sm leading-snug break-words">
                            {item.projectName}
                          </h3>
                          <span className="text-[10px] font-mono text-text-muted">
                            #{(page - 1) * pageSize + index + 1}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {getStatusBadge(item.status)}
                      </div>
                    </div>

                    {/* Metadata strip */}
                    <div className="p-2.5 rounded-xl bg-surface-muted border border-border/60 space-y-1.5 text-xs">
                      {/* Dispute ID */}
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <span className="text-text-muted font-medium">Mã tranh chấp:</span>
                        <div className="flex items-center gap-1 font-mono font-bold text-text-primary min-w-0">
                          <span className="truncate">{item.disputeId.substring(0, 14)}...</span>
                          <button
                            onClick={(e) => handleCopyId(item.disputeId, e)}
                            className="p-1 hover:text-brand text-text-muted cursor-pointer shrink-0"
                            title="Sao chép ID"
                          >
                            {copiedId === item.disputeId ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>

                      {/* Contract ID */}
                      {item.contractId && (
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <span className="text-text-muted font-medium">Hợp đồng:</span>
                          <span className="font-mono font-bold text-brand truncate max-w-[180px]">
                            {item.contractId.substring(0, 14)}...
                          </span>
                        </div>
                      )}

                      {/* Date */}
                      <div className="flex items-center justify-between gap-1 text-[11px] pt-1 border-t border-border/40">
                        <span className="text-text-muted font-medium inline-flex items-center gap-1">
                          <Clock3 size={11} /> Ngày tạo:
                        </span>
                        <span className="font-semibold text-text-secondary">{formatDate(item.createdAt)}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-1" onClick={e => e.stopPropagation()}>
                      {item.status === DisputeStatus.Resolved && item.canCreateJobPostFromRemainingMilestones && (
                        <button
                          type="button"
                          disabled={recreatingDisputeId === item.disputeId}
                          onClick={(e) => void handleCreateJobPostFromRemainingMilestones(item.disputeId, e)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand bg-brand/10 px-3 py-2 text-xs font-extrabold text-brand transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-60 shadow-xs min-h-[38px]"
                        >
                          <Sparkles size={13} />
                          <span className="truncate">
                            {recreatingDisputeId === item.disputeId ? t('myDisputes.recreating', 'Đang xử lý...') : t('myDisputes.recreateJobPost', 'Tạo lại bài đăng')}
                          </span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/contracts/${item.contractId}/disputes/${item.disputeId}`)}
                        className="flex-1 px-3.5 py-2 rounded-xl text-xs font-bold text-brand bg-brand/10 hover:bg-brand hover:text-white transition-all shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer min-h-[38px]"
                      >
                        <Eye size={14} />
                        <span>{t('myDisputes.viewDetail', 'Xem chi tiết')}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* 2. Desktop Table (>= md) */}
              <div className="hidden md:block rounded-2xl border border-border bg-surface shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[780px]">
                    <thead>
                      <tr className="border-b border-border bg-surface-muted text-[11px] text-text-muted uppercase font-black tracking-wider">
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
                          className="hover:bg-surface-hover transition-all cursor-pointer group"
                        >
                          {/* STT */}
                          <td className="py-4 px-5 font-mono text-xs font-bold text-text-muted">
                            {(page - 1) * pageSize + index + 1}
                          </td>

                          {/* Project Name & Dispute ID */}
                          <td className="py-4 px-5">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-surface-muted border border-border flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:border-brand/40 transition-colors shadow-xs text-brand">
                                <Scale size={18} />
                              </div>
                              <div className="min-w-0">
                                <span className="font-extrabold text-text-primary text-sm group-hover:text-brand transition-colors block mb-0.5 truncate max-w-md">
                                  {item.projectName}
                                </span>
                                <div className="flex items-center gap-2 text-[11px] text-text-muted font-medium">
                                  <span className="font-mono">ID: {item.disputeId.substring(0, 12)}...</span>
                                  <button
                                    onClick={(e) => handleCopyId(item.disputeId, e)}
                                    className="p-1 hover:text-brand text-text-muted cursor-pointer"
                                    title="Sao chép ID tranh chấp"
                                  >
                                    {copiedId === item.disputeId ? (
                                      <Check size={13} className="text-success" />
                                    ) : (
                                      <Copy size={13} />
                                    )}
                                  </button>
                                  {item.contractId && (
                                    <span className="truncate max-w-[140px] text-brand font-bold">
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
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-brand bg-brand/10 px-3.5 py-1.5 text-xs font-extrabold text-brand transition hover:bg-brand hover:text-white disabled:cursor-not-allowed disabled:opacity-60 shadow-xs cursor-pointer"
                                >
                                  <Sparkles size={14} />
                                  <span>
                                    {recreatingDisputeId === item.disputeId
                                      ? t('myDisputes.recreating', 'Đang xử lý...')
                                      : t('myDisputes.recreateJobPost', 'Tạo lại bài đăng từ mốc còn lại')}
                                  </span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => navigate(`/contracts/${item.contractId}/disputes/${item.disputeId}`)}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-brand bg-brand/10 hover:bg-brand hover:text-white transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <Eye size={14} />
                                <span>{t('myDisputes.viewDetail', 'Xem chi tiết')}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Complete Pagination Controls with CustomSelect */}
              <div className="relative z-20 rounded-2xl border border-border bg-surface px-4 sm:px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                {/* Summary Info & Page Size */}
                <div className="flex items-center gap-3 sm:gap-4 text-xs font-bold text-text-secondary flex-wrap justify-center sm:justify-start">
                  <span>
                    Hiển thị <strong className="text-text-primary">{startIndex + 1}</strong> –{' '}
                    <strong className="text-text-primary">{endIndex}</strong> /{' '}
                    <strong className="text-brand">{totalItems}</strong> tranh chấp
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted font-semibold">Xem:</span>
                    <CustomSelect
                      value={String(pageSize)}
                      options={pageSizeSelectOptions}
                      onChange={val => { setPageSize(Number(val)); setPage(1); }}
                      searchable={false}
                      className="w-36 sm:w-40 cs-compact"
                      ariaLabel="Chọn số hàng trên mỗi trang"
                    />
                  </div>
                </div>

                {/* Page Navigation Buttons */}
                <div className="flex items-center gap-1 sm:gap-1.5 text-xs flex-wrap justify-center">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="p-2 rounded-xl border border-border hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Trang đầu"
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-xl border border-border hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
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
                              className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl font-black transition-all text-xs cursor-pointer ${
                                page === p
                                  ? 'bg-brand text-brand-foreground shadow-md shadow-brand/30 ring-2 ring-brand/50 scale-105'
                                  : 'hover:bg-surface-hover text-text-secondary border border-border'
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
                    className="p-2 rounded-xl border border-border hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                    title="Trang sau"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="p-2 rounded-xl border border-border hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed text-text-secondary transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
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
