import { useTranslation } from '../../../hooks/useTranslation';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface PostJobBudgetExceededPromptProps {
  isOpen: boolean;
  /** Formatted milestone plan total, e.g. "200 G-coin". */
  total: string;
  /** Formatted expected budget, e.g. "100 G-coin". */
  expected: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirm/Cancel dialog shown when the milestone plan total exceeds the
 * client's expected budget. Confirm raises the job post expected budget to the
 * milestone total and continues; Cancel aborts the submission.
 */
export function PostJobBudgetExceededPrompt({
  isOpen,
  total,
  expected,
  onConfirm,
  onCancel,
}: PostJobBudgetExceededPromptProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-all duration-300">
      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden text-foreground animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground border-none bg-transparent cursor-pointer transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4 pr-6">
          <div className="p-3 bg-[var(--gb-amber)]/10 border border-[var(--gb-amber)]/25 rounded-xl text-[var(--gb-amber)] shrink-0">
            <AlertTriangle size={22} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-extrabold tracking-tight text-foreground mb-1">
              {t('postJobWizard.budgetExceeded.title')}
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('postJobWizard.budgetExceeded.desc', { total, expected })}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs bg-transparent border border-border text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer flex items-center justify-center gap-1.5 transition-all"
          >
            <X size={14} />
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-[1.5] px-4 py-2.5 rounded-xl font-bold text-xs bg-[var(--gb-cyan)] text-white border-none cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-[0_2px_8px_rgba(0,240,255,0.2)] hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
          >
            <CheckCircle2 size={14} />
            {t('postJobWizard.budgetExceeded.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
