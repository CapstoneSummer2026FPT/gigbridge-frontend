import {
  ArrowUpRight,
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
}

export function ClientDashboardOverview({
  isLoading,
  eloSummary,
  proposalCounts,
  pendingMilestonesCount,
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
      name: t('dashboard.proposalPending', 'Pending'),
      value: proposalCounts.pending,
      color: '#f59e0b',
    },
    {
      key: 'accepted',
      name: t('dashboard.proposalAccepted', 'Accepted'),
      value: proposalCounts.accepted,
      color: '#22c55e',
    },
    {
      key: 'rejected',
      name: t('dashboard.proposalRejected', 'Rejected'),
      value: proposalCounts.rejected,
      color: '#ef4444',
    },
  ];
  const trackedProposalCount = proposalChartData.reduce((sum, item) => sum + item.value, 0);
  const chartData = trackedProposalCount > 0
    ? proposalChartData
    : [{ key: 'pending' as const, name: t('dashboard.noProposals', 'No proposals'), value: 1, color: '#94a3b8' }];
  const completedMilestonesCount = Math.max(0, totalMilestonesCount - pendingMilestonesCount);
  const milestoneProgress = totalMilestonesCount > 0
    ? Math.round((completedMilestonesCount / totalMilestonesCount) * 100)
    : 0;

  return (
    <section className="space-y-4" aria-labelledby="client-dashboard-overview-title">
      <div className="px-1">
        <span className="client-dash-section-kicker">
          {t('dashboard.overviewKicker', 'Live metrics')}
        </span>
        <h2 id="client-dashboard-overview-title" className="text-xl sm:text-2xl font-black tracking-tight uppercase text-text-primary mt-0.5">
          {t('dashboard.overview', 'Overview')}
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        {/* Card 1: Elo Point */}
        <article className="glass-card p-5 sm:p-6 rounded-3xl flex flex-col justify-between h-full client-dash-card-hover">
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <span className="client-dash-card-eyebrow">
                  {t('dashboard.reputation', 'Trust & Reputation')}
                </span>
                <h3 className="text-base font-black text-text-primary mt-0.5">{t('dashboard.eloPoint', 'Elo Point')}</h3>
              </div>
              <button type="button" className="client-dash-icon-link" onClick={onOpenEloHistory}>
                {t('dashboard.history', 'History')}
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-auto">
              {/* Circular Gauge */}
              <div
                className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center"
                role="img"
                aria-label={t('dashboard.eloScoreAria', {
                  defaultValue: 'Current Elo score: {{score}}',
                  score: eloScore ?? 0,
                })}
              >
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-surface-muted opacity-40"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="url(#eloGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={251.2}
                    strokeDashoffset={251.2 * (1 - Math.min(1, (eloScore ?? 0) / 2000))}
                    className="transition-all duration-700 ease-out"
                  />
                  <defs>
                    <linearGradient id="eloGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4f46e5" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <ShieldCheck size={16} className="text-brand mb-0.5" />
                  <strong className="text-xl sm:text-2xl font-black leading-none text-text-primary tracking-tight">
                    {isLoading || eloScore == null ? '—' : eloScore.toLocaleString()}
                  </strong>
                  <span className="text-[8px] font-black uppercase text-text-muted tracking-widest mt-0.5">
                    {t('dashboard.rating', 'Rating')}
                  </span>
                </div>
              </div>

              {/* Status / Ledger Info */}
              <div className="flex flex-col gap-2 w-full sm:w-auto flex-1 min-w-0">
                <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-surface-muted/60 border border-border/80">
                  <span className="text-xs font-bold text-text-secondary">{t('dashboard.status', 'Status')}</span>
                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-success/15 text-success">
                    {eloSummary ? t('dashboard.verified', 'Verified') : t('dashboard.syncing', 'Syncing')}
                  </span>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-surface-muted/60 border border-border/80">
                  <span className="text-xs font-bold text-text-secondary">{t('dashboard.gained', 'Gained')}</span>
                  <strong className="text-xs font-black text-success">
                    +{eloSummary?.totalGained?.toLocaleString() ?? 0}
                  </strong>
                </div>
                <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-surface-muted/60 border border-border/80">
                  <span className="text-xs font-bold text-text-secondary">{t('dashboard.lost', 'Lost')}</span>
                  <strong className="text-xs font-black text-danger">
                    −{eloSummary?.totalLost?.toLocaleString() ?? 0}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Card 2: Proposal Pipeline */}
        <article className="glass-card p-5 sm:p-6 rounded-3xl flex flex-col justify-between h-full client-dash-card-hover">
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <span className="client-dash-card-eyebrow">
                  {t('dashboard.proposalPipeline', 'Proposal pipeline')}
                </span>
                <h3 className="text-base font-black text-text-primary mt-0.5">{t('dashboard.proposalStatus', 'Proposal status')}</h3>
              </div>
              <button type="button" className="client-dash-icon-link" onClick={onOpenProposals}>
                {t('dashboard.viewAll', 'View all')}
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            </div>

            {/* Donut + 3 Stacked Status Rows */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-auto">
              {/* Donut Ring */}
              <div
                className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 flex items-center justify-center"
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
                  <div className="w-24 h-24 rounded-full border-4 border-surface-muted border-t-brand animate-spin" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={38}
                        outerRadius={52}
                        paddingAngle={trackedProposalCount > 0 ? 3 : 0}
                        cornerRadius={5}
                        stroke="none"
                        isAnimationActive={trackedProposalCount > 0}
                      >
                        {chartData.map(item => <Cell key={item.key} fill={item.color} opacity={trackedProposalCount > 0 ? 1 : 0.22} />)}
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
                          }}
                          formatter={(value: number, name: string) => [value, name]}
                        />
                      )}
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <strong className="text-2xl sm:text-3xl font-black leading-none text-text-primary tracking-tight">
                    {isLoading ? '—' : trackedProposalCount}
                  </strong>
                  <span className="text-[8px] font-black uppercase text-text-muted tracking-widest mt-1">
                    {t('dashboard.tracked', 'Tracked')}
                  </span>
                </div>
              </div>

              {/* 3 Status Rows */}
              <div className="flex flex-col gap-2 w-full sm:w-auto flex-1 min-w-0" aria-label={t('dashboard.proposalBreakdown', 'Proposal breakdown')}>
                {proposalChartData.map(item => (
                  <div
                    key={item.key}
                    className="flex items-center justify-between px-3.5 py-2 rounded-2xl bg-surface-muted/60 border border-border/80 transition-all hover:bg-surface-muted hover:border-border"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-bold text-text-secondary truncate">{item.name}</span>
                    </div>
                    <strong className="text-sm font-black text-text-primary leading-none ml-2">
                      {isLoading ? '—' : item.value}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        {/* Card 3: Delivery & Milestones */}
        <article className="glass-card p-5 sm:p-6 rounded-3xl flex flex-col justify-between h-full client-dash-card-hover">
          <div className="flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <span className="client-dash-card-eyebrow">
                  {t('dashboard.deliveryPipeline', 'Delivery pipeline')}
                </span>
                <h3 className="text-base font-black text-text-primary mt-0.5">{t('dashboard.milestonesAwaitingCompletion', 'Milestones awaiting completion')}</h3>
              </div>
              <button type="button" className="client-dash-icon-link" onClick={onOpenContracts}>
                {t('dashboard.openContracts', 'Contracts')}
                <ArrowUpRight size={14} aria-hidden="true" />
              </button>
            </div>

            {/* Milestone metric & 3 contract status rows */}
            <div className="flex flex-col gap-3 my-auto">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0 border border-brand/20">
                    <ListChecks size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <strong className="text-xl sm:text-2xl font-black leading-none text-text-primary">{isLoading ? '—' : pendingMilestonesCount}</strong>
                    <span className="block text-[8px] uppercase tracking-wider font-black text-text-muted mt-0.5">Pending completion</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-brand/10 text-brand border border-brand/20 shrink-0">
                  {milestoneProgress}% completed
                </span>
              </div>

              {/* 3 Contract Status Badges */}
              <div className="grid grid-cols-3 gap-2" aria-label={t('dashboard.contractStatusBreakdown', 'Contract status breakdown')}>
                {[
                  {
                    key: 'pendingEscrow',
                    label: t('dashboard.pendingEscrow', 'Pending escrow'),
                    value: contractPipelineCounts.pendingEscrow,
                    dotClass: 'bg-purple-500',
                  },
                  {
                    key: 'pendingSignature',
                    label: t('dashboard.pendingSignature', 'Pending signature'),
                    value: contractPipelineCounts.pendingSignature,
                    dotClass: 'bg-warning',
                  },
                  {
                    key: 'active',
                    label: t('dashboard.activeContracts', 'Active'),
                    value: contractPipelineCounts.active,
                    dotClass: 'bg-success',
                  },
                ].map(item => (
                  <div key={item.key} className="min-w-0 rounded-2xl border border-border/80 bg-surface-muted/60 px-2 py-2 text-center transition-all hover:bg-surface-muted hover:border-border">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${item.dotClass}`} />
                      <span className="truncate text-[8px] font-black uppercase tracking-wide text-text-muted">{item.label}</span>
                    </div>
                    <strong className="mt-1 block text-sm font-black leading-none text-text-primary">{isLoading ? '—' : item.value}</strong>
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
