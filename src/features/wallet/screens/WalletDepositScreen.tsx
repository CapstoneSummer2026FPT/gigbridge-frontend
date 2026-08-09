import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Coins,
  CreditCard,
  Loader2,
  QrCode,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import { walletPostAPI } from '../../../api/walletAPI/POST';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import { useTranslation } from '../../../hooks/useTranslation';

const VND_PER_GIGCOIN = 1000;
const MIN_VND = 10_000;
const MAX_VND = 250_000_000;
const LAST_PAYOS_ORDER_CODE_KEY = 'gigbridge:lastPayOsTopUpOrderCode';

const QUICK_AMOUNTS_VND = [50_000, 100_000, 200_000, 500_000, 1_000_000, 2_000_000];

function fmtVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

function makeIdempotencyKey(): string {
  return `topup_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function WalletDepositScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const syncAttemptedRef = useRef<number | null>(null);

  const [selectedVnd, setSelectedVnd] = useState<number>(100_000);
  const [customVnd, setCustomVnd] = useState('');
  const [processing, setProcessing] = useState(false);
  const [returnSuccess, setReturnSuccess] = useState(false);
  const [returnOrderCode, setReturnOrderCode] = useState<number | null>(null);
  const [syncingReturn, setSyncingReturn] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [errorText, setErrorText] = useState<string | null>(null);

  const finalVnd = customVnd ? parseInt(customVnd, 10) || 0 : selectedVnd;
  const gigcoinAmount = finalVnd / VND_PER_GIGCOIN;
  const isAmountValid = finalVnd >= MIN_VND && finalVnd <= MAX_VND;

  const fetchBalance = async () => {
    try {
      setLoadingBalance(true);
      const res = await walletGetAPI.getMyWallet();
      if (res.success && res.data) {
        setCurrentBalance(res.data.totalSpendableGigCoin);
      } else {
        setErrorText(res.message || t('walletDeposit.errorLoadBalance'));
      }
    } catch (error) {
      console.error('Failed to load wallet balance:', error);
      setErrorText(getErrorMessage(error, t('walletDeposit.errorServer')));
    } finally {
      setLoadingBalance(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('result');
    const status = params.get('status');
    const isCancelled = result === 'cancel' || params.get('cancel') === 'true' || status === 'CANCELLED';
    const fallbackOrderCode = window.localStorage.getItem(LAST_PAYOS_ORDER_CODE_KEY);
    const orderCode = Number(params.get('orderCode') || fallbackOrderCode);

    if (result === 'success' && !isCancelled) {
      setReturnSuccess(true);
      if (Number.isSafeInteger(orderCode) && orderCode > 0) {
        setReturnOrderCode(orderCode);
      }
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    if (isCancelled) {
      setErrorText(t('walletDeposit.errorCancelled'));
      window.localStorage.removeItem(LAST_PAYOS_ORDER_CODE_KEY);
      if (Number.isSafeInteger(orderCode) && orderCode > 0) {
        walletPostAPI.syncPayOsTopUp({ orderCode }).catch(err => {
          console.error('Failed to sync cancelled payment status:', err);
        });
      }
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    void fetchBalance();
  }, []);

  useEffect(() => {
    if (!returnSuccess) {
      return;
    }

    if (!returnOrderCode) {
      // If no orderCode, just fetch balance and finish
      void fetchBalance();
      return;
    }

    if (syncAttemptedRef.current === returnOrderCode) {
      return;
    }

    syncAttemptedRef.current = returnOrderCode;

    const syncReturnedTopUp = async () => {
      setSyncingReturn(true);
      setErrorText(null);

      try {
        let synced = false;

        for (let attempt = 0; attempt < 5; attempt += 1) {
          const syncRes = await walletPostAPI.syncPayOsTopUp({ orderCode: returnOrderCode });
          if (!syncRes.success) {
            setErrorText(syncRes.message || t('walletDeposit.errorSyncPayos'));
            break;
          }

          if (syncRes.data?.status === 1) {
            synced = true;
            setIsSynced(true);
            window.localStorage.removeItem(LAST_PAYOS_ORDER_CODE_KEY);
            break;
          }

          if (attempt < 4) {
            await new Promise(resolve => window.setTimeout(resolve, 3000));
          }
        }

        await fetchBalance();
        window.dispatchEvent(new Event('gigbridge-wallet-updated'));

        if (!synced) {
          setErrorText(t('walletDeposit.syncWarning'));
        }
      } catch (error) {
        console.error('PayOS sync error:', error);
        setErrorText(getErrorMessage(error, t('walletDeposit.errorSyncPayosStatus')));
      } finally {
        setSyncingReturn(false);
      }
    };

    void syncReturnedTopUp();
  }, [returnSuccess, returnOrderCode]);

  const handleDeposit = async () => {
    if (!isAmountValid || processing) {
      return;
    }

    setProcessing(true);
    setErrorText(null);

    try {
      const returnUrl = `${window.location.origin}/wallet/deposit?result=success`;
      const cancelUrl = `${window.location.origin}/wallet/deposit?result=cancel`;

      const res = await walletPostAPI.createTopUp({
        tokenAmount: gigcoinAmount,
        returnUrl,
        cancelUrl,
        idempotencyKey: makeIdempotencyKey(),
      });

      if (res.success && res.data?.checkoutUrl) {
        if (res.data.gatewayOrderCode) {
          window.localStorage.setItem(LAST_PAYOS_ORDER_CODE_KEY, res.data.gatewayOrderCode);
        }
        window.location.href = res.data.checkoutUrl;
        return;
      }

      setErrorText(res.message || t('walletDeposit.errorInitDeposit'));
      setProcessing(false);
    } catch (error) {
      console.error('Top-up error:', error);
      setErrorText(getErrorMessage(error, t('walletDeposit.errorInitDepositUnknown')));
      setProcessing(false);
    }
  };

  if (returnSuccess) {
    const isSuccessState = !syncingReturn && (isSynced || !errorText);

    return (
      <AppLayout>
        <div className="min-h-[85vh] flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl border border-border/80 bg-surface-card p-8 shadow-2xl text-center space-y-6">
            <div className={`relative w-20 h-20 rounded-full flex items-center justify-center mx-auto ${
              syncingReturn
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : isSuccessState
                  ? 'bg-emerald-500/15 border border-emerald-500/30'
                  : 'bg-amber-500/15 border border-amber-500/30'
            }`}>
              <div className={`absolute inset-0 rounded-full blur-xl pointer-events-none ${
                syncingReturn
                  ? 'bg-emerald-500/20 animate-pulse'
                  : isSuccessState
                    ? 'bg-emerald-500/30'
                    : 'bg-amber-500/20'
              }`} />

              {syncingReturn ? (
                <Loader2 size={44} className="text-emerald-500 animate-spin relative z-10" />
              ) : isSuccessState ? (
                <CheckCircle2 size={44} className="text-emerald-500 relative z-10 animate-in zoom-in-50 duration-300" />
              ) : (
                <AlertCircle size={44} className="text-amber-500 relative z-10" />
              )}
            </div>

            <div>
              <h2 className="text-2xl font-black text-text-primary tracking-tight">
                {syncingReturn
                  ? t('walletDeposit.syncTitle')
                  : isSuccessState
                    ? t('walletDeposit.syncSuccessTitle', { defaultValue: 'Nạp Tiền Thành Công!' })
                    : t('walletDeposit.syncTitle')}
              </h2>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                {syncingReturn
                  ? t('walletDeposit.syncDesc')
                  : isSuccessState
                    ? t('walletDeposit.syncSuccessDesc', { defaultValue: 'Giao dịch đã được xác nhận. Số dư GigCoin của bạn đã được cập nhật thành công!' })
                    : t('walletDeposit.syncDesc')}
              </p>
            </div>

            {errorText && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                {errorText}
              </div>
            )}

            <div className="rounded-2xl border border-border/80 bg-surface-muted/50 p-5 space-y-1">
              <span className="block text-[10px] font-black uppercase text-text-muted tracking-wider">{t('walletDeposit.currentBalance')}</span>
              <div className="flex items-center justify-center gap-2">
                <GigCoinLogo size={24} />
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {loadingBalance ? (
                    <Loader2 size={20} className="animate-spin inline" />
                  ) : (
                    `${fmtVnd(currentBalance)} GigCoin`
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => {
                  void fetchBalance();
                  if (returnOrderCode) {
                    void walletPostAPI.syncPayOsTopUp({ orderCode: returnOrderCode });
                  }
                }}
                disabled={syncingReturn}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-muted py-3 px-4 text-xs font-black text-text-primary hover:bg-border/60 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={15} className={syncingReturn ? 'animate-spin' : ''} />
                {t('walletDeposit.reloadBalance')}
              </button>
              <button
                onClick={() => navigate('/wallet/history')}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand py-3 px-4 text-xs font-black text-white shadow-md hover:bg-brand-hover transition cursor-pointer"
              >
                {t('walletDeposit.viewHistory')}
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        {/* Top Header & Navigation */}
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
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 text-brand text-[10px] font-black uppercase tracking-wider">
                <Sparkles size={12} /> {t('walletDeposit.badgeLabel', { defaultValue: 'Top-Up Wallet' })}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                <Coins size={11} /> 1 GigCoin = 1,000 VNĐ
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              {t('walletDeposit.title')}
            </h1>
            <p className="text-xs text-text-muted font-medium">
              {t('walletDeposit.subtitle')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/wallet/history')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface-card text-xs font-black text-text-primary hover:bg-surface-muted transition cursor-pointer shadow-2xs"
          >
            <Wallet size={15} className="text-brand" />
            {t('walletDeposit.viewHistory', { defaultValue: 'Lịch sử ví' })}
          </button>
        </div>

        {/* Main Grid: Left Options Column & Right Summary Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {errorText && (
              <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-3 text-rose-600 dark:text-rose-400 animate-in fade-in">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span className="text-xs font-bold leading-relaxed">{errorText}</span>
              </div>
            )}

            {/* Current Balance Banner Card */}
            <div className="relative rounded-3xl border border-border/80 bg-surface-card p-6 shadow-md overflow-hidden flex flex-wrap items-center justify-between gap-4">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
              <div className="space-y-1 relative z-10">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                  <Wallet size={13} className="text-brand" />
                  {t('walletDeposit.currentBalance')}
                </span>
                <div className="flex items-center gap-2.5">
                  <GigCoinLogo size={32} />
                  <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {loadingBalance ? (
                      <Loader2 size={24} className="animate-spin inline" />
                    ) : (
                      fmtVnd(currentBalance)
                    )}
                  </span>
                  <span className="text-xs font-extrabold text-text-muted uppercase">GigCoin</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { void fetchBalance(); }}
                disabled={loadingBalance}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface-muted/60 text-xs font-bold text-text-muted hover:text-text-primary transition cursor-pointer relative z-10"
              >
                <RefreshCw size={13} className={loadingBalance ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>

            {/* Quick Amount Tiles Selection Card */}
            <div className="rounded-3xl border border-border/80 bg-surface-card p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <h3 className="text-sm font-black text-text-primary uppercase tracking-wider flex items-center gap-2">
                  <Zap size={16} className="text-brand" />
                  {t('walletDeposit.selectAmount')}
                </h3>
                <span className="text-[11px] font-bold text-text-muted">Chọn gói nạp nhanh</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {QUICK_AMOUNTS_VND.map(amount => {
                  const isSelected = selectedVnd === amount && !customVnd;
                  const coins = amount / VND_PER_GIGCOIN;
                  return (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => {
                        setSelectedVnd(amount);
                        setCustomVnd('');
                      }}
                      className={`relative rounded-2xl p-4 text-left transition-all cursor-pointer border ${
                        isSelected
                          ? 'border-brand bg-brand/10 shadow-sm ring-2 ring-brand/30'
                          : 'border-border/80 bg-surface-card hover:border-brand/40 hover:bg-surface-muted/50'
                      }`}
                    >
                      {isSelected && (
                        <CheckCircle2 size={16} className="absolute top-3 right-3 text-brand" />
                      )}
                      <div className="text-sm font-black text-text-primary">{fmtVnd(amount)} đ</div>
                      <div className="text-xs font-extrabold text-brand mt-1 flex items-center gap-1">
                        <GigCoinLogo size={13} />
                        +{fmtVnd(coins)} G-coin
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Input */}
              <div className="pt-2 space-y-2">
                <label htmlFor="custom-deposit-input" className="block text-xs font-black uppercase tracking-wider text-text-muted">
                  {t('walletDeposit.customAmount')}
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted text-sm font-extrabold">VNĐ</span>
                  <input
                    id="custom-deposit-input"
                    type="number"
                    value={customVnd}
                    onChange={event => setCustomVnd(event.target.value)}
                    placeholder={t('walletDeposit.customAmountPlaceholder', { defaultValue: 'Nhập số tiền nạp tùy chỉnh...' })}
                    className="w-full h-12 rounded-2xl border border-border/80 bg-surface-muted/30 pl-14 pr-4 text-sm font-bold text-text-primary outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    min={MIN_VND}
                    max={MAX_VND}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold text-text-muted px-1">
                  <span>Tối thiểu: {fmtVnd(MIN_VND)} đ</span>
                  <span>Tối đa: {fmtVnd(MAX_VND)} đ</span>
                </div>

                {customVnd && parseInt(customVnd, 10) > 0 && (
                  <div className="mt-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center justify-between text-xs font-bold text-amber-600 dark:text-amber-400 animate-in fade-in">
                    <span>{t('walletDeposit.gigcoinReceived')}:</span>
                    <span className="flex items-center gap-1 font-black text-sm">
                      <GigCoinLogo size={16} />
                      +{fmtVnd((parseInt(customVnd, 10) || 0) / VND_PER_GIGCOIN)} GigCoin
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Payment Method Gateway Card */}
            <div className="rounded-3xl border border-border/80 bg-surface-card p-6 shadow-md space-y-4">
              <h3 className="text-sm font-black text-text-primary uppercase tracking-wider flex items-center gap-2 border-b border-border/60 pb-3">
                <CreditCard size={16} className="text-brand" />
                {t('walletDeposit.paymentMethod')}
              </h3>

              <div className="rounded-2xl border-2 border-brand bg-brand/5 p-4 flex items-center gap-4 relative overflow-hidden">
                <div className="h-12 w-12 rounded-xl bg-brand/15 border border-brand/30 flex items-center justify-center shrink-0">
                  <QrCode size={24} className="text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-sm font-black text-text-primary">Cổng Thanh Toán PayOS 24/7</h4>
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                      Tự động 24/7
                    </span>
                  </div>
                  <p className="text-xs text-text-muted font-medium mt-0.5">
                    Thanh toán quét mã VietQR ngân hàng hoặc chuyển khoản liên khoản nhận xu tức thì.
                  </p>
                </div>
                <CheckCircle2 size={20} className="text-brand shrink-0" />
              </div>

              <div className="rounded-2xl border border-border/60 bg-surface-muted/30 p-3.5 flex items-center gap-3 text-xs text-text-muted font-medium">
                <ShieldCheck size={18} className="text-brand shrink-0" />
                <span>{t('walletDeposit.securePaymentDesc', { defaultValue: 'Giao dịch được mã hóa an toàn bảo mật chuẩn ngân hàng.' })}</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky Order Summary (4 cols) */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
            <div className="rounded-3xl border border-border/80 bg-surface-card p-6 shadow-xl space-y-5">
              <h3 className="text-sm font-black text-text-primary uppercase tracking-wider border-b border-border/60 pb-3 flex items-center gap-2">
                <Sparkles size={15} className="text-brand" />
                {t('walletDeposit.summary')}
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between items-center text-text-muted font-medium">
                  <span>{t('walletDeposit.depositAmount')}</span>
                  <span className="text-text-primary font-black text-sm">{fmtVnd(finalVnd)} đ</span>
                </div>
                <div className="flex justify-between items-center text-text-muted font-medium">
                  <span>{t('walletDeposit.processingFee')}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">0 đ (Miễn phí)</span>
                </div>
                <div className="flex justify-between items-center text-text-muted font-medium pt-2 border-t border-border/50">
                  <span>{t('walletDeposit.gigcoinEarned')}</span>
                  <div className="flex items-center gap-1 text-brand font-black text-sm">
                    <GigCoinLogo size={14} />
                    +{fmtVnd(gigcoinAmount)} G-coin
                  </div>
                </div>
              </div>

              {/* Expected Balance Calculation Box */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-1">
                <span className="block text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">
                  {t('walletDeposit.newBalanceExpected')}
                </span>
                <div className="flex items-center gap-2 justify-end">
                  <GigCoinLogo size={22} />
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {loadingBalance ? '...' : fmtVnd(currentBalance + gigcoinAmount)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="button"
                  onClick={handleDeposit}
                  disabled={processing || !isAmountValid}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 px-5 text-xs font-black text-white shadow-lg hover:bg-brand-hover transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {t('walletDeposit.processing')}
                    </>
                  ) : (
                    <>
                      {t('walletDeposit.confirmDeposit', { defaultValue: 'Xác Nhận Nạp Tiền' })}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="w-full py-2.5 text-xs font-bold text-text-muted hover:text-text-primary transition cursor-pointer text-center"
                >
                  {t('walletDeposit.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
