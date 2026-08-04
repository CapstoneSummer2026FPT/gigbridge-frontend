import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, LoaderCircle, Lock, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { walletGetAPI } from '../../../api/walletAPI/GET';
import { useTranslation } from '../../../hooks/useTranslation';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import { formatGigCoinPrecise } from '../../../shared/utils/gigcoin';
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
      <section className="glass-card p-8 md:p-10 space-y-5" aria-label={t('contracts.secureContractEscrow')}>
        <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
          <AlertCircle size={20} className="text-amber-500" />
          <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-zentry">
            {t('contracts.secureContractEscrow')}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">{t('contracts.escrowQuoteUnavailable')}</p>
        <button
          type="button"
          onClick={handleRetryQuote}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/60 bg-secondary/50 px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
        >
          <RefreshCw size={16} />
          {t('contracts.retry')}
        </button>
      </section>
    );
  }

  return (
    <section className="glass-card p-8 md:p-10 space-y-6" aria-label={t('contracts.secureContractEscrow')}>
      <div className="flex items-center gap-2.5 border-b border-border/50 pb-4">
        <Lock size={20} className="text-primary" />
        <h2 className="text-xl font-bold text-foreground uppercase tracking-tight font-zentry">
          {t('contracts.secureContractEscrow')}
        </h2>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {t('contracts.escrowFundingDesc')}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border/25 bg-secondary/15 p-5">
          <span className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {t('contracts.escrowHeldTokens')}
          </span>
          <span className="mt-1.5 block text-2xl font-bold text-foreground">
            {formatGigCoinPrecise(escrow.requiredTokens)}
          </span>
        </div>
        <div className="rounded-2xl border border-border/25 bg-secondary/15 p-5">
          <span className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {t('contracts.escrowFundingFee', { percent: escrow.fundingFeeRate * 100 })}
          </span>
          <span className="mt-1.5 block text-2xl font-bold text-foreground">
            {formatGigCoinPrecise(escrow.fundingFeeTokens)}
          </span>
        </div>
        <div className="rounded-2xl border border-primary/25 bg-primary/10 p-5">
          <span className="block text-[10px] font-black uppercase tracking-widest text-primary">
            {t('contracts.totalWalletDebit')}
          </span>
          <span className="mt-1.5 block text-2xl font-bold text-primary">
            {formatGigCoinPrecise(escrow.totalDebitTokens)}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/20 bg-secondary/10 p-5">
        <div>
          <span className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {t('contracts.yourWalletBalance')}
          </span>
          <span className="mt-1 flex items-center gap-2 text-xl font-bold text-foreground">
            <GigCoinLogo size={18} />
            {walletLoading
              ? t('common.loading')
              : walletBalance === null
                ? '—'
                : formatGigCoinPrecise(walletBalance)}
          </span>
        </div>

        {hasInsufficientBalance ? (
          <div className="shrink-0 text-right">
            <span className="mb-1 block text-xs font-bold text-destructive">
              {t('contracts.shortOf', { amount: formatGigCoinPrecise(shortfall) })}
            </span>
          </div>
        ) : null}
      </div>

      {walletError ? (
        <div className="space-y-3 rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <p>{walletError}</p>
          <button
            type="button"
            onClick={handleRetryWallet}
            className="inline-flex items-center gap-2 rounded-lg border border-destructive/30 px-3 py-2 font-bold"
          >
            <RefreshCw size={15} />
            {t('contracts.retry')}
          </button>
        </div>
      ) : hasInsufficientBalance ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 p-4 text-xs font-medium text-destructive">
            {t('contracts.insufficientTokensDesc')}
          </div>
          <button
            type="button"
            onClick={handleTopUp}
            className="btn-primary-custom flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all"
          >
            <GigCoinLogo size={17} />
            {t('contracts.topUpWallet')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={funding || walletLoading || walletBalance === null}
          onClick={handleFundEscrow}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-none bg-emerald-500 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {funding ? <LoaderCircle size={17} className="animate-spin" /> : <Lock size={17} />}
          {funding ? t('contracts.fundingEscrow') : t('contracts.fundEscrowNow')}
        </button>
      )}
    </section>
  );
}
