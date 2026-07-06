import { AlertCircle, Loader2 } from 'lucide-react';
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
import { GigCoinAmount } from './GigCoinAmount';

interface ServiceFeeDialogProps {
  open: boolean;
  mode: 'confirmation' | 'insufficient';
  actionDescription: string;
  insufficientDescription: string;
  amountLabel: string;
  jobAmount: number;
  serviceFee: number;
  balance: number | null;
  loadingBalance?: boolean;
  submitting?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  onTopUp: () => void;
}

export function ServiceFeeDialog({
  open,
  mode,
  actionDescription,
  insufficientDescription,
  amountLabel,
  jobAmount,
  serviceFee,
  balance,
  loadingBalance = false,
  submitting = false,
  error,
  onConfirm,
  onCancel,
  onTopUp,
}: ServiceFeeDialogProps) {
  const insufficient = mode === 'insufficient';

  return (
    <AlertDialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{insufficient ? 'Insufficient GigCoin' : 'Service Fee Confirmation'}</AlertDialogTitle>
          <AlertDialogDescription>
            {insufficient
              ? `You do not have enough GigCoin to pay the service fee. Please top up your wallet before ${insufficientDescription}.`
              : `${actionDescription} requires a service fee.`}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {!insufficient && (
          <div className="grid gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{amountLabel}</span>
              <strong><GigCoinAmount amount={jobAmount} /></strong>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Service Fee (1%)</span>
              <strong><GigCoinAmount amount={serviceFee} /></strong>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border pt-3">
              <span className="text-muted-foreground">Current GigCoin Balance</span>
              <strong>
                {loadingBalance
                  ? <Loader2 size={16} className="animate-spin" />
                  : balance === null
                    ? 'Unavailable'
                    : <GigCoinAmount amount={balance} />}
              </strong>
            </div>
          </div>
        )}

        {error && !insufficient && (
          <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting} onClick={onCancel}>Cancel</AlertDialogCancel>
          {insufficient ? (
            <AlertDialogAction
              aria-label="Top Up"
              className="min-w-24 border border-transparent"
              style={{ backgroundColor: 'var(--brand, #494be7)', color: 'var(--brand-foreground, #ffffff)' }}
              onClick={(event) => { event.preventDefault(); onTopUp(); }}
            >
              <span style={{ color: 'var(--brand-foreground, #ffffff)' }}>Top Up</span>
            </AlertDialogAction>
          ) : (
            <AlertDialogAction
              aria-label="Confirm service fee"
              className="min-w-24 border border-transparent"
              style={{ backgroundColor: 'var(--brand, #494be7)', color: 'var(--brand-foreground, #ffffff)' }}
              disabled={submitting || loadingBalance || balance === null}
              onClick={(event) => { event.preventDefault(); onConfirm(); }}
            >
              {submitting ? (
                <span className="flex items-center gap-2" style={{ color: 'var(--brand-foreground, #ffffff)' }}>
                  <Loader2 size={15} className="animate-spin" />Processing
                </span>
              ) : (
                <span style={{ color: 'var(--brand-foreground, #ffffff)' }}>Confirm</span>
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
