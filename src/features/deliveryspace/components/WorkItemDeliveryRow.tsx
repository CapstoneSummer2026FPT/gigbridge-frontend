import { CalendarDays, Clock, Paperclip, UploadCloud, X, FileCheck } from 'lucide-react';
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
    <li className="rounded-2xl border border-border bg-surface-card p-4 sm:p-6 shadow-xs space-y-4 transition-all hover:border-border-hover">
      {/* Top Header Row */}
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

      {/* Freelancer Upload Section */}
      {canSubmit && (
        <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <span className="text-xs font-black uppercase tracking-wider text-text-primary flex items-center gap-2">
              <UploadCloud size={16} className="text-brand" />
              <span>Nộp Sản Phẩm Cho Đầu Việc Này</span>
            </span>
            <span className="text-[11px] font-bold text-text-primary bg-surface-muted border border-border px-2.5 py-0.5 rounded-full">
              Sẵn sàng nộp
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-black uppercase tracking-wider text-text-muted block">
              Ghi chú cho khách hàng:
            </label>
            <textarea
              value={draft.note}
              onChange={event => onNoteChange(event.target.value)}
              placeholder={labels.notePlaceholder || 'Nhập mô tả kết quả, hướng dẫn xem tệp đính kèm...'}
              disabled={disabled}
              rows={3}
              className="w-full rounded-xl border border-border bg-background p-3 text-xs sm:text-sm font-medium text-text-primary placeholder:text-text-muted outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:bg-surface-muted transition"
            />
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={MILESTONE_FILE_ACCEPT}
            className="hidden"
            onChange={event => {
              const file = event.target.files?.[0];
              if (file) onAttach(file);
              event.target.value = '';
            }}
          />

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-muted hover:bg-surface-muted/80 hover:border-brand/40 px-4 py-2.5 text-xs font-black text-text-primary transition cursor-pointer disabled:opacity-50 shadow-2xs active:scale-95"
            >
              <Paperclip size={14} className="text-brand" />
              <span>{labels.attachFile || 'Đính kèm tệp sản phẩm'}</span>
            </button>
            <span className="text-[11px] font-semibold text-text-muted">
              (Hỗ trợ file zip, pdf, docx, figma, mp4, png...)
            </span>
          </div>

          {/* Attached Files List */}
          {draft.files.length > 0 && (
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
          )}
        </div>
      )}

      {/* History Ledger */}
      <div className="pt-2 border-t border-border/60">
        <WorkItemSubmissionHistory submissions={workItem.submissions ?? []} labels={labels} />
      </div>
    </li>
  );
};
