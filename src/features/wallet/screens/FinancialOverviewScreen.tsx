import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  AlertCircle,
  Calendar,
  Download,
  Landmark,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import type {
  FinancialOverviewPeriod,
  FinancialOverviewResponse,
  FinancialTransactionCategory,
} from '../../../types/models/Financial';
import { useTranslation } from '../../../hooks/useTranslation';
import { AppLayout } from '../../../shared/components/AppLayout';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import '../styles/financial-overview-screen.css';

const PERIODS: FinancialOverviewPeriod[] = ['day', 'month', 'year'];

const formatAxisAmount = (value: number) => {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

export default function FinancialOverviewScreen() {
  const { t, i18n } = useTranslation();
  const [period, setPeriod] = useState<FinancialOverviewPeriod>('month');
  const [overview, setOverview] = useState<FinancialOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const periodLabel = t(`financialOverview.periods.${period}`);

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      setLoading(true);
      setError(null);
      const response = await walletGetAPI.getFinancialOverview(period);
      if (cancelled) return;

      if (!response.success || !response.data) {
        setError(response.message || t('financialOverview.loadError'));
        setLoading(false);
        return;
      }

      setOverview(response.data);
      setLoading(false);
    };

    void loadOverview();
    return () => {
      cancelled = true;
    };
  }, [period, reloadKey, t]);

  const isClient = overview?.role === 'Client';
  const roleKicker = overview
    ? isClient ? t('financialOverview.clientFinance') : t('financialOverview.freelancerFinance')
    : t('financialOverview.accountFinance');
  const statusLabels = useMemo<Record<FinancialTransactionCategory, string>>(() => ({
    escrow: t('financialOverview.status.inEscrow'),
    released: isClient ? t('financialOverview.status.paid') : t('financialOverview.status.received'),
    refund: t('financialOverview.status.refunded'),
    serviceFee: t('financialOverview.status.serviceFee'),
  }), [isClient, t]);
  const progressData = useMemo(() => {
    if (!overview || overview.totalContractValue <= 0) return [];
    const completed = Math.min(overview.progressAmount, overview.totalContractValue);
    return [
      { name: isClient ? t('financialOverview.status.paid') : t('financialOverview.status.received'), value: completed, color: '#22C55E' },
      { name: t('financialOverview.status.remaining'), value: Math.max(0, overview.totalContractValue - completed), color: '#F59E0B' },
    ].filter(item => item.value > 0);
  }, [isClient, overview, t]);
  const isEmpty = Boolean(overview) &&
    overview!.totalAmount === 0 &&
    overview!.totalServiceFeePaid === 0 &&
    overview!.totalContractValue === 0 &&
    overview!.recentTransactions.length === 0;

  const exportOverview = () => {
    if (!overview) return;

    const rows: Array<Array<string | number>> = [
      [t('financialOverview.title'), overview.role],
      [t('financialOverview.csv.period'), t(`financialOverview.periods.${overview.period}`)],
      [t('financialOverview.csv.periodStartUtc'), overview.periodStartUtc],
      [t('financialOverview.csv.periodEndUtc'), overview.periodEndUtc],
      [isClient ? t('financialOverview.totalSpent') : t('financialOverview.totalEarnings'), overview.totalAmount],
      [isClient ? t('financialOverview.averageSpending') : t('financialOverview.averageEarnings'), overview.averageAmount],
      [isClient ? t('financialOverview.status.paid') : t('financialOverview.status.received'), overview.progressAmount],
      [t('financialOverview.totalContractValue'), overview.totalContractValue],
      [t('financialOverview.csv.progressPercentage'), overview.progressPercentage],
      [t('financialOverview.serviceFeePaid'), overview.totalServiceFeePaid],
      [],
      [t('financialOverview.csv.trend')],
      [t('financialOverview.csv.period'), isClient ? t('financialOverview.status.paid') : t('financialOverview.status.received'), t('financialOverview.status.escrowFunded'), t('financialOverview.status.serviceFee')],
      ...overview.trendPoints.map(point => [
        point.period,
        point.paidOrReceivedAmount,
        point.escrowFundedAmount,
        point.serviceFeeAmount,
      ]),
      [],
      [t('financialOverview.recentTransactions')],
      [t('financialOverview.csv.date'), t('financialOverview.csv.project'), t('financialOverview.csv.category'), t('financialOverview.csv.amount')],
      ...overview.recentTransactions.map(transaction => [
        transaction.occurredAt,
        transaction.project,
        statusLabels[transaction.category],
        transaction.signedAmount,
      ]),
    ];
    const csv = rows
      .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `financial-overview-${overview.role.toLowerCase()}-${overview.period}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="financial-overview-page">
        <header className="financial-overview-header">
          <div>
            <div className="financial-overview-kicker">
              <Landmark size={18} />
              {roleKicker}
            </div>
            <h1>{t('financialOverview.title')}</h1>
            <p>
              {!overview
                ? t('financialOverview.loadingDescription')
                : isClient
                ? t('financialOverview.clientDescription')
                : t('financialOverview.freelancerDescription')}
              {' '}{t('financialOverview.amountsInGigCoin')}
            </p>
          </div>
          <button
            type="button"
            className="financial-overview-export"
            onClick={exportOverview}
            disabled={!overview || loading || isEmpty}
          >
            <Download size={16} />
            {t('financialOverview.export')}
          </button>
        </header>

        <div className="financial-range-tabs financial-overview-period-tabs" aria-label={t('financialOverview.periodAriaLabel')}>
          {PERIODS.map(item => (
            <button
              type="button"
              key={item}
              className={period === item ? 'active' : ''}
              onClick={() => setPeriod(item)}
              disabled={loading && period === item}
              title={t(`financialOverview.periods.${item}`)}
            >
              {t(`financialOverview.tabs.${item}`)}
            </button>
          ))}
        </div>

        {loading && !overview ? (
          <section className="financial-overview-state">
            <Loader2 size={24} className="financial-overview-spin" />
            <strong>{t('financialOverview.loading')}</strong>
          </section>
        ) : error ? (
          <section className="financial-overview-state error">
            <AlertCircle size={24} />
            <strong>{t('financialOverview.loadErrorTitle')}</strong>
            <p>{error}</p>
            <button type="button" onClick={() => setReloadKey(value => value + 1)}>
              <RefreshCw size={15} /> {t('financialOverview.retry')}
            </button>
          </section>
        ) : overview && isEmpty ? (
          <section className="financial-overview-state">
            <Wallet size={26} />
            <strong>{t('financialOverview.emptyTitle', { period: periodLabel.toLocaleLowerCase(i18n.resolvedLanguage) })}</strong>
            <p>{t('financialOverview.emptyDescription')}</p>
          </section>
        ) : overview ? (
          <>
            <section className={`financial-overview-stats ${loading ? 'is-refreshing' : ''}`}>
              {[
                {
                  label: isClient ? t('financialOverview.totalSpent') : t('financialOverview.totalEarnings'),
                  value: formatGigCoin(overview.totalAmount),
                  icon: isClient ? <TrendingDown size={18} /> : <TrendingUp size={18} />,
                  tone: 'cyan',
                },
                {
                  label: isClient ? t('financialOverview.averageSpending') : t('financialOverview.averageEarnings'),
                  value: formatGigCoin(overview.averageAmount),
                  icon: <TrendingUp size={18} />,
                  tone: 'green',
                },
                {
                  label: isClient ? t('financialOverview.paymentProgress') : t('financialOverview.earningsProgress'),
                  value: `${formatGigCoin(overview.progressAmount)} / ${formatGigCoin(overview.totalContractValue)} (${overview.progressPercentage}%)`,
                  icon: <ShieldCheck size={18} />,
                  tone: 'amber',
                },
                {
                  label: t('financialOverview.serviceFeePaid'),
                  value: formatGigCoin(overview.totalServiceFeePaid),
                  icon: <Wallet size={18} />,
                  tone: 'purple',
                },
              ].map(stat => (
                <div key={stat.label} className="financial-stat-card">
                  <span className={stat.tone}>{stat.icon}</span>
                  <small>{stat.label}</small>
                  <strong>{stat.value}</strong>
                </div>
              ))}
            </section>

            <section className="financial-overview-grid">
              <div className="financial-chart-card wide">
                <div className="financial-chart-head">
                  <div>
                    <h2>{isClient ? t('financialOverview.paymentTrends') : t('financialOverview.earningsTrends')}</h2>
                    <p>{t('financialOverview.trendsDescription', { period: periodLabel.toLocaleLowerCase(i18n.resolvedLanguage) })}</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={overview.trendPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="period" tick={{ fill: '#8892A4', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#8892A4', fontSize: 12 }} tickFormatter={formatAxisAmount} />
                    <Tooltip formatter={(value) => formatGigCoin(Number(value))} contentStyle={{ background: '#0D1526', border: '1px solid rgba(0,119,255,0.25)', borderRadius: 10, color: 'white' }} />
                    <Bar dataKey="paidOrReceivedAmount" name={isClient ? t('financialOverview.status.paid') : t('financialOverview.status.received')} fill="#22C55E" radius={[6, 6, 0, 0]} />
                    {isClient && <Bar dataKey="escrowFundedAmount" name={t('financialOverview.status.escrowFunded')} fill="#F59E0B" radius={[6, 6, 0, 0]} />}
                    <Bar dataKey="serviceFeeAmount" name={t('financialOverview.status.serviceFee')} fill="#9F4BFF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="financial-chart-card">
                <div className="financial-chart-head">
                  <div>
                    <h2>{isClient ? t('financialOverview.paymentProgress') : t('financialOverview.earningsProgress')}</h2>
                    <p>{t('financialOverview.progressOf', { current: formatGigCoin(overview.progressAmount), total: formatGigCoin(overview.totalContractValue) })}</p>
                  </div>
                </div>
                {progressData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={progressData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92}>
                          {progressData.map(item => <Cell key={item.name} fill={item.color} />)}
                        </Pie>
                        <Tooltip formatter={(value) => formatGigCoin(Number(value))} contentStyle={{ background: '#0D1526', border: '1px solid rgba(159,75,255,0.25)', borderRadius: 10, color: 'white' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="financial-legend">
                      {progressData.map(item => (
                        <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="financial-chart-empty">{t('financialOverview.noProgress')}</div>
                )}
              </div>
            </section>

            <section className="financial-table-card">
              <div className="financial-chart-head">
                <div>
                  <h2>{t('financialOverview.recentTransactions')}</h2>
                  <p>{t('financialOverview.transactionsDescription')}</p>
                </div>
              </div>
              {overview.recentTransactions.length > 0 ? (
                <div className="financial-transaction-list">
                  {overview.recentTransactions.map(transaction => (
                    <article key={transaction.walletTransactionId}>
                      <div>
                        <strong>{statusLabels[transaction.category]}</strong>
                        <span>
                          <Calendar size={13} />
                          {new Date(transaction.occurredAt).toLocaleString(i18n.resolvedLanguage?.startsWith('vi') ? 'vi-VN' : 'en-US', { timeZone: 'Asia/Ho_Chi_Minh' })}
                          {' · '}{transaction.project}
                        </span>
                      </div>
                      <span className={`financial-status ${transaction.category}`}>
                        {statusLabels[transaction.category]}
                      </span>
                      <b className={transaction.signedAmount >= 0 ? 'positive' : 'negative'}>
                        {formatGigCoin(transaction.signedAmount)}
                      </b>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="financial-chart-empty">{t('financialOverview.noTransactions')}</div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
