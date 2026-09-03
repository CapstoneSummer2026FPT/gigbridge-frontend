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
  Zap,
  Copy,
  Check,
  Search,
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
import { toast } from 'sonner';
import '../styles/early-payout-screen.css';
import { isValidationResponse, showValidationToast } from '../../../shared/utils/validationToast';

const QUICK_AMOUNTS = [10, 50, 100, 500, 1000, 5000];
const PERCENTAGE_PRESETS = [0.25, 0.5, 0.75, 1];

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
        badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
      };
    case WithdrawalStatus.Processing:
      return {
        label: t('withdrawalsScreen.statusProcessing', { defaultValue: 'Đang xử lý tự động' }),
        badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30',
      };
    case WithdrawalStatus.SyncRequired:
      return {
        label: t('withdrawalsScreen.statusSyncRequired', { defaultValue: 'Đồng bộ lại' }),
        badgeClass: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30',
      };
    case WithdrawalStatus.Success:
      return {
        label: t('withdrawalsScreen.statusSuccess', { defaultValue: 'Thành công' }),
        badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
      };
    case WithdrawalStatus.Failed:
      return {
        label: t('withdrawalsScreen.statusFailed', { defaultValue: 'Thất bại' }),
        badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30',
      };
    case WithdrawalStatus.Cancelled:
      return {
        label: t('withdrawalsScreen.statusCancelled', { defaultValue: 'Đã hủy' }),
        badgeClass: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border border-zinc-500/30',
      };
    default:
      return {
        label: t('withdrawalsScreen.statusProcessing', { defaultValue: 'Đang xử lý' }),
        badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30',
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
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'success' | 'processing' | 'failed'>('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const withdrawalDraftRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);

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
  const vndPerToken = settings?.vndPerToken ?? 1000;
  const vndAmount = amountValue * vndPerToken;
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
    const validationMessages: string[] = [];
    if (!selectedBank) {
      validationMessages.push(t('withdrawalsScreen.errorNoBank', { defaultValue: 'Vui lòng chọn tài khoản ngân hàng nhận tiền.' }));
    }

    if (!amountValid) {
      validationMessages.push(t('withdrawalsScreen.errorInvalidAmount', {
        min: settings?.minTokens ?? 1,
        max: withdrawMax.toLocaleString('vi-VN'),
        defaultValue: `Số GigCoin rút phải từ ${settings?.minTokens ?? 1} đến ${withdrawMax.toLocaleString('vi-VN')} và không vượt quá thu nhập có thể rút.`,
      }));
    }

    if (validationMessages.length > 0) {
      showValidationToast(validationMessages, { fallback: t('withdrawalsScreen.errorCreateWithdrawal') });
      if (!selectedBank) document.querySelector<HTMLElement>('.eps-bank-picker-grid button')?.focus();
      else amountInputRef.current?.focus();
      return;
    }

    if (!selectedBank) return;

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
      const fallback = getResponseMessage(response.message, t('withdrawalsScreen.errorCreateWithdrawal', { defaultValue: 'Không thể tạo yêu cầu rút tiền.' }));
      if (isValidationResponse(response)) showValidationToast(response, { fallback });
      else setError(fallback);
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
      const fallback = getResponseMessage(response.message, t('withdrawalsScreen.errorSync', { defaultValue: 'Không thể đồng bộ trạng thái rút tiền.' }));
      if (isValidationResponse(response)) showValidationToast(response, { fallback });
      else setError(fallback);
    }

    setSyncingId(null);
  };

  const handleApplyPercentage = (pct: number) => {
    if (withdrawMax <= 0) return;
    const computed = Math.floor(withdrawMax * pct);
    setAmount(String(computed));
  };

  const handleCopyOrderId = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedOrderId(code);
    toast.success(t('common.copied', { defaultValue: 'Đã sao chép mã giao dịch' }));
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  // Filtered History Records
  const filteredWithdrawals = useMemo(() => {
    return withdrawals.filter(w => {
      // Tab status filter
      if (historyFilter === 'success' && w.status !== WithdrawalStatus.Success) return false;
      if (historyFilter === 'failed' && (w.status !== WithdrawalStatus.Failed && w.status !== WithdrawalStatus.Cancelled)) return false;
      if (historyFilter === 'processing' && (w.status !== WithdrawalStatus.Pending && w.status !== WithdrawalStatus.Processing && w.status !== WithdrawalStatus.SyncRequired)) return false;

      // Query filter
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase().trim();
        const matchCode = (w.providerOrderCode || w.withdrawalId).toLowerCase().includes(q);
        const matchBank = w.bankName.toLowerCase().includes(q);
        const matchAccount = w.bankAccountNumberMasked.toLowerCase().includes(q);
        const matchHolder = w.bankAccountName.toLowerCase().includes(q);
        return matchCode || matchBank || matchAccount || matchHolder;
      }

      return true;
    });
  }, [withdrawals, historyFilter, historySearchQuery]);

  return (
    <AppLayout>
      <div className="eps-container">
        {/* Header Section */}
        <div className="eps-header">
          <div className="eps-header-left">
            <div className="eps-header-badges">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-1.5 rounded-xl border border-border bg-surface hover:bg-surface-muted text-text-muted hover:text-text-primary transition cursor-pointer"
                title="Quay lại"
              >
                <ArrowLeft size={16} />
              </button>
              <span className="eps-badge-pill eps-badge-primary">
                <Sparkles size={12} /> {t('withdrawalsScreen.badgeLabel', { defaultValue: 'Trung Tâm Rút Tiền' })}
              </span>
              <span className="eps-badge-pill eps-badge-rate">
                <Coins size={12} /> {t('withdrawalsScreen.rateNotice', { defaultValue: '1 GigCoin = 1,000 VNĐ' })}
              </span>
              <span className="eps-badge-pill eps-badge-secondary hidden sm:inline-flex">
                <Zap size={12} /> NAPAS 24/7 Auto Payout
              </span>
            </div>
            <h1 className="eps-title">
              {t('withdrawalsScreen.title', { defaultValue: 'Rút Tiền Về Ngân Hàng' })}
            </h1>
            <p className="eps-subtitle">
              {t('withdrawalsScreen.subtitle', { defaultValue: 'Chuyển thu nhập GigCoin đã kiếm được về tài khoản ngân hàng chính chủ của bạn 24/7.' })}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="eps-refresh-btn"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-brand' : 'text-brand'} />
            <span>{t('withdrawalsScreen.refreshData', { defaultValue: 'Làm mới dữ liệu' })}</span>
          </button>
        </div>

        {/* Alerts & System Maintenance Notices */}
        {error && (
          <div className="rounded-2xl bg-rose-600 text-white p-4 flex items-center gap-3 shadow-md animate-in fade-in">
            <AlertTriangle size={18} className="shrink-0" />
            <span className="text-xs font-bold leading-relaxed">{error}</span>
          </div>
        )}
        {success && (
          <div className="rounded-2xl bg-emerald-600 text-white p-4 flex items-center gap-3 shadow-md animate-in fade-in">
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="text-xs font-bold leading-relaxed">{success}</span>
          </div>
        )}
        {settings && !settings.enabled && (
          <div className="rounded-2xl bg-amber-600 text-white p-4 flex items-center gap-3 shadow-md">
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
            {/* Wallet Balance Hero Bento Grid */}
            <div className="eps-balance-grid">
              {/* Earned (Withdrawable) Balance Hero Card */}
              <div className="eps-hero-card">
                <div className="eps-hero-top">
                  <span className="eps-hero-badge">
                    <Banknote size={13} /> {t('withdrawalsScreen.statEarned', { defaultValue: 'Thu nhập có thể rút' })}
                  </span>
                  <span className="eps-live-dot">
                    <span className="eps-live-dot-ping" />
                    <span className="eps-live-dot-core" />
                  </span>
                </div>

                <div>
                  <div className="eps-hero-amount-row">
                    <GigCoinLogo size={26} />
                    <span className="eps-hero-amount">
                      {withdrawableTokens.toLocaleString('vi-VN')}
                    </span>
                    <span className="eps-hero-currency">GigCoin</span>
                  </div>
                </div>

                <div className="eps-hero-bottom">
                  <span className="eps-hero-vnd-badge">
                    ≈ {formatVnd(wallet?.withdrawableGigCoinVnd ?? 0)}
                  </span>
                  {withdrawableTokens > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(withdrawMax))}
                      className="eps-hero-withdraw-all-btn"
                    >
                      <Zap size={11} />
                      <span>Rút tối đa</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Deposited Pool Card */}
              <div className="eps-metric-card">
                <div className="eps-metric-top">
                  <span className="eps-metric-badge eps-metric-badge-indigo">
                    <Wallet size={12} /> {t('withdrawalsScreen.statDeposited', { defaultValue: 'Đã nạp' })}
                  </span>
                  <span className="text-[10px] font-bold text-text-muted">{t('withdrawalsScreen.statDepositedNote', { defaultValue: '(Không rút)' })}</span>
                </div>
                <div className="eps-metric-amount-row">
                  <GigCoinLogo size={20} />
                  <span className="eps-metric-amount">
                    {depositedTokens.toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="eps-metric-bottom">
                  <span>Giá trị VNĐ</span>
                  <span className="font-bold text-text-primary">{formatVnd(wallet?.depositedGigCoinVnd ?? 0)}</span>
                </div>
              </div>

              {/* Escrow Held Card */}
              <div className="eps-metric-card">
                <div className="eps-metric-top">
                  <span className="eps-metric-badge eps-metric-badge-amber">
                    <ShieldCheck size={12} /> {t('withdrawalsScreen.statEscrow', { defaultValue: 'Ký quỹ Escrow' })}
                  </span>
                </div>
                <div className="eps-metric-amount-row">
                  <GigCoinLogo size={20} />
                  <span className="eps-metric-amount">
                    {(wallet?.heldGigCoin || 0).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="eps-metric-bottom">
                  <span>Đang bảo chứng</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{formatVnd(wallet?.heldGigCoinVnd || 0)}</span>
                </div>
              </div>

              {/* Pending Withdrawal Card */}
              <div className="eps-metric-card">
                <div className="eps-metric-top">
                  <span className="eps-metric-badge eps-metric-badge-blue">
                    <Clock size={12} /> {t('withdrawalsScreen.statPending', { defaultValue: 'Đang xử lý' })}
                  </span>
                </div>
                <div className="eps-metric-amount-row">
                  <GigCoinLogo size={20} />
                  <span className="eps-metric-amount">
                    {(wallet?.pendingWithdrawalGigCoin || 0).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="eps-metric-bottom">
                  <span>Chờ giải ngân</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">{formatVnd(wallet?.pendingWithdrawalGigCoinVnd || 0)}</span>
                </div>
              </div>
            </div>

            {/* SECTION 1: BANK ACCOUNT MANAGER (Full Width Hub) */}
            <section className="space-y-3">
              <BankAccountManager onBankAccountsChange={setBankAccounts} />
            </section>

            {/* SECTION 2: CREATE WITHDRAWAL & SUMMARY WORKSPACE GRID */}
            <div className="eps-workspace-grid">
              {/* Form Column (Left) */}
              <div className="space-y-6">
                <div className="eps-section-card">
                  <div className="eps-section-header">
                    <h3 className="eps-section-title">
                      <Send size={18} className="text-brand" />
                      <span>{t('withdrawalsScreen.formTitle', { defaultValue: 'Tạo Lệnh Rút Tiền Về Ngân Hàng' })}</span>
                    </h3>
                  </div>

                  {/* Step 1: Pick Destination Bank */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                        <CreditCard size={14} className="text-brand" />
                        <span>{t('withdrawalsScreen.bankPickerLabel', { defaultValue: '1. Chọn tài khoản ngân hàng nhận tiền' })}</span>
                      </label>
                      <span className="text-[11px] font-bold text-text-muted">{activeBankAccounts.length} tài khoản khả dụng</span>
                    </div>

                    {activeBankAccounts.length === 0 ? (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-3">
                        <AlertTriangle size={18} className="shrink-0" />
                        <span>{t('withdrawalsScreen.noBankWarning', { defaultValue: 'Chưa có tài khoản ngân hàng liên kết. Hãy thêm tài khoản ở phần trên trước khi tạo lệnh rút.' })}</span>
                      </div>
                    ) : (
                      <div className="eps-bank-picker-grid">
                        {activeBankAccounts.map(account => {
                          const isSelected = account.bankAccountId === selectedBankId;
                          return (
                            <button
                              key={account.bankAccountId}
                              type="button"
                              onClick={() => setSelectedBankId(account.bankAccountId)}
                              className={`eps-bank-select-card ${isSelected ? 'is-active' : ''}`}
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
                                <div className="font-bold text-text-primary">{account.accountName}</div>
                                <div className="font-mono text-text-primary font-bold mt-0.5">{account.accountNumberMasked}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Step 2: Withdrawal Amount Inputs */}
                  <div className="space-y-4 pt-3 border-t border-border">
                    <div className="flex justify-between items-center text-xs font-black uppercase tracking-wider text-text-muted">
                      <label htmlFor="withdraw-amount-input" className="flex items-center gap-1.5">
                        <Coins size={14} className="text-brand" />
                        <span>{t('withdrawalsScreen.customAmountLabel', { defaultValue: '2. Số GigCoin muốn rút' })}</span>
                      </label>
                      <span>{t('withdrawalsScreen.maxWithdrawNotice', { max: withdrawMax.toLocaleString('vi-VN'), defaultValue: `Tối đa có thể rút: ${withdrawMax.toLocaleString('vi-VN')} G-coin` })}</span>
                    </div>

                    {/* Percentage Preset Pills */}
                    <div className="eps-quick-pills-row">
                      {PERCENTAGE_PRESETS.map(pct => {
                        const targetAmount = Math.floor(withdrawMax * pct);
                        const isSelected = amountValue > 0 && amountValue === targetAmount;
                        return (
                          <button
                            key={pct}
                            type="button"
                            disabled={withdrawMax <= 0}
                            onClick={() => handleApplyPercentage(pct)}
                            className={`eps-percentage-btn ${isSelected ? 'is-active' : ''}`}
                          >
                            {pct === 1 ? '100% (Tất cả)' : `${pct * 100}%`}
                          </button>
                        );
                      })}
                    </div>

                    {/* Quick Amount Tiles */}
                    <div className="space-y-2">
                      <span className="block text-[11px] font-bold text-text-muted">Hoặc chọn nhanh mệnh giá:</span>
                      <div className="eps-quick-grid">
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
                              className={`eps-quick-amount-btn ${isSelected ? 'is-selected' : ''}`}
                            >
                              <GigCoinAmount amount={quickAmount} />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Currency Input Box */}
                    <div className="eps-input-container">
                      <span className="eps-input-icon">
                        <GigCoinLogo size={20} />
                      </span>
                      <input
                        ref={amountInputRef}
                        id="withdraw-amount-input"
                        type="number"
                        value={amount}
                        min={settings?.minTokens ?? 1}
                        max={withdrawMax}
                        step="0.0001"
                        onChange={event => setAmount(event.target.value)}
                        placeholder={t('withdrawalsScreen.customAmountPlaceholder', { defaultValue: 'Nhập số GigCoin...' })}
                        className="eps-amount-input"
                      />
                      <span className="eps-input-badge-vnd">
                        ≈ {formatVnd(vndAmount || 0)}
                      </span>
                    </div>

                    {nonWithdrawableTokens > 0 && (
                      <p className="text-[11px] font-semibold text-text-muted italic px-1">
                        {t('withdrawalsScreen.depositedNonWithdrawNotice', { amount: nonWithdrawableTokens.toLocaleString('vi-VN'), defaultValue: `* ${nonWithdrawableTokens.toLocaleString('vi-VN')} GigCoin từ nguồn đã nạp chỉ dùng thanh toán trong ứng dụng, không thể rút.` })}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Summary Sticky Column (Right) */}
              <div className="eps-summary-sticky">
                <div className="eps-summary-card">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <h3 className="text-sm font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
                      <Sparkles size={16} className="text-brand" />
                      <span>{t('withdrawalsScreen.summaryTitle', { defaultValue: 'Tóm Tắt Lệnh Rút' })}</span>
                    </h3>
                    <span className="text-[10px] font-black uppercase text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      NAPAS 24/7
                    </span>
                  </div>

                  <div className="eps-summary-rows">
                    <div className="eps-summary-row">
                      <span>{t('withdrawalsScreen.summaryAmount', { defaultValue: 'Số GigCoin rút' })}</span>
                      <span className="eps-summary-row-val">{amountValue.toLocaleString('vi-VN')} G-coin</span>
                    </div>
                    <div className="eps-summary-row">
                      <span>{t('withdrawalsScreen.summaryVnd', { defaultValue: 'Quy đổi VNĐ (1k/coin)' })}</span>
                      <span className="eps-summary-row-val">{formatVnd(vndAmount || 0)}</span>
                    </div>
                    <div className="eps-summary-row">
                      <span>{t('withdrawalsScreen.summaryFee', { defaultValue: 'Phí xử lý giao dịch' })}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {feeVnd === 0 ? 'Miễn phí (0đ)' : formatVnd(feeVnd)}
                      </span>
                    </div>

                    {selectedBank && (
                      <div className="p-2.5 rounded-xl bg-surface-muted/60 border border-border text-xs space-y-1">
                        <div className="text-[10px] font-bold text-text-muted uppercase">Ngân hàng thụ hưởng</div>
                        <div className="font-bold text-text-primary">{selectedBank.bankName}</div>
                        <div className="text-text-muted font-mono">{selectedBank.accountNumberMasked} · {selectedBank.accountName}</div>
                      </div>
                    )}

                    <div className="eps-summary-total">
                      <span className="eps-summary-total-label">{t('withdrawalsScreen.summaryNet', { defaultValue: 'Thực nhận về ngân hàng' })}</span>
                      <span className="eps-summary-net-amount">{formatVnd(netVnd || 0)}</span>
                    </div>
                  </div>

                  <div className="eps-security-notice">
                    <ShieldCheck size={18} className="text-emerald-500 shrink-0" />
                    <span>{t('withdrawalsScreen.summaryNote', { defaultValue: 'Lệnh rút được xử lý tự động qua cổng PayOS Out 24/7 trong 1-3 phút.' })}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleCreateWithdrawal()}
                    disabled={submitting || withdrawableTokens <= 0 || !settings?.enabled}
                    className="eps-submit-btn"
                  >
                    {submitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                    <span>
                      {withdrawableTokens <= 0
                        ? t('withdrawalsScreen.submitNoBalance', { defaultValue: 'Chưa có GigCoin có thể rút' })
                        : t('withdrawalsScreen.submitBtn', { defaultValue: 'Tạo Yêu Cầu Rút Tiền' })}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {/* SECTION 3: WITHDRAWAL HISTORY */}
            <section className="eps-history-section">
              <div className="eps-history-header">
                <div>
                  <h3 className="text-base font-black text-text-primary uppercase tracking-tight flex items-center gap-2">
                    <Clock size={18} className="text-brand" />
                    <span>{t('withdrawalsScreen.historyTitle', { defaultValue: 'Lịch Sử Rút Tiền' })}</span>
                  </h3>
                  <p className="text-xs text-text-muted font-medium mt-0.5">
                    {t('withdrawalsScreen.historySubtitle', { defaultValue: 'Tự động chi tiền 24/7 qua cổng PayOS.' })}
                  </p>
                </div>

                {/* Filter Tabs & Search Box */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="eps-history-tabs">
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('all')}
                      className={`eps-history-tab ${historyFilter === 'all' ? 'is-active' : ''}`}
                    >
                      Tất cả ({withdrawals.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('processing')}
                      className={`eps-history-tab ${historyFilter === 'processing' ? 'is-active' : ''}`}
                    >
                      Đang xử lý
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('success')}
                      className={`eps-history-tab ${historyFilter === 'success' ? 'is-active' : ''}`}
                    >
                      Thành công
                    </button>
                    <button
                      type="button"
                      onClick={() => setHistoryFilter('failed')}
                      className={`eps-history-tab ${historyFilter === 'failed' ? 'is-active' : ''}`}
                    >
                      Thất bại
                    </button>
                  </div>

                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={historySearchQuery}
                      onChange={e => setHistorySearchQuery(e.target.value)}
                      placeholder="Tìm mã lệnh / ngân hàng..."
                      className="h-8.5 pl-8 pr-3 text-xs rounded-xl border border-border bg-surface font-medium outline-none focus:border-brand"
                    />
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-3">
                {filteredWithdrawals.map(withdrawal => {
                  const status = getStatusMeta(withdrawal.status, t);
                  const orderCode = withdrawal.providerOrderCode || withdrawal.withdrawalId;

                  return (
                    <div
                      key={withdrawal.withdrawalId}
                      className="eps-history-item"
                    >
                      <div className="space-y-1 min-w-[200px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black ${status.badgeClass}`}>
                            {status.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyOrderId(orderCode)}
                            className="text-[11px] font-bold text-text-muted hover:text-brand flex items-center gap-1 transition"
                            title="Sao chép mã"
                          >
                            <span>Mã: {orderCode.slice(0, 16)}...</span>
                            {copiedOrderId === orderCode ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          </button>
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
                        <div>{withdrawal.bankAccountName} · <span className="font-mono">{withdrawal.bankAccountNumberMasked}</span></div>
                      </div>

                      <div className="text-xs text-right space-y-1 shrink-0">
                        <div className="text-text-muted font-medium">Tạo: {formatDate(withdrawal.createdAt)}</div>
                        {withdrawal.completedAt && (
                          <div className="text-emerald-600 dark:text-emerald-400 font-bold">Hoàn tất: {formatDate(withdrawal.completedAt)}</div>
                        )}
                        {/* SyncRequired rows carry their cause in lastSyncError, not failureReason -
                            showing only the latter is why these rows looked blank. */}
                        {(withdrawal.failureReason || withdrawal.lastSyncError) && (
                          <div className="text-rose-500 font-bold text-[11px] max-w-xs">
                            {withdrawal.failureReason || withdrawal.lastSyncError}
                          </div>
                        )}
                        {withdrawal.providerRawStatus && !isTerminalStatus(withdrawal.status) && (
                          <div className="font-mono text-[10px] text-text-muted max-w-xs">
                            {withdrawal.providerRawStatus}
                          </div>
                        )}
                        {!isTerminalStatus(withdrawal.status) && (
                          <button
                            type="button"
                            onClick={() => void handleSyncWithdrawal(withdrawal.withdrawalId)}
                            disabled={syncingId === withdrawal.withdrawalId}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-muted px-3 py-1.5 text-[11px] font-bold text-text-primary hover:bg-border/60 transition cursor-pointer"
                          >
                            {syncingId === withdrawal.withdrawalId ? <Loader2 size={13} className="animate-spin text-brand" /> : <RefreshCw size={13} />}
                            <span>{t('withdrawalsScreen.checkStatus', { defaultValue: 'Kiểm tra trạng thái' })}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredWithdrawals.length === 0 && (
                  <div className="rounded-3xl border border-border/80 bg-surface p-12 text-center text-xs text-text-muted space-y-2">
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
