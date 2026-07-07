import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calendar, Download, Landmark, ShieldCheck, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  CLIENT_CASH_FLOW_RECORDS,
  formatGigCoinAmount,
  getQuarter,
  type ClientCashFlowRecord,
  type ClientCashFlowStatus,
} from '../mock/data-for-FinancialOverviewScreen';
import '../styles/financial-overview-screen.css';

type DateRange = 'month' | 'quarter' | 'year';

function getBucketLabel(record: ClientCashFlowRecord, range: DateRange, t: any) {
  const date = new Date(record.date);
  if (range === 'year') return String(date.getFullYear());
  if (range === 'quarter') return getQuarter(date);
  return date.toLocaleDateString(t('financialOverview.enUS'), { month: 'short', year: 'numeric' });
}

export default function FinancialOverviewScreen() {
  const { t } = useTranslation();
  const [dateRange, setDateRange] = useState<DateRange>('month');

  const STATUS_COLORS: Record<ClientCashFlowStatus, string> = {
    escrow: '#F59E0B',
    released: '#22C55E',
    spent: '#0077FF',
    subscription: '#9F4BFF',
  };

  const statusLabels: Record<ClientCashFlowStatus, string> = {
    escrow: t('financialOverview.inEscrow'),
    released: t('financialOverview.released'),
    spent: t('financialOverview.spent'),
    subscription: t('financialOverview.subscription'),
  };

  const stats = useMemo(() => {
    const totalSpent = CLIENT_CASH_FLOW_RECORDS
      .filter(record => record.status === 'spent' || record.status === 'subscription' || record.status === 'released')
      .reduce((sum, record) => sum + record.amountGigcoin, 0);
    const totalInEscrow = CLIENT_CASH_FLOW_RECORDS
      .filter(record => record.status === 'escrow')
      .reduce((sum, record) => sum + record.amountGigcoin, 0);
    const totalReleased = CLIENT_CASH_FLOW_RECORDS
      .filter(record => record.status === 'released')
      .reduce((sum, record) => sum + record.amountGigcoin, 0);
    const subscriptionCost = CLIENT_CASH_FLOW_RECORDS
      .filter(record => record.status === 'subscription')
      .reduce((sum, record) => sum + record.amountGigcoin, 0);

    return { totalSpent, totalInEscrow, totalReleased, subscriptionCost };
  }, []);

  const trendData = useMemo(() => {
    const buckets = new Map<string, { period: string; spent: number; escrow: number; released: number }>();
    CLIENT_CASH_FLOW_RECORDS.forEach(record => {
      const period = getBucketLabel(record, dateRange, t);
      const current = buckets.get(period) || { period, spent: 0, escrow: 0, released: 0 };
      if (record.status === 'escrow') current.escrow += record.amountGigcoin;
      if (record.status === 'released') current.released += record.amountGigcoin;
      if (record.status === 'spent' || record.status === 'subscription') current.spent += record.amountGigcoin;
      buckets.set(period, current);
    });
    return Array.from(buckets.values());
  }, [dateRange, t]);

  const statusBreakdown = useMemo(() => {
    return (Object.keys(statusLabels) as ClientCashFlowStatus[]).map(status => ({
      name: statusLabels[status],
      value: CLIENT_CASH_FLOW_RECORDS
        .filter(record => record.status === status)
        .reduce((sum, record) => sum + record.amountGigcoin, 0),
      color: STATUS_COLORS[status],
    })).filter(item => item.value > 0);
  }, [statusLabels]);

  return (
    <AppLayout>
      <div className="financial-overview-page">
        <header className="financial-overview-header">
          <div>
            <div className="financial-overview-kicker">
              <Landmark size={18} />
              {t('financialOverview.clientFinance')}
            </div>
            <h1>{t('financialOverview.title')}</h1>
            <p>{t('financialOverview.subtitle')}</p>
          </div>
          <button type="button" className="financial-overview-export">
            <Download size={16} />
            {t('financialOverview.export')}
          </button>
        </header>

        <section className="financial-overview-stats">
          {[
            { label: t('financialOverview.totalSpent'), value: formatGigCoinAmount(stats.totalSpent), icon: <TrendingDown size={18} />, tone: 'cyan' },
            { label: t('financialOverview.totalInEscrow'), value: formatGigCoinAmount(stats.totalInEscrow), icon: <ShieldCheck size={18} />, tone: 'amber' },
            { label: t('financialOverview.totalReleased'), value: formatGigCoinAmount(stats.totalReleased), icon: <TrendingUp size={18} />, tone: 'green' },
            { label: t('financialOverview.subscriptions'), value: formatGigCoinAmount(stats.subscriptionCost), icon: <Wallet size={18} />, tone: 'purple' },
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
                <h2>{t('financialOverview.cashFlowTrends')}</h2>
                <p>{t('financialOverview.aggregatedRecords')}</p>
              </div>
              <div className="financial-range-tabs">
                {(['month', 'quarter', 'year'] as DateRange[]).map(range => (
                  <button key={range} className={dateRange === range ? 'active' : ''} onClick={() => setDateRange(range)}>
                    {t(`financialOverview.${range}`)}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                <XAxis dataKey="period" tick={{ fill: '#8892A4', fontSize: 12 }} />
                <YAxis tick={{ fill: '#8892A4', fontSize: 12 }} tickFormatter={value => `${Number(value) / 1000000}M`} />
                <Tooltip formatter={(value: number) => formatGigCoinAmount(value)} contentStyle={{ background: '#0D1526', border: '1px solid rgba(0,119,255,0.25)', borderRadius: 10, color: 'white' }} />
                <Bar dataKey="spent" name={t('financialOverview.spent')} fill="#0077FF" radius={[6, 6, 0, 0]} />
                <Bar dataKey="escrow" name={t('financialOverview.inEscrow')} fill="#F59E0B" radius={[6, 6, 0, 0]} />
                <Bar dataKey="released" name={t('financialOverview.released')} fill="#22C55E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="financial-chart-card">
            <div className="financial-chart-head">
              <div>
                <h2>{t('financialOverview.allocation')}</h2>
                <p>{t('financialOverview.allocationSubtitle')}</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusBreakdown} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92}>
                  {statusBreakdown.map(item => <Cell key={item.name} fill={item.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => formatGigCoinAmount(value)} contentStyle={{ background: '#0D1526', border: '1px solid rgba(159,75,255,0.25)', borderRadius: 10, color: 'white' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="financial-legend">
              {statusBreakdown.map(item => (
                <span key={item.name}><i style={{ background: item.color }} />{item.name}</span>
              ))}
            </div>
          </div>
        </section>

        <section className="financial-table-card">
          <div className="financial-chart-head">
            <div>
              <h2>{t('financialOverview.recentTransactions')}</h2>
              <p>{t('financialOverview.transactionsSubtitle')}</p>
            </div>
          </div>
          <div className="financial-transaction-list">
            {CLIENT_CASH_FLOW_RECORDS.slice().reverse().map(record => (
              <article key={record.id}>
                <div>
                  <strong>{record.label}</strong>
                  <span><Calendar size={13} /> {new Date(record.date).toLocaleDateString('vi-VN')} · {record.project}</span>
                </div>
                <span className={`financial-status ${record.status}`}>{statusLabels[record.status]}</span>
                <b>{formatGigCoinAmount(record.amountGigcoin)}</b>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
