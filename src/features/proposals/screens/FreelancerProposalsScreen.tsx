import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ArrowLeft,
  Bot,
  Briefcase,
  Edit3,
  FileText,
  MessageSquare,
  ShieldAlert,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { proposalGetAPI } from '../../../api/proposalAPI/GET';
import { proposalPatchAPI } from '../../../api/proposalAPI/PATCH';
import { ProposalStatus, type ProposalDto } from '../../../types/models/Proposal';
import type { ProposalStatusFilter } from '../types';
import { canEditProposal, canViewProposalAnswers, canWithdrawProposal, getStatusLabel } from '../utils/statusHelpers';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { useTranslation } from '../../../hooks/useTranslation';

type ProposalItem = ProposalDto & {
  updatedAt?: string | null;
};

export default function FreelancerProposalsScreen() {
  const { t } = useTranslation(['proposals', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);

  const submittedProposalId = (location.state as { submittedProposalId?: string } | null)?.submittedProposalId;

  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [activeProposalId, setActiveProposalId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ProposalStatusFilter>('all');
  const [message, setMessage] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [openingNegotiationId, setOpeningNegotiationId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [, setTotalCount] = useState(0);
  const pageSize = 10;

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
      { selector: '.fps-gsap-sidebar', x: -20, duration: 0.5 },
      { selector: '.fps-gsap-detail', y: 20, duration: 0.5 },
    ],
  });

  const handleStatusFilterChange = (status: ProposalStatusFilter) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const filteredProposals = useMemo(() => {
    return [...proposals].sort((a, b) =>
      new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
    );
  }, [proposals]);

  useEffect(() => {
    if (filteredProposals.length === 0) {
      setActiveProposalId(null);
      return;
    }

    if (!activeProposalId || !filteredProposals.some(proposal => proposal.proposalsId === activeProposalId)) {
      setActiveProposalId(filteredProposals[0].proposalsId);
    }
  }, [filteredProposals, activeProposalId]);

  const activeProposal = useMemo(
    () => filteredProposals.find(proposal => proposal.proposalsId === activeProposalId) || null,
    [filteredProposals, activeProposalId]
  );

  const handleWithdraw = async (proposal: ProposalItem) => {
    if (!canWithdrawProposal(proposal.status)) {
      setMessage('Only pending proposals can be withdrawn.');
      return;
    }

    setActionLoadingId(proposal.proposalsId);
    setMessage('');

    const response = await proposalPatchAPI.updateProposalStatus(proposal.proposalsId, {
      status: ProposalStatus.Withdrawn,
    });

    setActionLoadingId(null);

    if (!response.success) {
      setMessage(response.message || 'Proposal could not be withdrawn.');
      return;
    }

    setProposals(prev => prev.map(item => item.proposalsId === proposal.proposalsId
      ? { ...item, status: ProposalStatus.Withdrawn, updatedAt: new Date().toISOString() }
      : item
    ));
    toast.success(t('inbox.withdrawnSuccess'));
  };

  const openAcceptedNegotiation = (proposal: ProposalItem) => {
    setOpeningNegotiationId(proposal.proposalsId);
    navigate('/messages', { state: { proposalId: proposal.proposalsId } });
  };

  // All status badges share the exact same text color (text-text-primary) with distinct soft backgrounds
  const statusBadgeClass = (status: number | string) => {
    const value = Number(status);
    if (value === ProposalStatus.Accepted) return 'border border-emerald-500/40 bg-emerald-500/15 text-text-primary font-black';
    if (value === ProposalStatus.Rejected || value === ProposalStatus.Withdrawn) return 'border border-rose-500/40 bg-rose-500/15 text-text-primary font-black';
    if (value === ProposalStatus.Shortlisted) return 'border border-blue-500/40 bg-blue-500/20 text-text-primary font-black';
    if (value === ProposalStatus.Draft) return 'border border-border bg-surface-muted text-text-primary font-black';
    return 'border border-amber-500/40 bg-amber-500/15 text-text-primary font-black';
  };

  return (
    <AppLayout fullWidth>
      <div ref={containerRef} className="flex flex-col h-[calc(100vh-4rem)] bg-background text-text-primary overflow-hidden">

        {/* ── Top Chrome Header Bar ─────────────────────────────────────────── */}
        <header className="fps-gsap-header sticky top-0 z-40 flex items-center justify-between px-6 py-3 border-b border-border bg-background/80 backdrop-blur-md shrink-0">
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

        {/* Message Banner */}
        {message && (
          <div className="mx-6 mt-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 flex items-center gap-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400 shrink-0">
            <ShieldAlert size={16} className="shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* ── Main Layout Workspace ─────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden p-4 gap-4">

          {/* Left Column: Applications List (Expanded width to w-[440px] to fit all filters) */}
          <section className="fps-gsap-sidebar w-full md:w-96 lg:w-[440px] flex flex-col rounded-2xl border border-border bg-background shrink-0 overflow-hidden shadow-sm">
            
            {/* Filter Tabs Bar (Selectable Pills wrapped cleanly) */}
            <div className="p-3 border-b border-border bg-surface-muted/30 shrink-0">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { value: 'all', label: 'Tất cả' },
                  { value: '1', label: 'Đang chờ' },
                  { value: '2', label: 'Vào danh sách' },
                  { value: '3', label: 'Đã chấp nhận' },
                  { value: '4', label: 'Đã từ chối' },
                  { value: '5', label: 'Đã rút' },
                  { value: '0', label: 'Nháp' },
                ].map(tab => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => handleStatusFilterChange(tab.value as ProposalStatusFilter)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                      statusFilter === tab.value
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-text-secondary hover:bg-background hover:text-text-primary border border-transparent'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* List Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="p-8 text-center text-xs font-semibold text-text-muted">
                  <LemniscateBloomLoader label={t('inbox.loading')} size={48} />
                </div>
              ) : filteredProposals.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <FileText size={32} className="mx-auto text-text-muted" />
                  <p className="text-xs font-bold text-text-secondary">{t('inbox.noProposals')}</p>
                </div>
              ) : (
                filteredProposals.map(proposal => {
                  const isActive = proposal.proposalsId === activeProposalId;
                  return (
                    <div
                      key={proposal.proposalsId}
                      onClick={() => setActiveProposalId(proposal.proposalsId)}
                      className={`border-b border-border/50 p-4 cursor-pointer transition-all hover:bg-surface-muted/60 ${
                        isActive ? 'bg-brand/5 border-l-4 border-l-brand' : ''
                      }`}
                    >
                      <h3 className="text-xs font-bold truncate text-text-primary leading-snug">
                        {proposal.jobTitle || 'Dự án không có tiêu đề'}
                      </h3>
                      <div className="flex justify-between items-center mt-2.5">
                        <span className="text-xs font-extrabold text-brand">
                          <GigCoinAmount amount={proposal.proposedBudget} />
                        </span>
                        <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${statusBadgeClass(proposal.status)}`}>
                          {getStatusLabel(proposal.status)}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-border bg-background flex items-center justify-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={currentPage === 1 || loading}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-text-primary hover:border-brand/40 hover:text-brand disabled:opacity-40 transition-all cursor-pointer font-bold text-xs"
                >
                  &lt;
                </button>

                <span className="text-xs font-bold text-text-muted px-2">
                  {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-text-primary hover:border-brand/40 hover:text-brand disabled:opacity-40 transition-all cursor-pointer font-bold text-xs"
                >
                  &gt;
                </button>
              </div>
            )}
          </section>

          {/* Right Column: Selected Proposal Detail */}
          <section className="fps-gsap-detail flex-1 rounded-2xl border border-border bg-background shadow-sm overflow-hidden flex flex-col p-6 overflow-y-auto custom-scrollbar">
            {activeProposal ? (
              <div className="space-y-6">
                {/* Proposal Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border pb-4">
                  <div>
                    <h2 className="text-lg font-extrabold text-text-primary leading-snug">
                      {activeProposal.jobTitle || 'Đề xuất ứng tuyển'}
                    </h2>
                    <p className="text-xs font-semibold text-text-muted mt-1">
                      {t('inbox.submittedOn', {
                        date: activeProposal.submittedAt
                          ? new Date(activeProposal.submittedAt).toLocaleDateString()
                          : 'Gần đây',
                      })}
                    </p>
                  </div>
                  <span className={`self-start rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wider ${statusBadgeClass(activeProposal.status)}`}>
                    {getStatusLabel(activeProposal.status)}
                  </span>
                </div>

                {/* Financial & Duration summary grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-border bg-surface-muted/40 p-4">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                      {t('inbox.yourBid')}
                    </span>
                    <p className="text-lg font-black text-brand mt-1">
                      <GigCoinAmount amount={activeProposal.proposedBudget} />
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-surface-muted/40 p-4">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                      {t('inbox.duration')}
                    </span>
                    <p className="text-base font-extrabold text-text-primary mt-1">
                      {activeProposal.proposedDuration || 'Linh hoạt'}
                    </p>
                  </div>
                </div>

                {/* Cover Letter */}
                <div className="space-y-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-muted">
                    {t('inbox.coverLetter')}
                  </h4>
                  <div className="text-xs font-medium text-text-primary leading-relaxed whitespace-pre-wrap rounded-2xl border border-border bg-surface-muted/30 p-4">
                    {activeProposal.coverLetter || 'Chưa cung cấp thư giới thiệu.'}
                  </div>
                </div>

                {/* AI Interview Banner */}
                {activeProposal.hasAiInterview && (
                  <div className="flex items-start gap-3 rounded-2xl border border-purple-500/20 bg-purple-500/10 p-4">
                    <Bot size={20} className="mt-0.5 shrink-0 text-purple-600 dark:text-purple-400" />
                    <div>
                      <p className="text-xs font-extrabold text-text-primary">
                        {activeProposal.aiInterviewCompleted
                          ? t('aiInterview.proposal.completedTitle')
                          : t('aiInterview.proposal.readyTitle')}
                      </p>
                      <p className="mt-1 text-xs font-medium text-text-secondary leading-relaxed">
                        {activeProposal.aiInterviewCompleted
                          ? t('aiInterview.proposal.completedDescription')
                          : t('aiInterview.proposal.readyDescription')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions Toolbar */}
                <div className="flex flex-wrap items-center gap-3 border-t border-border pt-6">
                  {canEditProposal(activeProposal.status) && (
                    <button
                      type="button"
                      onClick={() => navigate(`/proposals/${activeProposal.proposalsId}/edit`)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
                      style={{ background: 'var(--brand)', boxShadow: '0 4px 14px -2px rgba(73,75,231,0.3)' }}
                    >
                      <Edit3 size={15} />
                      <span>{t('inbox.continueEditing')}</span>
                    </button>
                  )}

                  {canViewProposalAnswers(activeProposal.status) && (
                    <button
                      type="button"
                      onClick={() => navigate(`/proposals/${activeProposal.proposalsId}/answers`)}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-xs font-bold text-text-primary hover:border-brand/40 hover:text-brand transition-all"
                    >
                      <FileText size={15} />
                      <span>{t('inbox.viewAnswers')}</span>
                    </button>
                  )}

                  {activeProposal.hasAiInterview
                    && !activeProposal.aiInterviewCompleted
                    && [ProposalStatus.Draft, ProposalStatus.Pending, ProposalStatus.Shortlisted, ProposalStatus.Accepted].includes(Number(activeProposal.status)) && (
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
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
                      style={{ background: 'var(--brand)', boxShadow: '0 4px 14px -2px rgba(73,75,231,0.3)' }}
                    >
                      <Bot size={15} />
                      <span>
                        {activeProposal.aiInterviewInProgress
                          ? t('aiInterview.proposal.continueAction')
                          : t('aiInterview.proposal.startAction')}
                      </span>
                    </button>
                  )}

                  {Number(activeProposal.status) === ProposalStatus.Accepted && (
                    <button
                      type="button"
                      onClick={() => openAcceptedNegotiation(activeProposal)}
                      disabled={openingNegotiationId === activeProposal.proposalsId}
                      className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-sm"
                    >
                      <MessageSquare size={15} />
                      <span>
                        {openingNegotiationId === activeProposal.proposalsId ? t('inbox.openingNegotiation') : t('inbox.enterNegotiation')}
                      </span>
                    </button>
                  )}

                  {/* Withdraw button with explicit Red Border */}
                  {canWithdrawProposal(activeProposal.status) && (
                    <button
                      type="button"
                      onClick={() => handleWithdraw(activeProposal)}
                      disabled={actionLoadingId === activeProposal.proposalsId}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/50 bg-rose-500/10 px-5 py-2.5 text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 hover:border-rose-600 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                    >
                      <XCircle size={15} className="text-rose-500 shrink-0" />
                      <span>{t('inbox.withdraw')}</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-3 text-text-muted">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand mb-1">
                  <FileText size={28} />
                </div>
                <p className="text-xs font-bold text-text-secondary">
                  {t('inbox.selectProposal')}
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/jobs/browse')}
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-extrabold text-white transition-all hover:opacity-90"
                  style={{ background: 'var(--brand)' }}
                >
                  <Briefcase size={14} /> {t('inbox.browseJobs')}
                </button>
              </div>
            )}
          </section>

        </div>
      </div>
    </AppLayout>
  );
}
