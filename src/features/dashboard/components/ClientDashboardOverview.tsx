import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  ListChecks,
} from 'lucide-react';
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ProposalStatusCounts } from '../utils/clientDashboardMetrics';

interface ClientDashboardOverviewProps {
  isLoading: boolean;
  proposalCounts: ProposalStatusCounts;
  pendingMilestonesCount: number;
  submittedMilestonesCount: number;
  totalMilestonesCount: number;
  theme: 'white' | 'black';
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
  proposalCounts,
  pendingMilestonesCount,
  submittedMilestonesCount,
  totalMilestonesCount,
  theme,
  onOpenProposals,
  onOpenContracts,
}: ClientDashboardOverviewProps) {
  const { t } = useTranslation();
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
    <section className="client-dash-overview-section" aria-labelledby="client-dashboard-overview-title">
      <div className="client-dash-section-heading">
        <div>
          <span className="client-dash-section-kicker">
            {t('dashboard.liveOverview', 'Live overview')}
          </span>
          <h2 id="client-dashboard-overview-title">
            {t('dashboard.hiringPulse', 'Hiring pulse')}
          </h2>
        </div>
        <p>{t('dashboard.hiringPulseDescription', 'Proposal decisions, reputation, and delivery progress in one place.')}</p>
      </div>

      <div className="client-dash-overview-grid">
        <article className="glass-card client-dash-proposal-chart-card">
          <div className="client-dash-card-heading">
            <div>
              <span className="client-dash-card-eyebrow">
                {t('dashboard.proposalPipeline', 'Proposal pipeline')}
              </span>
              <h3>{t('dashboard.proposalStatus', 'Proposal status')}</h3>
              <p>{t('dashboard.proposalStatusDescription', 'Current decisions across all your job posts.')}</p>
            </div>
            <button type="button" className="client-dash-icon-link" onClick={onOpenProposals}>
              {t('dashboard.viewAll', 'View all')}
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          </div>

          <div className="client-dash-proposal-chart-content">
            <div
              className="client-dash-donut-wrap"
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
                <div className="client-dash-chart-skeleton" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={64}
                      outerRadius={90}
                      paddingAngle={trackedProposalCount > 0 ? 4 : 0}
                      cornerRadius={7}
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
                        }}
                        formatter={(value: number, name: string) => [value, name]}
                      />
                    )}
                  </PieChart>
                </ResponsiveContainer>
              )}
              <div className="client-dash-donut-total" aria-hidden="true">
                <strong>{isLoading ? '—' : trackedProposalCount}</strong>
                <span>{t('dashboard.tracked', 'Tracked')}</span>
              </div>
            </div>

            <div className="client-dash-proposal-legend" aria-label={t('dashboard.proposalBreakdown', 'Proposal breakdown')}>
              {proposalChartData.map(item => (
                <div className="client-dash-proposal-legend-row" key={item.key}>
                  <span className="client-dash-legend-dot" style={{ backgroundColor: item.color }} />
                  <span>{item.name}</span>
                  <strong>{isLoading ? '—' : item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </article>

        <div className="client-dash-overview-side">
          <article className="glass-card client-dash-milestone-card">
            <div className="client-dash-milestone-topline">
              <div className="client-dash-card-icon client-dash-card-icon-cyan">
                <ListChecks size={21} aria-hidden="true" />
              </div>
              <span className="client-dash-progress-label">{milestoneProgress}%</span>
            </div>
            <div>
              <span className="client-dash-metric-label">
                {t('dashboard.milestonesAwaitingCompletion', 'Milestones awaiting completion')}
              </span>
              <strong className="client-dash-milestone-value">{isLoading ? '—' : pendingMilestonesCount}</strong>
            </div>
            <div className="client-dash-milestone-progress" aria-hidden="true">
              <span style={{ width: `${milestoneProgress}%` }} />
            </div>
            <div className="client-dash-milestone-footer">
              <span>
                {submittedMilestonesCount > 0 ? <Clock3 size={14} /> : <CheckCircle2 size={14} />}
                {submittedMilestonesCount > 0
                  ? t('dashboard.milestonesSubmitted', {
                    defaultValue: '{{count}} submitted for review',
                    count: submittedMilestonesCount,
                  })
                  : t('dashboard.noMilestonesForReview', 'Nothing waiting for review')}
              </span>
              <button type="button" onClick={onOpenContracts}>
                {t('dashboard.openContracts', 'Open contracts')}
                <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
