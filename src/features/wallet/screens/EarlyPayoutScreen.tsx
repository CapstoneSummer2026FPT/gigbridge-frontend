import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import { walletPostAPI } from '../../../api/walletAPI/POST';
import BankAccountManager from '../components/BankAccountManager';
import { BankAccountStatus, WithdrawalStatus } from '../../../types';
import type {
  BankAccountResponse,
  WalletResponse,
  WithdrawalResponse,
  WithdrawalSettingsResponse,
} from '../../../types';
import '../styles/early-payout-screen.css';

const QUICK_AMOUNTS = [10, 50, 100, 500, 1000, 5000];

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

function isTerminalStatus(status: WithdrawalStatus): boolean {
  return status === WithdrawalStatus.Success || status === WithdrawalStatus.Failed || status === WithdrawalStatus.Cancelled;
}

function getStatusMeta(status: WithdrawalStatus) {
  switch (status) {
    case WithdrawalStatus.Pending:
      return { label: 'Đang xử lý tự động', className: 'pending' };
    case WithdrawalStatus.Processing:
      return { label: 'Đang xử lý tự động', className: 'processing' };
    case WithdrawalStatus.SyncRequired:
      return { label: 'Đang xử lý tự động', className: 'processing' };
    case WithdrawalStatus.Success:
      return { label: 'Thành công', className: 'success' };
    case WithdrawalStatus.Failed:
      return { label: 'Thất bại', className: 'failed' };
    case WithdrawalStatus.Cancelled:
      return { label: 'Đã hủy', className: 'cancelled' };
    default:
      return { label: 'Đang xử lý tự động', className: 'processing' };
  }
}

function getResponseMessage(responseMessage: string | undefined, fallback: string): string {
  return responseMessage && responseMessage.trim().length > 0 ? responseMessage : fallback;
}

export default function EarlyPayoutScreen() {
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccountResponse[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalResponse[]>([]);
  const [settings, setSettings] = useState<WithdrawalSettingsResponse | null>(null);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [amount, setAmount] = useState('100');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const withdrawalDraftRef = useRef<{ fingerprint: string; key: string } | null>(null);

  const activeBankAccounts = useMemo(
    () => bankAccounts.filter(account => account.status === BankAccountStatus.Active && Boolean(account.bankBin)),
    [bankAccounts]
  );

  const selectedBank = useMemo(
    () => activeBankAccounts.find(account => account.bankAccountId === selectedBankId) || null,
    [activeBankAccounts, selectedBankId]
  );

  // Keep the selected payout account valid as the shared BankAccountManager
  // loads or changes accounts: if the current selection is gone, fall back to
  // the default account, then the first active account.
  useEffect(() => {
    setSelectedBankId(current => {
      const activeIds = new Set(activeBankAccounts.map(account => account.bankAccountId));
      if (current && activeIds.has(current)) return current;
      const defaultBank = activeBankAccounts.find(account => account.isDefault);
      return defaultBank?.bankAccountId || activeBankAccounts[0]?.bankAccountId || '';
    });
  }, [activeBankAccounts]);

  const amountValue = Number(amount || 0);
  // Deposited GigCoin is spendable in-platform but never withdrawable; earned
  // GigCoin is spendable and withdrawable. Only the earned pool can fund a
  // withdrawal.
  const depositedTokens = wallet?.depositedGigCoin ?? 0;
  const withdrawableTokens = wallet?.withdrawableGigCoin ?? 0;
  const nonWithdrawableTokens = depositedTokens;
  const feeVnd = settings?.fixedFeeVnd ?? 0;
  const vndAmount = amountValue * (settings?.vndPerToken ?? 0);
  const netVnd = Math.max(0, vndAmount - feeVnd);
  const hasEnoughBalance = wallet ? amountValue <= withdrawableTokens : false;
  // Withdrawal max is capped by the earned (withdrawable) pool.
  const withdrawMax = Math.min(settings?.maxTokens ?? 0, settings?.dailyMaxTokens ?? 0, withdrawableTokens);
  const amountValid =
    Number.isFinite(amountValue) &&
    Boolean(settings?.enabled) &&
    amountValue >= (settings?.minTokens ?? Number.POSITIVE_INFINITY) &&
    amountValue <= withdrawMax &&
    netVnd > 0 &&
    hasEnoughBalance;

  const loadData = async () => {
    setLoading(true);
    setError('');

    const [walletRes, withdrawalRes, settingsRes] = await Promise.all([
      walletGetAPI.getMyWallet(),
      walletGetAPI.getWithdrawals(50),
      walletGetAPI.getWithdrawalSettings(),
    ]);
    let nextError = '';

    if (walletRes.success && walletRes.data) {
      setWallet(walletRes.data);
    } else {
      nextError = getResponseMessage(walletRes.message, 'Không thể tải ví.');
    }

    if (withdrawalRes.success && withdrawalRes.data) {
      setWithdrawals(withdrawalRes.data);
    } else if (!nextError) {
      nextError = getResponseMessage(withdrawalRes.message, 'Không thể tải lịch sử rút tiền.');
    }

    if (settingsRes.success && settingsRes.data) {
      setSettings(settingsRes.data);
    } else if (!nextError) {
      nextError = getResponseMessage(settingsRes.message, 'Khong the tai cau hinh rut tien.');
    }

    setError(nextError);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreateWithdrawal = async () => {
    if (!selectedBank) {
      setError('Vui lòng chọn tài khoản ngân hàng nhận tiền.');
      return;
    }

    if (!amountValid) {
      setError(`Số GigCoin rút phải từ ${settings?.minTokens ?? 0} đến ${(settings?.maxTokens ?? 0).toLocaleString('vi-VN')} và không vượt quá thu nhập có thể rút.`);
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    const fingerprint = `${selectedBank.bankAccountId}:${amountValue}`;
    if (withdrawalDraftRef.current?.fingerprint !== fingerprint) {
      withdrawalDraftRef.current = { fingerprint, key: crypto.randomUUID() };
    }

    const response = await walletPostAPI.createWithdrawal({
      tokenAmount: amountValue,
      bankAccountId: selectedBank.bankAccountId,
      idempotencyKey: withdrawalDraftRef.current.key,
    });

    if (response.success && response.data) {
      withdrawalDraftRef.current = null;
      setAmount('');
      setSuccess('Đã xếp hàng yêu cầu rút tiền. Hệ thống sẽ tự động tạo lệnh chi và kiểm tra trạng thái PayOS.');
      await loadData();
      window.dispatchEvent(new Event('gigbridge-wallet-updated'));
    } else {
      setError(getResponseMessage(response.message, 'Không thể tạo yêu cầu rút tiền.'));
    }

    setSubmitting(false);
  };

  const handleSyncWithdrawal = async (withdrawalId: string) => {
    setSyncingId(withdrawalId);
    setError('');
    setSuccess('');

    const response = await walletPostAPI.syncWithdrawal(withdrawalId);
    if (response.success && response.data) {
      setSuccess('Đã đồng bộ trạng thái rút tiền.');
      await loadData();
      window.dispatchEvent(new Event('gigbridge-wallet-updated'));
    } else {
      setError(getResponseMessage(response.message, 'Không thể đồng bộ trạng thái rút tiền.'));
    }

    setSyncingId(null);
  };

  return (
    <AppLayout>
      <div className="early-payout-page">
        <header className="early-payout-header">
          <div>
            <p><Banknote size={18} /> Freelancer Withdrawal</p>
            <h1>Rút tiền về ngân hàng</h1>
            <span>GigCoin rút sẽ được khóa trong Pending Withdrawal cho đến khi nhà cung cấp trả kết quả cuối.</span>
          </div>
          <button type="button" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </button>
        </header>

        {error && <div className="early-payout-alert danger"><AlertTriangle size={17} />{error}</div>}
        {success && <div className="early-payout-alert success"><CheckCircle2 size={17} />{success}</div>}
        {settings && !settings.enabled && (
          <div className="early-payout-alert danger">
            <AlertTriangle size={17} />Chức năng rút tiền đang tạm khóa để bảo trì.
          </div>
        )}

        {loading ? (
          <div className="early-payout-loading">
            <Loader2 size={34} className="animate-spin" />
            <span>Đang tải ví rút tiền...</span>
          </div>
        ) : (
          <>
            <section className="early-payout-stats">
              <div className="early-payout-stat">
                <Wallet size={18} />
                <span>Đã nạp (Deposited)</span>
                <strong><GigCoinAmount amount={depositedTokens} /></strong>
                <small>{formatVnd(wallet?.depositedGigCoinVnd ?? 0)}</small>
              </div>
              <div className="early-payout-stat">
                <Banknote size={18} />
                <span>Có thể rút (Earned)</span>
                <strong><GigCoinAmount amount={withdrawableTokens} /></strong>
                <small>{formatVnd(wallet?.withdrawableGigCoinVnd ?? 0)}</small>
              </div>
              <div className="early-payout-stat">
                <ShieldCheck size={18} />
                <span>Escrow held</span>
                <strong><GigCoinAmount amount={wallet?.heldGigCoin || 0} /></strong>
                <small>{formatVnd(wallet?.heldGigCoinVnd || 0)}</small>
              </div>
              <div className="early-payout-stat">
                <Clock size={18} />
                <span>Đang rút</span>
                <strong><GigCoinAmount amount={wallet?.pendingWithdrawalGigCoin || 0} /></strong>
                <small>{formatVnd(wallet?.pendingWithdrawalGigCoinVnd || 0)}</small>
              </div>
            </section>

            <div className="early-payout-layout">
              <main className="early-payout-card">
                <div className="early-payout-balance">
                  <Wallet size={24} />
                  <div>
                    <span>GigCoin kiếm được có thể rút</span>
                    <strong><GigCoinAmount amount={withdrawableTokens} /></strong>
                    {withdrawableTokens <= 0 && (
                      <small className="early-payout-balance-note">
                        Bạn chưa có GigCoin đủ điều kiện rút. GigCoin kiếm được từ hợp đồng/đợt đã hoàn thành mới có thể rút.
                      </small>
                    )}
                    {nonWithdrawableTokens > 0 && (
                      <small className="early-payout-balance-note">
                        <GigCoinAmount amount={nonWithdrawableTokens} /> đã nạp chỉ dùng trong app, không thể rút.
                      </small>
                    )}
                  </div>
                </div>

                <div className="early-payout-quick-grid">
                  {QUICK_AMOUNTS.map(quickAmount => (
                    <button
                      key={quickAmount}
                      type="button"
                      className={amountValue === quickAmount ? 'selected' : ''}
                      onClick={() => setAmount(String(quickAmount))}
                      disabled={!settings?.enabled || quickAmount > withdrawableTokens ||
                        quickAmount > Math.min(settings?.maxTokens ?? 0, settings?.dailyMaxTokens ?? 0)}
                    >
                      <GigCoinAmount amount={quickAmount} />
                    </button>
                  ))}
                </div>

                <label>
                  Số GigCoin muốn rút
                  <input
                    value={amount}
                    type="number"
                    min={settings?.minTokens ?? 0}
                    max={withdrawMax}
                    step="0.0001"
                    onChange={event => setAmount(event.target.value)}
                    placeholder="Nhập số GigCoin"
                  />
                </label>

                <div className="early-payout-bank-picker">
                  <span>Tài khoản nhận tiền</span>
                  {activeBankAccounts.length === 0 ? (
                    <div className="early-payout-empty-bank">
                      <Banknote size={18} />
                      <p>Chưa có tài khoản ngân hàng. Hãy thêm tài khoản ở khung bên phải.</p>
                    </div>
                  ) : (
                    activeBankAccounts.map(account => (
                      <button
                        key={account.bankAccountId}
                        type="button"
                        className={account.bankAccountId === selectedBankId ? 'selected' : ''}
                        onClick={() => setSelectedBankId(account.bankAccountId)}
                      >
                        <b>{account.bankName}</b>
                        <small>{account.accountName} · {account.accountNumberMasked}</small>
                        {account.isDefault && <em>Mặc định</em>}
                      </button>
                    ))
                  )}
                </div>

                <div className="early-payout-summary">
                  <div><span>Yêu cầu rút</span><b><GigCoinAmount amount={amountValue || 0} /></b></div>
                  <div><span>Quy đổi VND</span><b>{formatVnd(vndAmount || 0)}</b></div>
                  <div><span>Phí xử lý</span><b>{formatVnd(feeVnd)}</b></div>
                  <div><span>Thực nhận</span><b>{formatVnd(netVnd || 0)}</b></div>
                </div>

                <button
                  className="early-payout-submit"
                  onClick={() => void handleCreateWithdrawal()}
                  disabled={submitting || !amountValid || !selectedBank || withdrawableTokens <= 0}
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  {withdrawableTokens <= 0 ? 'Chưa có GigCoin có thể rút' : 'Tạo yêu cầu rút tiền'}
                </button>
              </main>

              <aside className="early-payout-side">
                <BankAccountManager onBankAccountsChange={setBankAccounts} />
              </aside>
            </div>

            <section className="early-payout-history">
              <div className="early-payout-history-head">
                <div>
                  <h2>Lịch sử rút tiền</h2>
                  <p>Hệ thống tự động tạo lệnh chi và thử lại khi PayOS tạm thời gián đoạn.</p>
                </div>
              </div>

              <div className="early-payout-history-list">
                {withdrawals.map(withdrawal => {
                  const status = getStatusMeta(withdrawal.status);

                  return (
                    <article key={withdrawal.withdrawalId} className="early-payout-history-item">
                      <div>
                        <span className={`early-payout-status ${status.className}`}>{status.label}</span>
                        <strong><GigCoinAmount amount={withdrawal.tokenAmount} /></strong>
                        <small>{formatVnd(withdrawal.netVndAmount)}</small>
                      </div>
                      <div>
                        <b>{withdrawal.bankName}</b>
                        <span>{withdrawal.bankAccountName} · {withdrawal.bankAccountNumberMasked}</span>
                        <span>Mã lệnh: {withdrawal.providerOrderCode || withdrawal.withdrawalId}</span>
                      </div>
                      <div>
                        <span>Tạo lúc {formatDate(withdrawal.createdAt)}</span>
                        {withdrawal.completedAt && <span>Hoàn tất {formatDate(withdrawal.completedAt)}</span>}
                        {withdrawal.failureReason && <em>{withdrawal.failureReason}</em>}
                        {!isTerminalStatus(withdrawal.status) && (
                          <button
                            type="button"
                            onClick={() => void handleSyncWithdrawal(withdrawal.withdrawalId)}
                            disabled={syncingId === withdrawal.withdrawalId}
                          >
                            {syncingId === withdrawal.withdrawalId ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                            Kiểm tra trạng thái
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}

                {withdrawals.length === 0 && (
                  <div className="early-payout-empty-history">
                    <XCircle size={26} />
                    <span>Chưa có yêu cầu rút tiền.</span>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </div>
    </AppLayout>
  );
}
