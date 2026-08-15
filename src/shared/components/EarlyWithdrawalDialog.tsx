import { CreditCard, Wifi, ShieldCheck, Info, Loader2, Wallet, X } from 'lucide-react';
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
      <AlertDialogContent className="w-[calc(100%-2rem)] max-w-md p-6 rounded-3xl border border-border/80 bg-card shadow-2xl overflow-hidden sm:max-w-[460px]">
        {/* Top Header */}
        <AlertDialogHeader className="space-y-1 text-left relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9.5 h-9.5 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                <Wallet size={19} />
              </div>
              <AlertDialogTitle className="text-base font-extrabold text-text-primary">
                {t('earlyWithdrawal.confirmTitle', { defaultValue: 'Confirm Early Withdrawal' })}
              </AlertDialogTitle>
            </div>
            <button
              type="button"
              disabled={submitting}
              onClick={onCancel}
              className="w-8 h-8 rounded-full bg-surface-muted hover:bg-surface-muted/80 text-text-muted flex items-center justify-center transition cursor-pointer"
            >
              <X size={15} />
            </button>
          </div>
          <AlertDialogDescription className="text-xs text-text-muted">
            {t('earlyWithdrawal.confirmDescription', { defaultValue: 'Move the available amount from escrow to your GigCoin wallet now.' })}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Credit Card Graphic Representation with Brand Theme */}
        <div className="my-4 relative z-10">
          <div className="w-full rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-brand/35 text-white p-5 sm:p-6 shadow-xl space-y-4 relative overflow-hidden">
            {/* Ambient Brand Glowing Orbs */}
            <div className="absolute -top-12 -right-12 w-40 h-40 bg-brand/25 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-brand/15 rounded-full blur-3xl pointer-events-none" />

            {/* Card Header Row: Chip & Contactless */}
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-2.5">
                {/* EMV Metallic Chip */}
                <div className="w-10 h-7 rounded-lg bg-gradient-to-tr from-amber-300 via-yellow-400 to-amber-200 border border-amber-400/60 shadow-inner flex items-center justify-center">
                  <div className="w-6 h-4 border-t border-b border-amber-800/30" />
                </div>
                <Wifi size={18} className="text-brand/80 rotate-90" />
              </div>
              <div className="flex items-center gap-1.5 bg-brand/20 border border-brand/35 px-3 py-1 rounded-full backdrop-blur-xs">
                <CreditCard size={13} className="text-brand" />
                <span className="text-[10px] font-black tracking-widest uppercase text-white">GIGCOIN PAYOUT</span>
              </div>
            </div>

            {/* Card Middle: Available Amount & Milestone */}
            <div className="py-2 relative z-10 space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand">
                {t('earlyWithdrawal.availableAmount', { defaultValue: 'Số tiền khả dụng' })}
              </span>
              <div className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-2">
                <GigCoinAmount amount={availableAmount} />
              </div>
              <p className="text-xs font-semibold text-slate-300 truncate pt-1.5" title={milestoneTitle}>
                {milestoneTitle}
              </p>
            </div>

            {/* Card Footer: Metadata */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] relative z-10 text-slate-400">
              <div>
                <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Hạn mức rút</span>
                <span className="font-bold text-slate-200">Max 80% Escrow</span>
              </div>
              <div className="text-right">
                <span className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Trạng thái</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1 justify-end">
                  <ShieldCheck size={13} /> Khả dụng ngay
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Info notice - Yellow background with white text */}
        <div className="mb-4 p-3.5 rounded-2xl bg-amber-500 text-white flex items-start gap-2.5 text-xs font-bold shadow-xs relative z-10">
          <Info size={16} className="shrink-0 mt-0.5 text-white" />
          <span>{t('earlyWithdrawal.maximumNotice', { defaultValue: 'You can withdraw up to 80% of an approved milestone before the project ends.' })}</span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-xs font-bold text-destructive relative z-10" role="alert">
            {error}
          </div>
        )}

        {/* Footer Actions */}
        <AlertDialogFooter className="flex items-center justify-end gap-2.5 relative z-10">
          <AlertDialogCancel
            disabled={submitting}
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-surface-muted text-text-muted hover:bg-surface-muted/80 transition cursor-pointer border-none"
          >
            {t('earlyWithdrawal.cancel', { defaultValue: 'Cancel' })}
          </AlertDialogCancel>

          <AlertDialogAction
            disabled={submitting}
            onClick={event => {
              event.preventDefault();
              onConfirm();
            }}
            className="px-5 py-2.5 rounded-xl font-extrabold text-xs bg-brand hover:bg-brand-hover text-brand-foreground shadow-md shadow-brand/25 transition cursor-pointer flex items-center gap-2 border-none active:scale-95 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>{t('earlyWithdrawal.submitting', { defaultValue: 'Processing...' })}</span>
              </>
            ) : (
              <span>{t('earlyWithdrawal.confirm', { defaultValue: 'Confirm withdrawal' })}</span>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
