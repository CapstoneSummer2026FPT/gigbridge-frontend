import { useState } from 'react';
import {
  ArrowUpRight,
  ChevronRight,
  ListChecks,
  ShieldCheck,
} from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useTranslation } from '../../../hooks/useTranslation';
import type { EloSummary } from '../../../types/elo';
import { MilestoneStatus } from '../../../types/models/Contract';
import type {
  FreelancerMilestoneTableItem,
  FreelancerWorkStatusCounts,
} from '../utils/freelancerDashboardMetrics';

interface FreelancerDashboardOverviewProps {
  isLoading: boolean;
  workStatusCounts: FreelancerWorkStatusCounts;
  pendingMilestoneItems: FreelancerMilestoneTableItem[];
  eloSummary: EloSummary | null;
  theme: 'white' | 'black';
  onOpenProposals: () => void;
  onOpenContracts: () => void;
  onOpenEloHistory: () => void;
}

export function FreelancerDashboardOverview({
  isLoading,
  workStatusCounts,
  pendingMilestoneItems,
  eloSummary,
  theme,
  onOpenProposals,
  onOpenContracts,
  onOpenEloHistory,
}: FreelancerDashboardOverviewProps) {
  const { t } = useTranslation();
  const [isMilestoneListOpen, setIsMilestoneListOpen] = useState(false);
  const workChartData = [
    {
      key: 'pending',
      label: t('dashboard.freelancerJobsPending', 'Pending'),
      detail: t('dashboard.freelancerJobsPendingDetail', 'Awaiting decision'),
      value: workStatusCounts.pending,
      color: '#f59e0b',
    },
    {
      key: 'active',
      label: t('dashboard.freelancerJobsActive', 'Active'),
      detail: t('dashboard.freelancerJobsActiveDetail', 'In delivery'),
      value: workStatusCounts.active,
      color: '#494be7',
    },
    {
      key: 'completed',
      label: t('dashboard.freelancerJobsCompleted', 'Completed'),
      detail: t('dashboard.freelancerJobsCompletedDetail', 'Delivered'),
      value: workStatusCounts.completed,
      color: '#22c55e',
    },
  ];
  const trackedWorkCount = workChartData.reduce((total, item) => total + item.value, 0);
  const chartData = trackedWorkCount > 0
    ? workChartData
    : [{ key: 'empty', label: t('dashboard.noTrackedJobs', 'No tracked jobs'), detail: '', value: 1, color: '#94a3b8' }];
  const eloScore = eloSummary?.currentPoints;
  const milestoneGroups = Array.from(
    pendingMilestoneItems.reduce<Map<string, { contractId: string; jobTitle: string; items: FreelancerMilestoneTableItem[] }>>(
      (groups, item) => {
        const current = groups.get(item.contractId);
        if (current) current.items.push(item);
        else groups.set(item.contractId, { contractId: item.contractId, jobTitle: item.jobTitle, items: [item] });
        return groups;
      },
      new Map(),
    ).values(),
  );

  const getMilestoneStatus = (status: number) => {
    if (status === MilestoneStatus.InProgress) {
      return { label: t('dashboard.milestoneInProgress', 'In progress'), className: 'bg-brand/10 text-brand border-brand/20' };
    }
    if (status === MilestoneStatus.Submitted) {
      return { label: t('dashboard.milestoneSubmitted', 'Submitted'), className: 'bg-warning/10 text-warning border-warning/20' };
    }
    if (status === MilestoneStatus.Disputed) {
      return { label: t('dashboard.milestoneDisputed', 'Disputed'), className: 'bg-destructive/10 text-destructive border-destructive/20' };
    }
    return { label: t('dashboard.milestonePending', 'Pending'), className: 'bg-surface-muted text-text-secondary border-border' };
  };

  const formatDueDate = (value: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short' }).format(date);
  };

  return (
    <section className="space-y-4" aria-labelledby="freelancer-dashboard-overview-title">
      <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-brand">
            {t('dashboard.freelancerLiveOverview', 'Live overview')}
          </span>
          <h2 id="freelancer-dashboard-overview-title" className="mt-0.5 text-xl font-black uppercase tracking-tight text-text-primary sm:text-2xl">
            {t('dashboard.freelancerWorkPulse', 'Work pulse')}
          </h2>
        </div>
        <p className="max-w-md text-left text-xs text-text-secondary sm:text-right">
          {t('dashboard.freelancerWorkPulseDescription', 'Applications, delivery work, milestones, and reputation in one place.')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-12 lg:items-stretch">
        <article className="glass-card flex h-full flex-col rounded-3xl p-5 md:col-span-2 sm:p-6 lg:col-span-5">
          <header className="mb-4 flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">
                {t('dashboard.freelancerJobPipeline', 'Job pipeline')}
              </span>
              <h3 className="mt-0.5 text-sm font-black text-text-primary">
                {t('dashboard.freelancerJobStatus', 'Job status')}
              </h3>
            </div>
            <button type="button" className="freelancer-dash-overview-link" onClick={onOpenProposals}>
              {t('dashboard.viewAll', 'View all')}
              <ArrowUpRight size={14} aria-hidden="true" />
            </button>
          </header>

          <div className="grid flex-1 grid-cols-1 items-center gap-4 sm:grid-cols-[minmax(176px,1fr)_minmax(170px,1.2fr)] sm:gap-5">
            <div
              className="relative mx-auto h-32 w-32 sm:h-44 sm:w-44"
              role="img"
              aria-label={t('dashboard.freelancerJobChartAria', {
                defaultValue: '{{pending}} pending jobs, {{active}} active jobs, and {{completed}} completed jobs',
                ...workStatusCounts,
              })}
            >
              {isLoading ? (
                <div className="absolute inset-4 animate-spin rounded-full border-[15px] border-surface-muted border-t-brand" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={trackedWorkCount > 0 ? 3 : 0}
                      cornerRadius={5}
                      stroke="none"
                      isAnimationActive={trackedWorkCount > 0}
                    >
                      {chartData.map(item => (
                        <Cell key={item.key} fill={item.color} opacity={trackedWorkCount > 0 ? 1 : 0.22} />
                      ))}
                    </Pie>
                    {trackedWorkCount > 0 && (
                      <Tooltip
                        contentStyle={{
                          background: theme === 'black' ? 'rgba(13,14,25,0.96)' : 'rgba(255,255,255,0.98)',
                          border: theme === 'black' ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(73,75,231,0.18)',
                          borderRadius: 10,
                          color: theme === 'black' ? '#f5f6f8' : '#19191b',
                          fontSize: 12,
                        }}
                        formatter={(value: number, name: string) => [value, name]}
                      />
                    )}
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <strong className="text-3xl font-black leading-none tracking-tight text-text-primary">
                  {isLoading ? '—' : trackedWorkCount}
                </strong>
                <span className="mt-1 text-[8px] font-black uppercase tracking-widest text-text-muted">
                  {t('dashboard.tracked', 'Tracked')}
                </span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2">
              {workChartData.map(item => (
                <div key={item.key} className="flex min-h-10 items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/60 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-black text-text-primary">{item.label}</span>
                      <span className="block truncate text-[8px] font-semibold text-text-muted">{item.detail}</span>
                    </div>
                  </div>
                  <strong className="text-base font-black text-text-primary">{isLoading ? '—' : item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="glass-card flex h-full min-h-[282px] flex-col rounded-3xl p-5 sm:p-6 lg:col-span-4">
          <header className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">
                {t('dashboard.deliveryPipeline', 'Delivery pipeline')}
              </span>
              <h3 className="mt-0.5 text-sm font-black text-text-primary">
                {isMilestoneListOpen
                  ? t('dashboard.milestoneListView', 'Milestone list')
                  : t('dashboard.milestonesAwaitingCompletion', 'Milestones awaiting completion')}
              </h3>
            </div>
            {isMilestoneListOpen ? (
              <span className="flex shrink-0 items-center gap-1.5 rounded-xl border border-brand/20 bg-brand/10 px-2.5 py-1.5 text-xs font-black text-brand">
                <ListChecks size={14} aria-hidden="true" />
                {isLoading ? '—' : pendingMilestoneItems.length}
              </span>
            ) : (
              <ListChecks size={19} className="shrink-0 text-brand" aria-hidden="true" />
            )}
          </header>

          <p className="mt-2 text-[9px] font-semibold text-text-muted">
            {t('dashboard.freelancerActiveContractMilestonesOnly', 'Counted from active contracts only')}
          </p>

          {isMilestoneListOpen ? (
            <div className="my-3 min-h-0 flex-1 overflow-hidden rounded-2xl border border-border">
              {isLoading ? (
                <div className="flex h-full min-h-40 items-center justify-center text-xs font-semibold text-text-muted animate-pulse">
                  {t('dashboard.loadingMilestones', 'Loading milestones…')}
                </div>
              ) : milestoneGroups.length === 0 ? (
                <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-5 text-center">
                  <ListChecks size={22} className="text-success" aria-hidden="true" />
                  <span className="text-xs font-bold text-text-secondary">
                    {t('dashboard.noPendingMilestones', 'No milestones awaiting completion')}
                  </span>
                </div>
              ) : (
                <div className="max-h-48 overflow-auto">
                  <table className="w-full min-w-[500px] border-collapse text-left">
                    <thead className="sticky top-0 z-10 bg-surface-muted">
                      <tr className="text-[8px] font-black uppercase tracking-wider text-text-muted">
                        <th className="px-3 py-2.5">{t('dashboard.milestoneJobColumn', 'Job')}</th>
                        <th className="px-3 py-2.5">{t('dashboard.milestoneNameColumn', 'Milestone')}</th>
                        <th className="px-3 py-2.5">{t('dashboard.milestoneStatusColumn', 'Status')}</th>
                        <th className="px-3 py-2.5 text-right">{t('dashboard.milestoneDueColumn', 'Due')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {milestoneGroups.flatMap(group => group.items.map((item, itemIndex) => {
                        const status = getMilestoneStatus(item.status);
                        return (
                          <tr key={item.id} className="border-t border-border/70 align-middle">
                            {itemIndex === 0 && (
                              <td rowSpan={group.items.length} className="max-w-36 border-r border-border/60 px-3 py-2.5 align-top text-[10px] font-black text-text-primary">
                                <span className="line-clamp-2">{group.jobTitle}</span>
                              </td>
                            )}
                            <td className="max-w-40 px-3 py-2.5 text-[10px] font-bold text-text-secondary">
                              <span className="line-clamp-2">{item.title}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className={`inline-flex whitespace-nowrap rounded-lg border px-2 py-1 text-[8px] font-black uppercase tracking-wide ${status.className}`}>
                                {status.label}
                              </span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-right text-[9px] font-bold text-text-muted">
                              {formatDueDate(item.dueDate)}
                            </td>
                          </tr>
                        );
                      }))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="my-3 flex min-h-40 flex-1 items-center justify-between gap-5 rounded-2xl border border-brand/15 bg-brand/5 px-5 py-4">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-brand/20 bg-brand/10 text-brand">
                  <ListChecks size={24} aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <strong className="block text-5xl font-black leading-none tracking-tighter text-text-primary">
                    {isLoading ? '—' : pendingMilestoneItems.length}
                  </strong>
                  <span className="mt-2 block text-[9px] font-black uppercase tracking-widest text-text-muted">
                    {t('dashboard.pendingMilestoneOverviewLabel', 'Pending milestones')}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <strong className="block text-xl font-black text-text-primary">{isLoading ? '—' : milestoneGroups.length}</strong>
                <span className="block text-[8px] font-black uppercase tracking-wider text-text-muted">
                  {t('dashboard.activeJobsWithMilestones', 'Jobs with pending work')}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
            <button
              type="button"
              className="freelancer-dash-overview-link"
              onClick={() => setIsMilestoneListOpen(open => !open)}
              aria-expanded={isMilestoneListOpen}
            >
              {isMilestoneListOpen
                ? t('dashboard.milestoneOverview', 'Overview')
                : t('dashboard.milestoneListView', 'List view')}
              <ChevronRight size={14} className={isMilestoneListOpen ? 'rotate-180' : ''} aria-hidden="true" />
            </button>
            <button type="button" className="freelancer-dash-overview-link" onClick={onOpenContracts}>
              {t('dashboard.openContracts', 'Open contracts')}
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>
        </article>

        <article className="glass-card flex h-full min-h-[282px] flex-col rounded-3xl p-5 sm:p-6 lg:col-span-3">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={17} className="text-brand" aria-hidden="true" />
              <h3 className="text-sm font-black text-text-primary">{t('dashboard.eloPoint', 'Elo Point')}</h3>
            </div>
            <span className="rounded-lg border border-brand/20 bg-brand/10 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-brand">
              {isLoading
                ? t('dashboard.eloSyncing', 'Syncing')
                : eloSummary
                  ? t('dashboard.eloVerified', 'Verified')
                  : t('dashboard.eloUnavailableBadge', 'Unavailable')}
            </span>
          </header>

          <div className="flex flex-1 flex-col items-center justify-center py-3">
            <div
              className="relative h-40 w-40"
              role="img"
              aria-label={t('dashboard.eloScoreAria', { defaultValue: 'Current Elo score: {{score}}', score: eloScore ?? 0 })}
            >
              <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200" aria-hidden="true">
                <defs>
                  <linearGradient id="freelancerEloRingGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#494be7" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="72" fill="none" stroke="currentColor" strokeWidth="18" className="text-surface-muted" />
                <circle cx="100" cy="100" r="72" fill="none" stroke="url(#freelancerEloRingGradient)" strokeWidth="18" strokeLinecap="round" className="freelancer-elo-donut-ring" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <strong className="text-3xl font-black leading-none tracking-tight text-text-primary">
                  {isLoading || eloScore == null ? '—' : eloScore.toLocaleString()}
                </strong>
                <span className="mt-1 text-[8px] font-black uppercase tracking-widest text-brand">Elo</span>
              </div>
            </div>
            {eloSummary && (
              <div className="-mt-1 flex items-center gap-2 text-[10px] font-black">
                <span className="text-success">+{eloSummary.totalGained.toLocaleString()}</span>
                <span className="text-text-muted">•</span>
                <span className="text-destructive">−{eloSummary.totalLost.toLocaleString()}</span>
              </div>
            )}
          </div>

          <button type="button" className="freelancer-dash-overview-link self-center" onClick={onOpenEloHistory}>
            {t('dashboard.eloHistory', 'View Elo history')}
            <ChevronRight size={14} aria-hidden="true" />
          </button>
        </article>
      </div>
    </section>
  );
}
