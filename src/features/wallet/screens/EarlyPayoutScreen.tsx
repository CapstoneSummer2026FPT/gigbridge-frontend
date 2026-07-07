import { useEffect, useMemo, useState } from 'react';
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
import { BankAccountStatus, WithdrawalStatus } from '../../../types';
import type { BankAccountResponse, WalletResponse, WithdrawalResponse } from '../../../types';
import '../styles/early-payout-screen.css';

const VND_PER_GIGCOIN = 1000;
const MIN_WITHDRAWAL_TOKENS = 10;
const MAX_WITHDRAWAL_TOKENS = 100_000;
const QUICK_AMOUNTS = [10, 50, 100, 500, 1000, 5000];

type BankFormState = {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
};

const emptyBankForm: BankFormState = {
  bankCode: '',
  bankName: '',
  accountNumber: '',
  accountName: '',
};

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

function makeIdempotencyKey(): string {
  return `withdraw_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function isTerminalStatus(status: WithdrawalStatus): boolean {
  return status === WithdrawalStatus.Success || status === WithdrawalStatus.Failed || status === WithdrawalStatus.Cancelled;
}

function getStatusMeta(status: WithdrawalStatus) {
  switch (status) {
    case WithdrawalStatus.Pending:
      return { label: 'Đang chờ', className: 'pending' };
    case WithdrawalStatus.Processing:
      return { label: 'Đang xử lý', className: 'processing' };
    case WithdrawalStatus.SyncRequired:
      return { label: 'Cần đồng bộ', className: 'sync' };
    case WithdrawalStatus.Success:
      return { label: 'Thành công', className: 'success' };
    case WithdrawalStatus.Failed:
      return { label: 'Thất bại', className: 'failed' };
    case WithdrawalStatus.Cancelled:
      return { label: 'Đã hủy', className: 'cancelled' };
    default:
      return { label: 'Đang xử lý', className: 'processing' };
  }
}

function getResponseMessage(responseMessage: string | undefined, fallback: string): string {
  return responseMessage && responseMessage.trim().length > 0 ? responseMessage : fallback;
}

export default function EarlyPayoutScreen() {
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccountResponse[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalResponse[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [amount, setAmount] = useState('100');
  const [bankForm, setBankForm] = useState<BankFormState>(emptyBankForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const activeBankAccounts = useMemo(
    () => bankAccounts.filter(account => account.status === BankAccountStatus.Active),
    [bankAccounts]
  );

  const selectedBank = useMemo(
    () => activeBankAccounts.find(account => account.bankAccountId === selectedBankId) || null,
    [activeBankAccounts, selectedBankId]
  );

  const amountValue = Number(amount || 0);
  const feeVnd = 0;
  const vndAmount = amountValue * VND_PER_GIGCOIN;
  const netVnd = Math.max(0, vndAmount - feeVnd);
  const hasEnoughBalance = wallet ? amountValue <= wallet.availableTokens : false;
  const amountValid =
    Number.isFinite(amountValue) &&
    amountValue >= MIN_WITHDRAWAL_TOKENS &&
    amountValue <= MAX_WITHDRAWAL_TOKENS &&
    hasEnoughBalance;

  const loadData = async () => {
    setLoading(true);
    setError('');

    const [walletRes, bankRes, withdrawalRes] = await Promise.all([
      walletGetAPI.getMyWallet(),
      walletGetAPI.getBankAccounts(),
      walletGetAPI.getWithdrawals(50),
    ]);
    let nextError = '';

    if (walletRes.success && walletRes.data) {
      setWallet(walletRes.data);
    } else {
      nextError = getResponseMessage(walletRes.message, 'Không thể tải ví.');
    }

    if (bankRes.success && bankRes.data) {
      setBankAccounts(bankRes.data);
      const defaultBank = bankRes.data.find(account => account.isDefault && account.status === BankAccountStatus.Active);
      const firstActive = bankRes.data.find(account => account.status === BankAccountStatus.Active);
      const activeIds = new Set(
        bankRes.data
          .filter(account => account.status === BankAccountStatus.Active)
          .map(account => account.bankAccountId)
      );
      setSelectedBankId(current => (current && activeIds.has(current) ? current : defaultBank?.bankAccountId || firstActive?.bankAccountId || ''));
    } else if (!nextError) {
      nextError = getResponseMessage(bankRes.message, 'Không thể tải tài khoản ngân hàng.');
    }

    if (withdrawalRes.success && withdrawalRes.data) {
      setWithdrawals(withdrawalRes.data);
    } else if (!nextError) {
      nextError = getResponseMessage(withdrawalRes.message, 'Không thể tải lịch sử rút tiền.');
    }

    setError(nextError);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleBankFormChange = (key: keyof BankFormState, value: string) => {
    setBankForm(prev => ({ ...prev, [key]: value }));
    setError('');
    setSuccess('');
  };

  const clearBankForm = () => {
    setBankForm(emptyBankForm);
    setEditingBankId(null);
  };

  const handleEditBank = (account: BankAccountResponse) => {
    setBankForm({
      bankCode: account.bankCode,
      bankName: account.bankName,
      accountName: account.accountName,
      accountNumber: '',
    });
    setEditingBankId(account.bankAccountId);
    setError('');
    setSuccess('');
  };

  const handleSaveBankAccount = async () => {
    const accountNumberPattern = /^[0-9A-Za-z\s.-]{6,34}$/;
    const accountNumber = bankForm.accountNumber.trim();
    const basePayload = {
      bankCode: bankForm.bankCode.trim().toUpperCase(),
      bankName: bankForm.bankName.trim(),
      accountName: bankForm.accountName.trim(),
    };

    if (!basePayload.bankCode || basePayload.bankCode.length < 2 || basePayload.bankName.length < 2) {
      setError('Vui lòng nhập mã ngân hàng và tên ngân hàng hợp lệ.');
      return;
    }

    if (basePayload.accountName.length < 2 || (!editingBankId && !accountNumberPattern.test(accountNumber))) {
      setError('Vui lòng nhập tên chủ tài khoản và số tài khoản hợp lệ.');
      return;
    }

    if (editingBankId && accountNumber && !accountNumberPattern.test(accountNumber)) {
      setError('Số tài khoản mới không hợp lệ.');
      return;
    }

    setSavingBank(true);
    setError('');
    setSuccess('');

    const response = editingBankId
      ? await walletPostAPI.updateBankAccount(editingBankId, {
        ...basePayload,
        ...(accountNumber ? { accountNumber } : {}),
      })
      : await walletPostAPI.createBankAccount({
        ...basePayload,
        accountNumber,
        isDefault: activeBankAccounts.length === 0,
      });

    if (response.success && response.data) {
      clearBankForm();
      setSuccess(editingBankId ? 'Đã cập nhật tài khoản ngân hàng.' : 'Đã lưu tài khoản ngân hàng.');
      await loadData();
      setSelectedBankId(response.data.bankAccountId);
    } else {
      setError(getResponseMessage(response.message, 'Không thể lưu tài khoản ngân hàng.'));
    }

    setSavingBank(false);
  };

  const handleSetDefaultBank = async (bankAccountId: string) => {
    setSavingBank(true);
    setError('');
    setSuccess('');

    const response = await walletPostAPI.updateBankAccount(bankAccountId, { isDefault: true });
    if (response.success && response.data) {
      setSelectedBankId(response.data.bankAccountId);
      setSuccess('Đã đặt tài khoản mặc định.');
      await loadData();
    } else {
      setError(getResponseMessage(response.message, 'Không thể đặt tài khoản mặc định.'));
    }

    setSavingBank(false);
  };

  const handleDeleteBank = async (bankAccountId: string) => {
    setSavingBank(true);
    setError('');
    setSuccess('');

    const response = await walletPostAPI.deleteBankAccount(bankAccountId);
    if (response.success) {
      setSuccess('Đã xóa tài khoản ngân hàng.');
      setSelectedBankId(current => (current === bankAccountId ? '' : current));
      if (editingBankId === bankAccountId) {
        clearBankForm();
      }
      await loadData();
    } else {
      setError(getResponseMessage(response.message, 'Không thể xóa tài khoản đang dùng cho lệnh rút tiền.'));
    }

    setSavingBank(false);
  };

  const handleCreateWithdrawal = async () => {
    if (!selectedBank) {
      setError('Vui lòng chọn tài khoản ngân hàng nhận tiền.');
      return;
    }

    if (!amountValid) {
      setError(`Số GigCoin rút phải từ ${MIN_WITHDRAWAL_TOKENS} đến ${MAX_WITHDRAWAL_TOKENS.toLocaleString('vi-VN')} và không vượt quá số dư khả dụng.`);
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    const response = await walletPostAPI.createWithdrawal({
      tokenAmount: amountValue,
      bankAccountId: selectedBank.bankAccountId,
      idempotencyKey: makeIdempotencyKey(),
    });

    if (response.success && response.data) {
      setAmount('');
      setSuccess('Đã tạo yêu cầu rút tiền. GigCoin đã được khóa cho đến khi PayOS trả trạng thái cuối.');
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
                <span>Khả dụng</span>
                <strong><GigCoinAmount amount={wallet?.availableTokens || 0} /></strong>
                <small>{formatVnd(wallet?.availableVnd || 0)}</small>
              </div>
              <div className="early-payout-stat">
                <ShieldCheck size={18} />
                <span>Escrow held</span>
                <strong><GigCoinAmount amount={wallet?.heldTokens || 0} /></strong>
                <small>{formatVnd(wallet?.heldVnd || 0)}</small>
              </div>
              <div className="early-payout-stat">
                <Clock size={18} />
                <span>Đang rút</span>
                <strong><GigCoinAmount amount={wallet?.pendingWithdrawalTokens || 0} /></strong>
                <small>{formatVnd(wallet?.pendingWithdrawalVnd || 0)}</small>
              </div>
            </section>

            <div className="early-payout-layout">
              <main className="early-payout-card">
                <div className="early-payout-balance">
                  <Wallet size={24} />
                  <div>
                    <span>Số dư có thể rút</span>
                    <strong><GigCoinAmount amount={wallet?.availableTokens || 0} /></strong>
                  </div>
                </div>

                <div className="early-payout-quick-grid">
                  {QUICK_AMOUNTS.map(quickAmount => (
                    <button
                      key={quickAmount}
                      type="button"
                      className={amountValue === quickAmount ? 'selected' : ''}
                      onClick={() => setAmount(String(quickAmount))}
                      disabled={quickAmount > (wallet?.availableTokens || 0)}
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
                    min={MIN_WITHDRAWAL_TOKENS}
                    max={MAX_WITHDRAWAL_TOKENS}
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
                  disabled={submitting || !amountValid || !selectedBank}
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                  Tạo yêu cầu rút tiền
                </button>
              </main>

              <aside className="early-payout-side">
                <div>
                  <Banknote size={22} />
                  <strong>{editingBankId ? 'Sửa tài khoản ngân hàng' : 'Thêm tài khoản ngân hàng'}</strong>
                  <div className="early-payout-form-grid">
                    <input value={bankForm.bankCode} onChange={event => handleBankFormChange('bankCode', event.target.value)} placeholder="Mã ngân hàng" />
                    <input value={bankForm.bankName} onChange={event => handleBankFormChange('bankName', event.target.value)} placeholder="Tên ngân hàng" />
                    <input value={bankForm.accountName} onChange={event => handleBankFormChange('accountName', event.target.value)} placeholder="Tên chủ tài khoản" />
                    <input value={bankForm.accountNumber} onChange={event => handleBankFormChange('accountNumber', event.target.value)} placeholder={editingBankId ? 'Số tài khoản mới (tùy chọn)' : 'Số tài khoản'} />
                  </div>
                  <button type="button" onClick={() => void handleSaveBankAccount()} disabled={savingBank}>
                    {savingBank ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                    {editingBankId ? 'Cập nhật tài khoản' : 'Lưu tài khoản'}
                  </button>
                  {editingBankId && (
                    <button type="button" onClick={clearBankForm} disabled={savingBank}>
                      Hủy sửa
                    </button>
                  )}
                </div>

                <div>
                  <ShieldCheck size={22} />
                  <strong>Tài khoản đã lưu</strong>
                  <div className="early-payout-bank-list">
                    {activeBankAccounts.map(account => (
                      <article key={account.bankAccountId}>
                        <span>{account.bankName}</span>
                        <p>{account.accountName}</p>
                        <p>{account.accountNumberMasked}</p>
                        <div>
                          {!account.isDefault && (
                            <button type="button" onClick={() => void handleSetDefaultBank(account.bankAccountId)} disabled={savingBank}>
                              Đặt mặc định
                            </button>
                          )}
                          <button type="button" onClick={() => handleEditBank(account)} disabled={savingBank}>
                            Sửa
                          </button>
                          <button type="button" onClick={() => void handleDeleteBank(account.bankAccountId)} disabled={savingBank}>
                            Xóa
                          </button>
                        </div>
                      </article>
                    ))}
                    {activeBankAccounts.length === 0 && <p>Chưa có tài khoản ngân hàng.</p>}
                  </div>
                </div>
              </aside>
            </div>

            <section className="early-payout-history">
              <div className="early-payout-history-head">
                <div>
                  <h2>Lịch sử rút tiền</h2>
                  <p>SYNC_REQUIRED vẫn giữ tiền bị khóa cho đến khi đồng bộ được trạng thái cuối.</p>
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
                            Đồng bộ
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
