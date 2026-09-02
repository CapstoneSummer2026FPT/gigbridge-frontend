import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  BarChart3,
  CalendarDays,
  Download,
  Info,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { adminAnalyticsAPI } from '../../../api/adminAnalyticsAPI';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useTranslation } from '../../../hooks/useTranslation';
import type {
  AdminTransactionPage,
  AnalyticsPeriod,
  AnalyticsRangeParams,
  AnalyticsTab,
  FinanceAnalyticsResponse,
  MarketplaceAnalyticsResponse,
  PremiumAnalyticsResponse,
  TransactionFilters,
} from '../../../types/adminAnalytics';
import {
  ANALYTICS_PERIODS,
  ANALYTICS_TABS,
  exportTransactionsCsv,
  labelFor,
} from '../utils/analyticsUtils';
import { AdminRevenueTab } from '../components/analytics/AdminRevenueTab';
import { AdminTransactionsTab } from '../components/analytics/AdminTransactionsTab';
import { AdminPremiumTab } from '../components/analytics/AdminPremiumTab';
import { AdminMarketplaceTab } from '../components/analytics/AdminMarketplaceTab';
import '../styles/admin-analytics-screen.css';

export default function AdminAnalyticsScreen() {
  const { t } = useTranslation('admin');
  const [params, setParams] = useSearchParams();

  const tab = ANALYTICS_TABS.includes(params.get('tab') as AnalyticsTab)
    ? (params.get('tab') as AnalyticsTab)
    : 'revenue';
  const period = ANALYTICS_PERIODS.includes(params.get('period') as AnalyticsPeriod)
    ? (params.get('period') as AnalyticsPeriod)
    : 'month';

  const anchor = params.get('anchor') ?? new Date().toISOString().slice(0, 10);
  const from = params.get('from') ?? anchor.slice(0, 8) + '01';
  const to = params.get('to') ?? anchor;

  const range = useMemo<AnalyticsRangeParams>(
    () => ({ period, anchor, ...(period === 'custom' ? { from, to } : {}) }),
    [period, anchor, from, to]
  );

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

  const updateParams = useCallback(
    (values: Record<string, string | undefined>) => {
      const next = new URLSearchParams(params);
      Object.entries(values).forEach(([key, value]) =>
        value ? next.set(key, value) : next.delete(key)
      );
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  useEffect(() => {
    setTransactionCursors([undefined]);
    setFilters(current => ({ ...current, ...range, cursor: undefined }));
  }, [range]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const load = async () => {
      if (tab === 'revenue') {
        const requestRange = analyticsRequest as AnalyticsRangeParams;
        const [financeRes, premiumRes] = await Promise.all([
          adminAnalyticsAPI.finance(requestRange),
          adminAnalyticsAPI.premium(requestRange),
        ]);
        if (!active) return;
        if (!financeRes.success || !financeRes.data || !premiumRes.success || !premiumRes.data) {
          throw new Error(financeRes.message || premiumRes.message);
        }
        setFinance(financeRes.data);
        setPremium(premiumRes.data);
      } else if (tab === 'premium') {
        const res = await adminAnalyticsAPI.premium(analyticsRequest as AnalyticsRangeParams);
        if (!active) return;
        if (!res.success || !res.data) throw new Error(res.message);
        setPremium(res.data);
      } else if (tab === 'transactions') {
        const res = await adminAnalyticsAPI.transactions(analyticsRequest as TransactionFilters);
        if (!active) return;
        if (!res.success || !res.data) throw new Error(res.message);
        setTransactions(res.data);
      } else {
        const res = await adminAnalyticsAPI.marketplace(analyticsRequest as AnalyticsRangeParams);
        if (!active) return;
        if (!res.success || !res.data) throw new Error(res.message);
        setMarket(res.data);
      }
    };

    void load()
      .catch(reason => active && setError(reason instanceof Error ? reason.message : 'Analytics could not be loaded.'))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [tab, analyticsRequest, refreshKey]);

  const movePeriod = (direction: -1 | 1) => {
    const date = new Date(`${anchor}T12:00:00`);
    if (period === 'month') date.setMonth(date.getMonth() + direction);
    else if (period === 'quarter') date.setMonth(date.getMonth() + 3 * direction);
    else if (period === 'year') date.setFullYear(date.getFullYear() + direction);
    updateParams({ anchor: date.toISOString().slice(0, 10) });
  };

  const handleExportCsv = async () => {
    const res = await exportTransactionsCsv(filters, anchor);
    if (!res.success && res.message) {
      setError(res.message);
    }
  };

  const isDataLoading =
    loading &&
    ((tab === 'revenue' && (!finance || !premium)) ||
      (tab === 'premium' && !premium) ||
      (tab === 'transactions' && !transactions) ||
      (tab === 'market' && !market));

  return (
    <AppLayout hideAIWidget>
      <div className="admin-analytics-page">
        {/* Hero Header */}
        <header className="analytics-hero">
          <div>
            <span className="analytics-eyebrow">
              <BarChart3 size={15} /> {t('adminAnalytics.eyebrow', { defaultValue: 'Admin Intelligence' })}
            </span>
            <h1>{t('adminAnalytics.title', { defaultValue: 'Platform Analytics' })}</h1>
            <p>
              {t('adminAnalytics.subtitle', {
                defaultValue:
                  'Revenue integrity, wallet cash movement, monetization, and marketplace opportunity—without mixing platform income with user escrow funds.',
              })}
            </p>
          </div>

          <div className="analytics-hero-actions">
            <button
              type="button"
              className="analytics-hero-btn"
              onClick={() => setRefreshKey(v => v + 1)}
              aria-label="Refresh analytics data"
            >
              <RefreshCw size={15} className={loading ? 'analytics-spin' : ''} />
              <span>{t('adminAnalytics.refresh', { defaultValue: 'Refresh' })}</span>
            </button>
            {tab === 'transactions' && (
              <button
                type="button"
                className="analytics-hero-btn"
                onClick={() => void handleExportCsv()}
                aria-label="Export CSV"
              >
                <Download size={15} />
                <span>{t('adminAnalytics.exportCsv', { defaultValue: 'Export CSV' })}</span>
              </button>
            )}
          </div>
        </header>

        {/* Section Tabs Navigation */}
        <nav className="analytics-tabs" aria-label="Analytics sections">
          {ANALYTICS_TABS.map(value => (
            <button
              key={value}
              type="button"
              className={`analytics-tab-btn ${tab === value ? 'active' : ''}`}
              onClick={() => updateParams({ tab: value })}
            >
              {labelFor(value, t)}
            </button>
          ))}
        </nav>

        {/* Period & Timeframe Toolbar */}
        <section className="analytics-toolbar">
          <div className="analytics-periods" role="group" aria-label="Time period selection">
            {ANALYTICS_PERIODS.map(value => (
              <button
                type="button"
                key={value}
                className={`analytics-period-btn ${period === value ? 'active' : ''}`}
                onClick={() => updateParams({ period: value })}
              >
                {labelFor(value, t)}
              </button>
            ))}
          </div>

          {period !== 'custom' ? (
            <div className="analytics-navigator">
              <button
                type="button"
                className="analytics-nav-arrow"
                aria-label="Previous period"
                onClick={() => movePeriod(-1)}
              >
                <ArrowLeft size={16} />
              </button>
              <label className="analytics-date-label">
                <CalendarDays size={16} className="text-text-muted" />
                <input
                  type="date"
                  value={anchor}
                  onChange={e => updateParams({ anchor: e.target.value })}
                />
              </label>
              <button
                type="button"
                className="analytics-nav-arrow"
                aria-label="Next period"
                onClick={() => movePeriod(1)}
              >
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <div className="analytics-custom-range">
              <label>
                <span>{t('adminAnalytics.range.from', { defaultValue: 'From' })}</span>
                <input
                  type="date"
                  value={from}
                  onChange={e => updateParams({ from: e.target.value })}
                />
              </label>
              <label>
                <span>{t('adminAnalytics.range.to', { defaultValue: 'To' })}</span>
                <input
                  type="date"
                  value={to}
                  onChange={e => updateParams({ to: e.target.value })}
                />
              </label>
            </div>
          )}

          <span className="analytics-timezone">
            {t('adminAnalytics.timezone', { defaultValue: 'ICT · Asia/Ho_Chi_Minh' })}
          </span>
        </section>

        {/* Loading Spinner & Error Banner */}
        {isDataLoading && (
          <div className="analytics-state">
            <RefreshCw className="analytics-spin text-brand" size={28} />
            <h2>{t('adminAnalytics.loadingTitle', { defaultValue: 'Loading Analytics Intelligence' })}</h2>
            <p>{t('adminAnalytics.loadingSubtitle', { defaultValue: 'Aggregating verified transactions and metrics for the selected period…' })}</p>
          </div>
        )}

        {error && (
          <div className="analytics-state analytics-error">
            <Info size={28} className="text-rose-500" />
            <h2>{t('adminAnalytics.errorTitle', { defaultValue: 'Analytics Data Unavailable' })}</h2>
            <p>{error}</p>
            <button
              type="button"
              className="analytics-primary-btn mt-2"
              onClick={() => setRefreshKey(v => v + 1)}
            >
              {t('adminAnalytics.retry', { defaultValue: 'Retry' })}
            </button>
          </div>
        )}

        {/* Tab 1: Revenue */}
        {tab === 'revenue' && finance && premium && (
          <AdminRevenueTab finance={finance} premium={premium} />
        )}

        {/* Tab 2: Premium & Promotions */}
        {tab === 'premium' && premium && <AdminPremiumTab premium={premium} />}

        {/* Tab 3: Transactions Ledger */}
        {tab === 'transactions' && transactions && (
          <AdminTransactionsTab
            data={transactions}
            filters={filters}
            page={transactionCursors.length}
            onFilters={next => {
              setTransactionCursors([undefined]);
              setFilters({ ...next, cursor: undefined });
            }}
            onPrevious={() => {
              if (transactionCursors.length <= 1) return;
              const nextCursors = transactionCursors.slice(0, -1);
              setTransactionCursors(nextCursors);
              setFilters(curr => ({ ...curr, cursor: nextCursors[nextCursors.length - 1] }));
            }}
            onNext={() => {
              if (!transactions.nextCursor) return;
              setTransactionCursors(curr => [...curr, transactions.nextCursor ?? undefined]);
              setFilters(curr => ({ ...curr, cursor: transactions.nextCursor ?? undefined }));
            }}
          />
        )}

        {/* Tab 4: Marketplace Discovery */}
        {tab === 'market' && market && <AdminMarketplaceTab data={market} />}
      </div>
    </AppLayout>
  );
}
