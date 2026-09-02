import { CalendarDays } from 'lucide-react';
import { isWorkItemAwaitingReview, type ContractWorkItem } from '../../../types/models/Contract';
import { WorkItemStatusPill } from './WorkItemStatusPill';
import { WorkItemSubmissionHistory } from './WorkItemSubmissionHistory';

interface WorkItemReviewRowProps {
  workItem: ContractWorkItem;
  selected: boolean;
  disabled: boolean;
  labels: Record<string, string>;
  onToggle: () => void;
}

/**
 * The client's view of the same work item. Only items actually awaiting review are selectable —
 * the rest still render their history so the client can see what was already settled.
 */
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
      className={`rounded-xl border bg-white p-4 shadow-sm ${
        selected ? 'border-blue-400 ring-1 ring-blue-200' : 'border-slate-200'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          disabled={disabled || !reviewable}
          onChange={onToggle}
          aria-label={`${labels.selectForReview} ${workItem.title}`}
          className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 disabled:opacity-40"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-slate-900">{workItem.title}</h3>
              {workItem.description ? (
                <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{workItem.description}</p>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {workItem.estimatedDuration ? <span>{workItem.estimatedDuration}</span> : null}
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                  {workItem.dueDate ?? labels.notScheduled}
                </span>
              </div>
            </div>
            <WorkItemStatusPill status={workItem.status} labels={labels} />
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3">
            <WorkItemSubmissionHistory submissions={workItem.submissions ?? []} labels={labels} />
          </div>
        </div>
      </div>
    </li>
  );
};
