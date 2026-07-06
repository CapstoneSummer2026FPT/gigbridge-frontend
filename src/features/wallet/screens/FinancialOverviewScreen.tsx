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
} from '../../../api/walletAPI/GET';
import { AppLayout } from '../../../shared/components/AppLayout';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import '../styles/financial-overview-screen.css';

const PERIODS: FinancialOverviewPeriod[] = ['day', 'month', 'year'];
const PERIOD_LABELS: Record<FinancialOverviewPeriod, string> = {
  day: 'Last 24 hours',
  month: 'Last month',
  year: 'Last year',
};

const STATUS_COLORS: Record<FinancialTransactionCategory, string> = {
  escrow: '#F59E0B',
  released: '#22C55E',
  refund: '#06B6D4',
  serviceFee: '#9F4BFF',
};

const formatAxisAmount = (value: number) => {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
};

export default function FinancialOverviewScreen() {
  const [period, setPeriod] = useState<FinancialOverviewPeriod>('month');
  const [overview, setOverview] = useState<FinancialOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const periodLabel = PERIOD_LABELS[period];

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      setLoading(true);
      setError(null);
      const response = await walletGetAPI.getFinancialOverview(period);
      if (cancelled) return;

      if (!response.success || !response.data) {
        setError(response.message || 'Unable to load your financial overview.');
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
  }, [period, reloadKey]);

  const isClient = overview?.role === 'Client';
  const roleKicker = overview
    ? isClient ? 'Client Finance' : 'Freelancer Finance'
    : 'Account Finance';
  const statusLabels = useMemo<Record<FinancialTransactionCategory, string>>(() => ({
    escrow: 'In Escrow',
    released: isClient ? 'Paid' : 'Received',
    refund: 'Refunded',
    serviceFee: 'Service Fee',
  }), [isClient]);
  const progressData = useMemo(() => {
    if (!overview || overview.totalContractValue <= 0) return [];
    const completed = Math.min(overview.progressAmount, overview.totalContractValue);
    return [
      { name: isClient ? 'Paid' : 'Received', value: completed, color: '#22C55E' },
      { name: 'Remaining', value: Math.max(0, overview.totalContractValue - completed), color: '#F59E0B' },
    ].filter(item => item.value > 0);
  }, [isClient, overview]);
  const isEmpty = Boolean(overview) &&
    overview!.totalAmount === 0 &&
    overview!.totalServiceFeePaid === 0 &&
    overview!.totalContractValue === 0 &&
    overview!.recentTransactions.length === 0;

  const exportOverview = () => {
    if (!overview) return;

    const rows: Array<Array<string | number>> = [
      ['Financial Overview', overview.role],
      ['Period', PERIOD_LABELS[overview.period]],
      ['Period Start UTC', overview.periodStartUtc],
      ['Period End UTC', overview.periodEndUtc],
      [isClient ? 'Total Spent' : 'Total Earnings', overview.totalAmount],
      [isClient ? 'Average Spending' : 'Average Earnings', overview.averageAmount],
      [isClient ? 'Paid' : 'Received', overview.progressAmount],
      ['Total Contract Value', overview.totalContractValue],
      ['Progress Percentage', overview.progressPercentage],
      ['Service Fee Paid', overview.totalServiceFeePaid],
      [],
      ['Trend'],
      ['Period', isClient ? 'Paid' : 'Received', 'Escrow Funded', 'Service Fee'],
      ...overview.trendPoints.map(point => [
        point.period,
        point.paidOrReceivedAmount,
        point.escrowFundedAmount,
        point.serviceFeeAmount,
      ]),
      [],
      ['Recent Transactions'],
      ['Date', 'Project', 'Category', 'Amount'],
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
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
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
            <h1>Financial Overview</h1>
            <p>
              {!overview
                ? 'Loading persisted project payments and service fees.'
                : isClient
                ? 'Actual spending, payment progress, escrow activity, and service fees.'
                : 'Actual earnings, payout progress, and service fees from accepted jobs.'}
              {' '}All amounts are shown in GigCoin.
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

        <div className="financial-range-tabs financial-overview-period-tabs" aria-label="Financial period">
          {PERIODS.map(item => (
            <button
              type="button"
              key={item}
              className={period === item ? 'active' : ''}
              onClick={() => setPeriod(item)}
              disabled={loading && period === item}
              title={PERIOD_LABELS[item]}
            >
              {item}
            </button>
          ))}
        </div>

        {loading && !overview ? (
          <section className="financial-overview-state">
            <Loader2 size={24} className="financial-overview-spin" />
            <strong>Loading financial data...</strong>
          </section>
        ) : error ? (
          <section className="financial-overview-state error">
            <AlertCircle size={24} />
            <strong>Financial data could not be loaded</strong>
            <p>{error}</p>
            <button type="button" onClick={() => setReloadKey(value => value + 1)}>
              <RefreshCw size={15} /> Retry
            </button>
          </section>
        ) : overview && isEmpty ? (
          <section className="financial-overview-state">
            <Wallet size={26} />
            <strong>No financial activity in the {periodLabel.toLowerCase()}</strong>
            <p>Project payments and service fees will appear here when transactions are completed.</p>
          </section>
        ) : overview ? (
          <>
            <section className={`financial-overview-stats ${loading ? 'is-refreshing' : ''}`}>
              {[
                {
                  label: isClient ? 'Total Spent' : 'Total Earnings',
                  value: formatGigCoin(overview.totalAmount),
                  icon: isClient ? <TrendingDown size={18} /> : <TrendingUp size={18} />,
                  tone: 'cyan',
                },
                {
                  label: isClient ? 'Average Spending' : 'Average Earnings',
                  value: formatGigCoin(overview.averageAmount),
                  icon: <TrendingUp size={18} />,
                  tone: 'green',
                },
                {
                  label: isClient ? 'Payment Progress' : 'Earnings Progress',
                  value: `${formatGigCoin(overview.progressAmount)} / ${formatGigCoin(overview.totalContractValue)} (${overview.progressPercentage}%)`,
                  icon: <ShieldCheck size={18} />,
                  tone: 'amber',
                },
                {
                  label: 'Service Fee Paid',
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
                    <h2>{isClient ? 'Payment Trends' : 'Earnings Trends'}</h2>
                    <p>Persisted project transactions from the {periodLabel.toLowerCase()}.</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={overview.trendPoints}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="period" tick={{ fill: '#8892A4', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#8892A4', fontSize: 12 }} tickFormatter={formatAxisAmount} />
                    <Tooltip formatter={(value) => formatGigCoin(Number(value))} contentStyle={{ background: '#0D1526', border: '1px solid rgba(0,119,255,0.25)', borderRadius: 10, color: 'white' }} />
                    <Bar dataKey="paidOrReceivedAmount" name={isClient ? 'Paid' : 'Received'} fill="#22C55E" radius={[6, 6, 0, 0]} />
                    {isClient && <Bar dataKey="escrowFundedAmount" name="Escrow Funded" fill="#F59E0B" radius={[6, 6, 0, 0]} />}
                    <Bar dataKey="serviceFeeAmount" name="Service Fee" fill="#9F4BFF" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="financial-chart-card">
                <div className="financial-chart-head">
                  <div>
                    <h2>{isClient ? 'Payment Progress' : 'Earnings Progress'}</h2>
                    <p>{formatGigCoin(overview.progressAmount)} of {formatGigCoin(overview.totalContractValue)}</p>
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
                  <div className="financial-chart-empty">No contract progress is available for this period.</div>
                )}
              </div>
            </section>

            <section className="financial-table-card">
              <div className="financial-chart-head">
                <div>
                  <h2>Recent Transactions</h2>
                  <p>Successful project wallet records from the selected period.</p>
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
                          {new Date(transaction.occurredAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
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
                <div className="financial-chart-empty">No project transactions in this period.</div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </AppLayout>
  );
}
