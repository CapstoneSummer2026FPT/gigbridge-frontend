import { useRef } from 'react';
import {
  ArrowLeft,
  Brain,
  Check,
  CircleDollarSign,
  FileSearch,
  Filter,
  LayoutList,
  Loader2,
  Search,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../app/components/ui/alert-dialog';
import { ProposalStatus, type ProposalDto } from '../../../types/models/Proposal';
import type { ProposalStatusFilter } from '../types';
import { getStatusLabel } from '../utils/statusHelpers';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { ProposalJudgingListView } from '../components/ProposalJudgingListView';
import { ProposalDetailModal } from '../components/ProposalDetailModal';
import ClientProposalJobSidebar from '../components/ClientProposalJobSidebar';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { CustomSelect } from '../../../shared/components/CustomSelect';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { useTranslation } from '../../../hooks/useTranslation';
import { useClientProposals, type SortBy } from '../hooks/useClientProposals';
import '../styles/client-proposals-screen.css';

const badgeClass = (status: number) => {
  if (status === ProposalStatus.Accepted) return 'border border-emerald-500/40 bg-emerald-500/15 text-text-primary font-black';
  if (status === ProposalStatus.Rejected || status === ProposalStatus.Withdrawn) return 'border border-rose-500/40 bg-rose-500/15 text-text-primary font-black';
  if (status === ProposalStatus.Shortlisted) return 'border border-blue-500/40 bg-blue-500/20 text-text-primary font-black';
  if (status === ProposalStatus.Draft) return 'border border-border bg-slate-500/15 text-text-primary font-black';
  return 'border border-amber-500/40 bg-amber-500/15 text-text-primary font-black';
};

const formatDate = (value?: string | null) => value
  ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(value))
  : '—';

const previewText = (value?: string | null, max = 120) => {
  const text = (value || '').replace(/[*_`>#-]/g, '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
};

const inputClass =
  'h-10 w-full rounded-xl border border-border bg-background px-3 text-xs font-bold text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20';
const buttonFocus = 'outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-background';

export default function ClientProposalsScreen() {
  const { t } = useTranslation(['proposals', 'jobs', 'common']);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    navigate,
    jobs,
    selectedJobId,
    selectedJob,
    selectedJobCanNegotiate,
    proposals,
    visible,
    pagedVisible,
    totalPages,
    currentPage,
    setCurrentPage,
    loading,
    loadError,
    stats,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    filtersOpen,
    setFiltersOpen,
    budgetMin,
    setBudgetMin,
    budgetMax,
    setBudgetMax,
    durationMax,
    setDurationMax,
    milestoneMin,
    setMilestoneMin,
    milestoneMax,
    setMilestoneMax,
    submittedFrom,
    setSubmittedFrom,
    submittedTo,
    setSubmittedTo,
    viewMode,
    setViewMode,
    activeFilterCount,
    evalModalOpen,
    setEvalModalOpen,
    evalLoading,
    evalResult,
    evalError,
    modalTab,
    setModalTab,
    activeId,
    detail,
    detailLoading,
    detailError,
    busyAction,
    rejectProposalId,
    setRejectProposalId,
    rawAnswers,
    selectJob,
    updateStatus,
    acceptForNegotiation,
    openNegotiation,
    openProposalModal,
    resetAdvancedFilters,
    resetAllFilters,
    refreshProposals,
    setProposalReloadKey,
    isBusy,
    canClientAct,
  } = useClientProposals();


  // GSAP Entrance animation
  usePageGSAP({
    containerRef,
    loading,
    groups: [
      { selector: '.cps-gsap-header', y: 20, duration: 0.55 },
      { selector: '.cps-gsap-metrics', y: 16, duration: 0.5, stagger: 0.08 },
      { selector: '.cps-gsap-main', y: 24, duration: 0.5 },
    ],
  });


  const detailMilestoneTotal = detail?.milestonePlans?.reduce((sum, item) => sum + (Number(item.amount) || 0), 0) ?? 0;

  const metricCards = [
    { label: t('proposalReview.metrics.total'), value: stats.total, icon: LayoutList, tone: 'text-brand' },
    { label: t('proposalReview.metrics.pending'), value: stats.pending, icon: FileSearch, tone: 'text-amber-500' },
    { label: t('proposalReview.metrics.shortlisted'), value: stats.shortlisted, icon: Check, tone: 'text-blue-500' },
    { label: t('proposalReview.metrics.averageBid'), value: formatGigCoin(stats.averageBid), icon: CircleDollarSign, tone: 'text-emerald-500' },
  ];

  return (
    <AppLayout fullWidth>
      <div ref={containerRef} className="min-h-[calc(100vh-4rem)] bg-background text-text-primary">
        
        {/* ── Top Glass Header Bar ─────────────────────────────────────────── */}
        <header className="cps-gsap-header cps-header sticky top-0 z-40 border-b border-border px-4 py-4 backdrop-blur lg:px-8">
          <div className="mx-auto flex max-w-[1600px] min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/client/dashboard')}
              aria-label={t('proposalReview.back')}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-text-secondary transition hover:border-brand/50 hover:text-brand cursor-pointer ${buttonFocus}`}
            >
              <ArrowLeft size={18} />
            </button>

            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-brand">
                <Sparkles size={14} />
                {t('proposalReview.eyebrow')}
              </div>
              <h1 className="truncate text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
                {t('proposalReview.titleWord1')} <span className="text-brand italic font-light">{t('proposalReview.titleWord2')}</span>
              </h1>
              <p className="mt-0.5 text-xs font-semibold text-text-muted">{t('proposalReview.subtitle')}</p>
            </div>

            {/* View Mode Toggle */}
            <div className="ml-auto flex items-center rounded-xl border border-border bg-surface-muted/60 p-1 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`rounded-lg px-3 py-1.5 font-extrabold transition cursor-pointer ${viewMode === 'table' ? 'bg-background shadow-sm text-text-primary' : 'text-text-muted hover:text-text-primary'}`}
              >
                Standard Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('aiJudging')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-extrabold transition cursor-pointer ${viewMode === 'aiJudging' ? 'bg-purple-600 text-white shadow-sm' : 'text-purple-600 dark:text-purple-400 hover:text-text-primary'}`}
              >
                <Brain size={14} /> AI Judging Leaderboard
              </button>
            </div>
          </div>
        </header>

        {/* ── Main Workspace ─────────────────────────────────────────────────── */}
        <main className="mx-auto grid max-w-[1600px] gap-5 px-4 py-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:px-8">
          
          {/* Left Sidebar: Job Posts Navigation */}
          <ClientProposalJobSidebar
            jobs={jobs}
            selectedJobId={selectedJobId}
            onSelect={selectJob}
            onCreateJob={() => navigate('/jobs/post')}
          />

          {/* Right Main Content */}
          <div className="min-w-0 space-y-5">
            {viewMode === 'aiJudging' ? (
              <ProposalJudgingListView
                jobPostId={selectedJobId || ''}
                jobTitle={selectedJob?.title || 'Job Post'}
                proposals={proposals}
                loading={loading}
                onSelectProposal={id => openProposalModal(id, 'aiReport')}
                onShortlist={id => updateStatus(id, ProposalStatus.Shortlisted, 'shortlist')}
                onStartNegotiation={id => acceptForNegotiation(id)}
                onReject={id => updateStatus(id, ProposalStatus.Rejected, 'reject')}
                canAct={selectedJobCanNegotiate}
                onRefreshProposals={refreshProposals}
              />
            ) : (
              <>
                {selectedJob && !selectedJobCanNegotiate && (
                  <div role="status" className="rounded-2xl border border-amber-500/40 bg-amber-500/15 px-4 py-3 text-xs font-black text-text-primary flex items-center gap-2.5 shadow-sm">
                    <ShieldAlert size={16} className="text-amber-500 shrink-0" />
                    <span>{t('proposalReview.readOnly')}</span>
                  </div>
                )}

                {/* Metric Summary Cards */}
                <section aria-label={t('proposalReview.metrics.label')} className="cps-gsap-metrics grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {metricCards.map(({ label, value, icon: Icon, tone }) => (
                    <article key={label} className="cps-card p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">{label}</p>
                          <p className="mt-1 text-xl font-black tracking-tight text-text-primary">{value}</p>
                        </div>
                        <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl bg-surface-muted ${tone}`}>
                          <Icon size={19} />
                        </span>
                      </div>
                    </article>
                  ))}
                </section>

                {/* Filter Controls & Proposals Table */}
                <section className="cps-gsap-main rounded-2xl border border-border bg-background shadow-sm overflow-hidden flex flex-col min-h-[640px]">
                  <div className="border-b border-border p-4 shrink-0">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                      <label className="relative min-w-0 flex-1">
                        <span className="sr-only">{t('proposalReview.search')}</span>
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={17} />
                        <input
                          value={search}
                          onChange={event => setSearch(event.target.value)}
                          placeholder={t('proposalReview.searchPlaceholder')}
                          className={`${inputClass} pl-10`}
                        />
                      </label>
                      <div className="grid grid-cols-2 gap-2 sm:flex">
                        <div className="sm:w-44">
                          <CustomSelect
                            ariaLabel={t('proposalReview.status')}
                            value={statusFilter}
                            onChange={val => setStatusFilter(val as ProposalStatusFilter)}
                            options={[
                              { value: 'all', label: t('proposalReview.statuses.all') },
                              { value: '1', label: t('proposalReview.statuses.pending') },
                              { value: '2', label: t('proposalReview.statuses.shortlisted') },
                              { value: '3', label: t('proposalReview.statuses.accepted') },
                              { value: '4', label: t('proposalReview.statuses.rejected') },
                              { value: '5', label: t('proposalReview.statuses.withdrawn') },
                            ]}
                          />
                        </div>

                        <div className="sm:w-44">
                          <CustomSelect
                            ariaLabel={t('proposalReview.sort')}
                            value={sortBy}
                            onChange={val => setSortBy(val as SortBy)}
                            options={[
                              { value: 'submittedAt', label: t('proposalReview.sorts.newest') },
                              { value: 'budget', label: t('proposalReview.sorts.budget') },
                              { value: 'duration', label: t('proposalReview.sorts.duration') },
                              { value: 'status', label: t('proposalReview.sorts.status') },
                              { value: 'milestoneTotal', label: t('proposalReview.sorts.milestones') },
                            ]}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setFiltersOpen(current => !current)}
                          aria-expanded={filtersOpen}
                          className={`col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition ${filtersOpen || activeFilterCount ? 'border-brand bg-brand/10 text-brand' : 'border-border hover:bg-surface-muted'} ${buttonFocus}`}
                        >
                          <Filter size={16} />
                          {t('proposalReview.filters')}
                          {activeFilterCount > 0 && <span className="rounded-full bg-brand px-1.5 py-0.5 text-[10px] text-white">{activeFilterCount}</span>}
                        </button>
                      </div>
                    </div>

                    {/* Advanced Filter Panel */}
                    {filtersOpen && (
                      <div className="mt-4 rounded-xl border border-border bg-surface-muted/30 p-4">
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <h2 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-text-primary">
                            <SlidersHorizontal size={15} />{t('proposalReview.advancedFilters')}
                          </h2>
                          <button type="button" onClick={resetAdvancedFilters} className={`text-xs font-bold text-brand hover:underline ${buttonFocus}`}>
                            {t('proposalReview.clearAdvanced')}
                          </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                          <FilterInput label={t('proposalReview.filterLabels.budgetMin')} type="number" value={budgetMin} onChange={setBudgetMin} />
                          <FilterInput label={t('proposalReview.filterLabels.budgetMax')} type="number" value={budgetMax} onChange={setBudgetMax} />
                          <FilterInput label={t('proposalReview.filterLabels.durationMax')} type="number" value={durationMax} onChange={setDurationMax} />
                          <FilterInput label={t('proposalReview.filterLabels.milestoneMin')} type="number" value={milestoneMin} onChange={setMilestoneMin} />
                          <FilterInput label={t('proposalReview.filterLabels.milestoneMax')} type="number" value={milestoneMax} onChange={setMilestoneMax} />
                          <FilterInput label={t('proposalReview.filterLabels.submittedFrom')} type="date" value={submittedFrom} onChange={setSubmittedFrom} />
                          <FilterInput label={t('proposalReview.filterLabels.submittedTo')} type="date" value={submittedTo} onChange={setSubmittedTo} />
                        </div>
                      </div>
                    )}

                    {/* Active Filter Chips */}
                    {(search || statusFilter !== 'all' || activeFilterCount > 0) && (
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-text-muted">{t('proposalReview.activeFilters')}</span>
                        {search && <FilterChip label={`${t('proposalReview.search')}: ${search}`} onRemove={() => setSearch('')} />}
                        {statusFilter !== 'all' && <FilterChip label={getStatusLabel(Number(statusFilter))} onRemove={() => setStatusFilter('all')} />}
                        {activeFilterCount > 0 && <FilterChip label={t('proposalReview.advancedFilterCount', { count: activeFilterCount })} onRemove={resetAdvancedFilters} />}
                        <button type="button" onClick={resetAllFilters} className={`font-bold text-brand hover:underline ${buttonFocus}`}>
                          {t('proposalReview.clearAll')}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Table Content & Pagination Container */}
                  <div className="flex-1 flex flex-col justify-between min-h-0">
                    {loadError ? (
                      <div className="p-12 text-center my-auto">
                        <FileSearch className="mx-auto mb-3 text-rose-500" size={34} />
                        <p role="alert" className="font-bold text-text-primary">{loadError}</p>
                        <button type="button" onClick={() => setProposalReloadKey(current => current + 1)} className="mt-3 text-xs font-extrabold text-brand hover:underline">
                          {t('proposalReview.retry')}
                        </button>
                      </div>
                    ) : loading ? (
                      <div className="flex min-h-[300px] items-center justify-center p-12 my-auto">
                        <LemniscateBloomLoader label={t('proposalReview.loading', { defaultValue: 'Loading proposals...' })} size={52} />
                      </div>
                    ) : visible.length === 0 ? (
                      <div className="p-12 text-center my-auto">
                        <UserRound className="mx-auto mb-3 text-text-muted" size={36} />
                        <h2 className="font-extrabold text-text-primary">{proposals.length ? t('proposalReview.emptyFilteredTitle') : t('proposalReview.emptyTitle')}</h2>
                        <p className="mt-1 text-xs font-semibold text-text-muted">{proposals.length ? t('proposalReview.emptyFilteredBody') : t('proposalReview.emptyBody')}</p>
                        {proposals.length > 0 && (
                          <button type="button" onClick={resetAllFilters} className="mt-4 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white hover:opacity-90">
                            {t('proposalReview.clearAll')}
                          </button>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="hidden overflow-x-auto md:block">
                          <table className="w-full min-w-[960px] table-fixed text-left text-xs">
                            <thead className="bg-surface-muted/60 text-[11px] font-extrabold uppercase tracking-wider text-text-muted">
                              <tr>
                                <th className="w-[22%] px-4 py-3">{t('proposalReview.columns.candidate')}</th>
                                <th className="w-[14%] px-4 py-3">{t('proposalReview.columns.offer')}</th>
                                <th className="w-[16%] px-4 py-3">{t('proposalReview.columns.plan')}</th>
                                <th className="w-[32%] px-4 py-3">{t('proposalReview.columns.summary')}</th>
                                <th className="w-[16%] px-4 py-3">{t('proposalReview.columns.status')}</th>
                                <th className="w-[14%] px-4 py-3">{t('proposalReview.columns.submitted')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {pagedVisible.map(item => (
                                <ProposalTableRow key={item.proposalsId} item={item} t={t} onOpen={id => openProposalModal(id, 'userAnswers')} />
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Responsive Cards for mobile */}
                        <div className="grid gap-3 p-3 md:hidden">
                          {pagedVisible.map(item => (
                            <ProposalCard key={item.proposalsId} item={item} t={t} onOpen={id => openProposalModal(id, 'userAnswers')} />
                          ))}
                        </div>

                        {/* Pagination Controls */}
                        <div className="mt-auto border-t border-border">
                          <div className="p-4 bg-background flex items-center justify-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={currentPage === 1}
                              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background hover:border-brand/40 hover:text-brand disabled:opacity-40 transition-all cursor-pointer font-bold text-xs"
                            >
                              &lt;
                            </button>

                            <span className="text-xs font-bold text-text-muted px-2">
                              {currentPage} / {totalPages}
                            </span>

                            <button
                              type="button"
                              disabled={currentPage >= totalPages}
                              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background hover:border-brand/40 hover:text-brand disabled:opacity-40 transition-all cursor-pointer font-bold text-xs"
                            >
                              &gt;
                            </button>
                          </div>

                          {!loading && !loadError && (
                            <div className="border-t border-border px-4 py-3 text-xs font-semibold text-text-muted">
                              {t('proposalReview.results', { visible: visible.length, total: proposals.length })}
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        </main>

        {/* ── Confirm Reject Dialog ────────────────────────────────────────── */}
        <AlertDialog open={Boolean(rejectProposalId)} onOpenChange={open => !open && setRejectProposalId(null)}>
          <AlertDialogContent className="rounded-3xl border border-border bg-background p-6 shadow-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg font-black text-text-primary">{t('proposalReview.reject.title')}</AlertDialogTitle>
              <AlertDialogDescription className="text-xs font-medium text-text-secondary">{t('proposalReview.reject.description')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-2">
              <AlertDialogCancel disabled={Boolean(busyAction)} className="rounded-xl border border-border px-4 py-2 text-xs font-bold">{t('proposalReview.reject.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                disabled={!rejectProposalId || Boolean(busyAction)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-rose-700 shadow-sm"
                onClick={event => {
                  event.preventDefault();
                  if (rejectProposalId) void updateStatus(rejectProposalId, ProposalStatus.Rejected, 'reject');
                }}
              >
                {busyAction ? <Loader2 className="animate-spin" size={16} /> : null}
                {t('proposalReview.reject.confirm')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Proposal Detail & Evaluation Modal (Extracted Component) ────────── */}
        <ProposalDetailModal
          isOpen={evalModalOpen}
          onClose={() => setEvalModalOpen(false)}
          activeId={activeId}
          detail={detail}
          detailLoading={detailLoading}
          detailError={detailError}
          proposals={proposals}
          detailMilestoneTotal={detailMilestoneTotal}
          modalTab={modalTab}
          setModalTab={setModalTab}
          evalLoading={evalLoading}
          evalError={evalError}
          evalResult={evalResult}
          rawAnswers={rawAnswers}
          rejectProposalId={rejectProposalId}
          setRejectProposalId={setRejectProposalId}
          selectedJobCanNegotiate={selectedJobCanNegotiate}
          canClientAct={(status?: number) => canClientAct(status ?? 0)}
          isBusy={isBusy}
          updateStatus={updateStatus}
          acceptForNegotiation={acceptForNegotiation}
          openNegotiation={openNegotiation}
          badgeClass={badgeClass}
          t={t}
        />
      </div>
    </AppLayout>
  );
}

function FilterInput({ label, type, value, onChange }: {
  label: string;
  type: 'number' | 'date';
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-bold text-text-muted">{label}</span>
      <input type={type} min={type === 'number' ? 0 : undefined} value={value} onChange={event => onChange(event.target.value)} className={inputClass} />
    </label>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-brand/20 bg-brand/10 px-2.5 py-1 text-[11px] font-extrabold text-brand">
      {label}
      <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="rounded-full p-0.5 hover:bg-brand/20 cursor-pointer"><X size={12} /></button>
    </span>
  );
}

function ProposalTableRow({ item, t, onOpen }: {
  item: ProposalDto;
  t: ReturnType<typeof useTranslation>['t'];
  onOpen: (id: string, trigger: HTMLElement) => void;
}) {
  const status = Number(item.status);
  return (
    <tr
      tabIndex={0}
      role="button"
      aria-label={`${item.freelancerName || t('proposalReview.freelancer')} proposal`}
      onClick={event => onOpen(item.proposalsId, event.currentTarget)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(item.proposalsId, event.currentTarget);
        }
      }}
      className="cps-table-row border-t border-border transition cursor-pointer focus:outline-none focus:bg-brand/5"
    >
      <td className="px-4 py-4 align-top overflow-hidden">
        <div className="flex items-center gap-3">
          <UserProfileLink userId={item.freelancerUserId} role="freelancer" className="flex items-center gap-3 min-w-0">
            <UserAvatar
              userId={item.freelancerUserId}
              name={item.freelancerName || 'Freelancer'}
              size="md"
            />
            <div className="min-w-0">
              <p className="truncate font-bold text-text-primary max-w-[130px]">{item.freelancerName || t('proposalReview.freelancer')}</p>
              <p className="mt-0.5 text-xs font-semibold text-text-muted">{t('proposalReview.candidate')}</p>
            </div>
          </UserProfileLink>
        </div>
      </td>
      <td className="px-4 py-4 align-top overflow-hidden">
        <p className="font-extrabold text-brand truncate">{formatGigCoin(item.proposedBudget || 0)}</p>
        <p className="mt-1 text-xs font-semibold text-text-muted truncate">{item.proposedDuration || '—'}</p>
      </td>
      <td className="px-4 py-4 align-top overflow-hidden">
        <p className="font-bold text-text-primary truncate">{item.milestoneCount || 0} {t('proposalReview.milestones')}</p>
        <p className="mt-1 text-xs font-semibold text-text-muted truncate">{item.workItemCount || 0} {t('proposalReview.workItems')} · {formatGigCoin(item.milestoneTotal || 0)}</p>
      </td>
      <td className="px-4 py-4 align-top text-xs font-medium text-text-secondary leading-relaxed overflow-hidden">
        <p className="line-clamp-2 break-words text-xs font-medium text-text-secondary leading-relaxed">
          {previewText(item.analysisSummaryPreview || item.coverLetter, 120) || t('proposalReview.notProvided')}
        </p>
      </td>
      <td className="px-4 py-4 align-top overflow-hidden"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] ${badgeClass(status)}`}>{getStatusLabel(status)}</span></td>
      <td className="px-4 py-4 align-top text-xs font-semibold text-text-muted truncate overflow-hidden">{formatDate(item.submittedAt)}</td>
    </tr>
  );
}

function ProposalCard({ item, t, onOpen }: {
  item: ProposalDto;
  t: ReturnType<typeof useTranslation>['t'];
  onOpen: (id: string, trigger: HTMLElement) => void;
}) {
  const status = Number(item.status);
  return (
    <article
      tabIndex={0}
      role="button"
      aria-label={`${item.freelancerName || t('proposalReview.freelancer')} proposal`}
      onClick={event => onOpen(item.proposalsId, event.currentTarget)}
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(item.proposalsId, event.currentTarget);
        }
      }}
      className="cps-card p-4 cursor-pointer transition hover:border-brand/40"
    >
      <div className="flex items-start justify-between gap-3">
        <UserProfileLink userId={item.freelancerUserId} role="freelancer" className="flex min-w-0 items-center gap-3">
          <UserAvatar
            userId={item.freelancerUserId}
            name={item.freelancerName || 'Freelancer'}
            size="md"
          />
          <div className="min-w-0">
            <h2 className="truncate font-extrabold text-text-primary text-sm">{item.freelancerName || t('proposalReview.freelancer')}</h2>
            <p className="text-xs font-semibold text-text-muted">{formatDate(item.submittedAt)}</p>
          </div>
        </UserProfileLink>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] ${badgeClass(status)}`}>{getStatusLabel(status)}</span>
      </div>
      <div className="my-3 grid grid-cols-2 gap-3 rounded-xl bg-surface-muted/40 p-3 text-xs">
        <div><p className="text-[11px] font-bold text-text-muted">{t('proposalReview.columns.offer')}</p><p className="mt-1 font-black text-brand">{formatGigCoin(item.proposedBudget || 0)}</p></div>
        <div><p className="text-[11px] font-bold text-text-muted">{t('proposalReview.sorts.duration')}</p><p className="mt-1 font-extrabold text-text-primary">{item.proposedDuration || '—'}</p></div>
      </div>
      <p className="line-clamp-2 text-xs font-medium leading-relaxed text-text-secondary">{previewText(item.analysisSummaryPreview || item.coverLetter, 150) || t('proposalReview.notProvided')}</p>
    </article>
  );
}
