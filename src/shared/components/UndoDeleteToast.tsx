import { useEffect, useRef, useState } from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

export interface UndoDeleteToastProps {
  message: string;
  undoLabel: string;
  onUndo: () => void;
  durationMs?: number;
}

export function UndoDeleteToast({
  message,
  undoLabel,
  onUndo,
  durationMs = 5000,
}: UndoDeleteToastProps) {
  const { t } = useTranslation();
  const startTimeRef = useRef(Date.now());
  const [remainingMs, setRemainingMs] = useState(durationMs);
  const [isUndone, setIsUndone] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const nextRemaining = Math.max(0, durationMs - elapsed);
      setRemainingMs(nextRemaining);
      if (nextRemaining <= 0) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [durationMs]);

  const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
  const progressPercent = Math.max(0, Math.min(100, (remainingMs / durationMs) * 100));

  const handleUndo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isUndone) return;
    setIsUndone(true);
    onUndo();
  };

  const displayUndoLabel = undoLabel || t('undoDelete.action', { defaultValue: 'Hoàn tác' });

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full max-w-[min(420px,calc(100vw-24px))] bg-surface/95 dark:bg-surface/95 backdrop-blur-xl border border-border/80 dark:border-border shadow-[0_12px_32px_-4px_rgba(0,0,0,0.12),0_4px_12px_-2px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_36px_-4px_rgba(0,0,0,0.6)] rounded-2xl p-3 sm:p-3.5 relative overflow-hidden transition-all select-none box-border"
    >
      {/* Subtle decorative glow */}
      <div className="absolute -top-10 -left-10 w-24 h-24 bg-rose-500/10 dark:bg-rose-500/15 rounded-full blur-xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-24 h-24 bg-primary/10 dark:bg-primary/15 rounded-full blur-xl pointer-events-none" />

      {/* Main content layout: row on desktop, auto-stack on narrow/mobile */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
        {/* Left icon & text */}
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-500 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20 shadow-2xs mt-0.5 sm:mt-0">
            <Trash2 size={15} />
          </div>
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <p className="text-xs font-bold text-foreground leading-snug break-words" title={message}>
              {message}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium mt-0.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
              <span className="truncate">
                {t('undoDelete.autoDeleteIn', {
                  defaultValue: 'Tự động xóa sau {{seconds}}s',
                  seconds: remainingSeconds,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Undo action button */}
        <div className="flex items-center justify-end sm:justify-center shrink-0 w-full sm:w-auto pt-1 sm:pt-0 border-t border-border/40 sm:border-t-0">
          <button
            type="button"
            onClick={handleUndo}
            disabled={isUndone}
            aria-label={`${displayUndoLabel} (${remainingSeconds}s)`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-100 active:scale-95 transition-all text-xs font-bold cursor-pointer shadow-md disabled:opacity-50 group"
          >
            <RotateCcw size={12} className="shrink-0 text-white dark:text-zinc-950 transition-transform group-hover:-rotate-45" />
            <span className="text-white dark:text-zinc-950 font-bold">{displayUndoLabel}</span>
            <span className="tabular-nums px-1.5 py-0.5 rounded-md bg-white/20 text-white dark:bg-zinc-900/15 dark:text-zinc-950 text-[10px] font-black leading-none">
              {remainingSeconds}s
            </span>
          </button>
        </div>
      </div>

      {/* Animated countdown progress bar */}
      <div className="relative z-10 w-full h-1 bg-muted/60 dark:bg-surface-muted rounded-full overflow-hidden mt-2.5">
        <div
          className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-primary rounded-full transition-[width] ease-linear duration-75"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
