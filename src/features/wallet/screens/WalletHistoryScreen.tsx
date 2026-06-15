import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  History,
  Search,
  Download,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Coins,
  Wallet,
  RefreshCw,
  XCircle,
  Loader2,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { walletGetAPI, WalletTransactionResponse } from '../../../api/walletAPI/GET';
import { walletPostAPI } from '../../../api/walletAPI/POST';
import '../../admin/styles/admin-users-screen.css';

export default function WalletHistoryScreen() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<WalletTransactionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewTransaction, setViewTransaction] = useState<WalletTransactionResponse | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setErrorText(null);
      const res = await walletGetAPI.getTransactions(100);
      if (res.success && res.data) {
        setTransactions(res.data);

        // Auto-sync pending TopUp transactions (type = 1, status = 0)
        const pendingTopUps = res.data.filter(t => t.type === 1 && t.status === 0 && t.gatewayOrderCode);
        if (pendingTopUps.length > 0) {
          Promise.all(
            pendingTopUps.map(async (t) => {
              try {
                const orderCode = Number(t.gatewayOrderCode);
                if (Number.isSafeInteger(orderCode) && orderCode > 0) {
                  await walletPostAPI.syncPayOsTopUp({ orderCode });
                }
              } catch (e) {
                console.error(`Failed to sync pending top-up order ${t.gatewayOrderCode}:`, e);
              }
            })
          ).then(async () => {
            // Silently re-fetch transactions to show the updated statuses (e.g. Succeeded or Cancelled)
            try {
              const silentRes = await walletGetAPI.getTransactions(100);
              if (silentRes.success && silentRes.data) {
                setTransactions(silentRes.data);
              }
            } catch (e) {
              console.error('Failed to silently refresh transactions:', e);
            }
          });
        }
      } else {
        setErrorText(res.message || 'Không thể tải lịch sử giao dịch.');
      }
    } catch (err) {
      console.error('Failed to load transaction history:', err);
      setErrorText(err instanceof Error ? err.message : 'Đã xảy ra lỗi khi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTransactions();
  }, []);

  const getDescription = (trans: WalletTransactionResponse) => {
    if (trans.note) return trans.note;
    switch (trans.type) {
      case 0:
        return 'Cấp số dư từ hệ thống (Admin)';
      case 1:
        return `Nạp tiền vào ví qua ${trans.gatewayProvider || 'PayOS'}`;
      case 2:
        return `Ký quỹ hợp đồng dự án`;
      case 3:
        return `Giải ngân hợp đồng dự án`;
      case 4:
        return `Hoàn trả ký quỹ hợp đồng`;
      case 5:
        return 'Điều chỉnh số dư từ hệ thống';
      default:
        return 'Giao dịch ví';
    }
  };

  const stats = useMemo(() => {
    const succeeded = transactions.filter(t => t.status === 1);
    const totalDeposits = succeeded.filter(t => t.type === 1).reduce((sum, t) => sum + t.tokenAmount, 0);
    const totalHold = succeeded.filter(t => t.type === 2).reduce((sum, t) => sum + t.tokenAmount, 0);
    const totalRefund = succeeded.filter(t => t.type === 4).reduce((sum, t) => sum + t.tokenAmount, 0);
    const pending = transactions.filter(t => t.status === 0).length;

    return {
      totalDeposits,
      totalHold,
      totalRefund,
      pending,
      totalTransactions: transactions.length,
    };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(trans => {
      const desc = getDescription(trans);
      const matchesSearch =
        searchQuery === '' ||
        desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        trans.walletTransactionId.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'all' || trans.type.toString() === typeFilter;
      const matchesStatus = statusFilter === 'all' || trans.status.toString() === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [transactions, searchQuery, typeFilter, statusFilter]);

  const fmtNumber = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  const getStatusBadge = (status: number) => {
    switch (status) {
      case 0:
        return <span className="badge-amber text-[11px] px-2 py-0.5 font-semibold">Chờ xử lý</span>;
      case 1:
        return <span className="badge-green text-[11px] px-2 py-0.5 font-semibold">Thành công</span>;
      case 2:
        return <span className="badge-red text-[11px] px-2 py-0.5 font-semibold">Thất bại</span>;
      case 3:
        return <span className="badge-gray text-[11px] px-2 py-0.5 font-semibold">Đã hủy</span>;
      default:
        return <span className="badge-gray text-[11px] px-2 py-0.5 font-semibold">Không rõ</span>;
    }
  };

  const getTypeBadge = (type: number) => {
    switch (type) {
      case 0:
        return <span className="badge-gray text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider">Admin</span>;
      case 1:
        return <span className="badge-green text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider">Nạp tiền</span>;
      case 2:
        return <span className="badge-amber text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider">Ký quỹ</span>;
      case 3:
        return <span className="badge-purple text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider">Giải ngân</span>;
      case 4:
        return <span className="badge-cyan text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider">Hoàn trả</span>;
      case 5:
        return <span className="badge-gray text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider">Điều chỉnh</span>;
      default:
        return <span className="badge-gray text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider">Khác</span>;
    }
  };

  const getTypeIcon = (type: number) => {
    switch (type) {
      case 0:
      case 5:
        return <RefreshCw size={16} className="text-muted" />;
      case 1:
      case 4:
        return <ArrowUpRight size={16} className="text-green" />;
      case 2:
      case 3:
        return <ArrowDownRight size={16} className="text-red" />;
      default:
        return <Wallet size={16} className="text-cyan" />;
    }
  };

  const getAmountDisplay = (trans: WalletTransactionResponse) => {
    const isPositive = trans.type === 0 || trans.type === 1 || trans.type === 4;
    const prefix = isPositive ? '+' : '-';
    const colorClass = isPositive ? 'text-green' : 'text-red';

    return (
      <div className="text-right ml-4 shrink-0">
        <div className={`text-lg sm:text-xl font-bold flex items-center justify-end gap-1 ${colorClass}`}>
          <span>{prefix}{fmtNumber(trans.tokenAmount)}</span>
          <Coins size={16} className="inline opacity-80" />
        </div>
        {trans.type === 1 && trans.vndAmount > 0 && (
          <p className="text-xs text-secondary mt-0.5 font-semibold">
            {fmtNumber(trans.vndAmount)} đ
          </p>
        )}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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
                <span className="badge-cyan text-xs">Giao Dịch</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">Lịch Sử Giao Dịch</h1>
              <p className="text-sm text-secondary mt-1">Xem toàn bộ lịch sử biến động số dư ví của bạn</p>
            </div>
            <button
              onClick={() => void fetchTransactions()}
              className="btn-ghost-cyan px-4 py-2 text-sm flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 mb-8">
            {[
              { label: 'Tổng nạp tiền', value: `${fmtNumber(stats.totalDeposits)} tokens`, icon: <ArrowUpRight size={16} />, color: 'green' },
              { label: 'Ký quỹ dự án', value: `${fmtNumber(stats.totalHold)} tokens`, icon: <ArrowDownRight size={16} />, color: 'red' },
              { label: 'Tổng hoàn trả', value: `${fmtNumber(stats.totalRefund)} tokens`, icon: <RefreshCw size={16} />, color: 'cyan' },
              { label: 'Đang xử lý', value: stats.pending.toString(), icon: <Loader2 size={16} className={stats.pending > 0 ? 'animate-spin' : ''} />, color: 'amber' },
              { label: 'Tổng số giao dịch', value: stats.totalTransactions.toString(), icon: <Wallet size={16} />, color: 'cyan' },
            ].map(stat => (
              <div key={stat.label} className="stat-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-secondary truncate">{stat.label}</p>
                  <span className={`icon-${stat.color} flex-shrink-0`}>{stat.icon}</span>
                </div>
                <p className="text-lg sm:text-xl font-bold text-primary truncate">{stat.value}</p>
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
                  placeholder="Tìm kiếm giao dịch..."
                  className="input-gb w-full py-2.5 text-sm"
                  style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                />
              </div>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="input-gb px-4 py-2.5 text-sm cursor-pointer"
              >
                <option value="all">Tất cả phân loại</option>
                <option value="1">Nạp tiền (TopUp)</option>
                <option value="2">Ký quỹ (Hold)</option>
                <option value="3">Giải ngân (Release)</option>
                <option value="4">Hoàn trả ký quỹ (Refund)</option>
                <option value="0">Cấp từ Admin</option>
                <option value="5">Điều chỉnh</option>
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="input-gb px-4 py-2.5 text-sm cursor-pointer"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="1">Thành công</option>
                <option value="0">Đang xử lý</option>
                <option value="2">Thất bại</option>
                <option value="3">Đã hủy</option>
              </select>
            </div>
          </div>

          {/* Transactions List */}
          {loading ? (
            <div className="glass-card p-12 text-center flex flex-col items-center justify-center">
              <Loader2 size={40} className="text-cyan animate-spin mb-4" />
              <p className="text-secondary text-sm">Đang tải lịch sử giao dịch...</p>
            </div>
          ) : errorText ? (
            <div className="glass-card p-8 border border-red-500/25 bg-red-500/5 text-center">
              <p className="text-red-500 font-semibold mb-2">{errorText}</p>
              <button onClick={() => void fetchTransactions()} className="btn-cyan px-4 py-2 text-xs">
                Thử lại
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map(trans => (
                <div key={trans.walletTransactionId} className="glass-card p-5 hover:border-cyan/30 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                        {getTypeIcon(trans.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <p className="text-sm font-bold text-primary truncate max-w-md">
                            {getDescription(trans)}
                          </p>
                          {getTypeBadge(trans.type)}
                          {getStatusBadge(trans.status)}
                        </div>
                        <p className="text-[11px] text-muted mb-0.5">ID: {trans.walletTransactionId}</p>
                        <p className="text-xs text-secondary">{formatDate(trans.createdAt)}</p>
                      </div>
                    </div>
                    {getAmountDisplay(trans)}
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/5 text-xs text-muted">
                    <div className="flex items-center gap-4 flex-wrap">
                      {trans.completedAt && (
                        <span>Hoàn thành: {formatDate(trans.completedAt)}</span>
                      )}
                      {trans.contractId && (
                        <span className="truncate max-w-[150px]">Hợp đồng: {trans.contractId}</span>
                      )}
                    </div>
                    <button
                      onClick={() => setViewTransaction(trans)}
                      className="text-xs text-cyan hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Eye size={12} />
                      Chi tiết
                    </button>
                  </div>
                </div>
              ))}

              {filteredTransactions.length === 0 && (
                <div className="glass-card p-12 text-center">
                  <History size={48} className="mx-auto mb-4 text-muted" />
                  <p className="text-lg font-semibold text-primary mb-2">Không tìm thấy giao dịch nào</p>
                  <p className="text-sm text-secondary">Thử điều chỉnh bộ lọc tìm kiếm của bạn</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {viewTransaction && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setViewTransaction(null)}
        >
          <div className="glass-card max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-primary">Chi Tiết Giao Dịch</h2>
              <button
                onClick={() => setViewTransaction(null)}
                className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
              >
                <XCircle size={20} className="text-red" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="glass-card p-5">
                <div className="flex items-start justify-between mb-4 pb-4 border-b border-white/5">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeBadge(viewTransaction.type)}
                      {getStatusBadge(viewTransaction.status)}
                    </div>
                    <p className="text-sm text-secondary font-medium">{getDescription(viewTransaction)}</p>
                  </div>
                  {getAmountDisplay(viewTransaction)}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <div>
                    <p className="text-muted text-xs mb-1">Mã giao dịch (ID)</p>
                    <p className="text-primary font-mono text-xs break-all">{viewTransaction.walletTransactionId}</p>
                  </div>
                  <div>
                    <p className="text-muted text-xs mb-1">Mã ví người dùng</p>
                    <p className="text-primary font-mono text-xs break-all">{viewTransaction.walletId}</p>
                  </div>
                  {viewTransaction.gatewayOrderCode && (
                    <div>
                      <p className="text-muted text-xs mb-1">Mã đơn hàng PayOS</p>
                      <p className="text-primary font-mono text-xs">{viewTransaction.gatewayOrderCode}</p>
                    </div>
                  )}
                  {viewTransaction.gatewayTransactionCode && (
                    <div>
                      <p className="text-muted text-xs mb-1">Mã tham chiếu PayOS</p>
                      <p className="text-primary font-mono text-xs">{viewTransaction.gatewayTransactionCode}</p>
                    </div>
                  )}
                  {viewTransaction.contractId && (
                    <div>
                      <p className="text-muted text-xs mb-1">Mã hợp đồng liên kết</p>
                      <p className="text-primary font-mono text-xs break-all">{viewTransaction.contractId}</p>
                    </div>
                  )}
                  {viewTransaction.contractEscrowId && (
                    <div>
                      <p className="text-muted text-xs mb-1">Mã ký quỹ hợp đồng</p>
                      <p className="text-primary font-mono text-xs break-all">{viewTransaction.contractEscrowId}</p>
                    </div>
                  )}
                  {viewTransaction.idempotencyKey && (
                    <div className="col-span-1 sm:col-span-2">
                      <p className="text-muted text-xs mb-1">Idempotency Key</p>
                      <p className="text-primary font-mono text-xs break-all">{viewTransaction.idempotencyKey}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted text-xs mb-1">Thời gian khởi tạo</p>
                    <p className="text-primary">{formatDate(viewTransaction.createdAt)}</p>
                  </div>
                  {viewTransaction.completedAt && (
                    <div>
                      <p className="text-muted text-xs mb-1">Thời gian hoàn thành</p>
                      <p className="text-primary">{formatDate(viewTransaction.completedAt)}</p>
                    </div>
                  )}
                  {viewTransaction.note && (
                    <div className="col-span-1 sm:col-span-2">
                      <p className="text-muted text-xs mb-1">Ghi chú</p>
                      <p className="text-primary bg-white/5 p-2 rounded-lg text-xs">{viewTransaction.note}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setViewTransaction(null)}
                className="btn-cyan px-6 py-2.5 font-semibold text-sm"
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
