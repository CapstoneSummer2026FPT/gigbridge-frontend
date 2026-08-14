import { AlertTriangle, CheckCircle2, Info, Loader2, X, XCircle } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

export type ConfirmationModalVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmationModalVariant;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<
  ConfirmationModalVariant,
  {
    accentBg: string;
    iconBg: string;
    iconColor: string;
    confirmBtn: string;
    defaultIcon: React.ReactNode;
  }
> = {
  danger: {
    accentBg: 'bg-rose-500',
    iconBg: 'bg-rose-500/10 border-rose-500/20',
    iconColor: 'text-rose-500',
    confirmBtn: 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20',
    defaultIcon: <XCircle size={22} />,
  },
  warning: {
    accentBg: 'bg-amber-500',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-500',
    confirmBtn: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20',
    defaultIcon: <AlertTriangle size={22} />,
  },
  info: {
    accentBg: 'bg-[var(--brand,#494be7)]',
    iconBg: 'bg-[var(--brand,#494be7)]/10 border-[var(--brand,#494be7)]/20',
    iconColor: 'text-[var(--brand,#494be7)]',
    confirmBtn: 'bg-[var(--brand,#494be7)] hover:bg-[var(--brand,#494be7)]/90 text-white shadow-indigo-500/20',
    defaultIcon: <Info size={22} />,
  },
  success: {
    accentBg: 'bg-emerald-500',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-500',
    confirmBtn: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20',
    defaultIcon: <CheckCircle2 size={22} />,
  },
};

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = 'danger',
  isLoading = false,
  icon,
}: ConfirmationModalProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const style = variantStyles[variant] || variantStyles.danger;
  const activeIcon = icon || style.defaultIcon;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      {/* Glass Backdrop */}
      <div
        className="fixed inset-0 bg-black/65 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={() => {
          if (!isLoading) onClose();
        }}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md rounded-3xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden transition-all animate-in zoom-in-95 duration-200 z-10 flex flex-col">
        {/* Top Accent Line */}
        <div className={`h-1.5 w-full ${style.accentBg} shrink-0`} />

        {/* Modal Header & Content */}
        <div className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${style.iconBg} ${style.iconColor}`}>
                {activeIcon}
              </div>
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-lg font-black text-foreground tracking-tight leading-snug">
                  {title}
                </h3>
              </div>
            </div>

            <button
              type="button"
              disabled={isLoading}
              className="rounded-xl p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0 cursor-pointer disabled:opacity-50"
              onClick={onClose}
              aria-label={t('common.close', { defaultValue: 'Đóng' })}
            >
              <X size={18} />
            </button>
          </div>

          {description && (
            <div className="text-xs text-muted-foreground font-medium leading-relaxed pl-0.5">
              {description}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-6 pt-0 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-2xl border border-border bg-surface-muted hover:bg-border/60 text-text-primary text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
          >
            {cancelText || t('common.cancel', { defaultValue: 'Hủy' })}
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer disabled:opacity-50 ${style.confirmBtn}`}
          >
            {isLoading && <Loader2 size={15} className="animate-spin" />}
            {confirmText || t('common.confirm', { defaultValue: 'Xác nhận' })}
          </button>
        </div>
      </div>
    </div>
  );
}
