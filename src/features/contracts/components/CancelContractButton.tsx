import { useEffect, useMemo, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ContractStatus } from '../../../types/models/Contract';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { useTranslation } from '../../../hooks/useTranslation';

const CANCELLATION_WAIT_MS = 60_000;

const CANCELLABLE_STATUSES = new Set<number>([
  ContractStatus.PendingContractDetails,
  ContractStatus.PendingContractConfirmation,
  ContractStatus.PendingSignature,
]);

interface CancelContractButtonProps {
  contractId: string;
  contractStatus: number;
  contractCreatedAt: string;
  onCancelled: () => void | Promise<void>;
}

export function CancelContractButton({
  contractId,
  contractStatus,
  contractCreatedAt,
  onCancelled,
}: CancelContractButtonProps) {
  const { t } = useTranslation(['contracts', 'common']);
  const [now, setNow] = useState(() => Date.now());
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unlockAt = useMemo(
    () => new Date(contractCreatedAt).getTime() + CANCELLATION_WAIT_MS,
    [contractCreatedAt],
  );
  const remainingMs = Math.max(0, unlockAt - now);
  const isUnlocked = remainingMs <= 0;

  useEffect(() => {
    if (isUnlocked) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isUnlocked]);

  if (!CANCELLABLE_STATUSES.has(contractStatus)) {
    return null;
  }

  const handleConfirm = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await contractPostAPI.cancelContract(contractId);
      if (response.success) {
        setConfirming(false);
        await onCancelled();
      } else {
        setError(response.message || t('contracts.cancelFailed', { defaultValue: 'Unable to cancel the contract.' }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('contracts.cancelFailed', { defaultValue: 'Unable to cancel the contract.' }));
    } finally {
      setSubmitting(false);
    }
  };

  const remainingSeconds = Math.ceil(remainingMs / 1000);

  return (
    <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4.5 sm:p-5 space-y-3">
      {!confirming ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h4 className="text-xs font-black text-text-primary">
              {t('contracts.cancelContract', { defaultValue: 'Cancel Contract' })}
            </h4>
            <p className="text-[11px] font-medium text-text-muted">
              {isUnlocked
                ? t('contracts.cancelContractSub', { defaultValue: 'Either party can cancel while the contract has not been fully signed.' })
                : t('contracts.cancelContractCountdown', {
                    defaultValue: 'Available in {{seconds}}s',
                    seconds: remainingSeconds,
                  })}
            </p>
          </div>
          <button
            type="button"
            disabled={!isUnlocked}
            onClick={() => setConfirming(true)}
            className="shrink-0 flex items-center gap-1.5 rounded-xl border border-red-500/40 px-3.5 py-2 text-[11px] font-black uppercase tracking-wide text-red-600 dark:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed enabled:hover:bg-red-500/10 transition-colors"
          >
            <X size={14} />
            {t('contracts.cancelContract', { defaultValue: 'Cancel Contract' })}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-text-primary">
            {t('contracts.cancelContractConfirm', { defaultValue: 'Are you sure you want to cancel this contract? This cannot be undone.' })}
          </p>
          {error && <p className="text-[11px] font-semibold text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={submitting}
              onClick={handleConfirm}
              className="flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-[11px] font-black uppercase tracking-wide text-white disabled:opacity-60 hover:bg-red-700 transition-colors"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {t('contracts.cancelContractConfirmYes', { defaultValue: 'Yes, cancel' })}
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              className="rounded-xl border border-border px-3.5 py-2 text-[11px] font-black uppercase tracking-wide text-text-muted disabled:opacity-60 hover:bg-surface-muted/40 transition-colors"
            >
              {t('contracts.cancelContractConfirmNo', { defaultValue: 'Keep contract' })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
