import { CalendarDays, Clock, CheckSquare2, Square } from 'lucide-react';
import { isWorkItemAwaitingReview, type ContractWorkItem } from '../../../types/models/Contract';
import { WorkItemStatusPill } from '../../../shared/components/WorkItemStatusPill';
import { WorkItemSubmissionHistory } from './WorkItemSubmissionHistory';

interface WorkItemReviewRowProps {
  workItem: ContractWorkItem;
  selected: boolean;
  disabled: boolean;
  labels: Record<string, string>;
  onToggle: () => void;
}

export const WorkItemReviewRow = ({
  workItem,
  selected,
  disabled,
  labels,
  onToggle,
}: WorkItemReviewRowProps) => {
  const reviewable = isWorkItemAwaitingReview(workItem.status);

  return (
    <li
      onClick={() => {
        if (!disabled && reviewable) {
          onToggle();
        }
      }}
      className={`rounded-2xl border p-4 sm:p-6 shadow-xs space-y-4 transition-all cursor-pointer select-none ${
        selected
          ? 'border-brand ring-2 ring-brand/25 bg-surface'
          : 'border-border bg-surface-card hover:border-border-hover'
      } ${!reviewable ? 'cursor-default' : ''}`}
    >
      <div className="flex items-start gap-4">
        {/* Selection Checkbox / Toggle Icon */}
        <div className="pt-0.5 shrink-0">
          {reviewable ? (
            <button
              type="button"
              disabled={disabled}
              onClick={e => {
                e.stopPropagation();
                onToggle();
              }}
              aria-label={`${labels.selectForReview || 'Chọn'} ${workItem.title}`}
              className="p-1 rounded-lg text-brand hover:scale-110 transition cursor-pointer"
            >
              {selected ? (
                <CheckSquare2 size={22} className="text-brand fill-brand/15" />
              ) : (
                <Square size={22} className="text-text-muted hover:text-brand" />
              )}
            </button>
          ) : (
            <div className="w-5 h-5 rounded border border-border/80 bg-surface-muted flex items-center justify-center opacity-40">
              <span className="block w-2 h-2 rounded-xs bg-text-muted" />
            </div>
          )}
        </div>

        {/* Work Item Content */}
        <div className="min-w-0 flex-1 space-y-3.5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand px-2 py-0.5 rounded-md bg-surface-muted border border-border">
                  Đầu việc WBS
                </span>
                {workItem.estimatedDuration && (
                  <span className="inline-flex items-center gap-1 font-bold text-xs bg-surface px-2.5 py-0.5 rounded-md border border-border text-text-secondary">
                    <Clock size={12} className="shrink-0 text-text-muted" />
                    <span>{workItem.estimatedDuration}</span>
                  </span>
                )}
                {workItem.dueDate && (
                  <span className="inline-flex items-center gap-1 font-bold text-xs bg-surface px-2.5 py-0.5 rounded-md border border-border text-text-secondary">
                    <CalendarDays size={12} className="shrink-0 text-text-muted" />
                    <span>Hạn chót: {workItem.dueDate}</span>
                  </span>
                )}
              </div>

              <h3 className="text-base sm:text-lg font-black text-text-primary leading-snug">
                {workItem.title}
              </h3>
            </div>

            <div className="shrink-0">
              <WorkItemStatusPill status={workItem.status} />
            </div>
          </div>

          {/* Description */}
          {workItem.description && (
            <div className="rounded-xl border border-border/80 bg-surface-muted p-3.5 text-xs sm:text-sm text-text-secondary leading-relaxed whitespace-pre-line font-medium">
              {workItem.description}
            </div>
          )}

          {/* History Ledger */}
          <div className="pt-2 border-t border-border/60">
            <WorkItemSubmissionHistory submissions={workItem.submissions ?? []} labels={labels} />
          </div>
        </div>
      </div>
    </li>
  );
};
