import { CalendarDays, Paperclip, X } from 'lucide-react';
import { useRef } from 'react';
import { canSubmitWorkItem, type ContractWorkItem } from '../../../types/models/Contract';
import { MILESTONE_FILE_ACCEPT } from '../utils/workItemSubmission';
import type { WorkItemDraft } from '../utils/workItemSubmission';
import { WorkItemStatusPill } from '../../../shared/components/WorkItemStatusPill';
import { WorkItemSubmissionHistory } from './WorkItemSubmissionHistory';

interface WorkItemDeliveryRowProps {
  workItem: ContractWorkItem;
  draft: WorkItemDraft;
  disabled: boolean;
  labels: Record<string, string>;
  onAttach: (file: File) => void;
  onDetach: (fileName: string) => void;
  onNoteChange: (note: string) => void;
}

/**
 * The freelancer's view of one work item: its three authored fields, its derived deadline, and its
 * own uploader. Any row can be filled in at any time — nothing here depends on the order of the
 * work items, because submission is explicitly not a queue.
 */
export const WorkItemDeliveryRow = ({
  workItem,
  draft,
  disabled,
  labels,
  onAttach,
  onDetach,
  onNoteChange,
}: WorkItemDeliveryRowProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const canSubmit = canSubmitWorkItem(workItem.status);

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
        <WorkItemStatusPill status={workItem.status} />
      </div>

      {canSubmit ? (
        <div className="mt-4 space-y-2">
          <textarea
            value={draft.note}
            onChange={event => onNoteChange(event.target.value)}
            placeholder={labels.notePlaceholder}
            disabled={disabled}
            rows={2}
            className="w-full rounded-lg border border-slate-200 p-2 text-sm disabled:bg-slate-50"
          />

          <input
            ref={inputRef}
            type="file"
            accept={MILESTONE_FILE_ACCEPT}
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) onAttach(file);
              // Reset so re-picking the same file still fires a change event.
              event.target.value = '';
            }}
          />

          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <Paperclip className="h-3.5 w-3.5" aria-hidden />
            {labels.attachFile}
          </button>

          {draft.files.length > 0 ? (
            <ul className="space-y-1">
              {draft.files.map(file => (
                <li
                  key={file.name}
                  className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                >
                  <span className="truncate">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => onDetach(file.name)}
                    disabled={disabled}
                    aria-label={`${labels.removeFile} ${file.name}`}
                    className="ml-2 shrink-0 rounded p-0.5 hover:bg-slate-200 disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 border-t border-slate-100 pt-3">
        <WorkItemSubmissionHistory submissions={workItem.submissions ?? []} labels={labels} />
      </div>
    </li>
  );
};
          </div >

  {/* Attached Files List */ }
{
  draft.files.length > 0 && (
    <div className="space-y-1.5 pt-1">
      <span className="text-[11px] font-black uppercase tracking-wider text-text-muted block">
        Tệp đã chọn ({draft.files.length}):
      </span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {draft.files.map(file => (
          <div
            key={file.name}
            className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface-muted text-xs font-bold text-text-primary shadow-2xs"
          >
            <div className="flex items-center gap-2 min-w-0 pr-2">
              <FileCheck size={15} className="text-brand shrink-0" />
              <span className="truncate">{file.name}</span>
            </div>
            <button
              type="button"
              onClick={() => onDetach(file.name)}
              disabled={disabled}
              aria-label={`${labels.removeFile} ${file.name}`}
              className="shrink-0 p-1 rounded-lg text-text-muted hover:text-rose-500 hover:bg-surface transition cursor-pointer disabled:opacity-50"
            >
              <X size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
        </div >
      )}

{/* History Ledger */ }
<div className="pt-2 border-t border-border/60">
  <WorkItemSubmissionHistory submissions={workItem.submissions ?? []} labels={labels} />
</div>
    </li >
  );
};
