import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
  XCircle,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { GigCoinAmount, GigCoinLogo } from '../../../shared/components/GigCoinAmount';
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
import { useTranslation } from '../../../hooks/useTranslation';
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

function getStatusMeta(status: WithdrawalStatus, t: any) {
  switch (status) {
    case WithdrawalStatus.Pending:
      return {
        label: t('withdrawalsScreen.statusPending', { defaultValue: 'Đang xử lý' }),
        badgeClass: 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400',
      };
    case WithdrawalStatus.Processing:
      return {
        label: t('withdrawalsScreen.statusProcessing', { defaultValue: 'Đang xử lý tự động' }),
        badgeClass: 'bg-blue-500/15 border-blue-500/30 text-blue-600 dark:text-blue-400',
      };
    case WithdrawalStatus.SyncRequired:
      return {
        label: t('withdrawalsScreen.statusSyncRequired', { defaultValue: 'Đồng bộ lại' }),
        badgeClass: 'bg-indigo-500/15 border-indigo-500/30 text-indigo-600 dark:text-indigo-400',
      };
    case WithdrawalStatus.Success:
      return {
        label: t('withdrawalsScreen.statusSuccess', { defaultValue: 'Thành công' }),
        badgeClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
      };
    case WithdrawalStatus.Failed:
      return {
        label: t('withdrawalsScreen.statusFailed', { defaultValue: 'Thất bại' }),
        badgeClass: 'bg-rose-500/15 border-rose-500/30 text-rose-500',
      };
    case WithdrawalStatus.Cancelled:
      return {
        label: t('withdrawalsScreen.statusCancelled', { defaultValue: 'Đã hủy' }),
        badgeClass: 'bg-surface-muted border-border text-text-muted',
      };
    default:
      return {
        label: t('withdrawalsScreen.statusProcessing', { defaultValue: 'Đang xử lý' }),
        badgeClass: 'bg-blue-500/15 border-blue-500/30 text-blue-600',
      };
  }
}

function getResponseMessage(responseMessage: string | undefined, fallback: string): string {
  return responseMessage && responseMessage.trim().length > 0 ? responseMessage : fallback;
}

export default function EarlyPayoutScreen() {
  const { t } = useTranslation(['wallet', 'common']);
  const navigate = useNavigate();

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

  useEffect(() => {
    setSelectedBankId(current => {
      const activeIds = new Set(activeBankAccounts.map(account => account.bankAccountId));
      if (current && activeIds.has(current)) return current;
      const defaultBank = activeBankAccounts.find(account => account.isDefault);
      return defaultBank?.bankAccountId || activeBankAccounts[0]?.bankAccountId || '';
    });
  }, [activeBankAccounts]);

  const amountValue = Number(amount || 0);
  const depositedTokens = wallet?.depositedGigCoin ?? 0;
  const withdrawableTokens = wallet?.withdrawableGigCoin ?? 0;
  const nonWithdrawableTokens = depositedTokens;
  const feeVnd = settings?.fixedFeeVnd ?? 0;
  const vndAmount = amountValue * (settings?.vndPerToken ?? 1000);
  const netVnd = Math.max(0, vndAmount - feeVnd);
  const hasEnoughBalance = wallet ? amountValue <= withdrawableTokens : false;
  const withdrawMax = Math.min(settings?.maxTokens ?? withdrawableTokens, settings?.dailyMaxTokens ?? withdrawableTokens, withdrawableTokens);
  const amountValid =
    Number.isFinite(amountValue) &&
    Boolean(settings?.enabled) &&
    amountValue >= (settings?.minTokens ?? 1) &&
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
      nextError = getResponseMessage(walletRes.message, t('withdrawalsScreen.errorLoadWallet', { defaultValue: 'Không thể tải thông tin ví.' }));
    }

    if (withdrawalRes.success && withdrawalRes.data) {
      setWithdrawals(withdrawalRes.data);
    } else if (!nextError) {
      nextError = getResponseMessage(withdrawalRes.message, t('withdrawalsScreen.errorLoadHistory', { defaultValue: 'Không thể tải lịch sử rút tiền.' }));
    }

    if (settingsRes.success && settingsRes.data) {
      setSettings(settingsRes.data);
    } else if (!nextError) {
      nextError = getResponseMessage(settingsRes.message, t('withdrawalsScreen.errorLoadSettings', { defaultValue: 'Không thể tải cấu hình rút tiền.' }));
    }

    setError(nextError);
    setLoading(false);
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreateWithdrawal = async () => {
    if (!selectedBank) {
      setError(t('withdrawalsScreen.errorNoBank', { defaultValue: 'Vui lòng chọn tài khoản ngân hàng nhận tiền.' }));
      return;
    }

    if (!amountValid) {
      setError(t('withdrawalsScreen.errorInvalidAmount', {
        min: settings?.minTokens ?? 1,
        max: withdrawMax.toLocaleString('vi-VN'),
        defaultValue: `Số GigCoin rút phải từ ${settings?.minTokens ?? 1} đến ${withdrawMax.toLocaleString('vi-VN')} và không vượt quá thu nhập có thể rút.`,
      }));
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
      setSuccess(t('withdrawalsScreen.successCreated', { defaultValue: 'Đã tạo yêu cầu rút tiền thành công. Hệ thống tự động chuyển khoản qua cổng PayOS.' }));
      await loadData();
      window.dispatchEvent(new Event('gigbridge-wallet-updated'));
    } else {
      setError(getResponseMessage(response.message, t('wallet.errorCreateWithdrawal', { defaultValue: 'Không thể tạo yêu cầu rút tiền.' })));
    }

    setSubmitting(false);
  };

  const handleSyncWithdrawal = async (withdrawalId: string) => {
    setSyncingId(withdrawalId);
    setError('');
    setSuccess('');

    const response = await walletPostAPI.syncWithdrawal(withdrawalId);
    if (response.success && response.data) {
      setSuccess(t('withdrawalsScreen.successSynced', { defaultValue: 'Đã đồng bộ trạng thái rút tiền.' }));
      await loadData();
      window.dispatchEvent(new Event('gigbridge-wallet-updated'));
    } else {
      setError(getResponseMessage(response.message, t('withdrawalsScreen.errorSync', { defaultValue: 'Không thể đồng bộ trạng thái rút tiền.' })));
    }

    setSyncingId(null);
  };

  return (
    <AppLayout>
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/60 pb-6">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-1.5 rounded-xl border border-border bg-surface-card hover:bg-surface-muted text-text-muted hover:text-text-primary transition cursor-pointer"
                title="Go back"
              >
                <ArrowLeft size={16} />
              </button>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                <Sparkles size={12} /> {t('withdrawalsScreen.badgeLabel', { defaultValue: 'Withdrawal Center' })}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                <Coins size={11} /> {t('withdrawalsScreen.rateNotice', { defaultValue: '1 GigCoin = 1,000 VNĐ' })}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              {t('withdrawalsScreen.title', { defaultValue: 'Rút Tiền Về Ngân Hàng' })}
            </h1>
            <p className="text-xs text-text-muted font-medium">
              {t('withdrawalsScreen.subtitle', { defaultValue: 'Chuyển thu nhập GigCoin đã kiếm được về tài khoản ngân hàng chính chủ của bạn 24/7.' })}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface-card text-xs font-black text-text-primary hover:bg-surface-muted transition cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-brand' : 'text-brand'} />
            {t('withdrawalsScreen.refreshData', { defaultValue: 'Làm mới dữ liệu' })}
          </button>
        </div>

        {/* Alerts & System Maintenance Notices */}
        {error && (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-center gap-3 text-rose-600 dark:text-rose-400 animate-in fade-in">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="text-xs font-bold leading-relaxed">{error}</span>
          </div>
        )}
        {success && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3 text-emerald-600 dark:text-emerald-400 animate-in fade-in">
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="text-xs font-bold leading-relaxed">{success}</span>
          </div>
        )}
        {settings && !settings.enabled && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center gap-3 text-amber-600 dark:text-amber-400">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="text-xs font-bold">{t('withdrawalsScreen.maintenanceNotice', { defaultValue: 'Chức năng rút tiền hiện đang tạm khóa để bảo trì hệ thống chi tự động.' })}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <Loader2 size={40} className="animate-spin text-brand" />
            <span className="text-xs font-bold text-text-muted">{t('withdrawalsScreen.loadingData', { defaultValue: 'Đang tải thông tin ví và danh sách rút tiền...' })}</span>
          </div>
        ) : (
          <>
            {/* Wallet Balance Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Earned (Withdrawable) Balance Card */}
              <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-2 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <Banknote size={14} /> {t('withdrawalsScreen.statEarned', { defaultValue: 'Có thể rút (Earned)' })}
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <div className="flex items-baseline gap-2">
                  <GigCoinLogo size={24} />
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {withdrawableTokens.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-xs font-bold text-emerald-600/70">GigCoin</span>
                </div>
                <p className="text-xs font-extrabold text-emerald-600/80 dark:text-emerald-400/80">
                  {formatVnd(wallet?.withdrawableGigCoinVnd ?? 0)}
                </p>
              </div>

              {/* Deposited Pool Card */}
              <div className="rounded-3xl border border-border/80 bg-surface-card p-5 space-y-2 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Wallet size={14} className="text-brand" /> {t('withdrawalsScreen.statDeposited', { defaultValue: 'Đã nạp (Deposited)' })}
                </span>
                <div className="flex items-baseline gap-2">
                  <GigCoinLogo size={24} />
                  <span className="text-2xl font-black text-text-primary tracking-tight">
                    {depositedTokens.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-xs font-bold text-text-muted">GigCoin</span>
                </div>
                <p className="text-xs font-bold text-text-muted">
                  {formatVnd(wallet?.depositedGigCoinVnd ?? 0)} {t('withdrawalsScreen.statDepositedNote', { defaultValue: '(Không rút)' })}
                </p>
              </div>

              {/* Escrow Held Card */}
              <div className="rounded-3xl border border-border/80 bg-surface-card p-5 space-y-2 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-500" /> {t('withdrawalsScreen.statEscrow', { defaultValue: 'Escrow Bảo Chứng' })}
                </span>
                <div className="flex items-baseline gap-2">
                  <GigCoinLogo size={24} />
                  <span className="text-2xl font-black text-text-primary tracking-tight">
                    {(wallet?.heldGigCoin || 0).toLocaleString('vi-VN')}
                  </span>
                  <span className="text-xs font-bold text-text-muted">GigCoin</span>
                </div>
                <p className="text-xs font-bold text-text-muted">
                  {formatVnd(wallet?.heldGigCoinVnd || 0)}
                </p>
              </div>

              {/* Pending Withdrawal Card */}
              <div className="rounded-3xl border border-border/80 bg-surface-card p-5 space-y-2 shadow-xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Clock size={14} className="text-indigo-400" /> {t('withdrawalsScreen.statPending', { defaultValue: 'Đang Chờ Xử Lý' })}
                </span>
                <div className="flex items-baseline gap-2">
                  <GigCoinLogo size={24} />
                  <span className="text-2xl font-black text-text-primary tracking-tight">
                    {(wallet?.pendingWithdrawalGigCoin || 0).toLocaleString('vi-VN')}
                  </span>
                  <span className="text-xs font-bold text-text-muted">GigCoin</span>
                </div>
                <p className="text-xs font-bold text-text-muted">
                  {formatVnd(wallet?.pendingWithdrawalGigCoinVnd || 0)}
                </p>
              </div>
            </div>

            {/* SECTION 1: BANK ACCOUNT MANAGER (Full Width Spacious Container) */}
            <section className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={16} className="text-brand" />
                  {t('withdrawalsScreen.bankManagerTitle', { defaultValue: 'Quản Lý Tài Khoản Ngân Hàng Nhận Tiền' })}
                </h3>
                <span className="text-[11px] font-bold text-text-muted">{t('withdrawalsScreen.bankManagerSubtitle', { defaultValue: 'Thêm & chọn ngân hàng liên kết nhận tiền' })}</span>
              </div>
              
              <div className="rounded-3xl border border-border/80 bg-surface-card p-6 shadow-md overflow-hidden">
                <BankAccountManager onBankAccountsChange={setBankAccounts} />
              </div>
            </section>

            {/* SECTION 2: CREATE WITHDRAWAL REQUEST & SUMMARY GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Form Column (8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                <div className="rounded-3xl border border-border/80 bg-surface-card p-6 shadow-md space-y-5">
                  <h3 className="text-sm font-black text-text-primary uppercase tracking-wider border-b border-border/60 pb-3 flex items-center gap-2">
                    <Send size={16} className="text-brand" />
                    {t('withdrawalsScreen.formTitle', { defaultValue: 'Tạo Lệnh Rút Tiền Về Ngân Hàng' })}
                  </h3>

                  {/* Quick Amount Tiles */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-text-muted">
                      {t('withdrawalsScreen.selectQuick', { defaultValue: 'Chọn nhanh số GigCoin' })}
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {QUICK_AMOUNTS.map(quickAmount => {
                        const isDisabled =
                          !settings?.enabled ||
                          quickAmount > withdrawableTokens ||
                          quickAmount > Math.min(settings?.maxTokens ?? 0, settings?.dailyMaxTokens ?? 0);
                        const isSelected = amountValue === quickAmount;

                        return (
                          <button
                            key={quickAmount}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => setAmount(String(quickAmount))}
                            className={`rounded-2xl py-2.5 px-2 text-center text-xs font-black transition-all cursor-pointer border ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-xs ring-2 ring-emerald-500/20'
                                : 'border-border/80 bg-surface-card hover:bg-surface-muted text-text-primary disabled:opacity-40 disabled:cursor-not-allowed'
                            }`}
                          >
                            <GigCoinAmount amount={quickAmount} />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Amount Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-text-muted">
                      <label htmlFor="withdraw-amount-input">{t('withdrawalsScreen.customAmountLabel', { defaultValue: 'Số GigCoin muốn rút' })}</label>
                      <span>{t('withdrawalsScreen.maxWithdrawNotice', { max: withdrawMax.toLocaleString('vi-VN'), defaultValue: `Tối đa có thể rút: ${withdrawMax.toLocaleString('vi-VN')} G-coin` })}</span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand text-sm font-extrabold">
                        <GigCoinLogo size={18} />
                      </span>
                      <input
                        id="withdraw-amount-input"
                        type="number"
                        value={amount}
                        min={settings?.minTokens ?? 1}
                        max={withdrawMax}
                        step="0.0001"
                        onChange={event => setAmount(event.target.value)}
                        placeholder={t('withdrawalsScreen.customAmountPlaceholder', { defaultValue: 'Nhập số GigCoin...' })}
                        className="w-full h-12 rounded-2xl border border-border/80 bg-surface-muted/30 pl-12 pr-4 text-sm font-bold text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                      />
                    </div>
                    {nonWithdrawableTokens > 0 && (
                      <p className="text-[11px] font-semibold text-text-muted italic px-1">
                        {t('withdrawalsScreen.depositedNonWithdrawNotice', { amount: nonWithdrawableTokens.toLocaleString('vi-VN'), defaultValue: `* ${nonWithdrawableTokens.toLocaleString('vi-VN')} GigCoin từ nguồn đã nạp chỉ dùng thanh toán trong ứng dụng, không thể rút.` })}
                      </p>
                    )}
                  </div>

                  {/* Selected Bank Picker */}
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <label className="block text-xs font-black uppercase tracking-wider text-text-muted">
                      {t('withdrawalsScreen.bankPickerLabel', { defaultValue: 'Tài khoản ngân hàng nhận tiền' })}
                    </label>
                    {activeBankAccounts.length === 0 ? (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-3">
                        <AlertTriangle size={18} className="shrink-0" />
                        <span>{t('withdrawalsScreen.noBankWarning', { defaultValue: 'Chưa có tài khoản ngân hàng liên kết. Hãy thêm tài khoản ở phần trên trước khi tạo lệnh rút.' })}</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {activeBankAccounts.map(account => {
                          const isSelected = account.bankAccountId === selectedBankId;
                          return (
                            <button
                              key={account.bankAccountId}
                              type="button"
                              onClick={() => setSelectedBankId(account.bankAccountId)}
                              className={`rounded-2xl p-4 text-left border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                                isSelected
                                  ? 'border-brand bg-brand/10 shadow-xs ring-2 ring-brand/20'
                                  : 'border-border/80 bg-surface-card hover:border-brand/40 hover:bg-surface-muted/40'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <strong className="text-xs font-black text-text-primary">{account.bankName}</strong>
                                {account.isDefault && (
                                  <span className="rounded-full bg-brand/15 border border-brand/30 px-2 py-0.5 text-[9px] font-black uppercase text-brand">
                                    {t('wallet.bankAccount.defaultBadge', { defaultValue: 'Mặc định' })}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-text-muted font-medium">
                                <div>{account.accountName}</div>
                                <div className="font-mono text-text-primary font-bold mt-0.5">{account.accountNumberMasked}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary Column (4 cols Sticky) */}
              <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
                <div className="rounded-3xl border border-border/80 bg-surface-card p-6 shadow-xl space-y-5">
                  <h3 className="text-sm font-black text-text-primary uppercase tracking-wider border-b border-border/60 pb-3 flex items-center gap-2">
                    <Sparkles size={15} className="text-brand" />
                    {t('withdrawalsScreen.summaryTitle', { defaultValue: 'Tóm Tắt Lệnh Rút' })}
                  </h3>

                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between items-center text-text-muted font-medium">
                      <span>{t('withdrawalsScreen.summaryAmount', { defaultValue: 'Số GigCoin rút' })}</span>
                      <span className="text-text-primary font-black text-sm">{amountValue.toLocaleString('vi-VN')} G-coin</span>
                    </div>
                    <div className="flex justify-between items-center text-text-muted font-medium">
                      <span>{t('withdrawalsScreen.summaryVnd', { defaultValue: 'Quy đổi VNĐ (1k/coin)' })}</span>
                      <span className="text-text-primary font-bold">{formatVnd(vndAmount || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-text-muted font-medium">
                      <span>{t('withdrawalsScreen.summaryFee', { defaultValue: 'Phí xử lý giao dịch' })}</span>
                      <span className="text-rose-500 font-bold">{formatVnd(feeVnd)}</span>
                    </div>
                    <div className="flex justify-between items-center text-text-muted font-medium pt-2 border-t border-border/50">
                      <span className="font-black text-text-primary">{t('withdrawalsScreen.summaryNet', { defaultValue: 'Thực nhận về ngân hàng' })}</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-black text-base">{formatVnd(netVnd || 0)}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-surface-muted/30 p-3.5 flex items-center gap-2.5 text-xs text-text-muted font-medium">
                    <ShieldCheck size={16} className="text-emerald-500 shrink-0" />
                    <span>{t('withdrawalsScreen.summaryNote', { defaultValue: 'Lệnh rút được xử lý tự động qua cổng PayOS Out 24/7.' })}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleCreateWithdrawal()}
                    disabled={submitting || !amountValid || !selectedBank || withdrawableTokens <= 0}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 px-5 text-xs font-black text-white shadow-lg hover:bg-emerald-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    {withdrawableTokens <= 0
                      ? t('withdrawalsScreen.submitNoBalance', { defaultValue: 'Chưa có GigCoin có thể rút' })
                      : t('withdrawalsScreen.submitBtn', { defaultValue: 'Tạo Yêu Cầu Rút Tiền' })}
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 3: WITHDRAWAL HISTORY */}
            <section className="space-y-4 pt-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-sm font-black text-text-primary uppercase tracking-wider">{t('withdrawalsScreen.historyTitle', { defaultValue: 'Lịch Sử Rút Tiền' })}</h3>
                  <p className="text-xs text-text-muted font-medium mt-0.5">{t('withdrawalsScreen.historySubtitle', { defaultValue: 'Tự động chi tiền 24/7 qua cổng PayOS.' })}</p>
                </div>
                <span className="rounded-full bg-surface-muted border border-border px-3 py-1 text-xs font-bold text-text-muted">
                  {t('withdrawalsScreen.historyCount', { count: withdrawals.length, defaultValue: `${withdrawals.length} giao dịch` })}
                </span>
              </div>

              <div className="space-y-3">
                {withdrawals.map(withdrawal => {
                  const status = getStatusMeta(withdrawal.status, t);

                  return (
                    <div
                      key={withdrawal.withdrawalId}
                      className="rounded-2xl border border-border/80 bg-surface-card p-4.5 transition-all flex flex-wrap items-center justify-between gap-4 shadow-2xs hover:border-brand/40"
                    >
                      <div className="space-y-1 min-w-[200px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black border ${status.badgeClass}`}>
                            {status.label}
                          </span>
                          <span className="text-[11px] font-bold text-text-muted">Mã: {withdrawal.providerOrderCode || withdrawal.withdrawalId}</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <GigCoinLogo size={16} />
                          <span className="text-base font-black text-text-primary">
                            {withdrawal.tokenAmount.toLocaleString('vi-VN')} GigCoin
                          </span>
                          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                            ({formatVnd(withdrawal.netVndAmount)})
                          </span>
                        </div>
                      </div>

                      <div className="text-xs space-y-0.5 text-text-muted font-medium min-w-[180px]">
                        <div className="font-bold text-text-primary">{withdrawal.bankName}</div>
                        <div>{withdrawal.bankAccountName} · {withdrawal.bankAccountNumberMasked}</div>
                      </div>

                      <div className="text-xs text-right space-y-1 shrink-0">
                        <div className="text-text-muted font-medium">Tạo: {formatDate(withdrawal.createdAt)}</div>
                        {withdrawal.completedAt && (
                          <div className="text-emerald-600 dark:text-emerald-400 font-bold">Hoàn tất: {formatDate(withdrawal.completedAt)}</div>
                        )}
                        {withdrawal.failureReason && (
                          <div className="text-rose-500 font-bold text-[11px]">{withdrawal.failureReason}</div>
                        )}
                        {!isTerminalStatus(withdrawal.status) && (
                          <button
                            type="button"
                            onClick={() => void handleSyncWithdrawal(withdrawal.withdrawalId)}
                            disabled={syncingId === withdrawal.withdrawalId}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-muted px-3 py-1 text-[11px] font-bold text-text-primary hover:bg-border/60 transition cursor-pointer"
                          >
                            {syncingId === withdrawal.withdrawalId ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                            {t('withdrawalsScreen.checkStatus', { defaultValue: 'Kiểm tra trạng thái' })}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {withdrawals.length === 0 && (
                  <div className="rounded-3xl border border-border/80 bg-surface-card p-12 text-center text-xs text-text-muted space-y-2">
                    <XCircle size={36} className="mx-auto text-text-muted/40" />
                    <p className="font-bold text-text-primary text-sm">{t('withdrawalsScreen.historyEmpty', { defaultValue: 'Chưa có yêu cầu rút tiền nào.' })}</p>
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
