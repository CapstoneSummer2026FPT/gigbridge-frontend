import {
  ArrowUpRight,
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
import type {
  ContractPipelineCounts,
  ProposalStatusCounts,
} from '../utils/clientDashboardMetrics';

interface ClientDashboardOverviewProps {
  isLoading: boolean;
  eloSummary: EloSummary | null;
  proposalCounts: ProposalStatusCounts;
  pendingMilestonesCount: number;
  submittedMilestonesCount: number;
  totalMilestonesCount: number;
  contractPipelineCounts: ContractPipelineCounts;
  theme: 'white' | 'black';
  onOpenEloHistory: () => void;
  onOpenProposals: () => void;
  onOpenContracts: () => void;
}

interface ProposalChartItem {
  key: keyof ProposalStatusCounts;
  name: string;
  value: number;
  color: string;
  detail: string;
}

export function ClientDashboardOverview({
  isLoading,
  eloSummary,
  proposalCounts,
  pendingMilestonesCount,
  submittedMilestonesCount: _submittedMilestonesCount,
  totalMilestonesCount,
  contractPipelineCounts,
  theme,
  onOpenEloHistory,
  onOpenProposals,
  onOpenContracts,
}: ClientDashboardOverviewProps) {
  const { t } = useTranslation();
  const eloScore = eloSummary?.currentPoints;

  const proposalChartData: ProposalChartItem[] = [
    {
      key: 'pending',
      name: t('dashboard.proposalPending', 'Pending Review'),
      value: proposalCounts.pending,
      color: '#f59e0b',
      detail: 'Awaiting decision',
    },
    {
      key: 'accepted',
      name: t('dashboard.proposalAccepted', 'Accepted'),
      value: proposalCounts.accepted,
      color: '#22c55e',
      detail: 'Contract created',
    },
    {
      key: 'rejected',
      name: t('dashboard.proposalRejected', 'Declined'),
      value: proposalCounts.rejected,
      color: '#ef4444',
      detail: 'Not selected',
    },
  ];

  const trackedProposalCount = proposalChartData.reduce((sum, item) => sum + item.value, 0);
  const chartData = trackedProposalCount > 0
    ? proposalChartData
    : [{ key: 'pending' as const, name: t('dashboard.noProposals', 'No proposals'), value: 1, color: '#94a3b8', detail: '' }];

  const completedMilestonesCount = Math.max(0, totalMilestonesCount - pendingMilestonesCount);
  const milestoneProgress = totalMilestonesCount > 0
    ? Math.round((completedMilestonesCount / totalMilestonesCount) * 100)
    : 0;

  return (
    <section className="space-y-6" aria-labelledby="client-dashboard-overview-title">
      <div className="flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand shadow-[0_0_8px_var(--brand)]" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-brand">
              {t('dashboard.overviewKicker', 'Live Metrics')}
            </span>
          </div>
          <h2 id="client-dashboard-overview-title" className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-text-primary font-display-sm">
            {t('dashboard.overview', 'Hiring Pulse & Pipeline')}
          </h2>
        </div>
        <p className="max-w-md text-left text-xs text-text-secondary sm:text-right font-medium leading-relaxed">
          {t('dashboard.clientOverviewDesc', 'Live monitoring of client reputation, inbound proposals, and contract milestones.')}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-stretch">
        {/* Card 1: Trust & Elo Reputation */}
        <article className="bento-spotlight-card p-5 sm:p-6 rounded-3xl flex flex-col justify-between h-full relative group">
          <div className="absolute top-0 right-0 w-36 h-36 bg-brand/10 blur-3xl rounded-full pointer-events-none group-hover:bg-brand/20 transition-all duration-500" />

          <div className="flex flex-col justify-between h-full relative z-10">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-brand shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand truncate">
                    {t('dashboard.reputation', 'Trust & Score')}
                  </span>
                </div>
                <h3 className="text-base font-black text-text-primary tracking-tight mt-0.5 truncate">
                  {t('dashboard.eloPoint', 'Client Reputation')}
                </h3>
              </div>
              <button
                type="button"
                className="freelancer-dash-overview-link group/link cursor-pointer shrink-0"
                onClick={onOpenEloHistory}
              >
                <span>{t('dashboard.history', 'History')}</span>
                <ArrowUpRight size={14} className="transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col @[340px]:flex-row items-center justify-between gap-4 my-auto py-2">
              {/* Circular Gauge */}
              <div
                className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0 flex items-center justify-center"
                role="img"
                aria-label={t('dashboard.eloScoreAria', {
                  defaultValue: 'Current Elo score: {{score}}',
                  score: eloScore ?? 0,
                })}
              >
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                  <defs>
                    <linearGradient id="clientEloGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#494be7" />
                      <stop offset="50%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-surface-muted/60"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="url(#clientEloGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 * (1 - Math.min(1, (eloScore ?? 0) / 2000))}
                    className="freelancer-elo-donut-ring transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
                  <strong className="text-2xl sm:text-3xl font-black leading-none text-text-primary tracking-tight">
                    {isLoading || eloScore == null ? '—' : eloScore.toLocaleString()}
                  </strong>
                  <span className="text-[9px] font-bold uppercase text-brand tracking-wide mt-1">
                    Elo Score
                  </span>
                </div>
              </div>

              {/* Status / Ledger Info */}
              <div className="flex flex-col gap-2 w-full @[340px]:w-auto flex-1 min-w-0">
                <div className="flex items-center justify-between px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-surface-muted/50 border border-border/70">
                  <span className="text-xs font-bold text-text-secondary">{t('dashboard.status', 'Status')}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider bg-brand/15 text-brand border border-brand/25 truncate">
                    <Sparkles size={10} className="shrink-0" />
                    {eloSummary ? 'Verified Client' : 'Active'}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-surface-muted/50 border border-border/70">
                  <span className="text-xs font-bold text-text-secondary">{t('dashboard.gained', 'Gained')}</span>
                  <strong className="flex items-center gap-0.5 text-xs font-black text-success">
                    <TrendingUp size={12} className="shrink-0" />
                    +{eloSummary?.totalGained?.toLocaleString() ?? 0}
                  </strong>
                </div>
                <div className="flex items-center justify-between px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-surface-muted/50 border border-border/70">
                  <span className="text-xs font-bold text-text-secondary">{t('dashboard.lost', 'Lost')}</span>
                  <strong className="flex items-center gap-0.5 text-xs font-black text-destructive">
                    <TrendingDown size={12} className="shrink-0" />
                    −{eloSummary?.totalLost?.toLocaleString() ?? 0}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Card 2: Proposal Pipeline */}
        <article className="bento-spotlight-card p-5 sm:p-6 rounded-3xl flex flex-col justify-between h-full relative group">
          <div className="absolute top-0 right-0 w-36 h-36 bg-purple/10 blur-3xl rounded-full pointer-events-none group-hover:bg-purple/20 transition-all duration-500" />

          <div className="flex flex-col justify-between h-full relative z-10">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <Flame size={13} className="text-purple shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand truncate">
                    {t('dashboard.proposalPipeline', 'Inbound')}
                  </span>
                </div>
                <h3 className="text-base font-black text-text-primary tracking-tight mt-0.5 truncate">
                  {t('dashboard.proposalStatus', 'Proposal Pipeline')}
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
            </div>

            <div className="flex flex-col @[340px]:flex-row items-center justify-between gap-4 my-auto py-2">
              {/* Donut Ring */}
              <div
                className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0 flex items-center justify-center"
                role="img"
                aria-label={t(
                  'dashboard.proposalChartAria',
                  {
                    defaultValue: 'Proposal chart: {{pending}} pending, {{accepted}} accepted, {{rejected}} rejected',
                    ...proposalCounts,
                  },
                )}
              >
                {isLoading ? (
                  <div className="w-20 h-20 rounded-full border-4 border-surface-muted border-t-brand animate-spin" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={44}
                        outerRadius={60}
                        paddingAngle={trackedProposalCount > 0 ? 4 : 0}
                        cornerRadius={5}
                        stroke="none"
                        isAnimationActive={trackedProposalCount > 0}
                      >
                        {chartData.map(item => <Cell key={item.key} fill={item.color} opacity={trackedProposalCount > 0 ? 1 : 0.25} />)}
                      </Pie>
                      {trackedProposalCount > 0 && (
                        <Tooltip
                          contentStyle={{
                            background: theme === 'black' ? 'rgba(13, 14, 25, 0.96)' : 'rgba(255, 255, 255, 0.98)',
                            border: theme === 'black' ? '1px solid rgba(255, 255, 255, 0.14)' : '1px solid rgba(73, 75, 231, 0.18)',
                            borderRadius: 12,
                            color: theme === 'black' ? '#f5f6f8' : '#19191b',
                            fontSize: 12,
                            padding: '6px 12px',
                            boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                          }}
                          formatter={(value: number, name: string) => [value, name]}
                        />
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
                  <strong className="text-2xl sm:text-3xl font-black leading-none text-text-primary tracking-tight">
                    {isLoading ? '—' : trackedProposalCount}
                  </strong>
                  <span className="text-[9px] font-bold uppercase text-text-muted tracking-wide mt-1 max-w-[84px] leading-tight">
                    {t('dashboard.tracked', 'Total Tracked')}
                  </span>
                </div>
              </div>

              {/* 3 Status Rows */}
              <div className="flex flex-col gap-2 w-full @[340px]:w-auto flex-1 min-w-0" aria-label={t('dashboard.proposalBreakdown', 'Proposal breakdown')}>
                {proposalChartData.map(item => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-2xl bg-surface-muted/50 border border-border/70 transition-all hover:bg-surface-muted hover:border-brand/30 group/pill min-w-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm group-hover/pill:scale-125 transition-transform"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs font-bold text-text-secondary truncate">{item.name}</span>
                    </div>
                    <strong className="text-xs font-black text-text-primary px-2 py-0.5 rounded-md bg-surface-muted/80 ml-2 shrink-0">
                      {isLoading ? '—' : item.value}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        {/* Card 3: Delivery & Milestones */}
        <article className="bento-spotlight-card p-5 sm:p-6 rounded-3xl flex flex-col justify-between h-full relative group">
          <div className="absolute top-0 right-0 w-36 h-36 bg-cyan/10 blur-3xl rounded-full pointer-events-none group-hover:bg-cyan/20 transition-all duration-500" />

          <div className="flex flex-col justify-between h-full relative z-10">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <ListChecks size={13} className="text-cyan shrink-0" />
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-brand truncate">
                    {t('dashboard.deliveryPipeline', 'Deliveries')}
                  </span>
                </div>
                <h3 className="text-base font-black text-text-primary tracking-tight mt-0.5 truncate">
                  {t('dashboard.milestonesAwaitingCompletion', 'Milestones in Delivery')}
                </h3>
              </div>
              <button
                type="button"
                className="freelancer-dash-overview-link group/link cursor-pointer shrink-0"
                onClick={onOpenContracts}
              >
                <span>{t('dashboard.openContracts', 'Contracts')}</span>
                <ArrowUpRight size={14} className="transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col gap-3 my-auto py-1">
              <div className="flex flex-wrap @[300px]:flex-nowrap items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-brand/12 via-brand/5 to-transparent border border-brand/20 min-w-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-brand/20 text-brand flex items-center justify-center shrink-0 border border-brand/30 shadow-[0_0_15px_rgba(73,75,231,0.25)]">
                    <ListChecks size={20} aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <strong className="text-2xl sm:text-3xl font-black leading-none text-text-primary tracking-tight">
                      {isLoading ? '—' : pendingMilestonesCount}
                    </strong>
                    <span className="block text-[8px] sm:text-[9px] uppercase tracking-wider font-black text-text-muted mt-1 truncate">
                      Pending Completion
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-1 rounded-xl text-xs font-black bg-brand/15 text-brand border border-brand/25 shadow-xs whitespace-nowrap">
                    {milestoneProgress}% Done
                  </span>
                </div>
              </div>

              {/* 3 Contract Status Badges */}
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2" aria-label={t('dashboard.contractStatusBreakdown', 'Contract status breakdown')}>
                {[
                  {
                    key: 'pendingEscrow',
                    label: t('dashboard.pendingEscrow', 'In Escrow'),
                    value: contractPipelineCounts.pendingEscrow,
                    dotClass: 'bg-purple shadow-[0_0_8px_rgba(139,92,246,0.8)]',
                  },
                  {
                    key: 'pendingSignature',
                    label: t('dashboard.pendingSignature', 'Signature'),
                    value: contractPipelineCounts.pendingSignature,
                    dotClass: 'bg-warning shadow-[0_0_8px_rgba(245,158,11,0.8)]',
                  },
                  {
                    key: 'active',
                    label: t('dashboard.activeContracts', 'Active'),
                    value: contractPipelineCounts.active,
                    dotClass: 'bg-success shadow-[0_0_8px_rgba(34,197,94,0.8)]',
                  },
                ].map(item => (
                  <div
                    key={item.key}
                    className="min-w-0 rounded-2xl border border-border/70 bg-surface-muted/50 px-1.5 py-2 text-center transition-all hover:bg-surface-muted hover:border-brand/30"
                  >
                    <div className="flex items-center justify-center gap-1 min-w-0">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.dotClass}`} />
                      <span className="truncate text-[8px] font-black uppercase tracking-tight text-text-muted">{item.label}</span>
                    </div>
                    <strong className="mt-1 block text-xs sm:text-sm font-black leading-none text-text-primary">{isLoading ? '—' : item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
