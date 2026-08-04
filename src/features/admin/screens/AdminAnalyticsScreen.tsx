import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts';
import {
  ArrowLeft, ArrowRight, BarChart3, BriefcaseBusiness, CalendarDays, Check, Crown,
  Download, ExternalLink, Eye, EyeOff, Info, Layers3, RefreshCw, X,
} from 'lucide-react';
import { adminAnalyticsAPI } from '../../../api/adminAnalyticsAPI';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useTranslation } from '../../../hooks/useTranslation';
import type {
  AdminTransactionItem, AdminTransactionPage, AnalyticsKpi, AnalyticsPeriod, AnalyticsRangeParams,
  AnalyticsSeriesPoint, AnalyticsTab, FinanceAnalyticsResponse, MarketplaceAnalyticsResponse,
  PremiumAnalyticsResponse, PremiumPromotionRecord, TransactionFilters,
} from '../../../types/adminAnalytics';
import '../styles/admin-analytics-screen.css';

const COLORS = ['#494be7', '#d97706', '#16a34a', '#8b5cf6', '#dc2626', '#0284c7', '#db2777'];
const TABS: AnalyticsTab[] = ['revenue', 'transactions', 'premium', 'market'];
const PERIODS: AnalyticsPeriod[] = ['month', 'quarter', 'year', 'custom'];
const TABLE_PAGE_SIZE = 8;
const SOURCE_VISIBILITY_KEY = 'gigbridge.adminAnalytics.hiddenRevenueSources';
type RevenueScope = 'all' | 'job' | 'premium';

const JOB_REVENUE_SOURCES = new Set(['ContractFundingFee', 'ContractReleaseFee', 'JobPromotionPurchase', 'PromotionBoost']);
const PREMIUM_REVENUE_SOURCES = new Set(['SubscriptionPurchase', 'JobPromotionPurchase', 'ProfilePromotionPurchase', 'PromotionBoost']);

const money = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

function pivot(points: AnalyticsSeriesPoint[]) {
  const rows = new Map<string, Record<string, string | number>>();
  points.forEach(point => {
    const row = rows.get(point.bucket) ?? { bucket: point.bucket };
    row[point.series] = point.value;
    rows.set(point.bucket, row);
  });
  return [...rows.values()].sort((a, b) => String(a.bucket).localeCompare(String(b.bucket)));
}

function formatKpi(kpi: AnalyticsKpi) {
  if (kpi.unit === 'VND') return `${money.format(kpi.value)} ₫`;
  if (kpi.unit === 'percent') return `${number.format(kpi.value)}%`;
  return `${number.format(kpi.value)} ${kpi.unit}`;
}

function labelFor(key: string) {
  const labels: Record<string, string> = {
    grossRevenue: 'Gross platform revenue', revenueGrowth: 'Revenue growth', contractTakeRate: 'Contract take rate',
    marketplaceGmv: 'Marketplace GMV', netCashMovement: 'Net cash movement', premiumRevenue: 'Premium revenue',
    activePaidUsers: 'Active paid users', paidFeatureUsers: 'Paid feature users', promotionCtr: 'Promotion CTR',
  };
  return labels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, value => value.toUpperCase());
}

function MetricCard({ metric }: { metric: AnalyticsKpi }) {
  return (
    <article className="analytics-metric-card">
      <div className="analytics-metric-label">{labelFor(metric.key)}</div>
      <div className="analytics-metric-value">{formatKpi(metric)}</div>
      <div className={`analytics-change ${(metric.changePercent ?? 0) >= 0 ? 'positive' : 'negative'}`}>
        {metric.changePercent == null ? 'New in this period' : `${metric.changePercent >= 0 ? '+' : ''}${number.format(metric.changePercent)}% vs prior`}
      </div>
    </article>
  );
}

function ChartPanel({ title, subtitle, children, table }: { title: string; subtitle?: string; children: React.ReactNode; table?: React.ReactNode }) {
  return (
    <section className="analytics-panel">
      <header><h2>{title}</h2>{subtitle ? <p>{subtitle}</p> : null}</header>
      <div className="analytics-chart" role="img" aria-label={title}>{children}</div>
      {table ? <details className="analytics-fallback"><summary>View chart data as table</summary>{table}</details> : null}
    </section>
  );
}

function FormulaTooltip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="analytics-info-tooltip">
      <button type="button" aria-label={label} aria-describedby={`${label.replace(/\W+/g, '-').toLowerCase()}-formula`}><Info size={14} /></button>
      <span id={`${label.replace(/\W+/g, '-').toLowerCase()}-formula`} className="analytics-info-bubble" role="tooltip">
        <strong>Formula</strong>
        {children}
      </span>
    </span>
  );
}

function useTablePage(itemCount: number, pageSize = TABLE_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(itemCount / pageSize));
  useEffect(() => setPage(current => Math.min(current, pageCount)), [pageCount]);
  return {
    page,
    pageCount,
    setPage,
    from: (page - 1) * pageSize,
    to: Math.min(page * pageSize, itemCount),
  };
}

function PaginationControls({
  page, pageCount, from, to, total, onPage, noun = 'rows', canPrevious = page > 1, canNext = page < pageCount,
}: {
  page: number; pageCount: number; from: number; to: number; total: number; onPage: (page: number) => void;
  noun?: string; canPrevious?: boolean; canNext?: boolean;
}) {
  if (total === 0) return null;
  return (
    <div className="analytics-pagination" aria-label={`${noun} pagination`}>
      <span>Showing {from + 1}–{to} of {total.toLocaleString()} {noun}</span>
      <div>
        <button type="button" disabled={!canPrevious} onClick={() => onPage(page - 1)}><ArrowLeft size={15} /> Previous</button>
        <strong>Page {page}{pageCount > 1 ? ` of ${pageCount}` : ''}</strong>
        <button type="button" disabled={!canNext} onClick={() => onPage(page + 1)}>Next <ArrowRight size={15} /></button>
      </div>
    </div>
  );
}

function sourceInScope(source: string, scope: RevenueScope) {
  if (scope === 'job') return JOB_REVENUE_SOURCES.has(source);
  if (scope === 'premium') return PREMIUM_REVENUE_SOURCES.has(source);
  return true;
}

function RevenueView({ finance, premium }: { finance: FinanceAnalyticsResponse; premium: PremiumAnalyticsResponse }) {
  const [scope, setScope] = useState<RevenueScope>('all');
  const [hiddenSources, setHiddenSources] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const stored = JSON.parse(window.localStorage.getItem(SOURCE_VISIBILITY_KEY) ?? '[]');
      return new Set(Array.isArray(stored) ? stored.filter(value => typeof value === 'string') : []);
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    window.localStorage.setItem(SOURCE_VISIBILITY_KEY, JSON.stringify([...hiddenSources]));
  }, [hiddenSources]);

  const scopedSources = finance.revenueSources.filter(source => sourceInScope(source.key, scope));
  const visibleSources = scopedSources.filter(source => !hiddenSources.has(source.key));
  const visibleKeys = new Set(visibleSources.map(source => source.key));
  const visibleRevenuePoints = finance.revenueSeries.filter(point => visibleKeys.has(point.series));
  const revenue = pivot(visibleRevenuePoints);
  const cash = pivot(finance.cashFlowSeries);
  const sourceColors = new Map(finance.revenueSources.map((source, index) => [source.key, COLORS[index % COLORS.length]]));
  const visibleRevenueTotal = visibleSources.reduce((sum, source) => sum + source.value, 0);

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
      <section className="analytics-kpis">{finance.kpis.map(metric => <MetricCard key={metric.key} metric={metric} />)}</section>

      <section className="analytics-revenue-controls" aria-label="Revenue view controls">
        <div>
          <span className="analytics-control-label">Revenue view</span>
          <div className="analytics-scope-options">
            {([
              ['all', 'All revenue', Layers3],
              ['job', 'Job-related', BriefcaseBusiness],
              ['premium', 'Premium', Crown],
            ] as const).map(([value, label, Icon]) => (
              <button key={value} type="button" className={scope === value ? 'active' : ''} aria-pressed={scope === value} onClick={() => setScope(value)}>
                <Icon size={16} />{label}
              </button>
            ))}
          </div>
        </div>
        <div className="analytics-visible-total"><span>Visible revenue</span><strong>{money.format(visibleRevenueTotal)} ₫</strong></div>
      </section>

      <div className="analytics-grid analytics-grid-two">
        <ChartPanel title="Revenue by source" subtitle="Retained platform value only; user funds are excluded" table={<SeriesTable points={visibleRevenuePoints} />}>
          {visibleSources.length ? (
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={revenue}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="bucket" /><YAxis tickFormatter={value => money.format(value)} />
              <Tooltip formatter={(value: number) => `${money.format(value)} ₫`} />
              {visibleSources.map(source => <Area key={source.key} dataKey={source.key} name={source.label} stackId="revenue" stroke={sourceColors.get(source.key)} fill={sourceColors.get(source.key)} fillOpacity={0.28} />)}
            </AreaChart></ResponsiveContainer>
          ) : <div className="analytics-chart-empty">Enable at least one revenue source to display this chart.</div>}
        </ChartPanel>
        <ChartPanel title="Revenue source mix" subtitle={`${finance.meta.classifiedSourceCount.toLocaleString()} classified events · selections are retained on this device`}>
          <div className="analytics-source-mix-layout">
            <div className="analytics-source-chart">
              {visibleSources.length ? (
                <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={visibleSources} dataKey="value" nameKey="label" innerRadius="58%" outerRadius="82%" paddingAngle={2}>
                  {visibleSources.map(source => <Cell key={source.key} fill={sourceColors.get(source.key)} />)}
                </Pie><Tooltip formatter={(value: number) => `${money.format(value)} ₫`} /></PieChart></ResponsiveContainer>
              ) : <div className="analytics-chart-empty">No sources selected.</div>}
            </div>
            <div className="analytics-source-controls" aria-label="Revenue source visibility">
              {scopedSources.map(source => {
                const enabled = !hiddenSources.has(source.key);
                return (
                  <button key={source.key} type="button" className={enabled ? 'enabled' : 'disabled'} aria-pressed={enabled} onClick={() => toggleSource(source.key)}>
                    <span className="analytics-source-swatch" style={{ backgroundColor: sourceColors.get(source.key) }} />
                    <span><strong>{source.label}</strong><small>{money.format(source.value)} ₫</small></span>
                    {enabled ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                );
              })}
            </div>
          </div>
        </ChartPanel>
        <ChartPanel title="Marketplace GMV" subtitle="Canonical successful escrow releases; counted once" table={<SeriesTable points={finance.gmvSeries} />}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={pivot(finance.gmvSeries)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="bucket" /><YAxis /><Tooltip formatter={(value: number) => `${money.format(value)} ₫`} /><Line type="monotone" dataKey="MarketplaceGMV" name="Marketplace GMV" stroke="#494be7" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Wallet cash flow" subtitle="Top-up inflow and successful net payout outflow; not revenue" table={<SeriesTable points={finance.cashFlowSeries} />}>
          <ResponsiveContainer width="100%" height="100%"><LineChart data={cash}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="bucket" /><YAxis /><Tooltip formatter={(value: number) => `${money.format(value)} ₫`} /><Legend />
            <Line type="monotone" dataKey="TopUpInflow" name="Top-up inflow" stroke="#16a34a" strokeWidth={3} dot={false} /><Line type="monotone" dataKey="WithdrawalPayout" name="Withdrawal payout" stroke="#dc2626" strokeWidth={3} dot={false} />
          </LineChart></ResponsiveContainer>
        </ChartPanel>
      </div>
      <section className="analytics-section-heading"><div><span>Premium</span><h2>Premium performance</h2><p>Purchases, adoption, and dated feature usage</p></div></section>
      <section className="analytics-kpis">{premium.kpis.map(metric => <MetricCard key={metric.key} metric={metric} />)}</section>
      <div className="analytics-grid analytics-grid-two">
        <ChartPanel title="Purchase and adoption funnel" subtitle="Each stage uses persisted paid-plan and usage records">
          <div className="analytics-funnel">
            {[
              ['New purchases', premium.newPurchases], ['Active paid users', premium.kpis.find(x => x.key === 'activePaidUsers')?.value ?? 0],
              ['Paid-feature users', premium.kpis.find(x => x.key === 'paidFeatureUsers')?.value ?? 0], ['Renewals', premium.renewals],
            ].map(([name, value], index) => <div key={String(name)} style={{ width: `${100 - index * 13}%` }}><span>{name}</span><strong>{number.format(Number(value))}</strong></div>)}
          </div>
        </ChartPanel>
        <ChartPanel title="Plans by role" subtitle="Revenue remains split into GigCoin and VND snapshots">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={premium.plans} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis type="category" dataKey="plan" width={110} /><Tooltip /><Legend /><Bar dataKey="purchases" name="Purchases" fill="#494be7" /><Bar dataKey="revenueGigCoin" name="GigCoin" fill="#d97706" /></BarChart></ResponsiveContainer>
        </ChartPanel>
      </div>
      <FeatureAdoptionTable premium={premium} />
    </div>
  );
}

function FeatureAdoptionTable({ premium }: { premium: PremiumAnalyticsResponse }) {
  const pagination = useTablePage(premium.featureAdoption.length);
  const rows = premium.featureAdoption.slice(pagination.from, pagination.to);
  return (
    <section className="analytics-panel"><header><h2>Premium feature adoption</h2><p>Historical lifetime promotion counters are displayed separately because dates cannot be reconstructed.</p></header>
      <div className="analytics-table-wrap"><table><thead><tr><th>Feature</th><th>Events</th><th>Distinct users</th><th>CTR</th></tr></thead><tbody>
        {rows.map(row => <tr key={row.feature}><td>{row.feature}</td><td>{row.events.toLocaleString()}</td><td>{row.distinctUsers.toLocaleString()}</td><td>{row.clickThroughRate == null ? '—' : `${number.format(row.clickThroughRate)}%`}</td></tr>)}
      </tbody></table></div>
      <PaginationControls page={pagination.page} pageCount={pagination.pageCount} from={pagination.from} to={pagination.to} total={premium.featureAdoption.length} onPage={pagination.setPage} noun="features" />
      <div className="analytics-lifetime-note"><Check size={15} /> Lifetime counters: {premium.historicalPromotionImpressions.toLocaleString()} impressions · {premium.historicalPromotionClicks.toLocaleString()} clicks</div>
    </section>
  );
}

type PromotionRoleFilter = 'all' | 'Client' | 'Freelancer';

function PromotionAttributeValue({ label, value }: { label: string; value: string | null }) {
  const normalized = value?.trim();
  if (!normalized) return <>—</>;
  if (!/^https?:\/\//i.test(normalized)) return <>{normalized}</>;

  const isImage = /image|photo|avatar|thumbnail/i.test(label)
    || /\.(?:avif|gif|jpe?g|png|webp)(?:\?.*)?$/i.test(normalized);
  return (
    <a className="analytics-masked-url" href={normalized} target="_blank" rel="noreferrer">
      {isImage ? 'View image' : 'Open link'} <ExternalLink size={14} aria-hidden="true" />
    </a>
  );
}

function PremiumTrackingView({ premium }: { premium: PremiumAnalyticsResponse }) {
  const [role, setRole] = useState<PromotionRoleFilter>('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<PremiumPromotionRecord | null>(null);
  const promotions = premium.promotions ?? [];
  const summaries = premium.promotionSummaries ?? [];
  const promotionRecordCount = premium.promotionRecordCount ?? promotions.length;
  const statuses = useMemo(() => [...new Set(promotions.map(item => item.status))].sort(), [promotions]);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return promotions.filter(item => {
      if (role !== 'all' && item.role !== role) return false;
      if (status !== 'all' && item.status !== status) return false;
      if (!query) return true;
      return [item.ownerName, item.ownerEmail, item.subjectName, item.type, item.promotionId]
        .some(value => value.toLocaleLowerCase().includes(query));
    });
  }, [promotions, role, search, status]);
  const pagination = useTablePage(filtered.length, 12);
  const rows = filtered.slice(pagination.from, pagination.to);

  useEffect(() => {
    if (!selected) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [selected]);

  return (
    <div className="analytics-stack">
      <section className="analytics-section-heading analytics-section-heading-first">
        <div><span>Premium operations</span><h2>Premium and promotion tracking</h2><p>Inspect client job promotions and freelancer profile promotions with their persisted attributes.</p></div>
      </section>
      <section className="analytics-kpis">{premium.kpis.map(metric => <MetricCard key={metric.key} metric={metric} />)}</section>

      <section className="analytics-promotion-summaries" aria-label="Promotion summaries">
        {summaries.map(summary => (
          <article key={summary.role} className="analytics-promotion-summary-card">
            <div className="analytics-promotion-summary-heading"><span className={`analytics-role-badge ${summary.role.toLowerCase()}`}>{summary.role}</span><strong>{summary.type}</strong></div>
            <dl>
              <div><dt>Records</dt><dd>{summary.total.toLocaleString()}</dd></div>
              <div><dt>Active</dt><dd>{summary.active.toLocaleString()}</dd></div>
              <div><dt>Spend</dt><dd>{number.format(summary.tokenSpend)} GC</dd></div>
              <div><dt>CTR</dt><dd>{number.format(summary.clickThroughRate)}%</dd></div>
              <div><dt>Impressions</dt><dd>{summary.impressions.toLocaleString()}</dd></div>
              <div><dt>Clicks</dt><dd>{summary.clicks.toLocaleString()}</dd></div>
            </dl>
          </article>
        ))}
      </section>

      <section className="analytics-panel">
        <header><h2>Promotion inventory</h2><p>{promotionRecordCount.toLocaleString()} promotions overlap the selected period or are active now. Ongoing promotions are pinned first; impression and click values are lifetime counters. Select a row to inspect every stored attribute.</p></header>
        <div className="analytics-promotion-filters">
          <label>Account type<select value={role} onChange={event => setRole(event.target.value as PromotionRoleFilter)}><option value="all">All accounts</option><option value="Client">Clients</option><option value="Freelancer">Freelancers</option></select></label>
          <label>Status<select value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option>{statuses.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Search<input value={search} onChange={event => setSearch(event.target.value)} placeholder="Owner, email, item, or promotion ID" /></label>
        </div>
        <div className="analytics-table-wrap"><table><thead><tr><th>Account</th><th>Owner</th><th>Promoted item</th><th>Status</th><th>Cost</th><th>Period</th><th>Impressions</th><th>Clicks</th><th>CTR</th></tr></thead><tbody>
          {rows.map(item => <tr key={item.promotionId} tabIndex={0} className="analytics-clickable-row" onClick={() => setSelected(item)} onKeyDown={event => event.key === 'Enter' && setSelected(item)}><td><span className={`analytics-role-badge ${item.role.toLowerCase()}`}>{item.role}</span><small className="analytics-promotion-type">{item.type}</small></td><td><strong>{item.ownerName}</strong><small className="analytics-table-secondary">{item.ownerEmail}</small></td><td><strong>{item.subjectName}</strong><small className="analytics-table-secondary">{item.subjectId}</small></td><td><span className={`analytics-promotion-status ${item.status.toLowerCase()}`}>{item.status}</span></td><td>{number.format(item.tokenCost)} GC</td><td>{new Date(item.startsAt).toLocaleDateString()}<small className="analytics-table-secondary">to {new Date(item.endsAt).toLocaleDateString()}</small></td><td>{item.impressionCount.toLocaleString()}</td><td>{item.clickCount.toLocaleString()}</td><td>{number.format(item.clickThroughRate)}%</td></tr>)}
        </tbody></table></div>
        {rows.length === 0 ? <div className="analytics-empty">No promotions match the selected filters.</div> : null}
        <PaginationControls page={pagination.page} pageCount={pagination.pageCount} from={pagination.from} to={pagination.to} total={filtered.length} onPage={pagination.setPage} noun="promotions" />
        {premium.promotionsTruncated ? <div className="analytics-lifetime-note"><Info size={15} /> Showing active promotions first, followed by the most recent records, up to 200 total. Narrow the date range to inspect older promotions.</div> : null}
      </section>

      <div className="analytics-grid analytics-grid-two">
        <section className="analytics-panel"><header><h2>Premium plan purchases</h2><p>Subscription purchases split by plan and account role.</p></header><div className="analytics-table-wrap"><table><thead><tr><th>Plan</th><th>Role</th><th>Purchases</th><th>GigCoin</th><th>VND</th></tr></thead><tbody>{premium.plans.map(plan => <tr key={`${plan.plan}-${plan.role}`}><td>{plan.plan}</td><td>{plan.role}</td><td>{plan.purchases.toLocaleString()}</td><td>{number.format(plan.revenueGigCoin)}</td><td>{money.format(plan.revenueVnd)} ₫</td></tr>)}</tbody></table></div></section>
        <FeatureAdoptionTable premium={premium} />
      </div>

      {selected ? (
        <div className="analytics-promotion-modal-backdrop" role="presentation" onMouseDown={() => setSelected(null)}>
          <section
            className="analytics-promotion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="promotion-details-title"
            onMouseDown={event => event.stopPropagation()}
          >
            <header className="analytics-promotion-modal-header">
              <div>
                <span className={`analytics-role-badge ${selected.role.toLowerCase()}`}>{selected.role}</span>
                <h2 id="promotion-details-title">{selected.subjectName}</h2>
                <p>{selected.type} · <span className={`analytics-promotion-status ${selected.status.toLowerCase()}`}>{selected.status}</span></p>
              </div>
              <button type="button" autoFocus aria-label="Close promotion details" onClick={() => setSelected(null)}><X size={20} /></button>
            </header>
            <div className="analytics-promotion-modal-body">
              <section aria-labelledby="promotion-overview-title">
                <h3 id="promotion-overview-title">Promotion overview</h3>
                <dl className="analytics-promotion-detail-grid">
                  <div><dt>Promotion ID</dt><dd>{selected.promotionId}</dd></div>
                  <div><dt>Subject ID</dt><dd>{selected.subjectId}</dd></div>
                  <div><dt>Owner</dt><dd><a href={`/admin/users?preview=${encodeURIComponent(selected.ownerUserId)}`}>{selected.ownerName}</a><br />{selected.ownerEmail}</dd></div>
                  <div><dt>Cost</dt><dd>{number.format(selected.tokenCost)} GigCoin</dd></div>
                  <div><dt>Performance</dt><dd>{selected.impressionCount.toLocaleString()} impressions · {selected.clickCount.toLocaleString()} clicks · {number.format(selected.clickThroughRate)}% CTR</dd></div>
                  <div><dt>Promotion period</dt><dd>{new Date(selected.startsAt).toLocaleString()} — {new Date(selected.endsAt).toLocaleString()}</dd></div>
                  <div><dt>Created</dt><dd>{new Date(selected.createdAt).toLocaleString()}</dd></div>
                </dl>
              </section>
              {Object.keys(selected.attributes).length > 0 ? (
                <section aria-labelledby="promotion-attributes-title">
                  <h3 id="promotion-attributes-title">Promotion attributes</h3>
                  <dl className="analytics-promotion-detail-grid analytics-promotion-attributes">
                    {Object.entries(selected.attributes).map(([key, value]) => (
                      <div key={key}><dt>{key}</dt><dd><PromotionAttributeValue label={key} value={value} /></dd></div>
                    ))}
                  </dl>
                </section>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function SeriesTable({ points }: { points: AnalyticsSeriesPoint[] }) {
  const pagination = useTablePage(points.length, 10);
  const rows = points.slice(pagination.from, pagination.to);
  return <><div className="analytics-table-wrap"><table><thead><tr><th>Bucket</th><th>Series</th><th>Value</th></tr></thead><tbody>{rows.map((point, index) => <tr key={`${point.bucket}-${point.series}-${pagination.from + index}`}><td>{point.bucket}</td><td>{point.series}</td><td>{number.format(point.value)}</td></tr>)}</tbody></table></div><PaginationControls page={pagination.page} pageCount={pagination.pageCount} from={pagination.from} to={pagination.to} total={points.length} onPage={pagination.setPage} /></>;
}

type OpportunityMode = 'skill' | 'query';
type OpportunityItem = MarketplaceAnalyticsResponse['opportunities'][number];
type OpportunityPoint = OpportunityItem & { x: number; y: number; z: number };

function OpportunityTooltip({ active, payload, mode }: { active?: boolean; payload?: Array<{ payload: OpportunityPoint }>; mode: OpportunityMode }) {
  if (!active || !payload?.[0]) return null;
  const item = payload[0].payload;
  return (
    <div className="analytics-opportunity-tooltip">
      <strong>{item.label}</strong>
      <span>Gap score: {number.format(item.score)}</span>
      {mode === 'skill' ? (
        <><span>{item.demand} open jobs</span><span>{item.supply} available freelancers</span></>
      ) : (
        <><span>{item.demand} committed searches</span><span>{number.format(item.resultCount)} average results</span></>
      )}
    </div>
  );
}

function opportunityMeaning(item: OpportunityItem) {
  if (item.kind === 'query') {
    return `${item.demand.toLocaleString()} searches produced ${number.format(item.resultCount)} results on average.`;
  }
  if (item.supply === 0) return `${item.demand.toLocaleString()} open jobs currently have no matching available freelancer.`;
  return `${item.demand.toLocaleString()} open jobs compete for ${item.supply.toLocaleString()} available freelancers.`;
}

function TransactionsView({
  data, filters, page, onFilters, onPrevious, onNext,
}: {
  data: AdminTransactionPage; filters: TransactionFilters; page: number;
  onFilters: (filters: TransactionFilters) => void; onPrevious: () => void; onNext: () => void;
}) {
  const [selected, setSelected] = useState<AdminTransactionItem | null>(null);
  const [textFilters, setTextFilters] = useState({
    gateway: filters.gateway ?? '',
    userId: filters.userId ?? '',
    contractId: filters.contractId ?? '',
  });
  const [textFilterError, setTextFilterError] = useState<string | null>(null);
  const countRows = pivot(data.countSeries);
  const typeKeys = [...new Set(data.countSeries.map(point => point.series))];
  const pageSize = data.pageSize || filters.pageSize || 20;
  const pageCount = Math.max(1, Math.ceil(data.filteredCount / pageSize));
  const from = (page - 1) * pageSize;
  const to = Math.min(from + data.items.length, data.filteredCount);
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  useEffect(() => {
    setTextFilters({
      gateway: filters.gateway ?? '',
      userId: filters.userId ?? '',
      contractId: filters.contractId ?? '',
    });
  }, [filters.gateway, filters.userId, filters.contractId]);

  const applyTextFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userId = textFilters.userId.trim();
    const contractId = textFilters.contractId.trim();
    if ((userId && !uuidPattern.test(userId)) || (contractId && !uuidPattern.test(contractId))) {
      setTextFilterError('User ID and Contract ID must be complete UUIDs before applying.');
      return;
    }
    setTextFilterError(null);
    onFilters({
      ...filters,
      gateway: textFilters.gateway.trim() || undefined,
      userId: userId || undefined,
      contractId: contractId || undefined,
      cursor: undefined,
    });
  };

  return (
    <div className="analytics-stack">
      <form className="analytics-filter-bar" aria-label="Transaction filters" onSubmit={applyTextFilters} noValidate>
        <label>Type<select value={filters.type ?? ''} onChange={event => onFilters({ ...filters, type: event.target.value === '' ? undefined : Number(event.target.value), cursor: undefined })}><option value="">All types</option>{data.typeBreakdown.map(type => <option key={type.key} value={type.key}>{type.label}</option>)}</select></label>
        <label>Status<select value={filters.status ?? ''} onChange={event => onFilters({ ...filters, status: event.target.value === '' ? undefined : Number(event.target.value), cursor: undefined })}><option value="">All statuses</option>{data.statusBreakdown.map(status => <option key={status.key} value={status.key}>{status.label}</option>)}</select></label>
        <label>Revenue source<select value={filters.revenueSource ?? ''} onChange={event => onFilters({ ...filters, revenueSource: event.target.value === '' ? undefined : Number(event.target.value), cursor: undefined })}><option value="">All sources</option><option value="0">Contract funding fee</option><option value="1">Contract release fee</option><option value="2">Subscription purchase</option><option value="3">Job promotion</option><option value="4">Profile promotion</option><option value="5">Promotion boost</option><option value="6">Withdrawal fee</option></select></label>
        <label>Gateway<input value={textFilters.gateway} onChange={event => setTextFilters(current => ({ ...current, gateway: event.target.value }))} placeholder="All gateways" /></label>
        <label>User ID<input value={textFilters.userId} onChange={event => setTextFilters(current => ({ ...current, userId: event.target.value }))} placeholder="UUID" aria-invalid={Boolean(textFilterError && textFilters.userId)} /></label>
        <label>Contract ID<input value={textFilters.contractId} onChange={event => setTextFilters(current => ({ ...current, contractId: event.target.value }))} placeholder="UUID" aria-invalid={Boolean(textFilterError && textFilters.contractId)} /></label>
        <div className="analytics-filter-submit">
          <button type="submit">Apply text filters</button>
          {textFilterError ? <span role="alert">{textFilterError}</span> : null}
        </div>
      </form>
      <section className="analytics-kpis">
        {data.statusBreakdown.map(item => <article key={item.key} className="analytics-metric-card"><div className="analytics-metric-label">{item.label}</div><div className="analytics-metric-value">{item.count.toLocaleString()}</div><div className="analytics-change">ledger transactions</div></article>)}
      </section>
      <ChartPanel title="Ledger activity" subtitle="Transaction counts only; chart segments filter the ledger" table={<SeriesTable points={data.countSeries} />}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={countRows}><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis dataKey="bucket" /><YAxis /><Tooltip /><Legend />{typeKeys.map((key, index) => <Bar key={key} dataKey={key} stackId="count" fill={COLORS[index % COLORS.length]} cursor="pointer" onClick={() => {
          const match = data.typeBreakdown.find(type => type.label.replaceAll(' ', '') === key);
          if (match) onFilters({ ...filters, type: Number(match.key), cursor: undefined });
        }} />)}</BarChart></ResponsiveContainer>
      </ChartPanel>
      <section className="analytics-panel"><header><h2>Wallet transaction ledger</h2><p>{data.filteredCount.toLocaleString()} matching rows · GigCoin and VND are never combined</p></header>
        <div className="analytics-table-wrap"><table><thead><tr><th>Occurred</th><th>User</th><th>Type</th><th>Direction</th><th>GigCoin</th><th>VND</th><th>Status</th><th>Revenue source</th></tr></thead><tbody>
          {data.items.map(item => <tr key={item.id} tabIndex={0} onClick={() => setSelected(item)} onKeyDown={event => event.key === 'Enter' && setSelected(item)} className="analytics-clickable-row"><td>{new Date(item.occurredAt).toLocaleString()}</td><td><a href={`/admin/users?preview=${encodeURIComponent(item.userId)}`}>{item.userName}</a></td><td>{item.typeLabel}</td><td><span className={`analytics-direction ${item.direction.toLowerCase()}`}>{item.direction}</span></td><td>{number.format(item.gigCoinAmount)}</td><td>{money.format(item.vndAmount)} ₫</td><td>{item.statusLabel}</td><td>{item.revenueSource ?? '—'}</td></tr>)}
        </tbody></table></div>
        {data.items.length === 0 ? <div className="analytics-empty">No transactions match the selected filters.</div> : null}
        <PaginationControls page={page} pageCount={pageCount} from={from} to={to} total={data.filteredCount} onPage={target => target < page ? onPrevious() : onNext()} canPrevious={page > 1} canNext={Boolean(data.nextCursor)} noun="transactions" />
      </section>
      {selected ? <aside className="analytics-drawer" aria-label="Transaction details"><button type="button" aria-label="Close details" onClick={() => setSelected(null)}><X /></button><h2>Transaction detail</h2>
        <dl>{Object.entries({ ID: selected.id, User: `${selected.userName} (${selected.userId})`, Contract: selected.contractTitle ?? selected.contractId ?? '—', Reference: selected.reference ?? '—', Gateway: selected.gateway ?? '—', Note: selected.note ?? '—', Metadata: selected.metadata ?? '—' }).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      </aside> : null}
    </div>
  );
}

function MarketView({ data }: { data: MarketplaceAnalyticsResponse }) {
  const [trendSort, setTrendSort] = useState<'score' | 'uniqueViews' | 'saves' | 'proposals' | 'contracts' | 'conversionPercent'>('score');
  const [opportunityMode, setOpportunityMode] = useState<OpportunityMode>('skill');
  const funnel = Object.entries(data.funnel).map(([stage, value]) => ({ stage, value }));
  const sortedJobs = useMemo(() => [...data.trendingJobs].sort((a, b) => b[trendSort] - a[trendSort]), [data.trendingJobs, trendSort]);
  const filteredOpportunities = useMemo(() => data.opportunities.filter(item => item.kind === opportunityMode), [data.opportunities, opportunityMode]);
  const scatter = filteredOpportunities.map(item => ({
    ...item,
    x: opportunityMode === 'skill' ? item.supply : item.resultCount,
    y: item.demand,
    z: Math.max(20, item.score),
  }));
  const trendPagination = useTablePage(sortedJobs.length);
  const opportunityPagination = useTablePage(filteredOpportunities.length);
  const jobs = sortedJobs.slice(trendPagination.from, trendPagination.to);
  const opportunities = filteredOpportunities.slice(opportunityPagination.from, opportunityPagination.to);
  const searchDetails = new Map(data.topSearches.map(search => [search.query.toLocaleLowerCase(), search]));
  useEffect(() => opportunityPagination.setPage(1), [opportunityMode]);
  return (
    <div className="analytics-stack">
      <div className="analytics-grid analytics-grid-two">
        <ChartPanel title="Top committed searches" subtitle="Queries appear only after ≥5 searches from ≥3 actors">
          <ResponsiveContainer width="100%" height="100%"><BarChart data={data.topSearches.slice(0, 12)} layout="vertical"><CartesianGrid strokeDasharray="3 3" opacity={0.2} /><XAxis type="number" /><YAxis type="category" dataKey="query" width={120} /><Tooltip /><Bar dataKey="searches" fill="#2563eb" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer>
        </ChartPanel>
        <ChartPanel title="Marketplace conversion" subtitle="Views → saves → submitted proposals → contracts">
          <div className="analytics-funnel">{funnel.map((item, index) => <div key={item.stage} style={{ width: `${100 - index * 14}%` }}><span>{labelFor(item.stage)}</span><strong>{item.value.toLocaleString()}</strong></div>)}</div>
        </ChartPanel>
      </div>
      <section className="analytics-panel"><header><h2 className="analytics-title-with-info">Trending jobs <FormulaTooltip label="How the trending job score is calculated"><span>Score (0–100) = 20% unique-view percentile + 20% save percentile + 35% submitted-proposal percentile + 25% created-contract percentile.</span></FormulaTooltip></h2><p>Jobs ranked by marketplace engagement during the selected period.</p></header>
        <div className="analytics-table-wrap"><table><thead><tr><th>Job</th>{([
          ['score', 'Score'], ['uniqueViews', 'Unique views'], ['saves', 'Saves'], ['proposals', 'Proposals'], ['contracts', 'Contracts'], ['conversionPercent', 'Conversion'],
        ] as const).map(([key, label]) => <th key={key}><button type="button" className={trendSort === key ? 'analytics-sort active' : 'analytics-sort'} onClick={() => setTrendSort(key)}>{label}{trendSort === key ? ' ↓' : ''}</button></th>)}</tr></thead><tbody>
          {jobs.map(job => <tr key={job.jobPostId}><td><a href={`/jobs/${job.jobPostId}`}>{job.title}</a></td><td><strong>{number.format(job.score)}</strong></td><td>{job.uniqueViews}</td><td>{job.saves}</td><td>{job.proposals}</td><td>{job.contracts}</td><td>{number.format(job.conversionPercent)}%</td></tr>)}
        </tbody></table></div>{data.trendingJobs.length === 0 ? <div className="analytics-empty">Trending history begins when discovery capture is deployed.</div> : null}
        <PaginationControls page={trendPagination.page} pageCount={trendPagination.pageCount} from={trendPagination.from} to={trendPagination.to} total={sortedJobs.length} onPage={trendPagination.setPage} noun="jobs" />
      </section>
      <section className="analytics-opportunity-guide">
        <div>
          <span className="analytics-control-label">Opportunity lens</span>
          <h2 className="analytics-title-with-info">Where marketplace demand is underserved <FormulaTooltip label={`How the ${opportunityMode === 'skill' ? 'talent gap' : 'search gap'} score is calculated`}>
            {opportunityMode === 'skill'
              ? <><span>Talent gap score = open jobs requiring the skill ÷ max(1, available freelancers with the skill).</span><small>A score above 1 means open-job demand exceeds available talent.</small></>
              : <><span>Search gap score = searches × (1 + zero-result rate) ÷ (1 + average result count).</span><small>Frequent searches with few or no results score highest.</small></>}
          </FormulaTooltip></h2>
          <p>{opportunityMode === 'skill' ? 'Find skills where open-job demand exceeds available talent.' : 'Find searches where users repeatedly receive too few results.'}</p>
        </div>
        <div className="analytics-scope-options" role="group" aria-label="Opportunity type">
          <button type="button" className={opportunityMode === 'skill' ? 'active' : ''} aria-pressed={opportunityMode === 'skill'} onClick={() => setOpportunityMode('skill')}><BriefcaseBusiness size={16} /> Talent gaps</button>
          <button type="button" className={opportunityMode === 'query' ? 'active' : ''} aria-pressed={opportunityMode === 'query'} onClick={() => setOpportunityMode('query')}><BarChart3 size={16} /> Search gaps</button>
        </div>
      </section>
      <div className="analytics-grid analytics-grid-two">
        <ChartPanel
          title={opportunityMode === 'skill' ? 'Talent supply radar' : 'Search-result gap radar'}
          subtitle={opportunityMode === 'skill'
            ? 'Each bubble is a skill. Higher and farther left means more open jobs with fewer available freelancers.'
            : 'Each bubble is a committed search term. Higher and farther left means more searches with fewer results.'}
        >
          {scatter.length ? <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 12, right: 18, bottom: 28, left: 12 }}><CartesianGrid />
            <XAxis type="number" dataKey="x" name={opportunityMode === 'skill' ? 'Available freelancers' : 'Average results per search'} label={{ value: opportunityMode === 'skill' ? 'Available freelancers →' : 'Average results per search →', position: 'insideBottom', offset: -16 }} />
            <YAxis type="number" dataKey="y" name={opportunityMode === 'skill' ? 'Open jobs' : 'Committed searches'} label={{ value: opportunityMode === 'skill' ? 'Open jobs →' : 'Committed searches →', angle: -90, position: 'insideLeft' }} />
            <ZAxis type="number" dataKey="z" range={[70, 520]} /><Tooltip cursor={{ strokeDasharray: '3 3' }} content={<OpportunityTooltip mode={opportunityMode} />} /><Scatter name={opportunityMode === 'skill' ? 'Skill opportunity' : 'Search opportunity'} data={scatter} fill={opportunityMode === 'skill' ? '#494be7' : '#d97706'} />
          </ScatterChart></ResponsiveContainer> : <div className="analytics-chart-empty">No {opportunityMode === 'skill' ? 'skill supply' : 'search gap'} data is available for this period.</div>}
        </ChartPanel>
        <section className="analytics-panel"><header><h2>{opportunityMode === 'skill' ? 'Talent gap details' : 'Search gap details'}</h2><p>{opportunityMode === 'skill' ? 'Compare open job demand with currently available freelancer supply.' : 'Compare committed search demand with the results users received.'}</p></header>
          <div className="analytics-table-wrap"><table><thead>{opportunityMode === 'skill' ? <tr><th>Skill</th><th>Gap score</th><th>Open jobs</th><th>Available freelancers</th><th>Proposals</th><th>Contracts</th><th>What it means</th></tr> : <tr><th>Search term</th><th>Gap score</th><th>Searches</th><th>Avg. results/search</th><th>Zero-result rate</th><th>What it means</th></tr>}</thead><tbody>
            {opportunities.map(item => {
              const search = searchDetails.get(item.label.toLocaleLowerCase());
              const zeroRate = search && search.searches > 0 ? search.zeroResultSearches * 100 / search.searches : 0;
              return opportunityMode === 'skill' ? <tr key={`${item.kind}-${item.key}`}><td><span className="analytics-kind">Skill</span>{item.label}</td><td><strong>{number.format(item.score)}</strong></td><td>{item.demand}</td><td>{item.supply}</td><td>{item.proposalCount}</td><td>{item.contractCount}</td><td className="analytics-opportunity-meaning">{opportunityMeaning(item)}</td></tr> : <tr key={`${item.kind}-${item.key}`}><td><span className="analytics-kind query">Search</span>{item.label}</td><td><strong>{number.format(item.score)}</strong></td><td>{item.demand}</td><td>{number.format(item.resultCount)}</td><td>{number.format(zeroRate)}%</td><td className="analytics-opportunity-meaning">{opportunityMeaning(item)}</td></tr>;
            })}
          </tbody></table></div>
          <PaginationControls page={opportunityPagination.page} pageCount={opportunityPagination.pageCount} from={opportunityPagination.from} to={opportunityPagination.to} total={filteredOpportunities.length} onPage={opportunityPagination.setPage} noun={opportunityMode === 'skill' ? 'skills' : 'search terms'} />
        </section>
      </div>
    </div>
  );
}

export default function AdminAnalyticsScreen() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab') as AnalyticsTab) ? params.get('tab') as AnalyticsTab : 'revenue';
  const period = PERIODS.includes(params.get('period') as AnalyticsPeriod) ? params.get('period') as AnalyticsPeriod : 'month';
  const anchor = params.get('anchor') ?? new Date().toISOString().slice(0, 10);
  const from = params.get('from') ?? anchor.slice(0, 8) + '01';
  const to = params.get('to') ?? anchor;
  const range = useMemo<AnalyticsRangeParams>(() => ({ period, anchor, ...(period === 'custom' ? { from, to } : {}) }), [period, anchor, from, to]);
  const [finance, setFinance] = useState<FinanceAnalyticsResponse | null>(null);
  const [premium, setPremium] = useState<PremiumAnalyticsResponse | null>(null);
  const [transactions, setTransactions] = useState<AdminTransactionPage | null>(null);
  const [market, setMarket] = useState<MarketplaceAnalyticsResponse | null>(null);
  const [filters, setFilters] = useState<TransactionFilters>({ ...range, pageSize: 20 });
  const [transactionCursors, setTransactionCursors] = useState<Array<string | undefined>>([undefined]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const analyticsRequest = tab === 'transactions' ? filters : range;

  const updateParams = useCallback((values: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    Object.entries(values).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    setParams(next, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    setTransactionCursors([undefined]);
    setFilters(current => ({ ...current, ...range, cursor: undefined }));
  }, [range]);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(null);
    const load = async () => {
      if (tab === 'revenue') {
        const requestRange = analyticsRequest as AnalyticsRangeParams;
        const [financeResponse, premiumResponse] = await Promise.all([adminAnalyticsAPI.finance(requestRange), adminAnalyticsAPI.premium(requestRange)]);
        if (!active) return;
        if (!financeResponse.success || !financeResponse.data || !premiumResponse.success || !premiumResponse.data) throw new Error(financeResponse.message || premiumResponse.message);
        setFinance(financeResponse.data); setPremium(premiumResponse.data);
      } else if (tab === 'premium') {
        const response = await adminAnalyticsAPI.premium(analyticsRequest as AnalyticsRangeParams);
        if (!active) return;
        if (!response.success || !response.data) throw new Error(response.message);
        setPremium(response.data);
      } else if (tab === 'transactions') {
        const response = await adminAnalyticsAPI.transactions(analyticsRequest as TransactionFilters);
        if (!active) return;
        if (!response.success || !response.data) throw new Error(response.message);
        setTransactions(response.data);
      } else {
        const response = await adminAnalyticsAPI.marketplace(analyticsRequest as AnalyticsRangeParams);
        if (!active) return;
        if (!response.success || !response.data) throw new Error(response.message);
        setMarket(response.data);
      }
    };
    void load().catch(reason => active && setError(reason instanceof Error ? reason.message : 'Analytics could not be loaded.')).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [tab, analyticsRequest, refreshKey]);

  const movePeriod = (direction: -1 | 1) => {
    const date = new Date(`${anchor}T12:00:00`);
    if (period === 'month') date.setMonth(date.getMonth() + direction);
    else if (period === 'quarter') date.setMonth(date.getMonth() + 3 * direction);
    else if (period === 'year') date.setFullYear(date.getFullYear() + direction);
    updateParams({ anchor: date.toISOString().slice(0, 10) });
  };
  const exportCsv = async () => {
    const response = await adminAnalyticsAPI.exportTransactions(filters);
    if (!response.success || !response.data) { setError(response.message); return; }
    const url = URL.createObjectURL(response.data); const link = document.createElement('a');
    link.href = url; link.download = `platform-transactions-${anchor}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <AppLayout hideAIWidget>
      <div className="admin-analytics-page">
        <header className="analytics-hero">
          <div><span className="analytics-eyebrow"><BarChart3 size={16} /> Admin intelligence</span><h1>{t('adminAnalytics.title', { defaultValue: 'Platform Analytics' })}</h1><p>{t('adminAnalytics.subtitle', { defaultValue: 'Revenue integrity, wallet activity, and marketplace opportunity—without mixing platform income with user funds.' })}</p></div>
          <div className="analytics-hero-actions"><button type="button" onClick={() => setRefreshKey(value => value + 1)}><RefreshCw size={17} />Refresh</button>{tab === 'transactions' ? <button type="button" onClick={() => void exportCsv()}><Download size={17} />CSV export</button> : null}</div>
        </header>
        <nav className="analytics-tabs" aria-label="Analytics sections">{TABS.map(value => <button key={value} type="button" className={tab === value ? 'active' : ''} onClick={() => updateParams({ tab: value })}>{value === 'market' ? 'Market Trends' : value === 'premium' ? 'Premium & Promotions' : labelFor(value)}</button>)}</nav>
        <section className="analytics-toolbar">
          <div className="analytics-periods">{PERIODS.map(value => <button type="button" key={value} className={period === value ? 'active' : ''} onClick={() => updateParams({ period: value })}>{labelFor(value)}</button>)}</div>
          {period !== 'custom' ? <div className="analytics-navigator"><button type="button" aria-label="Previous period" onClick={() => movePeriod(-1)}><ArrowLeft size={17} /></button><label><CalendarDays size={17} /><input type="date" value={anchor} onChange={event => updateParams({ anchor: event.target.value })} /></label><button type="button" aria-label="Next period" onClick={() => movePeriod(1)}><ArrowRight size={17} /></button></div> : <div className="analytics-custom-range"><label>From<input type="date" value={from} onChange={event => updateParams({ from: event.target.value })} /></label><label>To<input type="date" value={to} onChange={event => updateParams({ to: event.target.value })} /></label></div>}
          <span className="analytics-timezone">ICT · Asia/Ho_Chi_Minh</span>
        </section>
        {loading && ((tab === 'revenue' && (!finance || !premium)) || (tab === 'premium' && !premium) || (tab === 'transactions' && !transactions) || (tab === 'market' && !market)) ? <div className="analytics-state"><RefreshCw className="analytics-spin" /><h2>Loading persisted analytics</h2><p>Aggregating the selected ICT period…</p></div> : null}
        {error ? <div className="analytics-state analytics-error"><Info /><h2>Analytics unavailable</h2><p>{error}</p><button type="button" onClick={() => setRefreshKey(value => value + 1)}>Try again</button></div> : null}
        {tab === 'revenue' && finance && premium ? <RevenueView finance={finance} premium={premium} /> : null}
        {tab === 'premium' && premium ? <PremiumTrackingView premium={premium} /> : null}
        {tab === 'transactions' && transactions ? <TransactionsView
          data={transactions}
          filters={filters}
          page={transactionCursors.length}
          onFilters={next => { setTransactionCursors([undefined]); setFilters({ ...next, cursor: undefined }); }}
          onPrevious={() => {
            if (transactionCursors.length <= 1) return;
            const nextCursors = transactionCursors.slice(0, -1);
            setTransactionCursors(nextCursors);
            setFilters(current => ({ ...current, cursor: nextCursors[nextCursors.length - 1] }));
          }}
          onNext={() => {
            if (!transactions.nextCursor) return;
            setTransactionCursors(current => [...current, transactions.nextCursor ?? undefined]);
            setFilters(current => ({ ...current, cursor: transactions.nextCursor ?? undefined }));
          }}
        /> : null}
        {tab === 'market' && market ? <MarketView data={market} /> : null}
      </div>
    </AppLayout>
  );
}
