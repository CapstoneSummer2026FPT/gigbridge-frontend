import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  History, Search, Eye, ArrowUpRight, ArrowDownRight, Coins,
  XCircle, Loader2, RefreshCw, Wallet
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { walletGetAPI, WalletTransactionResponse } from '../../../api/walletAPI/GET';
import '../../admin/styles/admin-users-screen.css';

// ── Backend enum maps ──────────────────────────────────────────
// type: 0=Unknown, 1=TopUp, 2=EscrowFund, 3=EscrowRelease, 4=AdminCredit, 5=Payout
// status: 0=Pending, 1=Succeeded, 2=Failed, 3=Cancelled

const TX_TYPE_LABELS: Record<number, string> = {
  0: 'Khác',
  1: 'Nạp tiền',
  2: 'Escrow Fund',
  3: 'Escrow Release',
  4: 'Admin Credit',
  5: 'Rút tiền',
};

const TX_STATUS_LABELS: Record<number, string> = {
  0: 'Chờ xử lý',
  1: 'Thành công',
  2: 'Thất bại',
  3: 'Đã hủy',
};

type TypeFilter = 'all' | '1' | '2' | '3' | '4' | '5';
type StatusFilter = 'all' | '0' | '1' | '2' | '3';

/** Format VND */
function fmtVnd(n: number): string {
  return new Intl.NumberFormat('vi-VN').format(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function WalletHistoryScreen() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<WalletTransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewTx, setViewTx] = useState<WalletTransactionResponse | null>(null);

  // ── Load transactions ──
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await walletGetAPI.getTransactions(100);
      if (res.success && res.data) {
        setTransactions(res.data);
      } else {
        setError(res.message || 'Không thể tải lịch sử giao dịch.');
      }
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
      setError(err?.message || 'Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // ── Stats ──
  const stats = useMemo(() => {
    const succeeded = transactions.filter(t => t.status === 1);
    const totalTopUp = succeeded.filter(t => t.type === 1).reduce((s, t) => s + t.tokenAmount, 0);
    const totalEscrow = succeeded.filter(t => t.type === 2).reduce((s, t) => s + t.tokenAmount, 0);
    const pending = transactions.filter(t => t.status === 0).length;

    return { totalTopUp, totalEscrow, pending, totalTransactions: transactions.length };
  }, [transactions]);

  // ── Filter ──
  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const matchSearch =
        searchQuery === '' ||
        tx.walletTransactionId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.gatewayOrderCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.note || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchType = typeFilter === 'all' || tx.type === Number(typeFilter);
      const matchStatus = statusFilter === 'all' || tx.status === Number(statusFilter);

      return matchSearch && matchType && matchStatus;
    });
  }, [transactions, searchQuery, typeFilter, statusFilter]);

  // ── Badge helpers ──
  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0: return <span className="badge-amber text-xs">{TX_STATUS_LABELS[0]}</span>;
      case 1: return <span className="badge-green text-xs">{TX_STATUS_LABELS[1]}</span>;
      case 2: return <span className="badge-red text-xs">{TX_STATUS_LABELS[2]}</span>;
      case 3: return <span className="badge-gray text-xs">{TX_STATUS_LABELS[3]}</span>;
      default: return <span className="badge-gray text-xs">N/A</span>;
    }
  };

  const getTypeBadge = (type: number) => {
    switch (type) {
      case 1: return <span className="badge-green text-xs">{TX_TYPE_LABELS[1]}</span>;
      case 2: return <span className="badge-purple text-xs">{TX_TYPE_LABELS[2]}</span>;
      case 3: return <span className="badge-cyan text-xs">{TX_TYPE_LABELS[3]}</span>;
      case 4: return <span className="badge-cyan text-xs">{TX_TYPE_LABELS[4]}</span>;
      case 5: return <span className="badge-red text-xs">{TX_TYPE_LABELS[5]}</span>;
      default: return <span className="badge-gray text-xs">{TX_TYPE_LABELS[0]}</span>;
    }
  };

  const getTypeIcon = (type: number) => {
    if (type === 1 || type === 4) return <ArrowUpRight size={16} className="text-green" />;
    if (type === 5) return <ArrowDownRight size={16} className="text-red" />;
    return <Coins size={16} className="text-cyan" />;
  };

  const isCredit = (type: number) => type === 1 || type === 3 || type === 4;

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
              <h1 className="text-2xl sm:text-3xl font-black text-primary">Lịch Sử Giao Dịch</h1>
              <p className="text-sm text-secondary mt-1">Xem toàn bộ lịch sử giao dịch ví</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={loadTransactions}
                className="btn-ghost-cyan px-4 py-2 text-sm flex items-center gap-2"
              >
                <RefreshCw size={14} />
                Tải lại
              </button>
              <button
                onClick={() => navigate('/wallet/deposit')}
                className="btn-cyan px-4 py-2 text-sm flex items-center gap-2"
              >
                <Coins size={14} />
                Nạp Tiền
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {[
              { label: 'Tổng Nạp', value: `${fmtVnd(stats.totalTopUp)} tokens`, icon: <ArrowUpRight size={16} />, color: 'green' },
              { label: 'Escrow', value: `${fmtVnd(stats.totalEscrow)} tokens`, icon: <Coins size={16} />, color: 'purple' },
              { label: 'Đang Chờ', value: stats.pending.toString(), icon: <Loader2 size={16} />, color: 'amber' },
              { label: 'Tổng GD', value: stats.totalTransactions.toString(), icon: <Wallet size={16} />, color: 'cyan' },
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
                  placeholder="Tìm kiếm theo ID, mã đơn, ghi chú..."
                  className="input-gb w-full py-2.5 text-sm"
                  style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                />
              </div>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as TypeFilter)}
                className="input-gb px-4 py-2.5 text-sm cursor-pointer"
              >
                <option value="all">Tất cả loại</option>
                <option value="1">Nạp tiền</option>
                <option value="2">Escrow Fund</option>
                <option value="3">Escrow Release</option>
                <option value="4">Admin Credit</option>
                <option value="5">Rút tiền</option>
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as StatusFilter)}
                className="input-gb px-4 py-2.5 text-sm cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="0">Chờ xử lý</option>
                <option value="1">Thành công</option>
                <option value="2">Thất bại</option>
                <option value="3">Đã hủy</option>
              </select>
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="glass-card p-12 text-center">
              <Loader2 size={40} className="mx-auto mb-4 text-cyan animate-spin" />
              <p className="text-sm text-secondary">Đang tải giao dịch...</p>
            </div>
          )}

          {/* Error state */}
          {!loading && error && (
            <div className="glass-card p-12 text-center">
              <XCircle size={40} className="mx-auto mb-4 text-red" />
              <p className="text-lg font-semibold text-primary mb-2">Lỗi</p>
              <p className="text-sm text-secondary mb-4">{error}</p>
              <button onClick={loadTransactions} className="btn-cyan px-6 py-2 text-sm">
                Thử Lại
              </button>
            </div>
          )}

          {/* Transaction list */}
          {!loading && !error && (
            <div className="space-y-3">
              {filtered.map(tx => (
                <div key={tx.walletTransactionId} className="glass-card p-5 hover:border-cyan/30 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                        {getTypeIcon(tx.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <p className="text-sm font-bold text-primary">
                            {TX_TYPE_LABELS[tx.type] || 'Giao dịch'}
                          </p>
                          {getTypeBadge(tx.type)}
                          {getStatusBadge(tx.status)}
                        </div>
                        {tx.note && (
                          <p className="text-xs text-secondary mb-1 truncate">{tx.note}</p>
                        )}
                        <p className="text-xs text-muted">{formatDate(tx.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right ml-4 flex-shrink-0">
                      <div className="flex items-center gap-1 justify-end">
                        <Coins size={16} className={isCredit(tx.type) ? 'text-green' : 'text-red'} />
                        <p className={`text-xl font-bold ${isCredit(tx.type) ? 'text-green' : 'text-red'}`}>
                          {isCredit(tx.type) ? '+' : '-'}{fmtVnd(tx.tokenAmount)}
                        </p>
                      </div>
                      <p className="text-xs text-muted mt-0.5">{fmtVnd(tx.vndAmount)} ₫</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex items-center gap-4 text-xs text-muted flex-wrap">
                      {tx.gatewayProvider && (
                        <span>Provider: {tx.gatewayProvider}</span>
                      )}
                      {tx.gatewayOrderCode && (
                        <span>Order: {tx.gatewayOrderCode}</span>
                      )}
                      {tx.completedAt && (
                        <span>Hoàn thành: {formatDate(tx.completedAt)}</span>
                      )}
                    </div>
                    <button
                      onClick={() => setViewTx(tx)}
                      className="text-xs text-cyan hover:underline flex items-center gap-1"
                    >
                      <Eye size={12} />
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {filtered.length === 0 && (
                <div className="glass-card p-12 text-center">
                  <History size={48} className="mx-auto mb-4 text-muted" />
                  <p className="text-lg font-semibold text-primary mb-2">Chưa có giao dịch</p>
                  <p className="text-sm text-secondary mb-4">
                    {searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
                      ? 'Thử thay đổi bộ lọc'
                      : 'Hãy nạp tiền để bắt đầu'}
                  </p>
                  {typeFilter === 'all' && statusFilter === 'all' && !searchQuery && (
                    <button
                      onClick={() => navigate('/wallet/deposit')}
                      className="btn-cyan px-6 py-2 text-sm"
                    >
                      Nạp Tiền Ngay
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {viewTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setViewTx(null)}>
          <div className="glass-card max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-primary">Chi Tiết Giao Dịch</h2>
              <button
                onClick={() => setViewTx(null)}
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
                      {getTypeBadge(viewTx.type)}
                      {getStatusBadge(viewTx.status)}
                    </div>
                    <p className="text-sm text-secondary">{viewTx.note || TX_TYPE_LABELS[viewTx.type]}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Coins size={20} className={isCredit(viewTx.type) ? 'text-green' : 'text-red'} />
                      <p className={`text-3xl font-bold ${isCredit(viewTx.type) ? 'text-green' : 'text-red'}`}>
                        {isCredit(viewTx.type) ? '+' : '-'}{fmtVnd(viewTx.tokenAmount)}
                      </p>
                    </div>
                    <p className="text-xs text-muted mt-1">{fmtVnd(viewTx.vndAmount)} ₫</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted mb-1">Transaction ID</p>
                    <p className="text-primary font-mono text-xs break-all">{viewTx.walletTransactionId}</p>
                  </div>
                  <div>
                    <p className="text-muted mb-1">Wallet ID</p>
                    <p className="text-primary font-mono text-xs break-all">{viewTx.walletId}</p>
                  </div>
                  {viewTx.gatewayProvider && (
                    <div>
                      <p className="text-muted mb-1">Gateway Provider</p>
                      <p className="text-primary">{viewTx.gatewayProvider}</p>
                    </div>
                  )}
                  {viewTx.gatewayOrderCode && (
                    <div>
                      <p className="text-muted mb-1">Order Code</p>
                      <p className="text-primary font-mono text-xs">{viewTx.gatewayOrderCode}</p>
                    </div>
                  )}
                  {viewTx.gatewayTransactionCode && (
                    <div>
                      <p className="text-muted mb-1">Transaction Code</p>
                      <p className="text-primary font-mono text-xs">{viewTx.gatewayTransactionCode}</p>
                    </div>
                  )}
                  {viewTx.contractId && (
                    <div>
                      <p className="text-muted mb-1">Contract ID</p>
                      <p className="text-primary font-mono text-xs break-all">{viewTx.contractId}</p>
                    </div>
                  )}
                  {viewTx.idempotencyKey && (
                    <div className="col-span-2">
                      <p className="text-muted mb-1">Idempotency Key</p>
                      <p className="text-primary font-mono text-xs break-all">{viewTx.idempotencyKey}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted mb-1">Loại</p>
                    <p className="text-primary">{TX_TYPE_LABELS[viewTx.type] || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted mb-1">Trạng thái</p>
                    <p className="text-primary">{TX_STATUS_LABELS[viewTx.status] || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted mb-1">Ngày tạo</p>
                    <p className="text-primary">{formatDate(viewTx.createdAt)}</p>
                  </div>
                  {viewTx.completedAt && (
                    <div>
                      <p className="text-muted mb-1">Hoàn thành</p>
                      <p className="text-primary">{formatDate(viewTx.completedAt)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setViewTx(null)}
                className="btn-ghost-cyan px-6 py-2"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
