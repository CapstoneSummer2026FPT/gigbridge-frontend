import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Briefcase,
  ChartNoAxesCombined,
  ChevronRight,
  FileCheck2,
  RefreshCw,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { adminGetAPI } from '../../../api/adminAPI/GET';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import type {
  AdminDashboardCountMetric,
  AdminDashboardDays,
  AdminDashboardSummary,
} from '../../../types/adminDashboard';
import { ADMIN_GROUPS, ADMIN_MANAGERS } from '../adminManagers';
import '../styles/admin-dashboard-screen.css';

const PERIODS: AdminDashboardDays[] = [7, 30, 90];
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

type QueueKey = keyof AdminDashboardSummary['workQueue'];

const queueDefinitions: Array<{
  key: QueueKey;
  path: string;
  fallback: string;
  color: string;
}> = [
  { key: 'reports', path: '/admin/reports', fallback: 'Open reports', color: '#ef4444' },
  { key: 'contractReports', path: '/admin/reports/contracts', fallback: 'Contract reports', color: '#f59e0b' },
  { key: 'disputes', path: '/admin/disputes', fallback: 'Active disputes', color: '#8b5cf6' },
];

function MetricTrend({ metric, days, label, newPeriodLabel }: { metric: AdminDashboardCountMetric; days: number; label: string; newPeriodLabel: string }) {
  const change = metric.changePercent;
  const TrendIcon = (change ?? 0) < 0 ? TrendingDown : TrendingUp;
  return (
    <div className="dashboard-metric-trend">
      <span>+{metric.periodValue.toLocaleString()} {label} · {days}d</span>
      <span className={change == null ? 'neutral' : change >= 0 ? 'positive' : 'negative'}>
        {change == null ? newPeriodLabel : <><TrendIcon size={13} /> {change > 0 ? '+' : ''}{number.format(change)}%</>}
      </span>
    </div>
  );
}

function DashboardSkeleton({ label }: { label: string }) {
  return (
    <div className="dashboard-data-stack" aria-label={label} role="status">
      <div className="dashboard-kpi-grid">
        {Array.from({ length: 4 }).map((_, index) => <div className="dashboard-skeleton dashboard-skeleton-kpi" key={index} />)}
      </div>
      <div className="dashboard-insight-grid">
        <div className="dashboard-skeleton dashboard-skeleton-chart" />
        <div className="dashboard-skeleton dashboard-skeleton-chart" />
      </div>
    </div>
  );
}

export default function AdminDashboardScreen() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const label = useCallback((key: string, fallback: string) => t(key, { defaultValue: fallback }), [t]);
  const [days, setDays] = useState<AdminDashboardDays>(30);
  const [summary, setSummary] = useState<AdminDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const activeRequest = ++requestId.current;
    setLoading(true);
    setError('');
    try {
      const response = await adminGetAPI.getDashboard(days);
      if (activeRequest !== requestId.current) return;
      if (response.success && response.data) {
        setSummary(response.data);
      } else {
        setError(response.message || label('adminDashboard.loadError', 'Dashboard statistics could not be loaded.'));
      }
    } catch {
      if (activeRequest === requestId.current) {
        setError(label('adminDashboard.loadError', 'Dashboard statistics could not be loaded.'));
      }
    } finally {
      if (activeRequest === requestId.current) setLoading(false);
    }
  }, [days, label]);

  useEffect(() => {
    void load();
  }, [load]);

  const activity = useMemo(() => summary?.activity.map(point => ({
    ...point,
    displayDate: new Intl.DateTimeFormat(i18n.language, { month: 'short', day: 'numeric' })
      .format(new Date(`${point.bucket}T00:00:00`)),
  })) ?? [], [i18n.language, summary?.activity]);

  const queueMax = summary ? Math.max(1, ...Object.values(summary.workQueue)) : 1;
  const managerBadges: Record<string, number | undefined> = summary ? {
    reports: summary.workQueue.reports,
    'contract-reports': summary.workQueue.contractReports,
    disputes: summary.workQueue.disputes,
    withdrawals: summary.workQueue.withdrawals,
  } : {};

  return (
    <AppLayout>
      <main className="admin-dashboard-page">
        <header className="dashboard-header">
          <div>
            <div className="dashboard-kicker"><Shield size={19} /><span>{label('adminDashboard.kicker', 'Admin panel')}</span></div>
            <h1>{label('adminDashboard.title', 'GigBridge Administration')}</h1>
            <p>{label('adminDashboard.subtitle', 'Monitor marketplace health, operational workload, and management areas from one place.')}</p>
            {summary && <small>{label('adminDashboard.updated', 'Updated')} {new Date(summary.generatedAt).toLocaleString(i18n.language)}</small>}
          </div>

          <div className="dashboard-header-controls">
            <div className="dashboard-period-control" aria-label={label('adminDashboard.rangeLabel', 'Dashboard time range')}>
              {PERIODS.map(value => (
                <button key={value} type="button" className={days === value ? 'active' : ''} aria-pressed={days === value} onClick={() => setDays(value)}>
                  {value} {label('adminDashboard.days', 'days')}
                </button>
              ))}
            </div>
            <button type="button" className="dashboard-refresh" onClick={() => void load()} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {label('adminDashboard.refresh', 'Refresh')}
            </button>
          </div>
        </header>

        {loading && !summary ? <DashboardSkeleton label={label('adminDashboard.loading', 'Loading dashboard statistics')} /> : error ? (
          <section className="dashboard-data-error" role="alert">
            <AlertTriangle size={20} />
            <div><strong>{label('adminDashboard.loadErrorTitle', 'Statistics unavailable')}</strong><p>{error}</p></div>
            <button type="button" onClick={() => void load()}><RefreshCw size={15} /> {label('adminDashboard.retry', 'Retry')}</button>
          </section>
        ) : summary ? (
          <div className={`dashboard-data-stack ${loading ? 'is-refreshing' : ''}`}>
            <section className="dashboard-kpi-grid" aria-label={label('adminDashboard.kpiLabel', 'Marketplace overview')}>
              <article className="dashboard-kpi-card cyan">
                <div className="dashboard-kpi-heading"><span>{label('adminDashboard.metrics.users', 'Marketplace users')}</span><Users size={18} /></div>
                <strong>{summary.marketplaceUsers.value.toLocaleString()}</strong>
                <MetricTrend metric={summary.marketplaceUsers} days={days} label={label('adminDashboard.metrics.newUsers', 'new')} newPeriodLabel={label('adminDashboard.newPeriod', 'New in this period')} />
              </article>
              <article className="dashboard-kpi-card purple">
                <div className="dashboard-kpi-heading"><span>{label('adminDashboard.metrics.jobs', 'Open job posts')}</span><Briefcase size={18} /></div>
                <strong>{summary.openJobPosts.value.toLocaleString()}</strong>
                <MetricTrend metric={summary.openJobPosts} days={days} label={label('adminDashboard.metrics.created', 'created')} newPeriodLabel={label('adminDashboard.newPeriod', 'New in this period')} />
              </article>
              <article className="dashboard-kpi-card green">
                <div className="dashboard-kpi-heading"><span>{label('adminDashboard.metrics.contracts', 'Active contracts')}</span><FileCheck2 size={18} /></div>
                <strong>{summary.activeContracts.value.toLocaleString()}</strong>
                <MetricTrend metric={summary.activeContracts} days={days} label={label('adminDashboard.metrics.created', 'created')} newPeriodLabel={label('adminDashboard.newPeriod', 'New in this period')} />
              </article>
              <article className="dashboard-kpi-card amber">
                <div className="dashboard-kpi-heading"><span>{label('adminDashboard.metrics.gmv', 'Marketplace GMV')}</span><ChartNoAxesCombined size={18} /></div>
                <strong>{money.format(summary.marketplaceGmv.value)} ₫</strong>
                <div className="dashboard-metric-trend">
                  <span>{days}d {label('adminDashboard.metrics.released', 'released value')}</span>
                  <span className={summary.marketplaceGmv.changePercent == null ? 'neutral' : summary.marketplaceGmv.changePercent >= 0 ? 'positive' : 'negative'}>
                    {summary.marketplaceGmv.changePercent == null
                      ? label('adminDashboard.newPeriod', 'New in this period')
                      : `${summary.marketplaceGmv.changePercent > 0 ? '+' : ''}${number.format(summary.marketplaceGmv.changePercent)}%`}
                  </span>
                </div>
              </article>
            </section>

            <section className="dashboard-insight-grid">
              <article className="dashboard-chart-card dashboard-activity-card">
                <header><div><span>{label('adminDashboard.charts.activityKicker', 'Marketplace activity')}</span><h2>{label('adminDashboard.charts.activity', 'Marketplace activity trend')}</h2><p>{label('adminDashboard.charts.activityHelp', 'New records created during the selected period.')}</p></div><Activity size={20} /></header>
                {activity.some(point => point.users || point.jobPosts || point.proposals || point.contracts) ? (
                  <div className="dashboard-chart-area" role="img" aria-label={label('adminDashboard.charts.activityAria', 'Activity trend for users, job posts, proposals, and contracts')}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={activity} margin={{ top: 8, right: 8, left: -20, bottom: 2 }}>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
                        <XAxis dataKey="displayDate" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
                        <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)' }} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                        <Line type="monotone" dataKey="users" name={label('adminDashboard.series.users', 'Users')} stroke="#0284c7" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="jobPosts" name={label('adminDashboard.series.jobs', 'Job posts')} stroke="#8b5cf6" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="proposals" name={label('adminDashboard.series.proposals', 'Proposals')} stroke="#f59e0b" strokeWidth={2.5} dot={false} />
                        <Line type="monotone" dataKey="contracts" name={label('adminDashboard.series.contracts', 'Contracts')} stroke="#16a34a" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : <div className="dashboard-chart-empty">{label('adminDashboard.charts.noActivity', 'No marketplace activity in this period.')}</div>}

                <details className="dashboard-chart-table">
                  <summary>{label('adminDashboard.charts.viewData', 'View chart data')}</summary>
                  <div><table><thead><tr><th>{label('adminDashboard.charts.date', 'Date')}</th><th>{label('adminDashboard.series.users', 'Users')}</th><th>{label('adminDashboard.series.jobs', 'Job posts')}</th><th>{label('adminDashboard.series.proposals', 'Proposals')}</th><th>{label('adminDashboard.series.contracts', 'Contracts')}</th></tr></thead><tbody>{activity.map(point => <tr key={point.bucket}><td>{point.displayDate}</td><td>{point.users}</td><td>{point.jobPosts}</td><td>{point.proposals}</td><td>{point.contracts}</td></tr>)}</tbody></table></div>
                </details>
              </article>

              <article className="dashboard-chart-card dashboard-queue-card">
                <header><div><span>{label('adminDashboard.charts.queueKicker', 'Operations')}</span><h2>{label('adminDashboard.charts.queue', 'Work requiring attention')}</h2><p>{label('adminDashboard.charts.queueHelp', 'Live unresolved workload across admin teams.')}</p></div><AlertTriangle size={20} /></header>
                <div className="dashboard-queue-chart" role="group" aria-label={label('adminDashboard.charts.queueAria', 'Current operational work queue')}>
                  {queueDefinitions.map(item => {
                    const value = summary.workQueue[item.key];
                    return (
                      <button type="button" key={item.key} onClick={() => navigate(item.path)}>
                        <span className="dashboard-queue-label"><span>{label(`adminDashboard.queues.${item.key}`, item.fallback)}</span><strong>{value.toLocaleString()}</strong></span>
                        <span className="dashboard-queue-track"><span style={{ width: `${value === 0 ? 0 : Math.max(5, value / queueMax * 100)}%`, background: item.color }} /></span>
                        <span className="dashboard-queue-link">{label('adminDashboard.openManager', 'Open manager')} <ArrowRight size={13} /></span>
                      </button>
                    );
                  })}
                </div>
              </article>
            </section>
          </div>
        ) : null}

        <section className="dashboard-management" aria-labelledby="dashboard-management-title">
          <div className="dashboard-section-heading">
            <div><span>{label('adminDashboard.navigationKicker', 'Administration')}</span><h2 id="dashboard-management-title">{label('adminDashboard.navigationTitle', 'Management areas')}</h2><p>{label('adminDashboard.navigationHelp', 'Open a workspace to review records or take administrative action.')}</p></div>
          </div>

          <div className="dashboard-manager-groups">
            {ADMIN_GROUPS.filter(group => group.id !== 'overview').map(group => {
              const managers = ADMIN_MANAGERS.filter(manager => manager.group === group.id && manager.showOnDashboard);
              if (managers.length === 0) return null;
              return (
                <section key={group.id} aria-labelledby={`admin-group-${group.id}`}>
                  <h3 id={`admin-group-${group.id}`}>{label(group.labelKey, group.fallbackLabel)}</h3>
                  <div className="dashboard-manager-grid">
                    {managers.map(manager => {
                      const Icon = manager.icon;
                      const badge = managerBadges[manager.id];
                      return (
                        <button key={manager.path} type="button" onClick={() => navigate(manager.path)} className="dashboard-manager-card">
                          <span className="dashboard-manager-icon"><Icon size={19} /></span>
                          <span className="dashboard-manager-copy"><strong>{label(manager.labelKey, manager.fallbackLabel)}</strong><small>{label(manager.descriptionKey, manager.fallbackDescription)}</small></span>
                          {badge !== undefined && badge > 0 && <span className="dashboard-manager-badge" aria-label={`${badge} ${label('adminDashboard.itemsNeedAttention', 'items need attention')}`}>{badge > 99 ? '99+' : badge}</span>}
                          <ChevronRight size={16} className="dashboard-manager-chevron" aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </section>
      </main>
    </AppLayout>
  );
}
