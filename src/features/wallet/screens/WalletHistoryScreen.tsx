import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { History, Search, Download, Eye, ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, Wallet, RefreshCw, XCircle, UploadCloud } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { Transaction, TransactionType, TransactionStatus } from '../../../types/models/Financial';
import '../../admin/styles/admin-users-screen.css';

type TransactionFilter = 'all' | 'deposit' | 'withdrawal' | 'subscription' | 'refund';
type StatusFilter = 'all' | 'completed' | 'pending' | 'failed';

// Mock transaction data
const MOCK_TRANSACTIONS: Transaction[] = [
  {
    trans_TransactionsId: 'trans_1',
    wal_WalletsId: 'wal_1',
    SubscriptionId: 'sub_1',
    Type: TransactionType.Subscription,
    Amount: 29.99,
    Currency: 'USD',
    Status: TransactionStatus.Completed,
    Description: 'GigBridge Pro - Monthly Subscription',
    CreatedAt: '2026-05-16T10:00:00Z',
    CompletedAt: '2026-05-16T10:00:05Z',
  },
  {
    trans_TransactionsId: 'trans_2',
    wal_WalletsId: 'wal_1',
    Type: TransactionType.Deposit,
    Amount: 500.00,
    Currency: 'USD',
    Status: TransactionStatus.Completed,
    Description: 'Wallet deposit via Credit Card',
    CreatedAt: '2026-05-15T13:45:00Z',
    CompletedAt: '2026-05-15T13:45:10Z',
  },
  {
    trans_TransactionsId: 'trans_3',
    wal_WalletsId: 'wal_1',
    Type: TransactionType.Withdrawal,
    Amount: 1200.00,
    Currency: 'USD',
    Status: TransactionStatus.Completed,
    Description: 'Withdrawal to Bank Account - Project Payment',
    CreatedAt: '2026-05-10T14:20:00Z',
    CompletedAt: '2026-05-10T14:25:30Z',
  },
  {
    trans_TransactionsId: 'trans_4',
    wal_WalletsId: 'wal_1',
    Type: TransactionType.Deposit,
    Amount: 250.00,
    Currency: 'USD',
    Status: TransactionStatus.Pending,
    Description: 'Wallet deposit via PayPal',
    CreatedAt: '2026-05-16T15:00:00Z',
  },
  {
    trans_TransactionsId: 'trans_5',
    wal_WalletsId: 'wal_1',
    Type: TransactionType.Deposit,
    Amount: 100.00,
    Currency: 'USD',
    Status: TransactionStatus.Completed,
    Description: 'Wallet deposit via Credit Card',
    CreatedAt: '2026-05-08T11:30:00Z',
    CompletedAt: '2026-05-08T11:30:08Z',
  },
  {
    trans_TransactionsId: 'trans_6',
    wal_WalletsId: 'wal_1',
    Type: TransactionType.Withdrawal,
    Amount: 850.00,
    Currency: 'USD',
    Status: TransactionStatus.Completed,
    Description: 'Withdrawal to Bank Account',
    CreatedAt: '2026-05-05T09:15:00Z',
    CompletedAt: '2026-05-05T09:20:15Z',
  },
  {
    trans_TransactionsId: 'trans_7',
    wal_WalletsId: 'wal_1',
    SubscriptionId: 'sub_2',
    Type: TransactionType.Refund,
    Amount: 29.99,
    Currency: 'USD',
    Status: TransactionStatus.Completed,
    Description: 'Refund for cancelled subscription',
    CreatedAt: '2026-05-03T11:30:00Z',
    CompletedAt: '2026-05-03T11:35:00Z',
  },
  {
    trans_TransactionsId: 'trans_8',
    wal_WalletsId: 'wal_1',
    Type: TransactionType.Deposit,
    Amount: 50.00,
    Currency: 'USD',
    Status: TransactionStatus.Failed,
    Description: 'Wallet deposit via Credit Card - Payment Failed',
    CreatedAt: '2026-05-01T16:00:00Z',
  },
];

export default function WalletHistoryScreen() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TransactionFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewTransaction, setViewTransaction] = useState<Transaction | null>(null);

  const stats = useMemo(() => {
    const completed = MOCK_TRANSACTIONS.filter(t => t.Status === TransactionStatus.Completed);
    const totalDeposits = completed.filter(t => t.Type === TransactionType.Deposit).reduce((sum, t) => sum + t.Amount, 0);
    const totalWithdrawals = completed.filter(t => t.Type === TransactionType.Withdrawal).reduce((sum, t) => sum + t.Amount, 0);
    const totalSubscriptions = completed.filter(t => t.Type === TransactionType.Subscription).reduce((sum, t) => sum + t.Amount, 0);
    const pending = MOCK_TRANSACTIONS.filter(t => t.Status === TransactionStatus.Pending).length;

    return { totalDeposits, totalWithdrawals, totalSubscriptions, pending, totalTransactions: MOCK_TRANSACTIONS.length };
  }, []);

  const filteredTransactions = useMemo(() => {
    return MOCK_TRANSACTIONS.filter(trans => {
      const matchesSearch = searchQuery === '' ||
        trans.Description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trans.trans_TransactionsId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'all' || trans.Type === typeFilter;
      const matchesStatus = statusFilter === 'all' || trans.Status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [searchQuery, typeFilter, statusFilter]);

  const getStatusBadge = (status: TransactionStatus) => {
    if (status === TransactionStatus.Completed) return <span className="badge-green text-xs">Completed</span>;
    if (status === TransactionStatus.Pending) return <span className="badge-amber text-xs">Pending</span>;
    if (status === TransactionStatus.Failed) return <span className="badge-red text-xs">Failed</span>;
    return <span className="badge-gray text-xs">Cancelled</span>;
  };

  const getTypeBadge = (type: TransactionType) => {
    if (type === TransactionType.Deposit) return <span className="badge-green text-xs">Deposit</span>;
    if (type === TransactionType.Withdrawal) return <span className="badge-red text-xs">Withdrawal</span>;
    if (type === TransactionType.Subscription) return <span className="badge-purple text-xs">Subscription</span>;
    return <span className="badge-cyan text-xs">Refund</span>;
  };

  const getTypeIcon = (type: TransactionType) => {
    if (type === TransactionType.Deposit) return <ArrowUpRight size={16} className="text-green" />;
    if (type === TransactionType.Withdrawal) return <ArrowDownRight size={16} className="text-red" />;
    if (type === TransactionType.Subscription) return <CreditCard size={16} className="text-purple" />;
    return <RefreshCw size={16} className="text-cyan" />;
  };

  const canUploadPaymentProof = (trans: Transaction) => (
    trans.Status === TransactionStatus.Pending
    && (trans.Type === TransactionType.Deposit || trans.Type === TransactionType.Subscription)
  );

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <History size={20} className="text-cyan" />
                <span className="badge-cyan text-xs">Transactions</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                Transaction <span className="text-blue-600 black:text-blue-400 italic font-light">History</span>
              </h1>
              <p className="text-sm text-secondary mt-1">View all your wallet transactions</p>
            </div>
            <button className="btn-ghost-cyan px-4 py-2 text-sm flex items-center gap-2">
              <Download size={14} />
              Export
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-8">
            {[
              { label: 'Total Deposits', value: `$${stats.totalDeposits.toFixed(2)}`, icon: <ArrowUpRight size={16} />, color: 'green' },
              { label: 'Total Withdrawals', value: `$${stats.totalWithdrawals.toFixed(2)}`, icon: <ArrowDownRight size={16} />, color: 'red' },
              { label: 'Subscriptions', value: `$${stats.totalSubscriptions.toFixed(2)}`, icon: <CreditCard size={16} />, color: 'purple' },
              { label: 'Pending', value: stats.pending.toString(), icon: <DollarSign size={16} />, color: 'amber' },
              { label: 'All Transactions', value: stats.totalTransactions.toString(), icon: <Wallet size={16} />, color: 'cyan' },
            ].map(stat => (
              <div key={stat.label} className="stat-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-secondary truncate">{stat.label}</p>
                  <span className={`icon-${stat.color} flex-shrink-0`}>{stat.icon}</span>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-primary">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="glass-card p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
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
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as TransactionFilter)}
                className="input-gb px-4 py-2.5 text-sm cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="deposit">Deposit</option>
                <option value="withdrawal">Withdrawal</option>
                <option value="subscription">Subscription</option>
                <option value="refund">Refund</option>
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="input-gb px-4 py-2.5 text-sm cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Transactions List */}
          <div className="space-y-3">
            {filteredTransactions.map(trans => (
              <div key={trans.trans_TransactionsId} className="glass-card p-5 hover:border-cyan/30 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                      {getTypeIcon(trans.Type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="text-sm font-bold text-primary">{trans.Description}</p>
                        {getTypeBadge(trans.Type)}
                        {getStatusBadge(trans.Status)}
                      </div>
                      <p className="text-xs text-muted mb-1">ID: {trans.trans_TransactionsId}</p>
                      <p className="text-xs text-secondary">{formatDate(trans.CreatedAt)}</p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`text-xl font-bold ${trans.Type === TransactionType.Deposit || trans.Type === TransactionType.Refund ? 'text-green' : 'text-red'}`}>
                      {trans.Type === TransactionType.Deposit || trans.Type === TransactionType.Refund ? '+' : '-'}${trans.Amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted">{trans.Currency}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-4 text-xs text-muted">
                    {trans.CompletedAt && (
                      <span>Completed: {formatDate(trans.CompletedAt)}</span>
                    )}
                    {trans.SubscriptionId && (
                      <span>Sub ID: {trans.SubscriptionId}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {canUploadPaymentProof(trans) && (
                      <button
                        onClick={() => navigate(`/wallet/payment-proof/${trans.trans_TransactionsId}`)}
                        className="text-xs text-amber hover:underline flex items-center gap-1"
                      >
                        <UploadCloud size={12} />
                        Upload Payment Proof
                      </button>
                    )}
                    <button
                      onClick={() => setViewTransaction(trans)}
                      className="text-xs text-cyan hover:underline flex items-center gap-1"
                    >
                      <Eye size={12} />
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredTransactions.length === 0 && (
              <div className="glass-card p-12 text-center">
                <History size={48} className="mx-auto mb-4 text-muted" />
                <p className="text-lg font-semibold text-primary mb-2">No transactions found</p>
                <p className="text-sm text-secondary">Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

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

            <div className="space-y-4">
              <div className="glass-card p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeBadge(viewTransaction.Type)}
                      {getStatusBadge(viewTransaction.Status)}
                    </div>
                    <p className="text-sm text-secondary">{viewTransaction.Description}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-bold ${viewTransaction.Type === TransactionType.Deposit || viewTransaction.Type === TransactionType.Refund ? 'text-green' : 'text-red'}`}>
                      {viewTransaction.Type === TransactionType.Deposit || viewTransaction.Type === TransactionType.Refund ? '+' : '-'}${viewTransaction.Amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted">{viewTransaction.Currency}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted mb-1">Transaction ID</p>
                    <p className="text-primary font-mono text-xs">{viewTransaction.trans_TransactionsId}</p>
                  </div>
                  <div>
                    <p className="text-muted mb-1">Wallet ID</p>
                    <p className="text-primary font-mono text-xs">{viewTransaction.wal_WalletsId}</p>
                  </div>
                  {viewTransaction.SubscriptionId && (
                    <div className="col-span-2">
                      <p className="text-muted mb-1">Subscription ID</p>
                      <p className="text-primary font-mono text-xs">{viewTransaction.SubscriptionId}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted mb-1">Type</p>
                    <p className="text-primary capitalize">{viewTransaction.Type}</p>
                  </div>
                  <div>
                    <p className="text-muted mb-1">Status</p>
                    <p className="text-primary capitalize">{viewTransaction.Status}</p>
                  </div>
                  <div>
                    <p className="text-muted mb-1">Created At</p>
                    <p className="text-primary">{formatDate(viewTransaction.CreatedAt)}</p>
                  </div>
                  {viewTransaction.CompletedAt && (
                    <div>
                      <p className="text-muted mb-1">Completed At</p>
                      <p className="text-primary">{formatDate(viewTransaction.CompletedAt)}</p>
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
    </AppLayout>
  );
}
