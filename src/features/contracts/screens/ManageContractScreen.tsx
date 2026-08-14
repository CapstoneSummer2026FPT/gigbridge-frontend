import { useRef } from 'react';
import {
  AlertCircle,
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
  Wallet,
  Zap,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { ContractStatus } from '../../../types/models/Contract';
import {
  getContractStatusLabel,
  formatContractAmount,
  formatContractDate,
} from '../../../shared/utils/contractUtils';
import { MilestoneDetailCard } from '../components/MilestoneDetailCard';
import { ContractAreaTabs } from '../components/ContractAreaTabs';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { useTranslation } from '../../../hooks/useTranslation';
import { useManageContracts, type ContractWithMilestones } from '../hooks/useManageContracts';
import '../styles/manage-contract-screen.css';

const badgeClass = (status: number) => {
  if (status === ContractStatus.Active) return 'border border-emerald-500/40 bg-emerald-500/15 text-text-primary font-black';
  if (status === ContractStatus.Completed) return 'border border-blue-500/40 bg-blue-500/20 text-text-primary font-black';
  if (status === ContractStatus.Cancelled || status === ContractStatus.Disputed) return 'border border-rose-500/40 bg-rose-500/15 text-text-primary font-black';
  if (status === ContractStatus.Draft) return 'border border-border bg-slate-500/15 text-text-primary font-black';
  return 'border border-amber-500/40 bg-amber-500/15 text-text-primary font-black';
};

export default function ManageContractScreen() {
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
    expandedContractId,
    toggleExpand,
    resetFilters,
    stats,
    loadContracts,
  } = useManageContracts();

  // GSAP Entrance Animation
  usePageGSAP({
    containerRef,
    loading,
    groups: [
      { selector: '.mcs-gsap-header', y: 20, duration: 0.55 },
      { selector: '.mcs-gsap-metrics', y: 16, duration: 0.5, stagger: 0.08 },
      { selector: '.mcs-gsap-main', y: 24, duration: 0.5 },
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
        <header className="mcs-gsap-header sticky top-0 z-40 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md lg:px-8">
          <div className="mx-auto flex max-w-[1600px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-1 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-brand">
                <Sparkles size={14} />
                {t('contracts.contractManagement')}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
                Contract <span className="text-brand italic font-light">Management</span>
              </h1>
              <p className="mt-0.5 text-xs font-semibold text-text-muted">{t('contracts.monitorSubtitle')}</p>
            </div>

            {/* Navigation Tabs bar */}
            <ContractAreaTabs />
          </div>
        </header>

        {/* Main Workspace */}
        <main className="mx-auto max-w-[1600px] space-y-6 px-4 py-6 lg:px-8">
          
          {/* Summary Metric Cards */}
          <section aria-label="Contract Metrics" className="mcs-gsap-metrics grid grid-cols-2 gap-3 xl:grid-cols-4">
            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">{t('contracts.active')}</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-text-primary">{stats.activeCount}</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Zap size={20} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">{t('contracts.pendingSignature')}</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-text-primary">{stats.pendingCount}</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Clock size={20} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">{t('contracts.completed')}</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-text-primary">{stats.completedCount}</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <CheckCircle2 size={20} />
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-border bg-background p-4 shadow-sm transition hover:border-brand/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-text-muted">{t('contracts.totalCommittedValue')}</p>
                  <p className="mt-1 text-2xl font-black tracking-tight text-brand">{formatContractAmount(stats.totalCommittedValue)}</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <TrendingUp size={20} />
                </span>
              </div>
            </article>
          </section>

          {/* Main Controls & Contracts Table/List */}
          <section className="mcs-gsap-main rounded-2xl border border-border bg-background shadow-sm overflow-hidden min-h-[600px] flex flex-col justify-between">
            
            {/* Search & Selectable Status Pills Toolbar */}
            <div className="border-b border-border p-4 space-y-4 shrink-0">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                
                {/* Horizontal Selectable Status Pills */}
                <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
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
                        className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                          isSelected
                            ? pill.colorClass
                            : 'border border-border bg-surface-muted/40 text-text-muted hover:border-brand/40 hover:text-text-primary'
                        }`}
                      >
                        {pill.icon}
                        {pill.label}
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-surface-muted text-text-muted'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Bar & Clear Filter */}
                <div className="flex items-center gap-2 sm:w-72 shrink-0">
                  <label className="relative flex-1">
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
                  <AlertCircle className="mx-auto text-rose-500" size={36} />
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
                  <Layers className="mx-auto text-text-muted/40" size={40} />
                  <h3 className="font-extrabold text-text-primary text-base">{t('contracts.noContractsMatched')}</h3>
                  <p className="text-xs font-semibold text-text-muted">{t('contracts.tryModifyingSearch')}</p>
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
                      <ClientContractCardItem
                        key={contract.contractsId}
                        contract={contract}
                        t={t}
                        expanded={expandedContractId === contract.contractsId}
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

function ClientContractCardItem({
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
  } else if (status === ContractStatus.PendingEscrow) {
    primaryAction = {
      label: t('contracts.fundEscrow'),
      icon: <Wallet size={14} />,
      path: `/contracts/${contract.contractsId}`,
      styleClass: 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm',
    };
  } else if (status === ContractStatus.Completed) {
    primaryAction = {
      label: t('contracts.viewCompleted'),
      icon: <CheckCircle2 size={14} />,
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
    <article className="rounded-2xl border border-border bg-background p-5 shadow-sm transition hover:border-brand/40 space-y-4">
      {/* Card Top Row */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h3 className="truncate text-base font-extrabold text-text-primary">
              {contract.title || t('contracts.contract')}
            </h3>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] ${badgeClass(status)}`}>
              {getContractStatusLabel(status)}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted font-semibold flex flex-wrap items-center gap-2">
            <span>ID: <strong className="text-text-primary font-mono">{contract.contractsId}</strong></span>
            <span>·</span>
            <span>Created: <strong className="text-text-primary font-bold">{formatContractDate(contract.createdAt)}</strong></span>
          </p>
        </div>

        <div className="text-right">
          <p className="text-xs font-bold text-text-muted uppercase tracking-wider">{t('contracts.totalCommittedValue')}</p>
          <p className="text-lg font-black text-brand">{formatContractAmount(contract.totalBudget)}</p>
        </div>
      </div>

      {/* Progress Bar & Milestone Info */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-text-muted">{t('contracts.milestoneCompletion')}</span>
            <span className="text-brand font-black">{progressPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
            <div className="h-full bg-gradient-to-r from-brand to-mint transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 text-xs font-bold text-text-muted">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={14} />
            {t('contracts.milestonesPaidCount', { milestonesPaid: completedMilestones })}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-muted/50 px-3 py-1.5 text-text-primary">
            {t('contracts.milestones')}: {totalMilestones}
          </span>
        </div>
      </div>

      {/* Action Buttons Footer */}
      <div className="flex flex-wrap items-center justify-between border-t border-border/60 pt-4 gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Primary Action Button */}
          <button
            type="button"
            onClick={() => onNavigate(primaryAction.path)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold transition cursor-pointer ${primaryAction.styleClass}`}
          >
            {primaryAction.icon} {primaryAction.label}
          </button>

          {/* Secondary View Details Button if primary isn't already View Details */}
          {primaryAction.label !== t('contracts.viewDetails') && (
            <button
              type="button"
              onClick={() => onNavigate(`/contracts/${contract.contractsId}`)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-xs font-extrabold text-text-primary hover:border-brand/40 hover:text-brand transition cursor-pointer"
            >
              <Eye size={14} /> {t('contracts.viewDetails')}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleExpand}
          className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand hover:underline cursor-pointer"
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
                  onSubmitDeliverable={() => onNavigate(`/contracts/${contract.contractsId}`)}
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
