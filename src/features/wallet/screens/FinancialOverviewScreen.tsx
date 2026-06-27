import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Calendar, Download, Landmark, ShieldCheck, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import {
  CLIENT_CASH_FLOW_RECORDS,
  formatGigCoinAmount,
  getQuarter,
  type ClientCashFlowRecord,
  type ClientCashFlowStatus,
} from '../mock/data-for-FinancialOverviewScreen';
import '../styles/financial-overview-screen.css';

type DateRange = 'month' | 'quarter' | 'year';

const STATUS_LABELS: Record<ClientCashFlowStatus, string> = {
  escrow: 'In Escrow',
  released: 'Released',
  spent: 'Spent',
  subscription: 'Subscription',
};

const STATUS_COLORS: Record<ClientCashFlowStatus, string> = {
  escrow: '#F59E0B',
  released: '#22C55E',
  spent: '#0077FF',
  subscription: '#9F4BFF',
};

function getBucketLabel(record: ClientCashFlowRecord, range: DateRange) {
  const date = new Date(record.date);
  if (range === 'year') return String(date.getFullYear());
  if (range === 'quarter') return getQuarter(date);
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export default function FinancialOverviewScreen() {
  const [dateRange, setDateRange] = useState<DateRange>('month');

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
      const period = getBucketLabel(record, dateRange);
      const current = buckets.get(period) || { period, spent: 0, escrow: 0, released: 0 };
      if (record.status === 'escrow') current.escrow += record.amountGigcoin;
      if (record.status === 'released') current.released += record.amountGigcoin;
      if (record.status === 'spent' || record.status === 'subscription') current.spent += record.amountGigcoin;
      buckets.set(period, current);
    });
    return Array.from(buckets.values());
  }, [dateRange]);

  const statusBreakdown = useMemo(() => {
    return (Object.keys(STATUS_LABELS) as ClientCashFlowStatus[]).map(status => ({
      name: STATUS_LABELS[status],
      value: CLIENT_CASH_FLOW_RECORDS
        .filter(record => record.status === status)
        .reduce((sum, record) => sum + record.amountGigcoin, 0),
      color: STATUS_COLORS[status],
    })).filter(item => item.value > 0);
  }, []);

  return (
    <AppLayout>
      <div className="financial-overview-page">
        <header className="financial-overview-header">
          <div>
            <div className="financial-overview-kicker">
              <Landmark size={18} />
              Client Finance
            </div>
            <h1>Financial Overview</h1>
            <p>Cash flow statistics for planning, escrow visibility, and released project payments. All amounts are shown in GigCoin.</p>
          </div>
          <button type="button" className="financial-overview-export">
            <Download size={16} />
            Export
          </button>
        </header>

        <section className="financial-overview-stats">
          {[
            { label: 'Total Spent', value: formatGigCoinAmount(stats.totalSpent), icon: <TrendingDown size={18} />, tone: 'cyan' },
            { label: 'Total In Escrow', value: formatGigCoinAmount(stats.totalInEscrow), icon: <ShieldCheck size={18} />, tone: 'amber' },
            { label: 'Total Released', value: formatGigCoinAmount(stats.totalReleased), icon: <TrendingUp size={18} />, tone: 'green' },
            { label: 'Subscriptions', value: formatGigCoinAmount(stats.subscriptionCost), icon: <Wallet size={18} />, tone: 'purple' },
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
                <h2>Cash Flow Trends</h2>
                <p>Aggregated from real-time transaction records.</p>
              </div>
              <div className="financial-range-tabs">
                {(['month', 'quarter', 'year'] as DateRange[]).map(range => (
                  <button key={range} className={dateRange === range ? 'active' : ''} onClick={() => setDateRange(range)}>
                    {range}
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
                <Bar dataKey="spent" name="Spent" fill="#0077FF" radius={[6, 6, 0, 0]} />
                <Bar dataKey="escrow" name="In Escrow" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                <Bar dataKey="released" name="Released" fill="#22C55E" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="financial-chart-card">
            <div className="financial-chart-head">
              <div>
                <h2>Allocation</h2>
                <p>Current cash flow composition.</p>
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
              <h2>Recent Transactions</h2>
              <p>Read-only records used for the summary cards and charts.</p>
            </div>
          </div>
          <div className="financial-transaction-list">
            {CLIENT_CASH_FLOW_RECORDS.slice().reverse().map(record => (
              <article key={record.id}>
                <div>
                  <strong>{record.label}</strong>
                  <span><Calendar size={13} /> {new Date(record.date).toLocaleDateString('vi-VN')} · {record.project}</span>
                </div>
                <span className={`financial-status ${record.status}`}>{STATUS_LABELS[record.status]}</span>
                <b>{formatGigCoinAmount(record.amountGigcoin)}</b>
              </article>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
