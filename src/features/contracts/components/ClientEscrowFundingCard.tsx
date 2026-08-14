import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  HelpCircle,
  Info,
  LoaderCircle,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import { useTranslation } from '../../../hooks/useTranslation';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import { formatGigCoinPrecise, formatGigCoinToVnd } from '../../../shared/utils/gigcoin';
import type { ContractEscrowDto } from '../../../types/models/Contract';

interface ClientEscrowFundingCardProps {
  contractId: string;
  escrow: ContractEscrowDto | null | undefined;
  onFunded: () => void | Promise<void>;
  onRetryQuote: () => void | Promise<void>;
}

export function ClientEscrowFundingCard({
  contractId,
  escrow,
  onFunded,
  onRetryQuote,
}: ClientEscrowFundingCardProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const [funding, setFunding] = useState(false);
  const [showGuideDetails, setShowGuideDetails] = useState(true);
  const fundingRef = useRef(false);
  const walletLoadFailedMessage = t('contracts.walletLoadFailed');

  const hasValidQuote = Boolean(
    escrow &&
    Number.isFinite(escrow.requiredTokens) &&
    escrow.requiredTokens > 0 &&
    Number.isFinite(escrow.totalDebitTokens) &&
    escrow.totalDebitTokens > 0
  );

  const loadWallet = useCallback(async (): Promise<void> => {
    if (!hasValidQuote) {
      setWalletBalance(null);
      setWalletError(null);
      return;
    }

    setWalletLoading(true);
    setWalletError(null);
    try {
      const response = await walletGetAPI.getMyWallet();
      if (!response.success || !response.data) {
        setWalletBalance(null);
        setWalletError(response.message || walletLoadFailedMessage);
        return;
      }

      // Funding escrow spends from both spendable pools (deposited first).
      setWalletBalance(response.data.totalSpendableGigCoin);
    } catch {
      setWalletBalance(null);
      setWalletError(walletLoadFailedMessage);
    } finally {
      setWalletLoading(false);
    }
  }, [hasValidQuote, walletLoadFailedMessage]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const totalDebitTokens = escrow?.totalDebitTokens ?? 0;
  const shortfall = useMemo(
    () => Math.max(0, totalDebitTokens - (walletBalance ?? 0)),
    [totalDebitTokens, walletBalance]
  );
  const hasInsufficientBalance =
    walletBalance !== null && walletBalance < totalDebitTokens;

  const handleRetryQuote = (): void => {
    void onRetryQuote();
  };

  const handleRetryWallet = (): void => {
    void loadWallet();
  };

  const handleTopUp = (): void => {
    navigate('/wallet/deposit');
  };

  const handleFundEscrow = async (): Promise<void> => {
    if (fundingRef.current || !hasValidQuote || walletBalance === null || hasInsufficientBalance) {
      return;
    }

    fundingRef.current = true;
    setFunding(true);
    let funded = false;
    try {
      const response = await contractPostAPI.fundEscrow(contractId);
      if (!response.success) {
        toast.error(response.message || t('contracts.escrowFundingFailed'));
        return;
      }

      funded = true;
      toast.success(t('contracts.escrowFundedSuccess'));
      await onFunded();
    } catch {
      if (!funded) {
        toast.error(t('contracts.escrowFundingFailed'));
      }
    } finally {
      if (!funded) {
        fundingRef.current = false;
        setFunding(false);
      }
    }
  };

  if (!hasValidQuote || !escrow) {
    return (
      <section className="rounded-3xl border border-border/80 bg-surface-card p-6 md:p-8 space-y-5 shadow-md" aria-label={t('contracts.secureContractEscrow')}>
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
            <AlertCircle size={20} />
          </div>
          <div>
            <h2 className="text-lg font-black text-text-primary tracking-tight">
              {t('contracts.secureContractEscrow')}
            </h2>
            <p className="text-xs font-semibold text-text-muted">{t('contracts.escrowQuoteUnavailable')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleRetryQuote}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border/80 bg-surface-muted px-5 py-2.5 text-xs font-black text-text-primary transition-all hover:bg-border/60 cursor-pointer shadow-xs"
        >
          <RefreshCw size={15} />
          {t('contracts.retry')}
        </button>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-border/80 bg-surface-card p-6 md:p-8 space-y-6 shadow-md" aria-label={t('contracts.secureContractEscrow')}>
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-xs">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-black text-text-primary tracking-tight">
                {t('contracts.secureContractEscrow')}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                GigBridge Protected
              </span>
            </div>
            <p className="text-xs font-semibold text-text-muted mt-0.5">
              {t('contracts.escrowFundingDesc')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowGuideDetails(prev => !prev)}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border bg-surface-muted/60 text-text-muted hover:text-text-primary transition-all text-xs font-extrabold cursor-pointer self-start sm:self-auto shrink-0"
        >
          <HelpCircle size={14} className="text-brand" />
          <span>{t('contracts.escrowGuideTitle', { defaultValue: 'Hướng dẫn Ký quỹ' })}</span>
          <ChevronDown size={13} className={`transition-transform duration-200 ${showGuideDetails ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Step-by-Step Escrow Protection Guide Box */}
      {showGuideDetails && (
        <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-brand" />
            <h3 className="text-xs font-black uppercase tracking-wider text-brand">
              {t('contracts.escrowGuideTitle', { defaultValue: 'Hướng dẫn & Quy trình Bảo chứng Escrow' })}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Step 1 */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-surface-card space-y-1">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
                <Lock size={15} />
                <span>{t('contracts.escrowGuideStep1Title', { defaultValue: '1. Khóa Tiền An Toàn' })}</span>
              </div>
              <p className="text-[11px] font-medium text-text-muted leading-relaxed">
                {t('contracts.escrowGuideStep1Desc', { defaultValue: '100% ngân sách được giữ an toàn tại GigBridge, bảo vệ tài chính tối đa.' })}
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-surface-card space-y-1">
              <div className="flex items-center gap-2 text-brand font-extrabold text-xs">
                <Info size={15} />
                <span>{t('contracts.escrowGuideStep2Title', { defaultValue: '2. Bàn Giao Sản Phẩm' })}</span>
              </div>
              <p className="text-[11px] font-medium text-text-muted leading-relaxed">
                {t('contracts.escrowGuideStep2Desc', { defaultValue: 'Freelancer tiến hành công việc và gửi sản phẩm nghiệm thu từng mốc.' })}
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-surface-card space-y-1">
              <div className="flex items-center gap-2 text-amber-500 font-extrabold text-xs">
                <CheckCircle2 size={15} />
                <span>{t('contracts.escrowGuideStep3Title', { defaultValue: '3. Duyệt & Giải Ngân' })}</span>
              </div>
              <p className="text-[11px] font-medium text-text-muted leading-relaxed">
                {t('contracts.escrowGuideStep3Desc', { defaultValue: 'Tiền chỉ được giải ngân khi bạn xem xét và bấm phê duyệt sản phẩm.' })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3 Metric Breakdown Tiles with VND Equivalent */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tile 1: Required Escrow */}
        <div className="rounded-2xl border border-border/80 bg-surface-muted/30 p-5 space-y-1 shadow-xs">
          <span className="block text-[10px] font-black uppercase tracking-widest text-text-muted">
            {t('contracts.escrowHeldTokens')}
          </span>
          <span className="block text-2xl font-black text-text-primary tracking-tight">
            {formatGigCoinPrecise(escrow.requiredTokens)}
          </span>
          <span className="block text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
            {t('contracts.vndEquivalent', { defaultValue: '≈ {{vnd}}', vnd: formatGigCoinToVnd(escrow.requiredTokens) })}
          </span>
        </div>

        {/* Tile 2: Funding Fee */}
        <div className="rounded-2xl border border-border/80 bg-surface-muted/30 p-5 space-y-1 shadow-xs">
          <span className="block text-[10px] font-black uppercase tracking-widest text-text-muted">
            {t('contracts.escrowFundingFee', { percent: escrow.fundingFeeRate * 100 })}
          </span>
          <span className="block text-2xl font-black text-text-primary tracking-tight">
            {formatGigCoinPrecise(escrow.fundingFeeTokens)}
          </span>
          <span className="block text-xs font-extrabold text-text-muted">
            {t('contracts.vndEquivalent', { defaultValue: '≈ {{vnd}}', vnd: formatGigCoinToVnd(escrow.fundingFeeTokens) })}
          </span>
        </div>

        {/* Tile 3: Total Debit */}
        <div className="rounded-2xl border border-brand/30 bg-brand/10 p-5 space-y-1 shadow-xs">
          <span className="block text-[10px] font-black uppercase tracking-widest text-brand">
            {t('contracts.totalWalletDebit')}
          </span>
          <span className="block text-2xl font-black text-brand tracking-tight">
            {formatGigCoinPrecise(escrow.totalDebitTokens)}
          </span>
          <span className="block text-xs font-extrabold text-brand/80">
            {t('contracts.vndEquivalent', { defaultValue: '≈ {{vnd}}', vnd: formatGigCoinToVnd(escrow.totalDebitTokens) })}
          </span>
        </div>
      </div>

      {/* Wallet Balance Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border/80 bg-surface-card p-5 shadow-xs">
        <div className="space-y-1">
          <span className="block text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
            <Wallet size={14} className="text-brand" />
            {t('contracts.yourWalletBalance')}
          </span>
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="flex items-center gap-2 text-xl sm:text-2xl font-black text-text-primary">
              <GigCoinLogo size={22} />
              {walletLoading
                ? t('common.loading')
                : walletBalance === null
                  ? '—'
                  : formatGigCoinPrecise(walletBalance)}
            </span>

            {walletBalance !== null && (
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                ({formatGigCoinToVnd(walletBalance)})
              </span>
            )}
          </div>
        </div>

        {hasInsufficientBalance ? (
          <div className="shrink-0 text-left sm:text-right">
            <span className="block text-xs font-black text-rose-500">
              {t('contracts.shortOf', { amount: formatGigCoinPrecise(shortfall) })}
            </span>
            <span className="block text-[11px] font-bold text-rose-500/80">
              ({formatGigCoinToVnd(shortfall)})
            </span>
          </div>
        ) : null}
      </div>

      {/* Error or CTA Action Button */}
      {walletError ? (
        <div className="space-y-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-500 shadow-xs">
          <p className="flex items-center gap-2">
            <AlertCircle size={16} />
            {walletError}
          </p>
          <button
            type="button"
            onClick={handleRetryWallet}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 px-3.5 py-2 font-black text-rose-500 hover:bg-rose-500/15 transition cursor-pointer"
          >
            <RefreshCw size={15} />
            {t('contracts.retry')}
          </button>
        </div>
      ) : hasInsufficientBalance ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-500 flex items-center gap-2.5">
            <AlertCircle size={18} className="shrink-0" />
            <span>{t('contracts.insufficientTokensDesc')}</span>
          </div>
          <button
            type="button"
            onClick={handleTopUp}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand text-white py-3.5 text-xs font-black hover:bg-brand-hover transition-all cursor-pointer shadow-lg"
          >
            <GigCoinLogo size={18} />
            {t('contracts.topUpWallet')} <ArrowRight size={16} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={funding || walletLoading || walletBalance === null}
          onClick={handleFundEscrow}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white py-4 text-xs sm:text-sm font-black transition-all cursor-pointer shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {funding ? <LoaderCircle size={18} className="animate-spin" /> : <Lock size={18} />}
          {funding ? t('contracts.fundingEscrow') : t('contracts.fundEscrowNow')}
        </button>
      )}
    </section>
  );
}
