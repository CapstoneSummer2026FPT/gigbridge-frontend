import { useState, useMemo, useEffect } from 'react';
import {
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
  Crown,
  ExternalLink,
  Info,
  Search,
  X,
  Inbox,
} from 'lucide-react';
import type {
  PremiumAnalyticsResponse,
  PremiumPromotionRecord,
} from '../../../../types/adminAnalytics';
import {
  formatMoney,
  formatNumber,
  useTablePage,
  type PromotionRoleFilter,
} from '../../utils/analyticsUtils';
import { AnalyticsMetricCard } from './AnalyticsMetricCard';
import { AnalyticsChartPanel } from './AnalyticsChartPanel';
import { AnalyticsPagination } from './AnalyticsPagination';
import { useTranslation } from '../../../../hooks/useTranslation';

export interface AdminPremiumTabProps {
  premium: PremiumAnalyticsResponse;
}

function PromotionAttributeValue({ label, value }: { label: string; value: string | null }) {
  const { t } = useTranslation('admin');
  const normalized = value?.trim();
  if (!normalized) return <>—</>;
  if (!/^https?:\/\//i.test(normalized)) return <>{normalized}</>;

  const isImage =
    /image|photo|avatar|thumbnail/i.test(label) ||
    /\.(?:avif|gif|jpe?g|png|webp)(?:\?.*)?$/i.test(normalized);

  return (
    <a
      className="analytics-masked-url inline-flex items-center gap-1 text-brand font-bold hover:underline"
      href={normalized}
      target="_blank"
      rel="noreferrer"
    >
      <span>
        {isImage
          ? t('adminAnalytics.premium.viewImageAsset', { defaultValue: 'View image asset' })
          : t('adminAnalytics.premium.openResourceLink', { defaultValue: 'Open resource link' })}
      </span>
      <ExternalLink size={13} aria-hidden="true" />
    </a>
  );
}

export function AdminPremiumTab({ premium }: AdminPremiumTabProps) {
  const { t } = useTranslation('admin');
  const [role, setRole] = useState<PromotionRoleFilter>('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PremiumPromotionRecord | null>(null);

  const promotions = premium.promotions ?? [];
  const summaries = premium.promotionSummaries ?? [];
  const promotionRecordCount = premium.promotionRecordCount ?? promotions.length;

  const statuses = useMemo(
    () => [...new Set(promotions.map(item => item.status))].sort(),
    [promotions]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return promotions.filter(item => {
      if (role !== 'all' && item.role !== role) return false;
      if (status !== 'all' && item.status !== status) return false;
      if (!query) return true;
      return [item.ownerName, item.ownerEmail, item.subjectName, item.type, item.promotionId]
        .some(val => val.toLocaleLowerCase().includes(query));
    });
  }, [promotions, role, search, status]);

  const pagination = useTablePage(filtered.length, 12);
  const rows = filtered.slice(pagination.from, pagination.to);

  // Lock body scroll on modal open
  useEffect(() => {
    if (!selected) return;
    const prevOverflow = document.body.style.overflow;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [selected]);

  return (
    <div className="analytics-stack">
      {/* Header Section */}
      <section className="analytics-section-heading analytics-section-heading-first">
        <div>
          <span className="analytics-eyebrow">
            <Crown size={14} /> {t('adminAnalytics.premium.eyebrow', { defaultValue: 'Monetization Operations' })}
          </span>
          <h2>{t('adminAnalytics.premium.title', { defaultValue: 'Premium Subscriptions & Promotion Inventory' })}</h2>
          <p>
            {t('adminAnalytics.premium.subtitle', { defaultValue: 'Monitor client job promotions, freelancer spotlight boosts, and recurring paid plan adoption.' })}
          </p>
        </div>
      </section>

      {/* KPI Metric Cards */}
      <section className="analytics-kpis">
        {(premium.kpis ?? []).map(metric => (
          <AnalyticsMetricCard key={metric.key} metric={metric} />
        ))}
      </section>

      {/* Funnel & Plans Breakdown */}
      <div className="analytics-grid analytics-grid-two">
        {/* Funnel Visual */}
        <AnalyticsChartPanel
          title={t('adminAnalytics.revenue.funnelTitle', { defaultValue: 'Monetization & Adoption Funnel' })}
          subtitle={t('adminAnalytics.revenue.funnelSubtitle', { defaultValue: 'Conversion progression from fresh purchases to sustained active feature adoption' })}
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
          subtitle={t('adminAnalytics.revenue.plansByRoleSubtitle', { defaultValue: 'Comparison of revenue generated in GigCoin credits vs. direct VND subscriptions' })}
        >
          {(premium.plans ?? []).length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={premium.plans} layout="vertical" margin={{ top: 12, right: 12, left: 12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" opacity={0.6} />
                <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="plan"
                  width={120}
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
              <Inbox size={28} className="text-text-muted mb-2 opacity-50" />
              <span>{t('adminAnalytics.revenue.emptyPlans', { defaultValue: 'No plan subscription records in this period.' })}</span>
            </div>
          )}
        </AnalyticsChartPanel>
      </div>

      {/* Promotion Summary Role Cards */}
      <section className="analytics-promotion-summaries" aria-label="Promotion summaries">
        {summaries.map(summary => (
          <article key={summary.role} className="analytics-promotion-summary-card">
            <div className="analytics-promotion-summary-heading">
              <span className={`analytics-role-badge ${(summary.role ?? '').toLowerCase()}`}>{summary.role}</span>
              <strong>{summary.type}</strong>
            </div>
            <dl className="analytics-summary-grid">
              <div>
                <dt>{t('adminAnalytics.premium.totalRecords', { defaultValue: 'Total Records' })}</dt>
                <dd>{(summary.total ?? 0).toLocaleString()}</dd>
              </div>
              <div>
                <dt>{t('adminAnalytics.premium.activeLive', { defaultValue: 'Active Live' })}</dt>
                <dd className="text-emerald-500 font-bold">{(summary.active ?? 0).toLocaleString()}</dd>
              </div>
              <div>
                <dt>{t('adminAnalytics.premium.tokenSpend', { defaultValue: 'Total Token Spend' })}</dt>
                <dd className="text-amber-500 font-bold">{formatNumber(summary.tokenSpend ?? 0)} GC</dd>
              </div>
              <div>
                <dt>{t('adminAnalytics.premium.averageCtr', { defaultValue: 'Average CTR' })}</dt>
                <dd className="text-brand font-bold">{formatNumber(summary.clickThroughRate ?? 0)}%</dd>
              </div>
              <div>
                <dt>{t('adminAnalytics.premium.impressions', { defaultValue: 'Impressions' })}</dt>
                <dd>{(summary.impressions ?? 0).toLocaleString()}</dd>
              </div>
              <div>
                <dt>{t('adminAnalytics.premium.totalClicks', { defaultValue: 'Total Clicks' })}</dt>
                <dd>{(summary.clicks ?? 0).toLocaleString()}</dd>
              </div>
            </dl>
          </article>
        ))}
        {summaries.length === 0 && (
          <div className="analytics-empty col-span-full">{t('adminAnalytics.premium.emptyPromotions', { defaultValue: 'No promotion activity summaries recorded.' })}</div>
        )}
      </section>

      {/* Promotion Inventory Table */}
      <section className="analytics-panel">
        <header className="analytics-panel-header">
          <div className="analytics-panel-titles">
            <h2>{t('adminAnalytics.premium.inventoryTitle', { defaultValue: 'Active Promotion Inventory' })}</h2>
            <p className="analytics-panel-subtitle">
              {t('adminAnalytics.premium.inventorySubtitle', {
                count: promotionRecordCount.toLocaleString(),
                defaultValue: `${promotionRecordCount.toLocaleString()} promotions active or intersecting this period. Click any record to inspect stored attributes.`
              })}
            </p>
          </div>
        </header>

        {/* Filter Controls */}
        <div className="analytics-promotion-filters">
          <label>
            <span>{t('adminAnalytics.premium.accountType', { defaultValue: 'Account Type' })}</span>
            <select value={role} onChange={e => setRole(e.target.value as PromotionRoleFilter)}>
              <option value="all">{t('adminAnalytics.premium.allAccounts', { defaultValue: 'All Accounts' })}</option>
              <option value="Client">{t('adminAnalytics.premium.clientsOnly', { defaultValue: 'Clients Only' })}</option>
              <option value="Freelancer">{t('adminAnalytics.premium.freelancersOnly', { defaultValue: 'Freelancers Only' })}</option>
            </select>
          </label>

          <label>
            <span>{t('adminAnalytics.premium.promotionStatus', { defaultValue: 'Promotion Status' })}</span>
            <select value={status} onChange={e => setStatus(e.target.value)}>
              <option value="all">{t('adminAnalytics.transactions.allStatuses', { defaultValue: 'All Statuses' })}</option>
              {statuses.map(val => (
                <option key={val} value={val}>
                  {val}
                </option>
              ))}
            </select>
          </label>

          <label className="flex-1">
            <span>{t('admin.searchPlaceholder', { defaultValue: 'Search Records' })}</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('adminAnalytics.premium.searchPlaceholder', { defaultValue: 'Search owner name, email, item title, or ID...' })}
                className="pl-8"
              />
            </div>
          </label>
        </div>

        <div className="analytics-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('adminAnalytics.premium.accountType', { defaultValue: 'Account' })}</th>
                <th>{t('adminAnalytics.premium.owner', { defaultValue: 'Owner' })}</th>
                <th>{t('adminAnalytics.premium.promotedItem', { defaultValue: 'Promoted Item' })}</th>
                <th>{t('adminAnalytics.transactions.status', { defaultValue: 'Status' })}</th>
                <th className="text-right">{t('adminAnalytics.premium.cost', { defaultValue: 'Cost' })}</th>
                <th>{t('adminAnalytics.premium.activePeriod', { defaultValue: 'Active Period' })}</th>
                <th className="text-right">{t('adminAnalytics.premium.impressions', { defaultValue: 'Impressions' })}</th>
                <th className="text-right">{t('adminAnalytics.premium.totalClicks', { defaultValue: 'Clicks' })}</th>
                <th className="text-right">CTR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(item => (
                <tr
                  key={item.promotionId}
                  tabIndex={0}
                  className="analytics-clickable-row"
                  onClick={() => setSelected(item)}
                  onKeyDown={e => e.key === 'Enter' && setSelected(item)}
                >
                  <td>
                    <span className={`analytics-role-badge ${(item.role ?? '').toLowerCase()}`}>{item.role}</span>
                    <small className="analytics-promotion-type block mt-0.5">{item.type}</small>
                  </td>
                  <td>
                    <strong className="text-text-primary block">{item.ownerName}</strong>
                    <small className="text-text-muted">{item.ownerEmail}</small>
                  </td>
                  <td>
                    <strong className="text-text-primary block">{item.subjectName}</strong>
                    <small className="font-mono text-text-muted text-[10px]">{item.subjectId}</small>
                  </td>
                  <td>
                    <span className={`analytics-status-pill ${(item.status ?? '').toLowerCase()}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="text-right font-mono font-bold text-amber-500">
                    {formatNumber(item.tokenCost)} GC
                  </td>
                  <td>
                    <span className="text-xs font-mono text-text-muted">
                      {new Date(item.startsAt).toLocaleDateString()}
                    </span>
                    <small className="block text-text-muted text-[10px]">
                      to {new Date(item.endsAt).toLocaleDateString()}
                    </small>
                  </td>
                  <td className="text-right font-mono font-semibold">{(item.impressionCount ?? 0).toLocaleString()}</td>
                  <td className="text-right font-mono font-semibold">{(item.clickCount ?? 0).toLocaleString()}</td>
                  <td className="text-right font-mono font-bold text-brand">
                    {formatNumber(item.clickThroughRate ?? 0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="analytics-empty">
            <span>{t('adminAnalytics.premium.emptyPromotions', { defaultValue: 'No promotions match the current filter selection.' })}</span>
          </div>
        )}

        <AnalyticsPagination
          page={pagination.page}
          pageCount={pagination.pageCount}
          from={pagination.from}
          to={pagination.to}
          total={filtered.length}
          onPage={pagination.setPage}
          noun="promotions"
        />

        {premium.promotionsTruncated && (
          <div className="analytics-lifetime-note">
            <Info size={15} className="text-brand shrink-0" />
            <span>
              {t('adminAnalytics.premium.truncatedNote', { defaultValue: 'Showing active promotions first, followed by the most recent records (up to 200 total). Narrow the date range to inspect older promotions.' })}
            </span>
          </div>
        )}
      </section>

      {/* Plan Purchases Breakdown Table */}
      <section className="analytics-panel">
        <header className="analytics-panel-header">
          <div className="analytics-panel-titles">
            <h2>{t('adminAnalytics.premium.planPurchasesTitle', { defaultValue: 'Plan Purchases & Revenue Realization' })}</h2>
            <p className="analytics-panel-subtitle">
              {t('adminAnalytics.premium.planPurchasesSubtitle', { defaultValue: 'Aggregated subscription revenue partitioned by plan tier and target role.' })}
            </p>
          </div>
        </header>
        <div className="analytics-table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('adminAnalytics.premium.subscriptionPlan', { defaultValue: 'Subscription Plan' })}</th>
                <th>{t('adminAnalytics.premium.targetRole', { defaultValue: 'Target Role' })}</th>
                <th className="text-right">{t('adminAnalytics.premium.purchases', { defaultValue: 'Purchases' })}</th>
                <th className="text-right">{t('adminAnalytics.premium.gigCoinVolume', { defaultValue: 'GigCoin Volume' })}</th>
                <th className="text-right">{t('adminAnalytics.premium.vndEquivalent', { defaultValue: 'VND Equivalent' })}</th>
              </tr>
            </thead>
            <tbody>
              {(premium.plans ?? []).map(plan => (
                <tr key={`${plan.plan}-${plan.role}`}>
                  <td>
                    <strong className="text-text-primary">{plan.plan}</strong>
                  </td>
                  <td>
                    <span className={`analytics-role-badge ${(plan.role ?? '').toLowerCase()}`}>{plan.role}</span>
                  </td>
                  <td className="text-right font-mono font-semibold">{plan.purchases.toLocaleString()}</td>
                  <td className="text-right font-mono font-bold text-amber-500">
                    {formatNumber(plan.revenueGigCoin)} GC
                  </td>
                  <td className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatMoney(plan.revenueVnd)} ₫
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Promotion Inspection Modal */}
      {selected && (
        <div
          className="analytics-promotion-modal-backdrop"
          role="presentation"
          onMouseDown={() => setSelected(null)}
        >
          <section
            className="analytics-promotion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="promotion-details-title"
            onMouseDown={e => e.stopPropagation()}
          >
            <header className="analytics-promotion-modal-header">
              <div>
                <span className={`analytics-role-badge ${(selected.role ?? '').toLowerCase()}`}>{selected.role}</span>
                <h2 id="promotion-details-title" className="text-xl font-bold mt-1 text-text-primary">
                  {selected.subjectName}
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  {selected.type} ·{' '}
                  <span className={`analytics-status-pill ${(selected.status ?? '').toLowerCase()}`}>
                    {selected.status}
                  </span>
                </p>
              </div>
              <button
                type="button"
                autoFocus
                className="analytics-close-btn"
                aria-label="Close promotion details"
                onClick={() => setSelected(null)}
              >
                <X size={18} />
              </button>
            </header>

            <div className="analytics-promotion-modal-body">
              <section aria-labelledby="promotion-overview-title">
                <h3 id="promotion-overview-title" className="font-bold text-sm text-text-primary mb-2">
                  {t('adminAnalytics.premium.modalOverview', { defaultValue: 'Promotion Overview' })}
                </h3>
                <dl className="analytics-promotion-detail-grid">
                  <div>
                    <dt>{t('adminAnalytics.premium.promotionId', { defaultValue: 'Promotion ID' })}</dt>
                    <dd className="font-mono">{selected.promotionId}</dd>
                  </div>
                  <div>
                    <dt>{t('adminAnalytics.premium.subjectTargetId', { defaultValue: 'Subject Target ID' })}</dt>
                    <dd className="font-mono">{selected.subjectId}</dd>
                  </div>
                  <div>
                    <dt>{t('adminAnalytics.premium.ownerProfile', { defaultValue: 'Owner Profile' })}</dt>
                    <dd>
                      <a
                        href={`/admin/users?preview=${encodeURIComponent(selected.ownerUserId)}`}
                        className="text-brand font-bold hover:underline"
                      >
                        {selected.ownerName}
                      </a>
                      <span className="block text-text-muted text-xs font-mono">{selected.ownerEmail}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>{t('adminAnalytics.premium.tokenCost', { defaultValue: 'Token Cost' })}</dt>
                    <dd className="text-amber-500 font-bold font-mono">{formatNumber(selected.tokenCost)} GigCoin</dd>
                  </div>
                  <div>
                    <dt>{t('adminAnalytics.premium.audiencePerformance', { defaultValue: 'Audience Performance' })}</dt>
                    <dd className="font-semibold">
                      {(selected.impressionCount ?? 0).toLocaleString()} {t('adminAnalytics.premium.impressions', { defaultValue: 'impressions' })} · {(selected.clickCount ?? 0).toLocaleString()} {t('adminAnalytics.premium.totalClicks', { defaultValue: 'clicks' })} ·{' '}
                      <span className="text-brand font-bold">{formatNumber(selected.clickThroughRate ?? 0)}% CTR</span>
                    </dd>
                  </div>
                  <div>
                    <dt>{t('adminAnalytics.premium.activeDuration', { defaultValue: 'Active Duration' })}</dt>
                    <dd className="font-mono text-xs">
                      {new Date(selected.startsAt).toLocaleString()} — {new Date(selected.endsAt).toLocaleString()}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('adminAnalytics.premium.createdTimestamp', { defaultValue: 'Created Timestamp' })}</dt>
                    <dd className="font-mono text-xs">{new Date(selected.createdAt).toLocaleString()}</dd>
                  </div>
                </dl>
              </section>

              {selected.attributes && Object.keys(selected.attributes).length > 0 && (
                <section aria-labelledby="promotion-attributes-title" className="mt-4 pt-4 border-t border-border">
                  <h3 id="promotion-attributes-title" className="font-bold text-sm text-text-primary mb-2">
                    {t('adminAnalytics.premium.modalAttributes', { defaultValue: 'Stored Promotion Attributes' })}
                  </h3>
                  <dl className="analytics-promotion-detail-grid analytics-promotion-attributes">
                    {Object.entries(selected.attributes).map(([key, value]) => (
                      <div key={key}>
                        <dt>{key}</dt>
                        <dd>
                          <PromotionAttributeValue label={key} value={value} />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminPremiumTab;
