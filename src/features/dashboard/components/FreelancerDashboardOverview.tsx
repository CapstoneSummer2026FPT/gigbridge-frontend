import { useState } from 'react';
import {
  ArrowUpRight,
  ChevronRight,
  Clock,
  Flame,
  ListChecks,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
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
      return {
        label: t('dashboard.milestoneInProgress', 'In progress'),
        className: 'bg-brand/15 text-brand border-brand/30',
        dotColor: 'bg-brand shadow-[0_0_8px_rgba(73,75,231,0.8)]',
      };
    }
    if (status === MilestoneStatus.Submitted) {
      return {
        label: t('dashboard.milestoneSubmitted', 'Submitted'),
        className: 'bg-warning/15 text-warning border-warning/30',
        dotColor: 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.8)]',
      };
    }
    if (status === MilestoneStatus.Disputed) {
      return {
        label: t('dashboard.milestoneDisputed', 'Disputed'),
        className: 'bg-destructive/15 text-destructive border-destructive/30',
        dotColor: 'bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.8)]',
      };
    }
    return {
      label: t('dashboard.milestonePending', 'Pending'),
      className: 'bg-surface-muted text-text-secondary border-border',
      dotColor: 'bg-text-muted',
    };
  };

  const formatDueDate = (value: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short' }).format(date);
  };

  return (
    <section className="space-y-6" aria-labelledby="freelancer-dashboard-overview-title">
      <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand shadow-[0_0_8px_var(--brand)]" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand">
              {t('dashboard.freelancerLiveOverview', 'Live Radar')}
            </span>
          </div>
          <h2 id="freelancer-dashboard-overview-title" className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-text-primary font-display-sm">
            {t('dashboard.freelancerWorkPulse', 'Work Pulse & Pipeline')}
          </h2>
        </div>
        <p className="max-w-md text-left text-xs text-text-secondary sm:text-right font-medium leading-relaxed">
          {t('dashboard.freelancerWorkPulseDescription', 'Live monitoring of proposals, milestone deliveries, and reputation velocity.')}
        </p>
      </div>      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-12 xl:items-stretch">
        {/* Card 1: Job Pipeline & Status */}
        <article className="bento-spotlight-card flex h-full flex-col justify-between p-5 sm:p-6 md:col-span-2 xl:col-span-5 relative group min-w-0">
          <div className="absolute top-0 right-0 w-36 h-36 bg-brand/10 blur-3xl rounded-full pointer-events-none group-hover:bg-brand/20 transition-all duration-500" />

          <header className="mb-4 flex items-start justify-between gap-3 relative z-10">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Flame size={13} className="text-brand shrink-0" />
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand truncate">
                  {t('dashboard.freelancerJobPipeline', 'Pipeline')}
                </span>
              </div>
              <h3 className="mt-0.5 text-base font-black text-text-primary tracking-tight truncate">
                {t('dashboard.freelancerJobStatus', 'Job Distribution')}
              </h3>
            </div>
            <button
              type="button"
              className="freelancer-dash-overview-link group/link cursor-pointer shrink-0"
              onClick={onOpenProposals}
            >
              <span>{t('dashboard.viewAll', 'View All')}</span>
              <ArrowUpRight size={14} className="transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" aria-hidden="true" />
            </button>
          </header>

          <div className="grid flex-1 grid-cols-1 @[380px]:grid-cols-[auto_1fr] items-center gap-5 sm:gap-6 relative z-10">
            <div
              className="relative mx-auto h-32 w-32 sm:h-36 sm:w-36 shrink-0"
              role="img"
              aria-label={t('dashboard.freelancerJobChartAria', {
                defaultValue: '{{pending}} pending jobs, {{active}} active jobs, and {{completed}} completed jobs',
                ...workStatusCounts,
              })}
            >
              {isLoading ? (
                <div className="absolute inset-4 animate-spin rounded-full border-[8px] border-surface-muted border-t-brand" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={62}
                      paddingAngle={trackedWorkCount > 0 ? 4 : 0}
                      cornerRadius={5}
                      stroke="none"
                      isAnimationActive={trackedWorkCount > 0}
                    >
                      {chartData.map(item => (
                        <Cell key={item.key} fill={item.color} opacity={trackedWorkCount > 0 ? 1 : 0.25} />
                      ))}
                    </Pie>
                    {trackedWorkCount > 0 && (
                      <Tooltip
                        contentStyle={{
                          background: theme === 'black' ? 'rgba(13,14,25,0.96)' : 'rgba(255,255,255,0.98)',
                          border: theme === 'black' ? '1px solid rgba(255,255,255,0.14)' : '1px solid rgba(73,75,231,0.18)',
                          borderRadius: 12,
                          color: theme === 'black' ? '#f5f6f8' : '#19191b',
                          fontSize: 12,
                          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                        }}
                        formatter={(value: number, name: string) => [value, name]}
                      />
                    )}
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <strong className="text-2xl sm:text-3xl font-black leading-none tracking-tight text-text-primary">
                  {isLoading ? '—' : trackedWorkCount}
                </strong>
                <span className="mt-1 text-[8px] font-black uppercase tracking-widest text-text-muted">
                  {t('dashboard.tracked', 'Total Tracked')}
                </span>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 min-w-0">
              {workChartData.map(item => (
                <div
                  key={item.key}
                  className="flex min-h-10 items-center justify-between gap-2.5 rounded-2xl border border-border/80 bg-surface-muted/40 hover:bg-surface-muted/80 px-3 py-1.5 transition-all duration-200 group/pill min-w-0"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full shadow-sm group-hover/pill:scale-125 transition-transform"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="min-w-0">
                      <span className="block truncate text-xs font-black text-text-primary">{item.label}</span>
                      <span className="block truncate text-[8px] sm:text-[9px] font-medium text-text-muted">{item.detail}</span>
                    </div>
                  </div>
                  <strong className="text-xs sm:text-sm font-black text-text-primary px-2 py-0.5 rounded-lg bg-surface-muted/80 border border-border/50 shrink-0">
                    {isLoading ? '—' : item.value}
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </article>

        {/* Card 2: Delivery Pipeline & Milestones */}
        <article className="bento-spotlight-card flex h-full min-h-[300px] flex-col justify-between p-5 sm:p-6 md:col-span-1 xl:col-span-4 relative group min-w-0">
          <div className="absolute top-0 right-0 w-36 h-36 bg-purple/10 blur-3xl rounded-full pointer-events-none group-hover:bg-purple/20 transition-all duration-500" />

          <div>
            <header className="flex items-start justify-between gap-3 relative z-10">
              <div className="min-w-0">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand truncate block">
                  {t('dashboard.deliveryPipeline', 'Deliveries')}
                </span>
                <h3 className="mt-0.5 text-base font-black text-text-primary tracking-tight truncate">
                  {isMilestoneListOpen
                    ? t('dashboard.milestoneListView', 'Milestone Matrix')
                    : t('dashboard.milestonesAwaitingCompletion', 'Milestones in Progress')}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsMilestoneListOpen(open => !open)}
                className="flex items-center gap-1.5 rounded-xl border border-brand/25 bg-brand/10 hover:bg-brand/20 px-2.5 py-1 text-xs font-black text-brand transition-colors cursor-pointer shrink-0"
              >
                <ListChecks size={14} aria-hidden="true" />
                <span>{isLoading ? '—' : `${pendingMilestoneItems.length} active`}</span>
              </button>
            </header>

            <div className="flex items-center gap-1.5 mt-2 text-[9px] font-semibold text-text-muted">
              <Clock size={11} className="text-text-muted shrink-0" />
              <span className="truncate">{t('dashboard.freelancerActiveContractMilestonesOnly', 'Counted from active contracts')}</span>
            </div>

            {isMilestoneListOpen ? (
              <div className="my-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/80 bg-surface-muted/30">
                {isLoading ? (
                  <div className="flex h-full min-h-36 items-center justify-center text-xs font-semibold text-text-muted animate-pulse">
                    {t('dashboard.loadingMilestones', 'Loading milestones…')}
                  </div>
                ) : milestoneGroups.length === 0 ? (
                  <div className="flex h-full min-h-36 flex-col items-center justify-center gap-2 px-5 text-center py-6">
                    <div className="w-10 h-10 rounded-2xl bg-success/10 flex items-center justify-center text-success">
                      <ListChecks size={20} aria-hidden="true" />
                    </div>
                    <span className="text-xs font-bold text-text-secondary">
                      {t('dashboard.noPendingMilestones', 'All milestones delivered')}
                    </span>
                  </div>
                ) : (
                  <div className="max-h-48 overflow-auto custom-scrollbar">
                    <table className="w-full min-w-[400px] border-collapse text-left">
                      <thead className="sticky top-0 z-10 bg-surface-muted/90 backdrop-blur-md">
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
                            <tr key={item.id} className="border-t border-border/50 hover:bg-surface-muted/40 transition-colors align-middle">
                              {itemIndex === 0 && (
                                <td rowSpan={group.items.length} className="max-w-32 border-r border-border/60 px-3 py-2.5 align-top text-[10px] font-black text-text-primary">
                                  <span className="line-clamp-2">{group.jobTitle}</span>
                                </td>
                              )}
                              <td className="max-w-36 px-3 py-2.5 text-[10px] font-bold text-text-secondary">
                                <span className="line-clamp-2">{item.title}</span>
                              </td>
                              <td className="px-3 py-2.5">
                                <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-2 py-0.5 text-[8px] font-black uppercase tracking-wide ${status.className}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
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
              <div className="my-4 flex flex-col @[280px]:flex-row min-h-36 flex-1 items-start @[280px]:items-center justify-between gap-4 rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/12 via-brand/5 to-transparent p-4 sm:px-5 sm:py-4 relative overflow-hidden min-w-0">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className="flex h-11 w-11 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl border border-brand/30 bg-brand/20 text-brand shadow-[0_0_20px_rgba(73,75,231,0.25)]">
                    <ListChecks size={24} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <strong className="block text-3xl sm:text-4xl font-black leading-none tracking-tight text-text-primary">
                      {isLoading ? '—' : pendingMilestoneItems.length}
                    </strong>
                    <span className="mt-1 block text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-text-muted truncate">
                      {t('dashboard.pendingMilestoneOverviewLabel', 'Pending Milestones')}
                    </span>
                  </div>
                </div>
                <div className="text-left @[280px]:text-right @[280px]:pl-3 pt-2 @[280px]:pt-0 border-t @[280px]:border-t-0 @[280px]:border-l border-border/60 w-full @[280px]:w-auto shrink-0">
                  <strong className="block text-xl sm:text-2xl font-black text-text-primary leading-tight">{isLoading ? '—' : milestoneGroups.length}</strong>
                  <span className="block text-[8px] font-black uppercase tracking-wider text-text-muted">
                    {t('dashboard.activeJobsWithMilestones', 'Active Contracts')}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3 relative z-10">
            <button
              type="button"
              className="freelancer-dash-overview-link cursor-pointer hover:underline"
              onClick={() => setIsMilestoneListOpen(open => !open)}
              aria-expanded={isMilestoneListOpen}
            >
              <span>
                {isMilestoneListOpen
                  ? t('dashboard.milestoneOverview', 'Overview Mode')
                  : t('dashboard.milestoneListView', 'Detailed Matrix')}
              </span>
              <ChevronRight size={14} className={`transition-transform ${isMilestoneListOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="freelancer-dash-overview-link group/link cursor-pointer shrink-0"
              onClick={onOpenContracts}
            >
              <span>{t('dashboard.openContracts', 'Open Contracts')}</span>
              <ChevronRight size={14} className="transition-transform group-hover/link:translate-x-1" aria-hidden="true" />
            </button>
          </div>
        </article>

        {/* Card 3: Elo Point Reputation Velocity */}
        <article className="bento-spotlight-card flex h-full min-h-[300px] flex-col justify-between p-5 sm:p-6 md:col-span-1 xl:col-span-3 relative group min-w-0">
          <div className="absolute top-0 right-0 w-36 h-36 bg-cyan/10 blur-3xl rounded-full pointer-events-none group-hover:bg-cyan/20 transition-all duration-500" />

          <header className="flex items-center justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center text-brand shadow-sm shrink-0">
                <ShieldCheck size={16} aria-hidden="true" />
              </div>
              <h3 className="text-sm font-black text-text-primary tracking-tight truncate">{t('dashboard.eloPoint', 'Elo Point')}</h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-lg border border-brand/30 bg-brand/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-brand shadow-xs shrink-0">
              <Sparkles size={10} />
              {isLoading
                ? t('dashboard.eloSyncing', 'Syncing')
                : eloSummary
                  ? 'Master Rank'
                  : 'Active'}
            </span>
          </header>

          <div className="flex flex-1 flex-col items-center justify-center py-2 relative z-10">
            <div
              className="relative h-32 w-32 sm:h-36 sm:w-36 shrink-0 flex items-center justify-center"
              role="img"
              aria-label={t('dashboard.eloScoreAria', { defaultValue: 'Current Elo score: {{score}}', score: eloScore ?? 0 })}
            >
              <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200" aria-hidden="true">
                <defs>
                  <linearGradient id="freelancerEloRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#494be7" />
                    <stop offset="50%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#06b6d4" />
                  </linearGradient>
                </defs>
                <circle cx="100" cy="100" r="74" fill="none" stroke="currentColor" strokeWidth="16" className="text-surface-muted/70" />
                <circle
                  cx="100"
                  cy="100"
                  r="74"
                  fill="none"
                  stroke="url(#freelancerEloRingGradient)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray="465"
                  strokeDashoffset="110"
                  className="freelancer-elo-donut-ring"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <strong className="text-2xl sm:text-3xl font-black leading-none tracking-tight text-text-primary">
                  {isLoading || eloScore == null ? '—' : eloScore.toLocaleString()}
                </strong>
                <span className="mt-1 text-[8px] font-black uppercase tracking-widest text-brand">Elo Score</span>
              </div>
            </div>

            {eloSummary && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-black">
                <span className="flex items-center gap-0.5 text-success bg-success/10 px-2 py-0.5 rounded-md border border-success/20">
                  <TrendingUp size={11} />
                  +{eloSummary.totalGained.toLocaleString()}
                </span>
                <span className="text-text-muted">•</span>
                <span className="flex items-center gap-0.5 text-destructive bg-destructive/10 px-2 py-0.5 rounded-md border border-destructive/20">
                  <TrendingDown size={11} />
                  −{eloSummary.totalLost.toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="freelancer-dash-overview-link self-center group/link cursor-pointer relative z-10 pt-2 border-t border-border/60 w-full justify-center"
            onClick={onOpenEloHistory}
          >
            <span>{t('dashboard.eloHistory', 'View Elo History')}</span>
            <ChevronRight size={14} className="transition-transform group-hover/link:translate-x-1" aria-hidden="true" />
          </button>
        </article>
      </div>
    </section>
  );
}
