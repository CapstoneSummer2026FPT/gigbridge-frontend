import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  RefreshCw,
  RotateCw,
  Search,
  ShieldAlert,
  Wallet,
  XCircle,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { adminAPI } from '../../../api/adminAPI';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';
import { WithdrawalStatus } from '../../../types';
import type { WithdrawalResponse } from '../../../types';
import '../styles/admin-users-screen.css';

type StatusFilter = WithdrawalStatus | 'all';
type AdminAction = 'sync' | 'retry';

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: WithdrawalStatus.Pending, label: 'Pending' },
  { value: WithdrawalStatus.Processing, label: 'Processing' },
  { value: WithdrawalStatus.SyncRequired, label: 'Sync required' },
  { value: WithdrawalStatus.Success, label: 'Success' },
  { value: WithdrawalStatus.Failed, label: 'Failed' },
  { value: WithdrawalStatus.Cancelled, label: 'Cancelled' },
];

function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} đ`;
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusMeta(status: WithdrawalStatus) {
  switch (status) {
    case WithdrawalStatus.Pending:
      return { label: 'Pending', badge: 'badge-amber', icon: <Clock size={13} /> };
    case WithdrawalStatus.Processing:
      return { label: 'Processing', badge: 'badge-amber', icon: <Loader2 size={13} /> };
    case WithdrawalStatus.SyncRequired:
      return { label: 'Sync required', badge: 'badge-amber', icon: <AlertTriangle size={13} /> };
    case WithdrawalStatus.Success:
      return { label: 'Success', badge: 'badge-green', icon: <CheckCircle2 size={13} /> };
    case WithdrawalStatus.Failed:
      return { label: 'Failed', badge: 'badge-red', icon: <XCircle size={13} /> };
    case WithdrawalStatus.Cancelled:
      return { label: 'Cancelled', badge: 'badge-gray', icon: <XCircle size={13} /> };
    default:
      return { label: 'Processing', badge: 'badge-amber', icon: <Clock size={13} /> };
  }
}

function isTerminal(status: WithdrawalStatus): boolean {
  return status === WithdrawalStatus.Success || status === WithdrawalStatus.Failed || status === WithdrawalStatus.Cancelled;
}

function getResponseMessage(responseMessage: string | undefined, fallback: string): string {
  return responseMessage && responseMessage.trim().length > 0 ? responseMessage : fallback;
}

export default function AdminWithdrawalsScreen() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalResponse[]>([]);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(WithdrawalStatus.SyncRequired);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadWithdrawals = useCallback(async () => {
    setLoading(true);
    setError('');

    const response = await adminAPI.getWithdrawals({ status: statusFilter, limit: 200 });
    if (response.success && response.data) {
      setWithdrawals(response.data);
    } else {
      setError(getResponseMessage(response.message, 'Cannot load withdrawals.'));
    }

    setLoading(false);
  }, [statusFilter]);

  useEffect(() => {
    void loadWithdrawals();
  }, [loadWithdrawals]);

  const stats = useMemo(() => {
    return {
      total: withdrawals.length,
      syncRequired: withdrawals.filter(item => item.status === WithdrawalStatus.SyncRequired).length,
      processing: withdrawals.filter(item => item.status === WithdrawalStatus.Pending || item.status === WithdrawalStatus.Processing).length,
      terminal: withdrawals.filter(item => isTerminal(item.status)).length,
    };
  }, [withdrawals]);

  const filteredWithdrawals = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return withdrawals;

    return withdrawals.filter(item => {
      return [
        item.withdrawalId,
        item.userId,
        item.providerOrderCode,
        item.providerPayoutId || '',
        item.bankName,
        item.bankAccountName,
        item.bankAccountNumberMasked,
      ].some(value => value.toLowerCase().includes(keyword));
    });
  }, [search, withdrawals]);

  const updateWithdrawal = (next: WithdrawalResponse) => {
    setWithdrawals(current => current.map(item => (item.withdrawalId === next.withdrawalId ? next : item)));
    setSelectedWithdrawal(current => (current?.withdrawalId === next.withdrawalId ? next : current));
  };

  const runAction = async (withdrawal: WithdrawalResponse, action: AdminAction) => {
    setActioning(`${action}:${withdrawal.withdrawalId}`);
    setError('');
    setSuccess('');

    const response = action === 'sync'
      ? await adminAPI.syncWithdrawal(withdrawal.withdrawalId)
      : await adminAPI.retryWithdrawal(withdrawal.withdrawalId);

    if (response.success && response.data) {
      updateWithdrawal(response.data);
      setSuccess(action === 'retry'
        ? 'Withdrawal retry queued; worker will process automatically.'
        : 'Withdrawal status synced.');
    } else {
      setError(getResponseMessage(response.message, `Cannot ${action} withdrawal.`));
    }

    setActioning('');
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[100vw] overflow-x-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <header className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Banknote size={20} className="text-cyan" />
                <span className="badge-amber text-xs">Payout Operations</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-primary">Withdrawal Queue</h1>
              <p className="text-sm text-secondary mt-1">Monitor PayOS payouts, sync ambiguous states, and resolve SYNC_REQUIRED safely.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadWithdrawals()}
              className="btn-ghost-cyan px-4 py-2 text-sm flex items-center gap-2"
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </header>

          <div className="glass-card p-4 mb-6 border border-amber-400/25 bg-amber-400/5">
            <div className="flex gap-3">
              <ShieldAlert size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-secondary">
                SYNC_REQUIRED keeps funds locked. Do not mark failed or refund unless provider evidence confirms the payout failed.
              </p>
            </div>
          </div>

          {error && <div className="alert-red text-sm font-semibold mb-4">{error}</div>}
          {success && <div className="alert-green text-sm font-semibold mb-4">{success}</div>}

          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            {[
              { label: 'Loaded', value: stats.total, icon: <Wallet size={16} />, color: 'cyan' },
              { label: 'Sync required', value: stats.syncRequired, icon: <AlertTriangle size={16} />, color: 'amber' },
              { label: 'In progress', value: stats.processing, icon: <Clock size={16} />, color: 'purple' },
              { label: 'Terminal', value: stats.terminal, icon: <CheckCircle2 size={16} />, color: 'green' },
            ].map(item => (
              <div key={item.label} className="stat-card">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-secondary truncate">{item.label}</p>
                  <span className={`icon-${item.color} flex-shrink-0`}>{item.icon}</span>
                </div>
                <p className="text-xl font-bold text-primary">{item.value}</p>
              </div>
            ))}
          </section>

          <div className="glass-card p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px] gap-3">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
                <input
                  className="input-gb w-full py-2.5 text-sm"
                  style={{ paddingLeft: '2.5rem', paddingRight: '1rem' }}
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Search withdrawal, user, provider ref, or bank..."
                />
              </div>
              <select
                className="input-gb px-4 py-2.5 text-sm cursor-pointer"
                value={statusFilter}
                onChange={event => {
                  const value = event.target.value;
                  setStatusFilter(value === 'all' ? 'all' : Number(value) as WithdrawalStatus);
                }}
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={String(option.value)} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="glass-card p-12 text-center flex flex-col items-center justify-center">
              <Loader2 size={40} className="text-cyan animate-spin mb-4" />
              <p className="text-secondary text-sm">Loading withdrawal queue...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredWithdrawals.map(withdrawal => {
                const status = getStatusMeta(withdrawal.status);
                const syncActionKey = `sync:${withdrawal.withdrawalId}`;
                const retryActionKey = `retry:${withdrawal.withdrawalId}`;

                return (
                  <article key={withdrawal.withdrawalId} className="glass-card p-5 hover:border-cyan/30 transition-all">
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_180px_220px] gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`${status.badge} text-[11px] px-2 py-0.5 font-semibold inline-flex items-center gap-1`}>
                            {status.icon}
                            {status.label}
                          </span>
                          <span className="badge-gray text-[11px] px-2 py-0.5 font-semibold">{withdrawal.provider || 'PayOS'}</span>
                        </div>
                        <p className="text-sm font-bold text-primary mb-1">{withdrawal.bankName} · {withdrawal.bankAccountName}</p>
                        <p className="text-xs text-secondary">{withdrawal.bankAccountNumberMasked}</p>
                        <p className="text-[11px] text-muted mt-1 break-all">Withdrawal: {withdrawal.withdrawalId}</p>
                        <p className="text-[11px] text-muted break-all">User: {withdrawal.userId}</p>
                      </div>

                      <div className="xl:text-right">
                        <p className="text-xs text-muted mb-1">Amount</p>
                        <p className="text-lg font-bold text-primary"><GigCoinAmount amount={withdrawal.tokenAmount} /></p>
                        <p className="text-xs text-secondary">{formatVnd(withdrawal.netVndAmount)}</p>
                      </div>

                      <div className="flex flex-col gap-2 xl:items-end">
                        <p className="text-xs text-muted">{formatDate(withdrawal.createdAt)}</p>
                        <div className="flex flex-wrap gap-2 xl:justify-end">
                          <button
                            type="button"
                            className="btn-ghost-cyan px-3 py-2 text-xs inline-flex items-center gap-1"
                            onClick={() => setSelectedWithdrawal(withdrawal)}
                          >
                            <Eye size={13} />
                            Detail
                          </button>
                          {!isTerminal(withdrawal.status) && (
                            <button
                              type="button"
                              className="btn-ghost-cyan px-3 py-2 text-xs inline-flex items-center gap-1"
                              onClick={() => void runAction(withdrawal, 'sync')}
                              disabled={actioning === syncActionKey}
                            >
                              {actioning === syncActionKey ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                              Sync
                            </button>
                          )}
                          {withdrawal.canRetry && (
                            <button
                              type="button"
                              className="btn-ghost-cyan px-3 py-2 text-xs inline-flex items-center gap-1"
                              onClick={() => void runAction(withdrawal, 'retry')}
                              disabled={actioning === retryActionKey}
                            >
                              {actioning === retryActionKey ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
                              Retry
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}

              {filteredWithdrawals.length === 0 && (
                <div className="glass-card p-12 text-center">
                  <Banknote size={46} className="mx-auto mb-4 text-muted" />
                  <p className="text-lg font-semibold text-primary mb-2">No withdrawals found</p>
                  <p className="text-sm text-secondary">Try another status filter or search keyword.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedWithdrawal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedWithdrawal(null)}
        >
          <div className="glass-card max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-primary">Withdrawal Detail</h2>
              <button
                type="button"
                onClick={() => setSelectedWithdrawal(null)}
                className="p-2 rounded-lg glass-button hover:bg-red-500/10 transition-colors"
              >
                <XCircle size={20} className="text-red" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {[
                ['Withdrawal ID', selectedWithdrawal.withdrawalId],
                ['User ID', selectedWithdrawal.userId],
                ['Wallet ID', selectedWithdrawal.walletId],
                ['Bank', `${selectedWithdrawal.bankName} (${selectedWithdrawal.bankCode})`],
                ['Account', `${selectedWithdrawal.bankAccountName} · ${selectedWithdrawal.bankAccountNumberMasked}`],
                ['Provider', selectedWithdrawal.provider],
                ['Provider order', selectedWithdrawal.providerOrderCode],
                ['Provider payout', selectedWithdrawal.providerPayoutId || '-'],
                ['Provider transaction', selectedWithdrawal.providerTransactionCode || '-'],
                ['Provider raw status', selectedWithdrawal.providerRawStatus || '-'],
                ['Created', formatDate(selectedWithdrawal.createdAt)],
                ['Last synced', formatDate(selectedWithdrawal.lastSyncedAt)],
                ['Completed', formatDate(selectedWithdrawal.completedAt)],
              ].map(([label, value]) => (
                <div key={label} className="glass-card p-4">
                  <p className="text-xs text-muted mb-1">{label}</p>
                  <p className="text-primary break-all">{value}</p>
                </div>
              ))}
              <div className="glass-card p-4">
                <p className="text-xs text-muted mb-1">Token amount</p>
                <p className="text-primary"><GigCoinAmount amount={selectedWithdrawal.tokenAmount} /></p>
              </div>
              <div className="glass-card p-4">
                <p className="text-xs text-muted mb-1">Net transfer</p>
                <p className="text-primary">{formatVnd(selectedWithdrawal.netVndAmount)}</p>
              </div>
              {(selectedWithdrawal.failureReason || selectedWithdrawal.lastSyncError) && (
                <div className="glass-card p-4 sm:col-span-2 border border-amber-400/25 bg-amber-400/5">
                  <p className="text-xs text-muted mb-1">Failure / sync note</p>
                  <p className="text-primary">{selectedWithdrawal.failureReason || selectedWithdrawal.lastSyncError}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
