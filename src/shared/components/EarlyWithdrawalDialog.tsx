import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../app/components/ui/alert-dialog';
import { useTranslation } from '../../hooks/useTranslation';
import { GigCoinAmount } from './GigCoinAmount';

interface EarlyWithdrawalDialogProps {
  open: boolean;
  milestoneTitle: string;
  availableAmount: number;
  submitting: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function EarlyWithdrawalDialog({
  open,
  milestoneTitle,
  availableAmount,
  submitting,
  error,
  onConfirm,
  onCancel,
}: EarlyWithdrawalDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={open} onOpenChange={nextOpen => !nextOpen && !submitting && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('earlyWithdrawal.confirmTitle')}</AlertDialogTitle>
          <AlertDialogDescription>{t('earlyWithdrawal.confirmDescription')}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <div className="flex items-start justify-between gap-4">
            <span className="text-muted-foreground">{t('earlyWithdrawal.milestone')}</span>
            <strong className="text-right text-foreground">{milestoneTitle}</strong>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">{t('earlyWithdrawal.availableAmount')}</span>
            <strong className="text-emerald-600"><GigCoinAmount amount={availableAmount} /></strong>
          </div>
          <p className="text-xs font-semibold text-amber-600">{t('earlyWithdrawal.maximumNotice')}</p>
          {error && <p className="text-xs font-semibold text-red-500" role="alert">{error}</p>}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting} onClick={onCancel}>
            {t('earlyWithdrawal.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={submitting}
            onClick={event => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {submitting ? t('earlyWithdrawal.submitting') : t('earlyWithdrawal.confirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
