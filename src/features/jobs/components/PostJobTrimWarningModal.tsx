import { useTranslation } from 'react-i18next';
import { Scissors, X, FileText } from 'lucide-react';

interface PostJobTrimWarningModalProps {
  isOpen: boolean;
  totalCharCount: number;
  onConfirmTrim: () => void;
  onCancel: () => void;
}

export function PostJobTrimWarningModal({
  isOpen,
  totalCharCount,
  onConfirmTrim,
  onCancel,
}: PostJobTrimWarningModalProps) {
  const { t } = useTranslation(['jobs', 'common']);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-all duration-300">
      <div
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden text-foreground animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close (Cancel) Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground border-none bg-transparent cursor-pointer transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4 pr-6">
          <div className="p-3 bg-[var(--brand)]/10 border border-[var(--brand)]/20 rounded-xl text-[var(--brand)] shrink-0">
            <Scissors size={22} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-extrabold tracking-tight text-foreground mb-1">
              {t('postJobWizard.ai.trimNoticeTitle', 'Document Trim Notice')}
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('postJobWizard.ai.trimNoticeDesc', {
                total: totalCharCount.toLocaleString(),
                defaultValue: `Your attached specification documents contain a total of ${totalCharCount.toLocaleString()} characters. To ensure optimal AI processing, the content will be automatically trimmed to the first 15,000 characters.`,
              })}
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-[var(--surface-muted)] rounded-xl border border-[var(--border)] flex items-center gap-3">
          <FileText size={16} className="text-blue-500 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-foreground">
              {totalCharCount.toLocaleString()} chars
            </span>
            <span className="text-muted-foreground mx-1">→</span>
            <span className="font-bold text-[var(--brand)]">
              15,000 chars (capped)
            </span>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onConfirmTrim}
            className="flex-[1.5] px-4 py-2.5 rounded-xl font-bold text-xs bg-[var(--brand)] text-white border-none cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-[0_2px_8px_rgba(0,240,255,0.2)] hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Scissors size={14} />
            {t('postJobWizard.ai.trimNoticeAgree', 'Agree & Continue')}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs bg-transparent border border-border text-foreground hover:bg-muted cursor-pointer flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            {t('postJobWizard.ai.trimNoticeCancel', 'Cancel & Edit Files')}
          </button>
        </div>
      </div>
    </div>
  );
}
