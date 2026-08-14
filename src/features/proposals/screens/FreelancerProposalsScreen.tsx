import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  AlertCircle,
  ArrowLeft,
  ArrowUpDown,
  Ban,
  Bot,
  Briefcase,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Edit3,
  ExternalLink,
  FileText,
  Filter,
  Layers,
  MessageSquare,
  Search,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPatchAPI } from '../../../api/proposalAPI/PATCH';
import { ProposalStatus, type ProposalDto, type ProposalDetailDto, type ProposalMilestonePlanDto } from '../../../types/models/Proposal';
import type { ProposalStatusFilter } from '../types';
import { canEditProposal, canViewProposalAnswers, canWithdrawProposal, getStatusLabel } from '../utils/statusHelpers';
import { useProposalAnswersModal } from '../hooks/useProposalAnswersModal';
import { ProposalAnswersModal } from '../components/ProposalAnswersModal';
import { ConfirmationModal } from '../../../shared/components/ConfirmationModal';
import { CustomSelect, type SelectOption } from '../../../shared/components/CustomSelect';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { useTranslation } from '../../../hooks/useTranslation';

type ProposalItem = ProposalDto & {
  updatedAt?: string | null;
};

type SortOption = 'newest' | 'oldest' | 'highestBid' | 'lowestBid';
type DetailTab = 'overview' | 'milestones' | 'aiInterview';

export default function FreelancerProposalsScreen() {
  const { t } = useTranslation(['proposals', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const answersModal = useProposalAnswersModal();

  const submittedProposalId = (location.state as { submittedProposalId?: string } | null)?.submittedProposalId;

  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProposalStatusFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');
  const [message, setMessage] = useState('');
  const [openingNegotiationId, setOpeningNegotiationId] = useState<string | null>(null);
  const [activeDetail, setActiveDetail] = useState<ProposalDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [withdrawTarget, setWithdrawTarget] = useState<ProposalItem | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  const statusTabs: { id: ProposalStatusFilter; labelKey: string; defaultLabel: string }[] = [
    { id: 'all', labelKey: 'inbox.filterAll', defaultLabel: 'Tất cả' },
    { id: '1', labelKey: 'inbox.filterPending', defaultLabel: 'Đang chờ' },
    { id: '2', labelKey: 'inbox.filterShortlisted', defaultLabel: 'Phỏng vấn' },
    { id: '3', labelKey: 'inbox.filterAccepted', defaultLabel: 'Đã nhận' },
    { id: '4', labelKey: 'inbox.filterRejected', defaultLabel: 'Từ chối' },
    { id: '5', labelKey: 'inbox.filterWithdrawn', defaultLabel: 'Đã rút' },
    { id: '0', labelKey: 'inbox.filterDraft', defaultLabel: 'Nháp' },
  ];

  useEffect(() => {
    const fetchProposals = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setMessage('');
        const response = await proposalGetAPI.getMyProposals({
          pageIndex: currentPage,
          pageSize,
          status: statusFilter === 'all' ? undefined : Number(statusFilter),
        });
        if (!response.success || !response.data) {
          setMessage(response.message || t('inbox.noProposals'));
          setProposals([]);
          setTotalPages(1);
          setTotalCount(0);
          return;
        }

        const loadedProposals = (response.data.items || []).map(proposal => ({
          ...proposal,
          updatedAt: proposal.reviewedAt || proposal.submittedAt,
        }));
        setProposals(loadedProposals);
        setTotalPages(response.data.totalPages || 1);
        setTotalCount(response.data.totalCount || 0);

        if (submittedProposalId) {
          const submittedProposal = loadedProposals.find(
            proposal => proposal.proposalsId === submittedProposalId
          );
          if (submittedProposal) {
            setActiveProposalId(submittedProposal.proposalsId);
            setMessage(submittedProposal.hasAiInterview && !submittedProposal.aiInterviewCompleted
              ? t('aiInterview.proposal.submittedWithInterview')
              : t('aiInterview.proposal.submitted'));
          }
        }
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    };

    fetchProposals();
  }, [submittedProposalId, t, user, currentPage, statusFilter]);

  // GSAP Entrance animation runs only ONCE on initial page load
  usePageGSAP({
    containerRef,
    loading: initialLoading,
    groups: [
      { selector: '.fps-gsap-header', y: 20, duration: 0.55 },
      { selector: '.fps-gsap-stats', y: 15, duration: 0.45 },
      { selector: '.fps-gsap-sidebar', x: -20, duration: 0.5 },
      { selector: '.fps-gsap-detail', y: 20, duration: 0.5 },
    ],
  });

  const handleStatusFilterChange = (status: ProposalStatusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // Helper count for badges
  const getFilterBadgeCount = (filterValue: ProposalStatusFilter) => {
    if (filterValue === 'all') return proposals.length;
    return proposals.filter(p => String(p.status) === String(filterValue)).length;
  };

  // Stats calculation
  const stats = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let totalBid = 0;
    proposals.forEach(p => {
      const st = Number(p.status);
      if (st === ProposalStatus.Pending || st === ProposalStatus.Shortlisted) pending++;
      if (st === ProposalStatus.Accepted) accepted++;
      totalBid += p.proposedBudget || 0;
    });
    return {
      total: totalCount || proposals.length,
      pending,
      accepted,
      totalBid,
    };
  }, [proposals, totalCount]);

  // Options for CustomSelect components
  const jobSelectOptions: SelectOption[] = useMemo(() => {
    return proposals.map(p => ({
      value: p.proposalsId,
      label: p.jobTitle || 'Đề xuất ứng tuyển',
      badge: getStatusLabel(p.status),
    }));
  }, [proposals]);

  const statusSelectOptions: SelectOption[] = useMemo(() => {
    return statusTabs.map(tab => ({
      value: tab.id,
      label: t(tab.labelKey, { defaultValue: tab.defaultLabel }),
      badge: String(getFilterBadgeCount(tab.id)),
    }));
  }, [proposals, t]);

  const sortSelectOptions: SelectOption[] = useMemo(() => [
    { value: 'newest', label: t('inbox.recentCreate', { defaultValue: 'Mới tạo gần đây' }) },
    { value: 'oldest', label: t('inbox.oldest', { defaultValue: 'Cũ nhất' }) },
    { value: 'highestBid', label: t('inbox.highestBid', { defaultValue: 'Giá cao nhất' }) },
    { value: 'lowestBid', label: t('inbox.lowestBid', { defaultValue: 'Giá thấp nhất' }) },
  ], [t]);

  const filteredAndSortedProposals = useMemo(() => {
    const result = proposals.filter(proposal => {
      if (statusFilter !== 'all' && String(proposal.status) !== String(statusFilter)) {
        return false;
      }
      return true;
    });

    return result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.submittedAt || 0).getTime() - new Date(b.submittedAt || 0).getTime();
      if (sortBy === 'highestBid') return (b.proposedBudget || 0) - (a.proposedBudget || 0);
      if (sortBy === 'lowestBid') return (a.proposedBudget || 0) - (b.proposedBudget || 0);
      return 0;
    });
  }, [proposals, statusFilter, sortBy]);

  useEffect(() => {
    if (filteredAndSortedProposals.length === 0) {
      setActiveProposalId(null);
      return;
    }

    if (!activeProposalId || !filteredAndSortedProposals.some(proposal => proposal.proposalsId === activeProposalId)) {
      setActiveProposalId(filteredAndSortedProposals[0].proposalsId);
    }
  }, [filteredAndSortedProposals, activeProposalId]);

  const activeProposal = useMemo(
    () => filteredAndSortedProposals.find(proposal => proposal.proposalsId === activeProposalId) || null,
    [filteredAndSortedProposals, activeProposalId]
  );

  useEffect(() => {
    let isMounted = true;
    if (!activeProposalId) {
      setActiveDetail(null);
      return;
    }

    const fetchDetail = async () => {
      setDetailLoading(true);
      try {
        const response = await proposalGetAPI.getProposalDetail(activeProposalId);
        if (isMounted && response.success && response.data) {
          setActiveDetail(response.data);
        }
      } catch (err) {
        console.error('Failed to load proposal detail:', err);
      } finally {
        if (isMounted) setDetailLoading(false);
      }
    };

    void fetchDetail();
    return () => {
      isMounted = false;
    };
  }, [activeProposalId]);

  const handleConfirmWithdraw = async () => {
    if (!withdrawTarget) return;
    setWithdrawing(true);
    try {
      const response = await proposalPatchAPI.updateProposalStatus(withdrawTarget.proposalsId, {
        status: ProposalStatus.Withdrawn,
      });

      if (!response.success) {
        toast.error(response.message || 'Proposal could not be withdrawn.');
        return;
      }

      setProposals(prev => prev.map(item => item.proposalsId === withdrawTarget.proposalsId
        ? { ...item, status: ProposalStatus.Withdrawn, updatedAt: new Date().toISOString() }
        : item
      ));
      if (activeDetail && activeDetail.proposalId === withdrawTarget.proposalsId) {
        setActiveDetail(prev => (prev ? { ...prev, status: ProposalStatus.Withdrawn } : null));
      }
      toast.success(t('inbox.withdrawnSuccess'));
    } catch (err) {
      toast.error('Withdrawal failed.');
    } finally {
      setWithdrawing(false);
      setWithdrawTarget(null);
    }
  };

  const openAcceptedNegotiation = (proposal: ProposalItem) => {
    setOpeningNegotiationId(proposal.proposalsId);
    navigate('/messages', { state: { proposalId: proposal.proposalsId } });
  };

  const statusBadgeClass = (status: number | string) => {
    const value = Number(status);
    if (value === ProposalStatus.Accepted) return 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold';
    if (value === ProposalStatus.Rejected || value === ProposalStatus.Withdrawn) return 'border border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-400 font-extrabold';
    if (value === ProposalStatus.Shortlisted) return 'border border-blue-500/40 bg-blue-500/20 text-blue-600 dark:text-blue-400 font-extrabold';
    if (value === ProposalStatus.Draft) return 'border border-border bg-surface-muted text-text-muted font-bold';
    return 'border border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400 font-extrabold';
  };

  return (
    <AppLayout fullWidth>
      <div ref={containerRef} className="flex flex-col h-[calc(100vh-4rem)] bg-background text-text-primary overflow-hidden">

        {/* ── Top Chrome Header Bar ─────────────────────────────────────────── */}
        <header className="fps-gsap-header sticky top-0 z-40 flex items-center justify-between px-6 py-3.5 border-b border-border bg-background/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <button
              type="button"
              onClick={() => navigate('/freelancer/dashboard')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border text-text-secondary transition-colors hover:border-brand/40 hover:text-brand cursor-pointer"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-tight text-text-primary sm:text-xl truncate">
                {t('inbox.titleWord1')} <span className="text-brand italic font-light">{t('inbox.titleWord2')}</span>
              </h1>
              <p className="text-xs font-semibold text-text-muted truncate">
                {t('inbox.subtitle')}
              </p>
            </div>
          </div>
        </header>

        {/* ── Quick Stats Ribbon ───────────────────────────────────────────── */}
        <div className="fps-gsap-stats px-6 py-2.5 bg-surface-muted/40 border-b border-border/80 shrink-0 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-background/80 border border-border/60 shadow-2xs">
            <div className="p-2 rounded-lg bg-brand/10 text-brand">
              <FileText size={16} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                {t('inbox.statsTotal', { defaultValue: 'Tổng đơn ứng tuyển' })}
              </span>
              <strong className="text-sm font-black text-text-primary">{stats.total}</strong>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-background/80 border border-border/60 shadow-2xs">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Clock size={16} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                {t('inbox.statsPending', { defaultValue: 'Đang chờ & Phỏng vấn' })}
              </span>
              <strong className="text-sm font-black text-amber-600 dark:text-amber-400">{stats.pending}</strong>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-background/80 border border-border/60 shadow-2xs">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 size={16} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                {t('inbox.statsAccepted', { defaultValue: 'Đã chấp nhận' })}
              </span>
              <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{stats.accepted}</strong>
            </div>
          </div>

          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-background/80 border border-border/60 shadow-2xs">
            <div className="p-2 rounded-lg bg-brand/10 text-brand">
              <Coins size={16} />
            </div>
            <div>
              <span className="block text-[10px] font-bold text-text-muted uppercase tracking-wider">
                {t('inbox.statsTotalValue', { defaultValue: 'Tổng giá trị chào thầu' })}
              </span>
              <strong className="text-sm font-black text-brand">
                <GigCoinAmount amount={stats.totalBid} />
              </strong>
            </div>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div className="mx-6 mt-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-center gap-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400 shrink-0">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* ── Main Layout Workspace ─────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden p-4 gap-4">

          {/* Left Column: Proposals Sidebar List & Filters */}
          <section className="fps-gsap-sidebar w-full md:w-96 lg:w-[420px] flex flex-col rounded-2xl border border-border bg-background shrink-0 overflow-hidden shadow-sm">
            
            {/* Searchable Job Quick Selector CustomSelect */}
            <div className="p-3 border-b border-border bg-surface-muted/30 space-y-3 shrink-0">
              <CustomSelect
                value={activeProposalId || ''}
                options={jobSelectOptions}
                onChange={val => setActiveProposalId(val)}
                leftIcon={<Search size={14} />}
                searchable={true}
                placeholder={t('inbox.selectJobPlaceholder', { defaultValue: 'Tìm & chọn nhanh công việc...' })}
                searchPlaceholder={t('inbox.searchJobPlaceholder', { defaultValue: 'Nhập tên công việc để tìm...' })}
                ariaLabel="Search and select job proposal"
              />

              {/* Dual CustomSelect Row for Status & Sorting */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <CustomSelect
                    value={statusFilter}
                    options={statusSelectOptions}
                    onChange={val => handleStatusFilterChange(val as ProposalStatusFilter)}
                    leftIcon={<Filter size={13} />}
                    searchable={true}
                    searchPlaceholder={t('common.search', { defaultValue: 'Tìm kiếm trạng thái...' })}
                    ariaLabel="Filter proposals by status"
                  />
                </div>
                <div>
                  <CustomSelect
                    value={sortBy}
                    options={sortSelectOptions}
                    onChange={val => setSortBy(val as SortOption)}
                    leftIcon={<ArrowUpDown size={13} />}
                    searchable={false}
                    ariaLabel="Sort proposals"
                  />
                </div>
              </div>

              {/* Horizontal Scrollable Stage Tab Pills (Matching Notifications Design) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar pt-1 border-t border-border/40">
                {statusTabs.map(tab => {
                  const count = getFilterBadgeCount(tab.id);
                  const isSelected = statusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleStatusFilterChange(tab.id)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-brand text-white shadow-xs'
                          : 'text-text-secondary hover:bg-background hover:text-text-primary border border-transparent'
                      }`}
                    >
                      <span>{t(tab.labelKey, { defaultValue: tab.defaultLabel })}</span>
                      {count > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-black ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-surface-muted text-text-muted'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Proposal Cards List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
              {loading ? (
                <div className="p-8 text-center text-xs font-semibold text-text-muted">
                  <LemniscateBloomLoader label={t('inbox.loading')} size={48} />
                </div>
              ) : filteredAndSortedProposals.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <FileText size={32} className="mx-auto text-text-muted" />
                  <p className="text-xs font-bold text-text-secondary">{t('inbox.noProposals')}</p>
                </div>
              ) : (
                filteredAndSortedProposals.map(proposal => {
                  const isActive = proposal.proposalsId === activeProposalId;
                  return (
                    <div
                      key={proposal.proposalsId}
                      onClick={() => setActiveProposalId(proposal.proposalsId)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                        isActive
                          ? 'border-brand bg-brand/5 dark:bg-brand/10 shadow-md ring-2 ring-brand/20'
                          : 'border-border bg-background hover:border-brand/40 hover:bg-surface-muted/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-xs font-extrabold text-text-primary line-clamp-2 leading-snug">
                          {proposal.jobTitle || 'Đề xuất ứng tuyển'}
                        </h3>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] uppercase ${statusBadgeClass(proposal.status)}`}>
                          {getStatusLabel(proposal.status)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-black text-brand">
                          <GigCoinAmount amount={proposal.proposedBudget} />
                        </span>
                        <div className="flex items-center gap-1.5 text-[10px] font-medium text-text-muted">
                          <Calendar size={11} />
                          <span>
                            {proposal.submittedAt ? new Date(proposal.submittedAt).toLocaleDateString() : '—'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-border/40 text-[10px]">
                        {proposal.hasAiInterview && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold border border-purple-500/20">
                            <Bot size={11} /> AI Interview
                          </span>
                        )}
                        {proposal.milestoneCount ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-muted text-text-secondary font-bold">
                            <Layers size={11} /> {proposal.milestoneCount} mốc
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-border bg-background flex items-center justify-center gap-2 shrink-0 text-xs">
                <button
                  type="button"
                  disabled={currentPage === 1 || loading}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background hover:border-brand/40 disabled:opacity-40 font-bold"
                >
                  &lt;
                </button>
                <span className="font-bold text-text-muted">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background hover:border-brand/40 disabled:opacity-40 font-bold"
                >
                  &gt;
                </button>
              </div>
            )}
          </section>

          {/* Right Column: Active Proposal Detail Workspace */}
          <section className="fps-gsap-detail flex-1 rounded-2xl border border-border bg-background shadow-sm overflow-hidden flex flex-col p-6 overflow-y-auto custom-scrollbar">
            {activeProposal ? (
              <div className="space-y-6">
                {/* Proposal Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-border pb-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-text-primary leading-snug">
                        {activeProposal.jobTitle || 'Đề xuất ứng tuyển'}
                      </h2>
                      <button
                        type="button"
                        onClick={() => navigate(`/jobs/${activeProposal.jobPostsId}`)}
                        className="p-1 rounded-lg text-text-muted hover:text-brand hover:bg-surface-muted transition-colors cursor-pointer"
                        title="Xem bài đăng tuyển"
                      >
                        <ExternalLink size={15} />
                      </button>
                    </div>
                    <p className="text-xs font-semibold text-text-muted flex items-center gap-2">
                      <span>{t('inbox.submittedOn', {
                        date: activeProposal.submittedAt
                          ? new Date(activeProposal.submittedAt).toLocaleDateString()
                          : 'Gần đây',
                      })}</span>
                      {activeProposal.updatedAt && (
                        <span>· Cập nhật: {new Date(activeProposal.updatedAt).toLocaleDateString()}</span>
                      )}
                    </p>
                  </div>
                  <span className={`self-start rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${statusBadgeClass(activeProposal.status)}`}>
                    {getStatusLabel(activeProposal.status)}
                  </span>
                </div>

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-2.5 pb-2">
                  {canEditProposal(activeProposal.status) && (
                    <button
                      type="button"
                      onClick={() => navigate(`/proposals/${activeProposal.proposalsId}/edit`)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold text-white transition-all hover:opacity-90 hover:-translate-y-0.5 cursor-pointer"
                      style={{ background: 'var(--brand)', boxShadow: '0 4px 14px -2px rgba(73,75,231,0.3)' }}
                    >
                      <Edit3 size={14} />
                      <span>{t('inbox.continueEditing')}</span>
                    </button>
                  )}

                  {canViewProposalAnswers(activeProposal.status) && (
                    <button
                      type="button"
                      onClick={() => void answersModal.openModal(activeProposal.proposalsId, activeProposal.jobTitle, activeProposal.status, activeProposal.jobPostsId)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-xs font-bold text-text-primary hover:border-brand/40 hover:text-brand transition-all cursor-pointer"
                    >
                      <FileText size={14} />
                      <span>{t('inbox.viewAnswers')}</span>
                    </button>
                  )}

                  {Number(activeProposal.status) === ProposalStatus.Accepted && (
                    <button
                      type="button"
                      onClick={() => openAcceptedNegotiation(activeProposal)}
                      disabled={openingNegotiationId === activeProposal.proposalsId}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm cursor-pointer"
                    >
                      <MessageSquare size={14} />
                      <span>
                        {openingNegotiationId === activeProposal.proposalsId ? t('inbox.openingNegotiation') : t('inbox.enterNegotiation')}
                      </span>
                    </button>
                  )}

                  {activeProposal.hasAiInterview
                    && !activeProposal.aiInterviewCompleted
                    && Number(activeProposal.status) === ProposalStatus.Draft && (
                    <button
                      type="button"
                      onClick={() => navigate(`/ai-interview/${encodeURIComponent(activeProposal.jobPostsId)}`, {
                        state: {
                          jobPostId: activeProposal.jobPostsId,
                          jobTitle: activeProposal.jobTitle,
                          interviewDefinitionId: activeProposal.aiInterviewDefinitionId,
                          proposalId: activeProposal.proposalsId,
                        },
                      })}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold text-white transition-all hover:opacity-90 cursor-pointer"
                      style={{ background: 'var(--brand)' }}
                    >
                      <Bot size={14} />
                      <span>
                        {activeProposal.aiInterviewInProgress
                          ? t('aiInterview.proposal.continueAction')
                          : t('aiInterview.proposal.startAction')}
                      </span>
                    </button>
                  )}

                  {canWithdrawProposal(activeProposal.status) && (
                    <button
                      type="button"
                      onClick={() => setWithdrawTarget(activeProposal)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                    >
                      <XCircle size={14} />
                      <span>{t('inbox.withdraw')}</span>
                    </button>
                  )}
                </div>

                {/* Segmented Tab Switcher Navigation */}
                <div className="inline-flex items-center gap-1.5 p-1.5 rounded-2xl border border-border/80 bg-surface-muted/50 dark:bg-surface-muted/30 backdrop-blur-md shadow-xs text-xs">
                  <button
                    type="button"
                    onClick={() => setDetailTab('overview')}
                    className={`relative px-4 py-2 rounded-xl font-black transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                      detailTab === 'overview'
                        ? 'bg-brand text-white shadow-md shadow-brand/25 scale-[1.02] ring-1 ring-white/20'
                        : 'text-text-secondary hover:text-text-primary hover:bg-background/60 font-extrabold'
                    }`}
                  >
                    <Sparkles size={14} className={detailTab === 'overview' ? 'animate-pulse' : 'text-brand'} />
                    <span>{t('inbox.tabOverview', { defaultValue: 'Tổng quan & Giải pháp' })}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDetailTab('milestones')}
                    className={`relative px-4 py-2 rounded-xl font-black transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                      detailTab === 'milestones'
                        ? 'bg-brand text-white shadow-md shadow-brand/25 scale-[1.02] ring-1 ring-white/20'
                        : 'text-text-secondary hover:text-text-primary hover:bg-background/60 font-extrabold'
                    }`}
                  >
                    <Layers size={14} className={detailTab === 'milestones' ? '' : 'text-brand'} />
                    <span>{t('inbox.tabMilestones', { defaultValue: 'Milestones & Chi phí' })}</span>
                  </button>

                  {activeProposal.hasAiInterview && (
                    <button
                      type="button"
                      onClick={() => setDetailTab('aiInterview')}
                      className={`relative px-4 py-2 rounded-xl font-black transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${
                        detailTab === 'aiInterview'
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 scale-[1.02] ring-1 ring-white/20'
                          : 'text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 font-extrabold'
                      }`}
                    >
                      <Bot size={14} className={detailTab === 'aiInterview' ? 'animate-bounce' : ''} />
                      <span>{t('inbox.tabAiInterview', { defaultValue: 'AI Assistant' })}</span>
                    </button>
                  )}
                </div>

                {/* Loading indicator during detail fetch */}
                {detailLoading && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-muted animate-pulse py-2">
                    <Sparkles size={14} className="text-brand animate-spin" />
                    <span>Đang tải chi tiết kế hoạch & giải pháp...</span>
                  </div>
                )}

                {/* TAB 1: OVERVIEW & SOLUTION */}
                {detailTab === 'overview' && (
                  <div className="space-y-5">
                    {/* Cover Letter */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                        <FileText size={14} className="text-brand" />
                        {t('createProposal.coverLetterLabel')}
                      </h4>
                      <div className="text-xs font-medium text-text-primary leading-relaxed whitespace-pre-wrap rounded-2xl border border-border bg-surface-muted/30 p-4 shadow-2xs">
                        {activeDetail?.coverLetter || activeProposal.coverLetter || 'Chưa cung cấp thư giới thiệu.'}
                      </div>
                    </div>

                    {/* Solution Strategy & Execution Plan */}
                    {(activeDetail?.solutionApproach || activeDetail?.analysisSummary) && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                          <Sparkles size={14} className="text-brand" />
                          {t('createProposal.solutionStrategyLabel')}
                        </h4>
                        <div className="text-xs font-medium text-text-primary leading-relaxed whitespace-pre-wrap rounded-2xl border border-border bg-surface-muted/30 p-4 shadow-2xs">
                          {activeDetail.solutionApproach || activeDetail.analysisSummary}
                        </div>
                      </div>
                    )}

                    {/* Overall Deliverables */}
                    {activeDetail?.deliverables && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                          <CheckCircle2 size={14} className="text-emerald-500" />
                          {t('createProposal.overallDeliverables')}
                        </h4>
                        <div className="text-xs font-medium text-text-primary leading-relaxed whitespace-pre-wrap rounded-2xl border border-border bg-surface-muted/30 p-4 shadow-2xs">
                          {activeDetail.deliverables}
                        </div>
                      </div>
                    )}

                    {/* Key Assumptions & Out of Scope Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeDetail?.assumptions && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                            <AlertCircle size={14} className="text-amber-500" />
                            {t('createProposal.keyAssumptions')}
                          </h4>
                          <div className="text-xs font-medium text-text-primary leading-relaxed whitespace-pre-wrap rounded-2xl border border-border bg-surface-muted/30 p-4 shadow-2xs">
                            {activeDetail.assumptions}
                          </div>
                        </div>
                      )}

                      {activeDetail?.outOfScope && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                            <Ban size={14} className="text-rose-500" />
                            {t('createProposal.outOfScope')}
                          </h4>
                          <div className="text-xs font-medium text-text-primary leading-relaxed whitespace-pre-wrap rounded-2xl border border-border bg-surface-muted/30 p-4 shadow-2xs">
                            {activeDetail.outOfScope}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 2: MILESTONES & BUDGET */}
                {detailTab === 'milestones' && (
                  <div className="space-y-5">
                    {/* Financial Summary Bento Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-2xl border border-border bg-surface-muted/40 p-4 shadow-2xs">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5 mb-1">
                          <Briefcase size={13} className="text-brand" />
                          {t('inbox.yourBid')}
                        </span>
                        <p className="text-xl font-black text-brand">
                          <GigCoinAmount amount={activeProposal.proposedBudget} />
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border bg-surface-muted/40 p-4 shadow-2xs">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5 mb-1">
                          <Clock size={13} className="text-brand" />
                          {t('inbox.duration')}
                        </span>
                        <p className="text-base font-black text-text-primary">
                          {activeProposal.proposedDuration || 'Linh hoạt'}
                        </p>
                      </div>
                    </div>

                    {/* Milestone List */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                        <Layers size={14} className="text-brand" />
                        {t('createProposal.section2Title')}
                      </h4>

                      {activeDetail?.milestonePlans && activeDetail.milestonePlans.length > 0 ? (
                        <div className="space-y-3">
                          {activeDetail.milestonePlans.map((m: ProposalMilestonePlanDto, idx: number) => (
                            <div key={m.id || idx} className="rounded-2xl border border-border/80 bg-surface-muted/30 p-4 space-y-2 shadow-2xs">
                              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
                                <span className="text-xs font-extrabold text-text-primary">
                                  {idx + 1}. {m.title || `Milestone ${idx + 1}`}
                                </span>
                                <span className="text-xs font-black text-brand">
                                  <GigCoinAmount amount={m.amount} />
                                </span>
                              </div>
                              {m.description && (
                                <p className="text-xs text-text-secondary leading-relaxed">{m.description}</p>
                              )}
                              {m.deliverables && (
                                <p className="text-[11px] font-semibold text-text-muted">
                                  🎯 Sản phẩm bàn giao: {m.deliverables}
                                </p>
                              )}
                              {m.dueDate && (
                                <p className="text-[11px] font-bold text-text-muted">
                                  📅 Hạn chót: {m.dueDate.split('T')[0]}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-border bg-surface-muted/20 p-8 text-center text-xs font-medium text-text-muted">
                          Chưa cấu hình chi tiết mốc thanh toán cho đề xuất này.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TAB 3: AI ASSISTANT & VETTING */}
                {detailTab === 'aiInterview' && activeProposal.hasAiInterview && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-5 shadow-2xs">
                      <Bot size={24} className="mt-0.5 shrink-0 text-purple-600 dark:text-purple-400" />
                      <div className="space-y-1">
                        <p className="text-sm font-black text-text-primary">
                          {activeProposal.aiInterviewCompleted
                            ? t('aiInterview.proposal.completedTitle')
                            : t('aiInterview.proposal.readyTitle')}
                        </p>
                        <p className="text-xs font-medium text-text-secondary leading-relaxed">
                          {activeProposal.aiInterviewCompleted
                            ? t('aiInterview.proposal.completedDescription')
                            : t('aiInterview.proposal.readyDescription')}
                        </p>

                        {!activeProposal.aiInterviewCompleted && Number(activeProposal.status) === ProposalStatus.Draft && (
                          <div className="pt-3">
                            <button
                              type="button"
                              onClick={() => navigate(`/ai-interview/${encodeURIComponent(activeProposal.jobPostsId)}`, {
                                state: {
                                  jobPostId: activeProposal.jobPostsId,
                                  jobTitle: activeProposal.jobTitle,
                                  interviewDefinitionId: activeProposal.aiInterviewDefinitionId,
                                  proposalId: activeProposal.proposalsId,
                                },
                              })}
                              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold text-white bg-purple-600 hover:bg-purple-700 transition-all cursor-pointer shadow-sm"
                            >
                              <Bot size={15} />
                              <span>
                                {activeProposal.aiInterviewInProgress
                                  ? t('aiInterview.proposal.continueAction')
                                  : t('aiInterview.proposal.startAction')}
                              </span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3 text-text-muted">
                <FileText size={42} className="text-text-muted/40" />
                <p className="text-sm font-bold">{t('inbox.selectProposal')}</p>
              </div>
            )}
          </section>

        </div>

        {/* Screening Answers Modal */}
        <ProposalAnswersModal modalState={answersModal} />

        {/* Confirm Withdraw Proposal Modal */}
        <ConfirmationModal
          isOpen={Boolean(withdrawTarget)}
          onClose={() => setWithdrawTarget(null)}
          onConfirm={handleConfirmWithdraw}
          title={t('inbox.confirmWithdrawTitle', { defaultValue: 'Xác nhận rút đề xuất' })}
          description={t('inbox.confirmWithdrawBody', { defaultValue: 'Bạn có chắc chắn muốn rút đề xuất cho dự án này không?' })}
          confirmText={t('inbox.confirmWithdrawAction', { defaultValue: 'Rút Đề Xuất' })}
          cancelText={t('inbox.cancel', { defaultValue: 'Hủy bỏ' })}
          variant="danger"
          isLoading={withdrawing}
        />

      </div>
    </AppLayout>
  );
}
