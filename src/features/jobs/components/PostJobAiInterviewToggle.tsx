import { Sparkles } from 'lucide-react';
import '../../../shared/components/styles/conic-border-button.css';

interface PostJobAiInterviewToggleProps {
  enabled: boolean;
  questionCount: number;
  title: string;
  description: string;
  disabledReason: string;
  disabledStatusLabel: string;
  onToggle: () => void;
  variant?: 'compact' | 'review';
}

export function PostJobAiInterviewToggle({
  enabled,
  questionCount,
  title,
  description,
  disabledReason,
  disabledStatusLabel,
  onToggle,
  variant = 'compact',
}: PostJobAiInterviewToggleProps) {
  const disabled = questionCount === 0;
  const isEnabled = enabled && !disabled;
  const isReview = variant === 'review';
  const statusLabel = disabled
    ? disabledStatusLabel
    : isEnabled ? '✓ ACTIVE ✦' : 'RECOMMENDED';

  const heading = (
    <span className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
      <strong className={`font-black text-[var(--brand,#494be7)] flex items-center gap-1.5 ${isReview ? 'text-xs sm:text-sm' : 'text-xs'}`}>
        <Sparkles
          size={15}
          className={`shrink-0 text-[var(--brand,#494be7)] ${disabled ? '' : 'animate-pulse'}`}
        />
        {title}
      </strong>
      <span
        className={`${isReview ? 'text-[9.5px] sm:text-[10px] px-2 sm:px-2.5' : 'text-[10px] px-2'} font-black py-0.5 rounded-full uppercase tracking-wider transition-all ${
          isEnabled
            ? 'bg-[var(--brand,#494be7)] text-white shadow-xs'
            : 'bg-[var(--brand,#494be7)]/15 text-[var(--brand,#494be7)] border border-[var(--brand,#494be7)]/30'
        }`}
      >
        {statusLabel}
      </span>
    </span>
  );

  const toggle = (
    <span className="pt-0.5 shrink-0" aria-hidden="true">
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border transition-all duration-300 ease-in-out ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        } ${
          isEnabled
            ? 'bg-gradient-to-r from-[var(--brand,#494be7)] to-[#6366f1] border-[var(--brand,#494be7)] shadow-md shadow-[var(--brand,#494be7)]/30 ring-2 ring-[var(--brand,#494be7)]/20'
            : 'bg-muted border-border'
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
            isEnabled ? 'translate-x-5' : 'translate-x-0'
          }`}
          style={
            !isEnabled && !disabled
              ? { animation: 'post-job-ai-toggle-nudge 2.8s infinite ease-in-out' }
              : undefined
          }
        />
      </span>
    </span>
  );

  return (
    <div
      className={`conic-border-wrap conic-border-card ${isReview ? 'rounded-2xl' : 'rounded-xl'} ${
        disabled ? 'is-disabled cursor-not-allowed' : 'cursor-pointer'
      }`}
      title={disabled ? disabledReason : undefined}
    >
      <style>{`
        @keyframes post-job-ai-toggle-nudge {
          0%, 100% { transform: translateX(0); box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2); }
          30% { transform: translateX(7px); box-shadow: 0 0 10px rgba(73, 75, 231, 0.6); }
          50% { transform: translateX(2px); }
          70% { transform: translateX(9px); box-shadow: 0 0 12px rgba(73, 75, 231, 0.7); }
        }
      `}</style>
      <button
        type="button"
        role="switch"
        aria-checked={isEnabled}
        aria-label={disabled ? `${title}. ${disabledReason}` : title}
        disabled={disabled}
        onClick={onToggle}
        className={`conic-border-card-inner ${isReview ? 'rounded-[calc(1rem-1.5px)] p-4 sm:p-5' : 'rounded-[calc(0.75rem-1.5px)] p-3.5'} justify-between items-stretch space-y-2 text-left transition-all duration-300 ${
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        } ${
          isEnabled
            ? 'bg-[var(--brand,#494be7)]/10 dark:bg-[var(--brand,#494be7)]/20'
            : 'bg-card'
        }`}
      >
        {isReview ? (
          <span className="block space-y-2.5 sm:space-y-3">
            <span className="flex items-start justify-between gap-3">
              {heading}
              {toggle}
            </span>
            <span className="block text-xs text-muted-foreground leading-relaxed">{description}</span>
          </span>
        ) : (
          <span className="flex items-start justify-between gap-3">
            <span className="space-y-1.5 flex-1 min-w-0">
              {heading}
              <span className="block text-[11px] text-muted-foreground leading-relaxed">{description}</span>
            </span>
            {toggle}
          </span>
        )}
      </button>
    </div>
  );
}
