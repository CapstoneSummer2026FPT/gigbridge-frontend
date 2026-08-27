import { useRef } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  Award,
  CheckCircle2,
  ChevronDown,
  Clock,
  Eye,
  Layers,
  ListChecks,
  PenTool,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { getContractStatusLabel, formatContractAmount, formatContractDate } from '../../../shared/utils/contractUtils';
import { MilestoneDetailCard } from '../components/MilestoneDetailCard';
import { ContractAreaTabs } from '../components/ContractAreaTabs';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { CustomSelect } from '../../../shared/components/CustomSelect';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { useTranslation } from '../../../hooks/useTranslation';
import { useFreelancerContracts, type ContractWithMilestones } from '../hooks/useFreelancerContracts';
import { ContractStatus } from '../../../types/models/Contract';
import '../styles/freelancer-contract-screen.css';

const badgeClass = (status: number) => {
  if (status === ContractStatus.Active) return 'border border-emerald-500/40 bg-emerald-500/15 text-text-primary font-black';
  if (status === ContractStatus.Completed) return 'border border-blue-500/40 bg-blue-500/20 text-text-primary font-black';
  if (status === ContractStatus.Cancelled || status === ContractStatus.Disputed) return 'border border-rose-500/40 bg-rose-500/15 text-text-primary font-black';
  if (status === ContractStatus.Draft) return 'border border-border bg-slate-500/15 text-text-primary font-black';
  return 'border border-amber-500/40 bg-amber-500/15 text-text-primary font-black';
};

export default function FreelancerContractScreen() {
  const { t } = useTranslation(['contracts', 'common']);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    navigate,
    contracts,
    filteredContracts,
    pagedContracts,
    totalPages,
    currentPage,
    setCurrentPage,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    selectedStatus,
    setSelectedStatus,
    sortBy,
    setSortBy,
    expandedContractIds,
    toggleExpand,
    resetFilters,
    stats,
    loadContracts,
  } = useFreelancerContracts();

  // GSAP Entrance Animation
  usePageGSAP({
    containerRef,
    loading,
    groups: [
      { selector: '.fcs-gsap-header', y: 20, duration: 0.55 },
      { selector: '.fcs-gsap-metrics', y: 16, duration: 0.5, stagger: 0.08 },
      { selector: '.fcs-gsap-main', y: 24, duration: 0.5 },
    ],
  });

  const statusPills: Array<{ value: ContractStatus | 'All'; label: string; icon: React.ReactNode; colorClass: string }> = [
    { value: ContractStatus.PendingSignature, label: t('contracts.pendingSignature'), icon: <Clock size={14} />, colorClass: 'bg-amber-500 text-white shadow-sm' },
    { value: ContractStatus.PendingEscrow, label: t('contracts.pendingEscrow'), icon: <ShieldAlert size={14} />, colorClass: 'bg-purple-600 text-white shadow-sm' },
    { value: ContractStatus.Active, label: t('contracts.active'), icon: <Zap size={14} />, colorClass: 'bg-emerald-600 text-white shadow-sm' },
    { value: ContractStatus.Completed, label: t('contracts.completed'), icon: <CheckCircle2 size={14} />, colorClass: 'bg-blue-600 text-white shadow-sm' },
    { value: ContractStatus.Draft, label: t('contracts.legal.status.draft'), icon: <PenTool size={14} />, colorClass: 'bg-slate-600 text-white shadow-sm' },
    { value: ContractStatus.Disputed, label: t('contracts.disputeTerms'), icon: <ShieldAlert size={14} />, colorClass: 'bg-rose-600 text-white shadow-sm' },
    { value: 'All', label: t('contracts.allContracts'), icon: <Layers size={14} />, colorClass: 'bg-brand text-white shadow-sm' },
  ];

  return (
    <AppLayout fullWidth>
      <div ref={containerRef} className="min-h-[calc(100vh-4rem)] bg-background text-text-primary">
        
        {/* Top Header Bar */}
        <header className="fcs-gsap-header sticky top-0 z-40 border-b border-border bg-background/80 px-3.5 py-3.5 sm:py-4 backdrop-blur-md lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[10.5px] sm:text-[11px] font-extrabold uppercase tracking-wider text-brand">
                <Sparkles size={14} />
                {t('contracts.contractPortal')}
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-text-primary">
                {t('contracts.myContracts')} <span className="text-brand italic font-light">Portal</span>
              </h1>
              <p className="mt-0.5 text-xs font-semibold text-text-muted">{t('contracts.manageSubtitle')}</p>
            </div>

            {/* Navigation Tabs bar */}
            <ContractAreaTabs />
          </div>
        </header>

        {/* Main Workspace */}
        <main className="mx-auto max-w-[1600px] space-y-4 sm:space-y-6 px-3.5 py-4 sm:py-6 lg:px-8">
          
          {/* Summary Metric Cards */}
          <section aria-label="Contract Metrics" className="fcs-gsap-metrics grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
            <article className="rounded-2xl border border-border bg-background p-3.5 sm:p-4 shadow-sm transition hover:border-brand/40 min-w-0">
              <div className="flex items-center justify-between gap-2.5 sm:gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-text-muted truncate">{t('contracts.active')}</p>
                  <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-black tracking-tight text-text-primary">{stats.activeCount}</p>
                </div>
                <span className="inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Zap size={18} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-3.5 sm:p-4 shadow-sm transition hover:border-brand/40 min-w-0">
              <div className="flex items-center justify-between gap-2.5 sm:gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-text-muted truncate">{t('contracts.tabPending')}</p>
                  <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-black tracking-tight text-text-primary">{stats.pendingCount}</p>
                </div>
                <span className="inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock size={18} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-3.5 sm:p-4 shadow-sm transition hover:border-brand/40 min-w-0">
              <div className="flex items-center justify-between gap-2.5 sm:gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-text-muted truncate">{t('contracts.completed')}</p>
                  <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-black tracking-tight text-text-primary">{stats.completedCount}</p>
                </div>
                <span className="inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Award size={18} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-3.5 sm:p-4 shadow-sm transition hover:border-brand/40 min-w-0">
              <div className="flex items-center justify-between gap-2.5 sm:gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-text-muted truncate">{t('contracts.totalValue')}</p>
                  <p className="mt-0.5 sm:mt-1 text-lg sm:text-2xl font-black tracking-tight text-brand truncate">{formatContractAmount(stats.totalValue)}</p>
                </div>
                <span className="inline-flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <TrendingUp size={18} />
                </span>
              </div>
            </article>
          </section>

          {/* Main Controls & Contracts List */}
          <section className="fcs-gsap-main rounded-2xl border border-border bg-background shadow-sm overflow-hidden min-h-[500px] flex flex-col justify-between">
            
            {/* Search, Filter Pills & Sort Toolbar */}
            <div className="border-b border-border p-3.5 sm:p-4 space-y-3.5 sm:space-y-4 shrink-0 min-w-0">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between min-w-0">
                
                {/* Horizontal Selectable Status Pills with Smooth Scroll */}
                <div
                  onWheel={e => {
                    if (e.deltaY !== 0) {
                      e.currentTarget.scrollLeft += e.deltaY;
                    }
                  }}
                  className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 pt-0.5 custom-scrollbar flex-nowrap w-full min-w-0 max-w-full touch-pan-x scroll-smooth"
                >
                  {statusPills.map(pill => {
                    const isSelected = selectedStatus === pill.value;
                    const count = pill.value === 'All'
                      ? stats.totalCount
                      : contracts.filter(c => Number(c.status) === pill.value).length;

                    return (
                      <button
                        key={String(pill.value)}
                        type="button"
                        onClick={() => setSelectedStatus(pill.value)}
                        className={`shrink-0 inline-flex items-center gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-3.5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? pill.colorClass
                            : 'border border-border bg-surface-muted/40 text-text-muted hover:border-brand/40 hover:text-text-primary'
                        }`}
                      >
                        {pill.icon}
                        <span>{pill.label}</span>
                        <span className={`rounded-full px-1.5 py-0.2 rounded-full text-[9.5px] sm:text-[10px] font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-surface-muted text-text-muted'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search & Sort Controls */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center w-full lg:w-auto">
                  <label className="relative min-w-0 flex-1 sm:w-64">
                    <span className="sr-only">{t('contracts.searchPlaceholder')}</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
                    <input
                      value={searchQuery}
                      onChange={event => setSearchQuery(event.target.value)}
                      placeholder={t('contracts.searchPlaceholder')}
                      className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-xs font-bold text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 shadow-sm"
                    />
                  </label>

                  {(searchQuery || selectedStatus !== 'All') && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      title={t('contracts.clearAllFilters')}
                      aria-label={t('contracts.clearAllFilters')}
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-muted/50 text-brand hover:bg-surface-muted transition cursor-pointer"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}

                  <div className="w-full sm:w-44 shrink-0">
                    <CustomSelect
                      value={sortBy}
                      ariaLabel={t('contracts.sortByDate')}
                      onChange={val => setSortBy(val as 'date' | 'value')}
                      leftIcon={<ArrowUpDown size={14} />}
                      options={[
                        { value: 'date', label: t('contracts.sortByDate') },
                        { value: 'value', label: t('contracts.sortByValue') },
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Contracts List / Loader / Empty state */}
            <div className="flex-1 flex flex-col justify-between min-h-0">
              {loading ? (
                <div className="flex min-h-[360px] items-center justify-center p-12 my-auto">
                  <LemniscateBloomLoader label={t('contracts.loading')} size={52} />
                </div>
              ) : error ? (
                <div className="p-12 text-center my-auto space-y-3">
                  <AlertTriangle className="mx-auto text-rose-500" size={36} />
                  <p role="alert" className="font-extrabold text-text-primary text-sm">{error}</p>
                  <button
                    type="button"
                    onClick={() => void loadContracts()}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white hover:opacity-90 transition cursor-pointer"
                  >
                    <RotateCcw size={14} /> {t('contracts.retry')}
                  </button>
                </div>
              ) : filteredContracts.length === 0 ? (
                <div className="p-12 text-center my-auto space-y-3">
                  <PenTool className="mx-auto text-text-muted/40" size={40} />
                  <h3 className="font-extrabold text-text-primary text-base">{t('contracts.noContractsFound')}</h3>
                  <p className="text-xs font-semibold text-text-muted">{t('contracts.noContractsCategory')}</p>
                  {(searchQuery || selectedStatus !== 'All') && (
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="mt-2 text-xs font-extrabold text-brand hover:underline cursor-pointer"
                    >
                      {t('contracts.clearAllFilters')}
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <div className="divide-y divide-border p-4 space-y-4">
                    {pagedContracts.map(contract => (
                      <ContractCardItem
                        key={contract.contractsId}
                        contract={contract}
                        t={t}
                        expanded={expandedContractIds.has(contract.contractsId)}
                        onToggleExpand={() => toggleExpand(contract.contractsId)}
                        onNavigate={path => navigate(path)}
                      />
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

                    <div className="border-t border-border px-4 py-3 text-xs font-semibold text-text-muted">
                      {t('contracts.showingContracts', {
                        start: (currentPage - 1) * 5 + 1,
                        end: Math.min(currentPage * 5, filteredContracts.length),
                        total: filteredContracts.length,
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </main>
      </div>
    </AppLayout>
  );
}

function ContractCardItem({
  contract,
  t,
  expanded,
  onToggleExpand,
  onNavigate,
}: {
  contract: ContractWithMilestones;
  t: ReturnType<typeof useTranslation>['t'];
  expanded: boolean;
  onToggleExpand: () => void;
  onNavigate: (path: string) => void;
}) {
  const status = Number(contract.status);

  const completedMilestones = contract.milestones?.filter(m => m.status === 3).length || 0;
  const totalMilestones = contract.milestones?.length || 0;
  const progressPercent = totalMilestones ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  // Determine dynamic primary action button based on contract status
  let primaryAction: { label: string; icon: React.ReactNode; path: string; styleClass?: string } = {
    label: t('contracts.viewDetails'),
    icon: <Eye size={14} />,
    path: `/contracts/${contract.contractsId}`,
    styleClass: 'bg-brand text-white shadow-sm',
  };

  if (status === ContractStatus.Active) {
    primaryAction = {
      label: t('contracts.goToWorkspace', { defaultValue: 'Go to workspace' }),
      icon: <ListChecks size={14} />,
      path: `/workspace/${contract.contractsId}`,
      styleClass: 'bg-brand text-white shadow-sm',
    };
  } else if (status === ContractStatus.Draft || status === ContractStatus.PendingSignature) {
    primaryAction = {
      label: t('contracts.signContract'),
      icon: <PenTool size={14} />,
      path: `/contracts/${contract.contractsId}/sign`,
      styleClass: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm',
    };
  } else if (status === ContractStatus.Completed) {
    primaryAction = {
      label: t('contracts.viewCompleted'),
      icon: <Award size={14} />,
      path: `/contracts/${contract.contractsId}`,
      styleClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
    };
  } else if (status === ContractStatus.Disputed || status === ContractStatus.Cancelled) {
    primaryAction = {
      label: t('contracts.viewDispute'),
      icon: <ShieldAlert size={14} />,
      path: `/contracts/${contract.contractsId}`,
      styleClass: 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm',
    };
  }

  return (
    <article className="rounded-2xl border border-border bg-background p-3.5 sm:p-5 shadow-sm transition hover:border-brand/40 space-y-3.5 sm:space-y-4">
      {/* Card Top Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3 border-b border-border/60 pb-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm sm:text-base font-extrabold text-text-primary break-all [overflow-wrap:anywhere]">
              {contract.title || t('contracts.contract')}
            </h3>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] ${badgeClass(status)}`}>
              {getContractStatusLabel(status)}
            </span>
          </div>
          <p className="mt-1 text-[11px] sm:text-xs text-text-muted font-semibold flex flex-wrap items-center gap-2">
            <span>ID: <strong className="text-text-primary font-mono">{contract.contractsId}</strong></span>
            <span>·</span>
            <span>Created: <strong className="text-text-primary font-bold">{formatContractDate(contract.createdAt)}</strong></span>
          </p>
        </div>

        <div className="sm:text-right text-left shrink-0">
          <p className="text-[10.5px] sm:text-xs font-bold text-text-muted uppercase tracking-wider">{t('contracts.totalValue')}</p>
          <p className="text-base sm:text-lg font-black text-brand">{formatContractAmount(contract.totalBudget)}</p>
        </div>
      </div>

      {/* Progress Bar & Milestone Info */}
      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 items-center">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-text-muted">{t('contracts.milestoneCompletion')}</span>
            <span className="text-brand font-black">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand to-mint transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start sm:justify-end gap-2 text-xs font-bold text-text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 sm:px-3 py-1.5 text-emerald-600 dark:text-emerald-400 text-[11px] sm:text-xs">
            <CheckCircle2 size={13} />
            {t('contracts.milestonesPaidCount', { milestonesPaid: completedMilestones })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-muted/50 px-2.5 sm:px-3 py-1.5 text-text-primary text-[11px] sm:text-xs">
            {t('contracts.milestones')}: {totalMilestones}
          </span>
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between border-t border-border/60 pt-3.5 sm:pt-4 gap-2.5 sm:gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Primary Action Button (e.g. Go to Workspace for Active) */}
          <button
            type="button"
            onClick={() => onNavigate(primaryAction.path)}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl px-3.5 sm:px-4 py-2 text-xs font-extrabold transition cursor-pointer text-center ${primaryAction.styleClass}`}
          >
            {primaryAction.icon} <span>{primaryAction.label}</span>
          </button>

          {/* Secondary View Details Button */}
          {primaryAction.label !== t('contracts.viewDetails') && (
            <button
              type="button"
              onClick={() => onNavigate(`/contracts/${contract.contractsId}`)}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-3.5 sm:px-4 py-2 text-xs font-extrabold text-text-primary hover:border-brand/40 hover:text-brand transition cursor-pointer text-center"
            >
              <Eye size={14} /> <span>{t('contracts.viewDetails')}</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleExpand}
          className="self-end sm:self-auto inline-flex items-center gap-1.5 text-xs font-extrabold text-brand hover:underline cursor-pointer py-1"
        >
          {expanded ? t('contracts.collapse') : t('contracts.milestoneBreakdown')}
          <ChevronDown className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} size={14} />
        </button>
      </div>

      {/* Expanded Milestone Breakdown */}
      {expanded && (
        <div className="rounded-2xl border border-border bg-surface-muted/30 p-4 space-y-3">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-text-primary border-b border-border pb-2">
            {t('contracts.milestonesSchedule')}
          </h4>
          {contract.milestones?.length ? (
            <div className="space-y-2">
              {contract.milestones.map((m, idx) => (
                <MilestoneDetailCard
                  key={m.id || idx}
                  milestone={m}
                  index={idx}
                  onSubmitDeliverable={() => onNavigate(`/contracts/${contract.contractsId}/submit`)}
                />
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-muted font-semibold">{t('contracts.noMilestonesPlanned')}</p>
          )}
        </div>
      )}
    </article>
  );
}
