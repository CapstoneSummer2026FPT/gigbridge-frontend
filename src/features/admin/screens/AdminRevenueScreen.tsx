import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router';
import { TrendingUp, Wallet, CreditCard, Search, Download, RefreshCw, Calendar, ArrowUpRight, ArrowDownRight, Eye, CheckCircle, XCircle, Clock, AlertCircle, Ban, RotateCw, Plus, Percent, ShieldCheck } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DB } from '../../../mock_backend';
import '../styles/admin-users-screen.css';
import '../styles/admin-revenue-screen.css';

type TabType = 'system' | 'overview' | 'wallets' | 'subscriptions' | 'transactions';
type TransactionFilter = 'all' | 'deposit' | 'withdrawal' | 'subscription' | 'refund';
type SubscriptionFilter = 'all' | 'active' | 'expired' | 'cancelled' | 'pending';
type SubscriptionAction = 'cancel' | 'extend' | 'renew';

// Mock data
const REVENUE_DATA = [
  { date: '2024-05-10', revenue: 12450, subscriptions: 145, deposits: 8200 },
  { date: '2024-05-11', revenue: 15680, subscriptions: 178, deposits: 9500 },
  { date: '2024-05-12', revenue: 14200, subscriptions: 165, deposits: 8800 },
  { date: '2024-05-13', revenue: 18900, subscriptions: 212, deposits: 11200 },
  { date: '2024-05-14', revenue: 16700, subscriptions: 189, deposits: 10100 },
  { date: '2024-05-15', revenue: 21300, subscriptions: 234, deposits: 12800 },
  { date: '2024-05-16', revenue: 24500, subscriptions: 267, deposits: 15200 },
];

const SUBSCRIPTION_DISTRIBUTION = [
  { name: 'Free', value: 68, color: '#8892A4' },
  { name: 'Pro Monthly', value: 22, color: '#9F4BFF' },
  { name: 'Pro Yearly', value: 10, color: '#0077FF' },
];

const MOCK_WALLETS = [
  {
    id: 'wal_1',
    userId: 'user_client_1',
    userName: 'John Doe',
    balance: 2450.50,
    currency: 'G-coin',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-05-16T14:30:00Z',
  },
  {
    id: 'wal_2',
    userId: 'user_freelancer_1',
    userName: 'Sarah Smith',
    balance: 5780.25,
    currency: 'G-coin',
    createdAt: '2024-02-20T09:00:00Z',
    updatedAt: '2024-05-16T13:45:00Z',
  },
  {
    id: 'wal_3',
    userId: 'user_client_2',
    userName: 'Tech Corp',
    balance: 12300.00,
    currency: 'G-coin',
    createdAt: '2024-01-10T11:30:00Z',
    updatedAt: '2024-05-16T12:20:00Z',
  },
];

const MOCK_SUBSCRIPTIONS = [
  {
    id: 'sub_1',
    userId: 'user_client_1',
    userName: 'John Doe',
    type: 'Pro' as const,
    amount: 29.99,
    duration: 'monthly' as const,
    status: 'active' as const,
    description: 'Pro Monthly Subscription',
    createdAt: '2024-05-01T10:00:00Z',
    renewsAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 'sub_2',
    userId: 'user_freelancer_2',
    userName: 'Sarah Designer',
    type: 'Pro' as const,
    amount: 299.99,
    duration: 'yearly' as const,
    status: 'active' as const,
    description: 'Pro Yearly Subscription',
    createdAt: '2024-01-15T09:00:00Z',
    renewsAt: '2025-01-15T09:00:00Z',
  },
  {
    id: 'sub_3',
    userId: 'user_client_3',
    userName: 'Tech Startup',
    type: 'Pro' as const,
    amount: 29.99,
    duration: 'monthly' as const,
    status: 'expired' as const,
    description: 'Pro Monthly Subscription',
    createdAt: '2024-03-01T11:00:00Z',
    expiredAt: '2024-05-01T11:00:00Z',
  },
  {
    id: 'sub_4',
    userId: 'user_freelancer_4',
    userName: 'Developer Pro',
    type: 'Free' as const,
    amount: 0,
    duration: 'monthly' as const,
    status: 'active' as const,
    description: 'Free Plan',
    createdAt: '2024-04-10T08:00:00Z',
  },
];

const MOCK_TRANSACTIONS = [
  {
    id: 'trans_1',
    walletId: 'wal_1',
    subscriptionId: 'sub_1',
    userId: 'user_client_1',
    userName: 'John Doe',
    type: 'subscription' as const,
    amount: 29.99,
    currency: 'G-coin',
    status: 'completed' as const,
    description: 'Pro Monthly Subscription Payment',
    createdAt: '2024-05-01T10:00:00Z',
    completedAt: '2024-05-01T10:00:05Z',
  },
  {
    id: 'trans_2',
    walletId: 'wal_2',
    userId: 'user_freelancer_1',
    userName: 'Sarah Smith',
    type: 'deposit' as const,
    amount: 500.00,
    currency: 'G-coin',
    status: 'completed' as const,
    description: 'Wallet deposit via credit card',
    createdAt: '2024-05-16T13:45:00Z',
    completedAt: '2024-05-16T13:45:10Z',
  },
  {
    id: 'trans_3',
    walletId: 'wal_3',
    userId: 'user_client_2',
    userName: 'Tech Corp',
    type: 'withdrawal' as const,
    amount: 1200.00,
    currency: 'G-coin',
    status: 'completed' as const,
    description: 'Withdrawal to bank account',
    createdAt: '2024-05-15T14:20:00Z',
    completedAt: '2024-05-15T14:25:30Z',
  },
  {
    id: 'trans_4',
    walletId: 'wal_1',
    userId: 'user_client_1',
    userName: 'John Doe',
    type: 'deposit' as const,
    amount: 250.00,
    currency: 'G-coin',
    status: 'pending' as const,
    description: 'Wallet deposit via PayPal',
    createdAt: '2024-05-16T15:00:00Z',
  },
  {
    id: 'trans_5',
    walletId: 'wal_2',
    subscriptionId: 'sub_2',
    userId: 'user_freelancer_2',
    userName: 'Sarah Designer',
    type: 'refund' as const,
    amount: 29.99,
    currency: 'G-coin',
    status: 'completed' as const,
    description: 'Refund for cancelled subscription',
    createdAt: '2024-05-14T11:30:00Z',
    completedAt: '2024-05-14T11:35:00Z',
  },
];

const SYSTEM_FINANCE_ALERTS = [
  {
    id: 'fin_alert_1',
    severity: 'warning',
    title: 'Escrow concentration is elevated',
    description: 'Top 3 active contracts currently hold 64% of total escrow. Review for settlement delay.',
    createdAt: '2026-06-03T08:30:00Z',
  },
  {
    id: 'fin_alert_2',
    severity: 'info',
    title: 'Commission rate changed recently',
    description: 'Commission policy update will apply to future transactions only per BR-64.',
    createdAt: '2026-06-02T15:10:00Z',
  },
  {
    id: 'fin_alert_3',
    severity: 'critical',
    title: 'Pending proof requires verification',
    description: 'One pending deposit has been waiting longer than the expected admin verification window.',
    createdAt: '2026-06-01T12:20:00Z',
  },
];

const SYSTEM_FINANCE_AUDIT_LOG = [
  { id: 'audit_fin_1', actor: 'Admin', action: 'Commission rate reviewed', detail: 'Reviewed current commission policy at 10%', createdAt: '2026-06-03T09:00:00Z' },
  { id: 'audit_fin_2', actor: 'System', action: 'Financial anomaly generated', detail: 'Escrow concentration alert created', createdAt: '2026-06-03T08:30:00Z' },
  { id: 'audit_fin_3', actor: 'Admin', action: 'Revenue export generated', detail: 'Downloaded platform finance report', createdAt: '2026-06-02T16:45:00Z' },
];

export default function AdminRevenueScreen() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>(
    location.pathname.includes('system-finance') ? 'system' : 'overview'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  const [subscriptionFilter, setSubscriptionFilter] = useState<SubscriptionFilter>('all');
  const [viewTransaction, setViewTransaction] = useState<typeof MOCK_TRANSACTIONS[0] | null>(null);
  const [subscriptionAction, setSubscriptionAction] = useState<{ action: SubscriptionAction; subscription: typeof MOCK_SUBSCRIPTIONS[0] } | null>(null);
  const [extendMonths, setExtendMonths] = useState(1);
  const [commissionRate, setCommissionRate] = useState('10');
  const [commissionError, setCommissionError] = useState<string | null>(null);
  const [commissionSuccess, setCommissionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (location.pathname.includes('system-finance')) {
      setActiveTab('system');
    }
  }, [location.pathname]);

  const stats = useMemo(() => {
    const totalRevenue = REVENUE_DATA[REVENUE_DATA.length - 1].revenue;
    const totalWalletBalance = MOCK_WALLETS.reduce((sum, w) => sum + w.balance, 0);
    const activeSubscriptions = MOCK_SUBSCRIPTIONS.filter(s => s.status === 'active').length;
    const totalTransactions = MOCK_TRANSACTIONS.length;
    const pendingTransactions = MOCK_TRANSACTIONS.filter(t => t.status === 'pending').length;
    const monthlyRecurring = MOCK_SUBSCRIPTIONS.filter(s => s.status === 'active' && s.type === 'Pro').reduce((sum, s) => sum + (s.duration === 'monthly' ? s.amount : s.amount / 12), 0);

    return { totalRevenue, totalWalletBalance, activeSubscriptions, totalTransactions, pendingTransactions, monthlyRecurring };
  }, []);

  const systemFinanceSummary = useMemo(() => {
    const totalPlatformBalance = MOCK_WALLETS.reduce((sum, wallet) => sum + wallet.balance, 0);
    const totalEscrowHeld = 18400;
    const completedRevenue = MOCK_TRANSACTIONS
      .filter(transaction => transaction.status === 'completed')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalCommissions = completedRevenue * (Number(commissionRate || 0) / 100);

    return {
      totalPlatformBalance,
      totalEscrowHeld,
      totalCommissions,
      pendingVerification: MOCK_TRANSACTIONS.filter(transaction => transaction.status === 'pending').length,
    };
  }, [commissionRate]);

  const filteredTransactions = useMemo(() => {
    return MOCK_TRANSACTIONS.filter(trans => {
      const matchesSearch = searchQuery === '' ||
        trans.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trans.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = transactionFilter === 'all' || trans.type === transactionFilter;

      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, transactionFilter]);

  const filteredSubscriptions = useMemo(() => {
    return MOCK_SUBSCRIPTIONS.filter(sub => {
      const matchesSearch = searchQuery === '' ||
        sub.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter = subscriptionFilter === 'all' || sub.status === subscriptionFilter;

      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, subscriptionFilter]);

  const getStatusBadge = (status: string) => {
    if (status === 'completed' || status === 'active') return <span className="badge-green text-xs">Completed</span>;
    if (status === 'pending') return <span className="badge-amber text-xs">Pending</span>;
    if (status === 'failed' || status === 'expired') return <span className="badge-red text-xs">Failed</span>;
    return <span className="badge-gray text-xs">Cancelled</span>;
  };

  const getTransactionTypeBadge = (type: string) => {
    if (type === 'deposit') return <span className="badge-green text-xs">Deposit</span>;
    if (type === 'withdrawal') return <span className="badge-red text-xs">Withdrawal</span>;
    if (type === 'subscription') return <span className="badge-purple text-xs">Subscription</span>;
    return <span className="badge-cyan text-xs">Refund</span>;
  };

  const getSubscriptionTypeBadge = (type: string, duration: string) => {
    if (type === 'Free') return <span className="badge-gray text-xs">Free</span>;
    return duration === 'monthly'
      ? <span className="badge-purple text-xs">Pro Monthly</span>
      : <span className="badge-cyan text-xs">Pro Yearly</span>;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleSubscriptionAction = () => {
    if (!subscriptionAction) return;

    const { action, subscription } = subscriptionAction;

    // Here you would make API call to backend
    console.log(`${action} subscription ${subscription.id}`);

    if (action === 'extend' || action === 'renew') {
      console.log(`Extending by ${extendMonths} months`);
    }

    // Close modal and reset
    setSubscriptionAction(null);
    setExtendMonths(1);
  };

  const handleSaveCommission = () => {
    const parsedRate = Number(commissionRate);
    setCommissionSuccess(null);

    if (Number.isNaN(parsedRate) || parsedRate < 0 || parsedRate > 100) {
      setCommissionError('MSG75: Commission rate must be between 0% and 100%.');
      return;
    }

    setCommissionError(null);
    setCommissionSuccess('Commission rate saved. Changes apply to future transactions only and were logged to Audit Log.');
  };

  return (
    <AppLayout>
      <div className="admin-revenue-screen w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <GCoinIcon size={20} />
                <span className="badge-green text-xs">Revenue Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">Revenue & Finance</h1>
              <p className="text-sm text-secondary mt-1">Monitor revenue, subscriptions, and transactions</p>
            </div>
            <div className="flex gap-2">
              <button className="btn-ghost-cyan px-3 py-2 text-xs sm:text-sm flex items-center gap-2">
                <RefreshCw size={14} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button className="btn-cyan px-3 py-2 text-xs sm:text-sm flex items-center gap-2">
                <Download size={14} />
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="revenue-stats-grid mb-6 sm:mb-8">
            {[
              { label: 'Total Revenue', value: `${stats.totalRevenue.toLocaleString()} G-coin`, icon: <TrendingUp size={16} />, color: 'green', trend: '+12%' },
              { label: 'Wallet Balance', value: `${stats.totalWalletBalance.toLocaleString()} G-coin`, icon: <Wallet size={16} />, color: 'cyan', trend: '+8%' },
              { label: 'Active Subs', value: stats.activeSubscriptions.toString(), icon: <CreditCard size={16} />, color: 'purple', trend: '+15' },
              { label: 'Transactions', value: stats.totalTransactions.toString(), icon: <GCoinIcon size={16} />, color: 'amber', trend: '+23' },
              { label: 'Pending', value: stats.pendingTransactions.toString(), icon: <Clock size={16} />, color: 'amber', trend: '2' },
              { label: 'Monthly MRR', value: `${stats.monthlyRecurring.toFixed(0)} G-coin`, icon: <TrendingUp size={16} />, color: 'green', trend: '+180 G-coin' },
            ].map(stat => (
              <div key={stat.label} className="revenue-stat-card">
                <div className="revenue-stat-header">
                  <p className="revenue-stat-label">{stat.label}</p>
                  <span className={`revenue-stat-icon icon-${stat.color}`}>{stat.icon}</span>
                </div>
                <p className="revenue-stat-value">{stat.value}</p>
                <p className="revenue-stat-trend">{stat.trend}</p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { id: 'system', label: 'System Finance', icon: <ShieldCheck size={14} /> },
              { id: 'overview', label: 'Overview', icon: <TrendingUp size={14} /> },
              { id: 'wallets', label: 'Wallets', icon: <Wallet size={14} /> },
              { id: 'subscriptions', label: 'Subscriptions', icon: <CreditCard size={14} /> },
              { id: 'transactions', label: 'Transactions', icon: <GCoinIcon size={14} /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-green/20 text-green border border-green'
                    : 'glass-button text-secondary hover:text-primary'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'system' && (
            <div className="system-finance-panel">
              <section className="system-finance-hero">
                <div>
                  <p className="system-finance-kicker">Admin Portal</p>
                  <h2>System Finance</h2>
                  <p>
                    Monitor platform-wide balances, escrow exposure, commission revenue, and finance anomalies.
                  </p>
                </div>
                <div className="system-finance-policy">
                  <ShieldCheck size={20} />
                  <span>Admins cannot directly modify user wallet balances from this page.</span>
                </div>
              </section>

              <section className="system-finance-summary-grid">
                <div className="system-finance-card">
                  <span>Total Platform Balance</span>
                  <strong>{systemFinanceSummary.totalPlatformBalance.toLocaleString()} G-coin</strong>
                  <small>Across all user wallets</small>
                </div>
                <div className="system-finance-card">
                  <span>Total Escrow Held</span>
                  <strong>{systemFinanceSummary.totalEscrowHeld.toLocaleString()} G-coin</strong>
                  <small>Funds reserved for active contracts</small>
                </div>
                <div className="system-finance-card">
                  <span>Total Commissions</span>
                  <strong>{systemFinanceSummary.totalCommissions.toFixed(2)} G-coin</strong>
                  <small>Estimated from completed transactions</small>
                </div>
                <div className="system-finance-card">
                  <span>Pending Verification</span>
                  <strong>{systemFinanceSummary.pendingVerification}</strong>
                  <small>Manual finance review queue</small>
                </div>
              </section>

              <section className="system-finance-grid">
                <div className="commission-card">
                  <div className="commission-card-header">
                    <div>
                      <p className="system-finance-kicker">BR-64 Configuration</p>
                      <h3>Commission Fee Percentage</h3>
                    </div>
                    <Percent size={22} />
                  </div>

                  <label className="commission-label" htmlFor="commissionRate">
                    Commission rate
                  </label>
                  <div className="commission-input-row">
                    <input
                      id="commissionRate"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={commissionRate}
                      onChange={(event) => {
                        setCommissionRate(event.target.value);
                        setCommissionError(null);
                        setCommissionSuccess(null);
                      }}
                      className="commission-input"
                    />
                    <span>%</span>
                    <button onClick={handleSaveCommission} className="commission-save-btn">
                      <CheckCircle size={16} />
                      Save Rate
                    </button>
                  </div>

                  {commissionError && (
                    <div className="system-finance-message error">
                      <AlertCircle size={16} />
                      <span>{commissionError}</span>
                    </div>
                  )}
                  {commissionSuccess && (
                    <div className="system-finance-message success">
                      <CheckCircle size={16} />
                      <span>{commissionSuccess}</span>
                    </div>
                  )}

                  <div className="commission-rule-note">
                    <strong>Business rule:</strong> Commission changes apply to future transactions only. Every saved change is written to Audit Log.
                  </div>
                </div>

                <div className="finance-alerts-card">
                  <div className="commission-card-header">
                    <div>
                      <p className="system-finance-kicker">Monitoring</p>
                      <h3>Financial Alerts & Anomalies</h3>
                    </div>
                    <AlertCircle size={22} />
                  </div>

                  <div className="finance-alert-list">
                    {SYSTEM_FINANCE_ALERTS.map(alert => (
                      <div key={alert.id} className={`finance-alert-item ${alert.severity}`}>
                        <div>
                          <strong>{alert.title}</strong>
                          <p>{alert.description}</p>
                        </div>
                        <span>{formatDate(alert.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="finance-audit-card">
                <div className="commission-card-header">
                  <div>
                    <p className="system-finance-kicker">Audit Log</p>
                    <h3>Configuration Change History</h3>
                  </div>
                  <Clock size={22} />
                </div>

                <div className="finance-audit-list">
                  {SYSTEM_FINANCE_AUDIT_LOG.map(log => (
                    <div key={log.id} className="finance-audit-item">
                      <span>{formatDate(log.createdAt)}</span>
                      <strong>{log.action}</strong>
                      <p>{log.detail}</p>
                      <small>by {log.actor}</small>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Revenue Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="font-semibold text-primary">Revenue Trend (7 Days)</h3>
                    <span className="badge-green text-xs">+18%</span>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={REVENUE_DATA}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k G-coin`} />
                      <Tooltip contentStyle={{ background: '#0D1526', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 10, color: 'white' }} formatter={(v: number) => [`${v.toLocaleString()} G-coin`, 'Revenue']} />
                      <Area type="monotone" dataKey="revenue" stroke="#22C55E" strokeWidth={2} fill="url(#revenueGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div className="glass-card p-6">
                  <h3 className="font-semibold text-primary mb-5">Subscription Distribution</h3>
                  <div className="flex items-center gap-8">
                    <div className="flex-shrink-0">
                      <PieChart width={180} height={180}>
                        <Pie data={SUBSCRIPTION_DISTRIBUTION} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value">
                          {SUBSCRIPTION_DISTRIBUTION.map((entry, i) => (
                            <Cell key={`cell-${i}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </div>
                    <div className="flex-1 space-y-3">
                      {SUBSCRIPTION_DISTRIBUTION.map(item => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                            <span className="text-sm text-primary">{item.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-primary">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Revenue Breakdown */}
              <div className="glass-card p-6">
                <h3 className="font-semibold text-primary mb-5">Revenue Breakdown (7 Days)</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={REVENUE_DATA}>
                    <XAxis dataKey="date" tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#8892A4', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k G-coin`} />
                    <Tooltip contentStyle={{ background: '#0D1526', border: '1px solid rgba(159,75,255,0.3)', borderRadius: 10, color: 'white' }} />
                    <Bar key="bar-subscriptions" dataKey="subscriptions" fill="#9F4BFF" radius={[4, 4, 0, 0]} name="Subscriptions" />
                    <Bar key="bar-deposits" dataKey="deposits" fill="#0077FF" radius={[4, 4, 0, 0]} name="Deposits" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Wallets Tab */}
          {activeTab === 'wallets' && (
            <div className="space-y-4">
              {/* Search */}
              <div className="glass-card p-4">
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search wallets..."
                    className="input-gb w-full py-2.5 text-sm"
                    style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                  />
                </div>
              </div>

              {/* Wallets List */}
              <div className="space-y-3">
                {MOCK_WALLETS.map(wallet => (
                  <div key={wallet.id} className="glass-card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan to-purple flex items-center justify-center">
                          <Wallet size={20} className="text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{wallet.userName}</p>
                          <p className="text-xs text-muted">ID: {wallet.id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green flex items-center justify-end gap-1"><GCoinIcon size={20} />{wallet.balance.toLocaleString()}</p>
                        <p className="text-xs text-muted">{wallet.currency}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs pt-3 border-t border-white/5">
                      <div>
                        <p className="text-muted mb-1">Created</p>
                        <p className="text-primary">{formatDate(wallet.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-muted mb-1">Last Updated</p>
                        <p className="text-primary">{formatDate(wallet.updatedAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subscriptions Tab */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="glass-card p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search subscriptions..."
                      className="input-gb w-full py-2.5 text-sm"
                      style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                    />
                  </div>
                  <select
                    value={subscriptionFilter}
                    onChange={e => setSubscriptionFilter(e.target.value as SubscriptionFilter)}
                    className="input-gb px-4 py-2.5 text-sm cursor-pointer"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>

              {/* Subscriptions List */}
              <div className="space-y-3">
                {filteredSubscriptions.map(sub => (
                  <div key={sub.id} className="glass-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-bold text-primary">{sub.userName}</p>
                          {getSubscriptionTypeBadge(sub.type, sub.duration)}
                          {getStatusBadge(sub.status)}
                        </div>
                        <p className="text-sm text-secondary mb-2">{sub.description}</p>
                        <p className="text-xs text-muted">ID: {sub.id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green flex items-center justify-end gap-1"><GCoinIcon size={20} />{sub.amount}</p>
                        <p className="text-xs text-muted capitalize">{sub.duration}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs pt-3 pb-3 border-t border-white/5">
                      <div>
                        <p className="text-muted mb-1">Created</p>
                        <p className="text-primary">{formatDate(sub.createdAt)}</p>
                      </div>
                      <div>
                        <p className="text-muted mb-1">{sub.renewsAt ? 'Renews' : 'Expired'}</p>
                        <p className="text-primary">{formatDate(sub.renewsAt || sub.expiredAt || sub.createdAt)}</p>
                      </div>
                    </div>
                    {/* Action Buttons */}
                    {sub.type !== 'Free' && (
                      <div className="flex gap-2 pt-3 border-t border-white/5">
                        {sub.status === 'active' && (
                          <>
                            <button
                              onClick={() => setSubscriptionAction({ action: 'extend', subscription: sub })}
                              className="btn-ghost-cyan px-3 py-1.5 text-xs flex items-center gap-1.5 flex-1"
                            >
                              <Plus size={14} />
                              Extend
                            </button>
                            <button
                              onClick={() => setSubscriptionAction({ action: 'cancel', subscription: sub })}
                              className="btn-ghost-red px-3 py-1.5 text-xs flex items-center gap-1.5 flex-1"
                            >
                              <Ban size={14} />
                              Cancel
                            </button>
                          </>
                        )}
                        {(sub.status === 'expired' || sub.status === 'cancelled') && (
                          <button
                            onClick={() => setSubscriptionAction({ action: 'renew', subscription: sub })}
                            className="btn-ghost-green px-3 py-1.5 text-xs flex items-center gap-1.5 w-full"
                          >
                            <RotateCw size={14} />
                            Renew Subscription
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transactions Tab */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="glass-card p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search transactions..."
                      className="input-gb w-full py-2.5 text-sm"
                      style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                    />
                  </div>
                  <select
                    value={transactionFilter}
                    onChange={e => setTransactionFilter(e.target.value as TransactionFilter)}
                    className="input-gb px-4 py-2.5 text-sm cursor-pointer"
                  >
                    <option value="all">All Types</option>
                    <option value="deposit">Deposit</option>
                    <option value="withdrawal">Withdrawal</option>
                    <option value="subscription">Subscription</option>
                    <option value="refund">Refund</option>
                  </select>
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-3">
                {filteredTransactions.map(trans => (
                  <div key={trans.id} className="glass-card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-sm font-bold text-primary">{trans.userName}</p>
                          {getTransactionTypeBadge(trans.type)}
                          {getStatusBadge(trans.status)}
                        </div>
                        <p className="text-sm text-secondary mb-1">{trans.description}</p>
                        <p className="text-xs text-muted">ID: {trans.id}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold flex items-center justify-end gap-1 ${trans.type === 'deposit' || trans.type === 'refund' ? 'text-green' : 'text-red'}`}>
                          {trans.type === 'deposit' || trans.type === 'refund' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                          <GCoinIcon size={20} />
                          {trans.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted">{trans.currency}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-white/5">
                      <p className="text-xs text-muted">{formatDate(trans.createdAt)}</p>
                      <button
                        onClick={() => setViewTransaction(trans)}
                        className="text-xs text-cyan hover:underline flex items-center gap-1"
                      >
                        <Eye size={12} />
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transaction Detail Modal */}
          {viewTransaction && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewTransaction(null)}>
              <div className="glass-card max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-primary">Transaction Details</h2>
                  <button
                    onClick={() => setViewTransaction(null)}
                    className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                  >
                    <XCircle size={20} className="text-red" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Transaction Info */}
                  <div className="glass-card p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {getTransactionTypeBadge(viewTransaction.type)}
                          {getStatusBadge(viewTransaction.status)}
                        </div>
                        <p className="text-sm text-secondary">{viewTransaction.description}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-3xl font-bold flex items-center justify-end gap-1 ${viewTransaction.type === 'deposit' || viewTransaction.type === 'refund' ? 'text-green' : 'text-red'}`}>
                          <GCoinIcon size={24} />
                          {viewTransaction.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted">{viewTransaction.currency}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted mb-1">Transaction ID</p>
                        <p className="text-primary font-mono text-xs">{viewTransaction.id}</p>
                      </div>
                      <div>
                        <p className="text-muted mb-1">Wallet ID</p>
                        <p className="text-primary font-mono text-xs">{viewTransaction.walletId}</p>
                      </div>
                      {viewTransaction.subscriptionId && (
                        <div className="col-span-2">
                          <p className="text-muted mb-1">Subscription ID</p>
                          <p className="text-primary font-mono text-xs">{viewTransaction.subscriptionId}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-muted mb-1">User</p>
                        <p className="text-primary">{viewTransaction.userName}</p>
                      </div>
                      <div>
                        <p className="text-muted mb-1">User ID</p>
                        <p className="text-primary font-mono text-xs">{viewTransaction.userId}</p>
                      </div>
                      <div>
                        <p className="text-muted mb-1">Created At</p>
                        <p className="text-primary">{formatDate(viewTransaction.createdAt)}</p>
                      </div>
                      {viewTransaction.completedAt && (
                        <div>
                          <p className="text-muted mb-1">Completed At</p>
                          <p className="text-primary">{formatDate(viewTransaction.completedAt)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setViewTransaction(null)}
                    className="btn-ghost-cyan px-6 py-2"
                  >
                    Close
                  </button>
                  <button className="btn-cyan px-6 py-2 flex items-center gap-2">
                    <Download size={16} />
                    Download Receipt
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Action Modal */}
          {subscriptionAction && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSubscriptionAction(null)}>
              <div className="glass-card max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
                {/* Cancel Confirmation */}
                {subscriptionAction.action === 'cancel' && (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-red/20 flex items-center justify-center">
                          <Ban size={24} className="text-red" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-primary">Cancel Subscription</h2>
                          <p className="text-xs text-muted">This action cannot be undone</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSubscriptionAction(null)}
                        className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                      >
                        <XCircle size={20} className="text-red" />
                      </button>
                    </div>

                    <div className="glass-card p-5 mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-bold text-primary mb-1">{subscriptionAction.subscription.userName}</p>
                          <p className="text-xs text-secondary">{subscriptionAction.subscription.description}</p>
                        </div>
                        {getSubscriptionTypeBadge(subscriptionAction.subscription.type, subscriptionAction.subscription.duration)}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-white/5">
                        <div>
                          <p className="text-muted mb-1">Amount</p>
                          <p className="text-primary font-bold flex items-center gap-1"><GCoinIcon size={14} />{subscriptionAction.subscription.amount}</p>
                        </div>
                        <div>
                          <p className="text-muted mb-1">Renews At</p>
                          <p className="text-primary">{formatDate(subscriptionAction.subscription.renewsAt || subscriptionAction.subscription.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-red/10 border border-red/20 rounded-lg p-4 mb-6">
                      <div className="flex gap-3">
                        <AlertCircle size={20} className="text-red flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-primary mb-1">Warning</p>
                          <p className="text-xs text-secondary">
                            Cancelling this subscription will immediately revoke the user's Pro features.
                            The user will be downgraded to the Free plan.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setSubscriptionAction(null)}
                        className="btn-ghost-cyan px-6 py-2"
                      >
                        Keep Active
                      </button>
                      <button
                        onClick={handleSubscriptionAction}
                        className="btn-red px-6 py-2 flex items-center gap-2"
                      >
                        <Ban size={16} />
                        Cancel Subscription
                      </button>
                    </div>
                  </>
                )}

                {/* Extend/Renew Modal */}
                {(subscriptionAction.action === 'extend' || subscriptionAction.action === 'renew') && (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-green/20 flex items-center justify-center">
                          {subscriptionAction.action === 'extend' ? <Plus size={24} className="text-green" /> : <RotateCw size={24} className="text-green" />}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-primary">
                            {subscriptionAction.action === 'extend' ? 'Extend Subscription' : 'Renew Subscription'}
                          </h2>
                          <p className="text-xs text-muted">Adjust subscription duration</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSubscriptionAction(null)}
                        className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
                      >
                        <XCircle size={20} className="text-red" />
                      </button>
                    </div>

                    <div className="glass-card p-5 mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-bold text-primary mb-1">{subscriptionAction.subscription.userName}</p>
                          <p className="text-xs text-secondary">{subscriptionAction.subscription.description}</p>
                        </div>
                        {getSubscriptionTypeBadge(subscriptionAction.subscription.type, subscriptionAction.subscription.duration)}
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs pt-3 border-t border-white/5">
                        <div>
                          <p className="text-muted mb-1">Current Amount</p>
                          <p className="text-primary font-bold flex items-center gap-1"><GCoinIcon size={14} />{subscriptionAction.subscription.amount}</p>
                        </div>
                        <div>
                          <p className="text-muted mb-1">{subscriptionAction.action === 'extend' ? 'Current End Date' : 'Expired At'}</p>
                          <p className="text-primary">{formatDate(subscriptionAction.subscription.renewsAt || subscriptionAction.subscription.expiredAt || subscriptionAction.subscription.createdAt)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-semibold text-primary mb-2">
                          {subscriptionAction.action === 'extend' ? 'Extend Duration' : 'Renewal Duration'}
                        </label>
                        <select
                          value={extendMonths}
                          onChange={e => setExtendMonths(Number(e.target.value))}
                          className="input-gb w-full px-4 py-3 text-sm cursor-pointer"
                        >
                          <option value={1}>1 Month (+{subscriptionAction.subscription.amount} G-coin)</option>
                          <option value={3}>3 Months (+{(subscriptionAction.subscription.amount * 3).toFixed(2)} G-coin)</option>
                          <option value={6}>6 Months (+{(subscriptionAction.subscription.amount * 6).toFixed(2)} G-coin)</option>
                          <option value={12}>12 Months (+{(subscriptionAction.subscription.amount * 12).toFixed(2)} G-coin)</option>
                        </select>
                      </div>

                      <div className="bg-green/10 border border-green/20 rounded-lg p-4">
                        <div className="flex gap-3">
                          <CheckCircle size={20} className="text-green flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-semibold text-primary mb-1">New End Date</p>
                            <p className="text-xs text-secondary">
                              Subscription will be {subscriptionAction.action === 'extend' ? 'extended' : 'renewed'} until{' '}
                              <span className="text-green font-semibold">
                                {new Date(new Date(subscriptionAction.subscription.renewsAt || subscriptionAction.subscription.expiredAt || new Date()).getTime() + extendMonths * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => setSubscriptionAction(null)}
                        className="btn-ghost-cyan px-6 py-2"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSubscriptionAction}
                        className="btn-green px-6 py-2 flex items-center gap-2"
                      >
                        {subscriptionAction.action === 'extend' ? <Plus size={16} /> : <RotateCw size={16} />}
                        {subscriptionAction.action === 'extend' ? 'Extend' : 'Renew'} Subscription
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
