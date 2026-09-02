import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  BriefcaseBusiness,
  Check,
  Crown,
  Eye,
  EyeOff,
  Layers3,
  Inbox,
} from 'lucide-react';
import type {
  FinanceAnalyticsResponse,
  PremiumAnalyticsResponse,
} from '../../../../types/adminAnalytics';
import {
  CHART_COLORS,
  SOURCE_VISIBILITY_KEY,
  formatMoney,
  formatNumber,
  pivot,
  sourceInScope,
  useTablePage,
  type RevenueScope,
} from '../../utils/analyticsUtils';
import { AnalyticsMetricCard } from './AnalyticsMetricCard';
import { AnalyticsChartPanel } from './AnalyticsChartPanel';
import { AnalyticsPagination } from './AnalyticsPagination';
import { SeriesTable } from './SeriesTable';
import { useTranslation } from '../../../../hooks/useTranslation';

export interface AdminRevenueTabProps {
  finance: FinanceAnalyticsResponse;
  premium: PremiumAnalyticsResponse;
}

export function AdminRevenueTab({ finance, premium }: AdminRevenueTabProps) {
  const { t } = useTranslation('admin');
  const [scope, setScope] = useState<RevenueScope>('all');
  const [hiddenSources, setHiddenSources] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = JSON.parse(window.localStorage.getItem(SOURCE_VISIBILITY_KEY) ?? '[]');
      return new Set(Array.isArray(stored) ? stored.filter(val => typeof val === 'string') : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    window.localStorage.setItem(SOURCE_VISIBILITY_KEY, JSON.stringify([...hiddenSources]));
  }, [hiddenSources]);

  const scopedSources = useMemo(
    () => (finance.revenueSources ?? []).filter(source => sourceInScope(source.key, scope)),
    [finance.revenueSources, scope]
  );

  const visibleSources = useMemo(
    () => scopedSources.filter(source => !hiddenSources.has(source.key)),
    [scopedSources, hiddenSources]
  );

  const visibleKeys = useMemo(
    () => new Set(visibleSources.map(source => source.key)),
    [visibleSources]
  );

  const visibleRevenuePoints = useMemo(
    () => (finance.revenueSeries ?? []).filter(point => visibleKeys.has(point.series)),
    [finance.revenueSeries, visibleKeys]
  );

  const revenueData = useMemo(() => pivot(visibleRevenuePoints), [visibleRevenuePoints]);
  const cashFlowData = useMemo(() => pivot(finance.cashFlowSeries ?? []), [finance.cashFlowSeries]);
  const gmvData = useMemo(() => pivot(finance.gmvSeries ?? []), [finance.gmvSeries]);

  const sourceColors = useMemo(
    () => new Map((finance.revenueSources ?? []).map((source, idx) => [source.key, CHART_COLORS[idx % CHART_COLORS.length]])),
    [finance.revenueSources]
  );

  const visibleRevenueTotal = useMemo(
    () => visibleSources.reduce((sum, source) => sum + source.value, 0),
    [visibleSources]
  );

  const toggleSource = (key: string) => {
    setHiddenSources(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="analytics-stack">
      {/* KPI Cards Row */}
      <section className="analytics-kpis">
        {(finance.kpis ?? []).map(metric => (
          <AnalyticsMetricCard key={metric.key} metric={metric} />
        ))}
      </section>

      {/* Revenue Filter & Scope Bar */}
      <section className="analytics-revenue-controls" aria-label={t('adminAnalytics.revenue.scope', { defaultValue: 'Revenue Scope' })}>
        <div className="analytics-scope-container">
          <span className="analytics-control-label">{t('adminAnalytics.revenue.scope', { defaultValue: 'Revenue Scope' })}</span>
          <div className="analytics-scope-options" role="group" aria-label="Filter revenue stream">
            {([
              ['all', t('adminAnalytics.revenue.all', { defaultValue: 'All Revenue' }), Layers3],
              ['job', t('adminAnalytics.revenue.job', { defaultValue: 'Job Related' }), BriefcaseBusiness],
              ['premium', t('adminAnalytics.revenue.premium', { defaultValue: 'Premium Only' }), Crown],
            ] as const).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                className={`analytics-scope-btn ${scope === value ? 'active' : ''}`}
                aria-pressed={scope === value}
                onClick={() => setScope(value)}
              >
                <Icon size={15} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="analytics-visible-total-card">
          <span className="analytics-visible-total-label">
            {t('adminAnalytics.revenue.activeFilteredTotal', { defaultValue: 'Active Filtered Total' })}
          </span>
          <strong className="analytics-visible-total-amount">{formatMoney(visibleRevenueTotal)} ₫</strong>
        </div>
      </section>

      {/* Revenue Charts Grid */}
      <div className="analytics-grid analytics-grid-two">
        {/* Chart 1: Revenue by Source (Stacked Area) */}
        <AnalyticsChartPanel
          title={t('adminAnalytics.revenue.bySourceTitle', { defaultValue: 'Retained Platform Revenue by Source' })}
          subtitle={t('adminAnalytics.revenue.bySourceSubtitle', { defaultValue: 'Retained platform fees only; user escrow funds are strictly excluded' })}
          table={<SeriesTable points={visibleRevenuePoints} />}
        >
          {visibleSources.length > 0 && revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={revenueData} margin={{ top: 12, right: 12, left: 12, bottom: 0 }}>
                <defs>
                  {visibleSources.map(source => {
                    const color = sourceColors.get(source.key) || '#494be7';
                    return (
                      <linearGradient key={`grad-${source.key}`} id={`grad-${source.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                <XAxis
                  dataKey="bucket"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={val => `${formatMoney(val)} ₫`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number) => [`${formatMoney(value)} ₫`, t('adminAnalytics.tabs.revenue', { defaultValue: 'Revenue' })]}
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    borderRadius: '0.75rem',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                    color: 'var(--text-primary)',
                    backdropFilter: 'blur(12px)',
                  }}
                />
                {visibleSources.map(source => (
                  <Area
                    key={source.key}
                    type="monotone"
                    dataKey={source.key}
                    name={source.label}
                    stackId="revenue"
                    stroke={sourceColors.get(source.key)}
                    strokeWidth={2}
                    fill={`url(#grad-${source.key})`}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="analytics-chart-empty">
              <Inbox size={28} className="text-text-muted mb-2 opacity-50" />
              <span>{t('adminAnalytics.revenue.emptyRevenue', { defaultValue: 'No revenue event series for this timeframe. Select "This Year" or navigate periods to view past data.' })}</span>
            </div>
          )}
        </AnalyticsChartPanel>

        {/* Chart 2: Revenue Source Mix (Donut + Toggles) */}
        <AnalyticsChartPanel
          title={t('adminAnalytics.revenue.mixTitle', { defaultValue: 'Revenue Source Breakdown' })}
          subtitle={t('adminAnalytics.revenue.mixSubtitle', {
            count: (finance.meta?.classifiedSourceCount ?? 0).toLocaleString(),
            defaultValue: `${(finance.meta?.classifiedSourceCount ?? 0).toLocaleString()} classified events · Selections persist automatically`
          })}
        >
          <div className="analytics-source-mix-layout">
            <div className="analytics-source-chart">
              {visibleSources.length > 0 && visibleRevenueTotal > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={visibleSources}
                      dataKey="value"
                      nameKey="label"
                      innerRadius="60%"
                      outerRadius="86%"
                      paddingAngle={3}
                      cornerRadius={4}
                    >
                      {visibleSources.map(source => (
                        <Cell
                          key={source.key}
                          fill={sourceColors.get(source.key)}
                          stroke="var(--surface)"
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${formatMoney(value)} ₫`, 'Share']}
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        borderRadius: '0.75rem',
                        color: 'var(--text-primary)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="analytics-chart-empty">
                  <span>{t('adminAnalytics.revenue.emptyMix', { defaultValue: 'No revenue source distribution for this timeframe.' })}</span>
                </div>
              )}
            </div>

            {/* Source Toggle Chips */}
            <div className="analytics-source-controls" aria-label="Toggle revenue sources">
              {scopedSources.map(source => {
                const enabled = !hiddenSources.has(source.key);
                const color = sourceColors.get(source.key) || '#494be7';
                return (
                  <button
                    key={source.key}
                    type="button"
                    className={`analytics-source-btn ${enabled ? 'enabled' : 'disabled'}`}
                    aria-pressed={enabled}
                    onClick={() => toggleSource(source.key)}
                  >
                    <span className="analytics-source-swatch" style={{ backgroundColor: color }} />
                    <span className="analytics-source-info">
                      <strong className="analytics-source-name">{source.label}</strong>
                      <small className="analytics-source-val">{formatMoney(source.value)} ₫</small>
                    </span>
                    <span className="analytics-source-icon">
                      {enabled ? <Eye size={15} /> : <EyeOff size={15} />}
                    </span>
                  </button>
                );
              })}
              {scopedSources.length === 0 && (
                <div className="text-xs text-text-muted p-3 text-center">{t('adminAnalytics.revenue.emptyMix', { defaultValue: 'No revenue sources recorded in this period.' })}</div>
              )}
            </div>
          </div>
        </AnalyticsChartPanel>

        {/* Chart 3: Marketplace GMV */}
        <AnalyticsChartPanel
          title={t('adminAnalytics.revenue.gmvTitle', { defaultValue: 'Marketplace Gross Merchandise Value (GMV)' })}
          subtitle={t('adminAnalytics.revenue.gmvSubtitle', { defaultValue: 'Successful contract escrow settlements; recognized upon completion' })}
          table={<SeriesTable points={finance.gmvSeries ?? []} />}
        >
          {gmvData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={gmvData} margin={{ top: 12, right: 12, left: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                <XAxis
                  dataKey="bucket"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={val => `${formatMoney(val)} ₫`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number) => [`${formatMoney(value)} ₫`, t('adminAnalytics.kpis.marketplaceGmv', { defaultValue: 'Marketplace GMV' })]}
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    borderRadius: '0.75rem',
                    color: 'var(--text-primary)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="MarketplaceGMV"
                  name={t('adminAnalytics.kpis.marketplaceGmv', { defaultValue: 'Marketplace GMV' })}
                  stroke="#494be7"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#494be7', stroke: 'var(--surface)', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#494be7' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="analytics-chart-empty">
              <span>{t('adminAnalytics.revenue.emptyGmv', { defaultValue: 'No completed contract releases in this period.' })}</span>
            </div>
          )}
        </AnalyticsChartPanel>

        {/* Chart 4: Wallet Cash Movement */}
        <AnalyticsChartPanel
          title={t('adminAnalytics.revenue.cashFlowTitle', { defaultValue: 'Platform Wallet Cash Movement' })}
          subtitle={t('adminAnalytics.revenue.cashFlowSubtitle', { defaultValue: 'Top-up user inflow vs. net withdrawal payout outflow (Escrow funds in transit)' })}
          table={<SeriesTable points={finance.cashFlowSeries ?? []} />}
        >
          {cashFlowData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={cashFlowData} margin={{ top: 12, right: 12, left: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.6} />
                <XAxis
                  dataKey="bucket"
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={val => `${formatMoney(val)} ₫`}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                />
                <Tooltip
                  formatter={(value: number) => [`${formatMoney(value)} ₫`]}
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    borderRadius: '0.75rem',
                    color: 'var(--text-primary)',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: 10, fontSize: '0.8rem' }} />
                <Line
                  type="monotone"
                  dataKey="TopUpInflow"
                  name={t('adminAnalytics.revenue.topUpInflow', { defaultValue: 'Top-up Inflow' })}
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#10b981' }}
                />
                <Line
                  type="monotone"
                  dataKey="WithdrawalPayout"
                  name={t('adminAnalytics.revenue.withdrawalPayout', { defaultValue: 'Withdrawal Payout' })}
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#ef4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="analytics-chart-empty">
              <span>{t('adminAnalytics.revenue.emptyCashFlow', { defaultValue: 'No top-up or withdrawal transactions during this period.' })}</span>
            </div>
          )}
        </AnalyticsChartPanel>
      </div>

      {/* Premium Performance Section */}
      <section className="analytics-section-heading">
        <div>
          <span className="analytics-eyebrow">{t('adminAnalytics.tabs.premium', { defaultValue: 'Premium Subscriptions' })}</span>
          <h2>{t('adminAnalytics.revenue.premiumSectionTitle', { defaultValue: 'Premium Monetization Performance' })}</h2>
          <p>{t('adminAnalytics.revenue.premiumSectionSubtitle', { defaultValue: 'Subscription purchases, adoption funnel, and plan revenue distribution.' })}</p>
        </div>
      </section>

      <section className="analytics-kpis">
        {(premium.kpis ?? []).map(metric => (
          <AnalyticsMetricCard key={metric.key} metric={metric} />
        ))}
      </section>

      <div className="analytics-grid analytics-grid-two">
        {/* Adoption Funnel */}
        <AnalyticsChartPanel
          title={t('adminAnalytics.revenue.funnelTitle', { defaultValue: 'Monetization & Adoption Funnel' })}
          subtitle={t('adminAnalytics.revenue.funnelSubtitle', { defaultValue: 'Conversion progression from purchases to active feature usage' })}
        >
          <div className="analytics-funnel-container">
            {[
              {
                name: t('adminAnalytics.revenue.newPurchases', { defaultValue: 'New Purchases' }),
                val: premium.newPurchases ?? 0,
                pct: '100%',
                color: 'var(--brand)',
              },
              {
                name: t('adminAnalytics.revenue.activePaidUsers', { defaultValue: 'Active Paid Users' }),
                val: premium.kpis?.find(x => x.key === 'activePaidUsers')?.value ?? 0,
                pct: '85%',
                color: '#6366f1',
              },
              {
                name: t('adminAnalytics.revenue.paidFeatureUsage', { defaultValue: 'Paid Feature Usage' }),
                val: premium.kpis?.find(x => x.key === 'paidFeatureUsers')?.value ?? 0,
                pct: '70%',
                color: '#8b5cf6',
              },
              {
                name: t('adminAnalytics.revenue.renewalsRecurring', { defaultValue: 'Renewals & Recurring' }),
                val: premium.renewals ?? 0,
                pct: '55%',
                color: '#10b981',
              },
            ].map(stage => (
              <div key={stage.name} className="analytics-funnel-row">
                <div className="analytics-funnel-label-row">
                  <span className="analytics-funnel-name">{stage.name}</span>
                  <strong className="analytics-funnel-val">{formatNumber(Number(stage.val))}</strong>
                </div>
                <div className="analytics-funnel-track">
                  <div
                    className="analytics-funnel-bar"
                    style={{ width: stage.pct, backgroundColor: stage.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </AnalyticsChartPanel>

        {/* Plans by Role Bar Chart */}
        <AnalyticsChartPanel
          title={t('adminAnalytics.revenue.plansByRoleTitle', { defaultValue: 'Plan Subscriptions by User Role' })}
          subtitle={t('adminAnalytics.revenue.plansByRoleSubtitle', { defaultValue: 'Revenue split into GigCoin credits vs. VND transactions' })}
        >
          {(premium.plans ?? []).length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={premium.plans} layout="vertical" margin={{ top: 12, right: 12, left: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.6} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="plan"
                  width={110}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border)' }}
                  tick={{ fill: 'var(--text-primary)', fontSize: 11, fontWeight: 700 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface)',
                    borderColor: 'var(--border)',
                    borderRadius: '0.75rem',
                    color: 'var(--text-primary)',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: 8, fontSize: '0.8rem' }} />
                <Bar dataKey="purchases" name={t('adminAnalytics.revenue.purchases', { defaultValue: 'Purchases' })} fill="#494be7" radius={[0, 4, 4, 0]} />
                <Bar dataKey="revenueGigCoin" name={t('adminAnalytics.revenue.gigCoinCredits', { defaultValue: 'GigCoin Credits' })} fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="analytics-chart-empty">
              <span>{t('adminAnalytics.revenue.emptyPlans', { defaultValue: 'No plan subscription records in this period.' })}</span>
            </div>
          )}
        </AnalyticsChartPanel>
      </div>

      {/* Feature Adoption Breakdown */}
      <FeatureAdoptionSection premium={premium} />
    </div>
  );
}

function FeatureAdoptionSection({ premium }: { premium: PremiumAnalyticsResponse }) {
  const { t } = useTranslation('admin');
  const featureList = premium.featureAdoption ?? [];
  const pagination = useTablePage(featureList.length, 8);
  const rows = featureList.slice(pagination.from, pagination.to);

  return (
    <section className="analytics-panel">
      <header className="analytics-panel-header">
        <div className="analytics-panel-titles">
          <h2>{t('adminAnalytics.revenue.featureAdoptionTitle', { defaultValue: 'Premium Feature Adoption & Conversion' })}</h2>
          <p className="analytics-panel-subtitle">
            {t('adminAnalytics.revenue.featureAdoptionSubtitle', { defaultValue: 'Distinct user participation and click-through rates across monetized capabilities.' })}
          </p>
        </div>
      </header>

      <div className="analytics-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t('adminAnalytics.revenue.feature', { defaultValue: 'Feature Capability' })}</th>
              <th className="text-right">{t('adminAnalytics.revenue.usageEvents', { defaultValue: 'Usage Events' })}</th>
              <th className="text-right">{t('adminAnalytics.revenue.distinctUsers', { defaultValue: 'Distinct Users' })}</th>
              <th className="text-right">{t('adminAnalytics.revenue.ctr', { defaultValue: 'Conversion (CTR)' })}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.feature}>
                <td>
                  <strong className="text-text-primary">{row.feature}</strong>
                </td>
                <td className="text-right font-mono font-medium">{row.events.toLocaleString()}</td>
                <td className="text-right font-mono font-medium">{row.distinctUsers.toLocaleString()}</td>
                <td className="text-right font-mono font-bold text-brand">
                  {row.clickThroughRate == null ? '—' : `${formatNumber(row.clickThroughRate)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="analytics-empty">{t('adminAnalytics.revenue.emptyFeatureAdoption', { defaultValue: 'No feature adoption events recorded in this period.' })}</div>
      )}

      <AnalyticsPagination
        page={pagination.page}
        pageCount={pagination.pageCount}
        from={pagination.from}
        to={pagination.to}
        total={featureList.length}
        onPage={pagination.setPage}
        noun="features"
      />

      <div className="analytics-lifetime-note">
        <Check size={15} className="text-emerald-500 shrink-0" />
        <span>
          {t('adminAnalytics.revenue.lifetimeNote', {
            impressions: (premium.historicalPromotionImpressions ?? 0).toLocaleString(),
            clicks: (premium.historicalPromotionClicks ?? 0).toLocaleString(),
            defaultValue: `Lifetime promotion metrics: ${(premium.historicalPromotionImpressions ?? 0).toLocaleString()} impressions · ${(premium.historicalPromotionClicks ?? 0).toLocaleString()} clicks`
          })}
        </span>
      </div>
    </section>
  );
}

export default AdminRevenueTab;
