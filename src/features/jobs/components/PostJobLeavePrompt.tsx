import { useTranslation } from '../../../hooks/useTranslation';
import { AlertCircle, Save, Trash2, X } from 'lucide-react';

type LeaveAction = 'save' | 'discard' | null;

interface PostJobLeavePromptProps {
  isOpen: boolean;
  leaveAction: LeaveAction;
  onSaveDraft: () => void;
  onDiscardDraft: () => void;
  onCancel: () => void;
}

export function PostJobLeavePrompt({
  isOpen,
  leaveAction,
  onSaveDraft,
  onDiscardDraft,
  onCancel,
}: PostJobLeavePromptProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 transition-all duration-300">
      <div 
        className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 overflow-hidden text-foreground animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close (Cancel) Button in top-right */}
        <button
          type="button"
          onClick={onCancel}
          disabled={leaveAction !== null}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground border-none bg-transparent cursor-pointer transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4 pr-6">
          <div className="p-3 bg-[var(--gb-cyan)]/10 border border-[var(--gb-cyan)]/20 rounded-xl text-[var(--gb-cyan)] shrink-0">
            <AlertCircle size={22} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-extrabold tracking-tight text-foreground mb-1">
              {t('postJob.savePrompt')}
            </h2>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('postJob.savePromptDesc')}
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          {/* Save button is wider (flex-[1.5]) */}
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={leaveAction !== null}
            className="flex-[1.5] px-4 py-2.5 rounded-xl font-bold text-xs bg-[var(--gb-cyan)] text-white border-none cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all shadow-[0_2px_8px_rgba(0,240,255,0.2)] hover:opacity-90 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Save size={14} />
            {leaveAction === 'save' ? t('postJob.saving') : t('postJob.saveDraft')}
          </button>
          
          {/* Discard button is narrower (flex-[1]) */}
          <button
            type="button"
            onClick={onDiscardDraft}
            disabled={leaveAction !== null}
            className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs bg-transparent border border-[var(--gb-red)]/35 text-[var(--gb-red)] hover:bg-[var(--gb-red)] hover:text-white cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            <Trash2 size={14} />
            {leaveAction === 'discard' ? t('postJob.discarding') : t('postJob.discardDraft')}
          </button>
        </div>
      </div>
    </div>
  );
}
