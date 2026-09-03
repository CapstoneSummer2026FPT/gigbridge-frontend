import { FileText, MessageSquare, AlertCircle, CheckCircle2, Clock, DownloadCloud } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  WorkItemSubmissionReviewStatus,
  type ContractWorkItemSubmission,
} from '../../../types/models/Contract';

interface WorkItemSubmissionHistoryProps {
  submissions: ContractWorkItemSubmission[];
  labels?: Record<string, string>;
}

export const WorkItemSubmissionHistory = ({ submissions, labels = {} }: WorkItemSubmissionHistoryProps) => {
  const { t } = useTranslation(['contracts', 'common']);

  if (submissions.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-text-muted italic py-2 px-3 rounded-xl bg-surface-muted border border-border">
        <Clock size={14} className="shrink-0 text-text-muted" />
        <span>{labels.noSubmissions || t('contracts.deliverySpace.noSubmissions', 'Chưa có bản nộp nào cho hạng mục này.')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-1">
        <span className="text-[11px] font-black uppercase tracking-wider text-text-muted flex items-center gap-1.5">
          <FileText size={13} className="text-brand" />
          <span>{t('contracts.deliverySpace.historyTitle', 'Lịch sử nộp & phản hồi')}</span>
        </span>
        <span className="text-[10.5px] font-bold text-text-muted px-2.5 py-0.5 rounded-full bg-surface-muted border border-border">
          {t('contracts.deliverySpace.versionsCount', {
            count: submissions.length,
            defaultValue: `${submissions.length} phiên bản`,
          })}
        </span>
      </div>

      <div className="space-y-3">
        {submissions.map((submission, sIdx) => {
          const status = Number(submission.reviewStatus);
          const isApproved = status === WorkItemSubmissionReviewStatus.Approved;
          const isRevision = status === WorkItemSubmissionReviewStatus.RevisionRequired;
          const versionNumber = submission.revisionNumber || sIdx + 1;

          return (
            <div
              key={submission.submissionId}
              className="rounded-2xl border border-border bg-surface p-4 sm:p-4.5 space-y-3.5 shadow-xs transition-all hover:border-border-strong"
            >
              {/* Version Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-text-primary px-2.5 py-1 rounded-lg bg-surface-muted border border-border">
                    {t('contracts.deliverySpace.submissionNumber', {
                      number: versionNumber,
                      defaultValue: `Lần nộp #${versionNumber}`,
                    })}
                  </span>
                </div>

                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-lg bg-surface-muted border border-border text-text-primary">
                  {isApproved ? (
                    <CheckCircle2 size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                  ) : isRevision ? (
                    <AlertCircle size={13} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <Clock size={13} className="shrink-0 text-brand" />
                  )}
                  <span>
                    {isApproved
                      ? labels.approved || t('contracts.workItemStatus.approved', 'Đã duyệt')
                      : isRevision
                        ? labels.revisionRequired || t('contracts.workItemStatus.revisionRequired', 'Cần chỉnh sửa')
                        : labels.awaitingReview || t('contracts.workItemStatus.submitted', 'Chờ duyệt')}
                  </span>
                </span>
              </div>

              {/* Freelancer Note */}
              {submission.note && (
                <div className="rounded-xl bg-surface-muted p-3 text-xs text-text-secondary leading-relaxed border border-border space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[10.5px] uppercase tracking-wider text-text-muted">
                    <MessageSquare size={13} className="text-text-muted" aria-hidden />
                    <span>{t('contracts.deliverySpace.freelancerNoteLabel', 'Ghi chú của Freelancer:')}</span>
                  </div>
                  <p className="font-medium text-text-primary whitespace-pre-wrap pl-4 leading-relaxed">
                    {submission.note}
                  </p>
                </div>
              )}

              {/* Attached Files List */}
              {submission.attachments && submission.attachments.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[10.5px] font-black uppercase tracking-wider text-text-muted block">
                    {t('contracts.deliverySpace.deliverableFilesLabel', {
                      count: submission.attachments.length,
                      defaultValue: `Tệp sản phẩm bàn giao (${submission.attachments.length}):`,
                    })}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {submission.attachments.map(attachment => (
                      <a
                        key={attachment.id}
                        href={attachment.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="group flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface-muted hover:bg-surface hover:border-brand/40 text-xs font-bold text-text-primary transition shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <div className="w-7 h-7 rounded-lg bg-surface border border-border flex items-center justify-center text-text-primary shrink-0 group-hover:text-brand transition">
                            <FileText size={14} />
                          </div>
                          <span className="truncate font-semibold text-text-primary group-hover:text-brand transition">
                            {attachment.file_name}
                          </span>
                        </div>
                        <DownloadCloud size={14} className="shrink-0 text-text-muted group-hover:text-brand transition" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Client Review Feedback Box */}
              {submission.reviewReason && (
                <div className="rounded-xl border border-border bg-surface-muted p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-black text-[11px] uppercase tracking-wider text-text-primary">
                    <AlertCircle size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>{t('contracts.deliverySpace.revisionReasonTitle', 'Lý do yêu cầu sửa đổi từ Client:')}</span>
                  </div>
                  <p className="whitespace-pre-wrap pl-5 leading-relaxed text-xs sm:text-sm font-medium text-text-primary">
                    {submission.reviewReason}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
