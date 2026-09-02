import { FileText, MessageSquare } from 'lucide-react';
import {
  WorkItemSubmissionReviewStatus,
  type ContractWorkItemSubmission,
} from '../../../types/models/Contract';

interface WorkItemSubmissionHistoryProps {
  submissions: ContractWorkItemSubmission[];
  labels: Record<string, string>;
}

const VERDICT_STYLES: Record<number, string> = {
  [WorkItemSubmissionReviewStatus.Submitted]: 'text-indigo-600',
  [WorkItemSubmissionReviewStatus.Approved]: 'text-emerald-600',
  [WorkItemSubmissionReviewStatus.RevisionRequired]: 'text-amber-600',
};

const VERDICT_KEYS: Record<number, string> = {
  [WorkItemSubmissionReviewStatus.Submitted]: 'awaitingReview',
  [WorkItemSubmissionReviewStatus.Approved]: 'approved',
  [WorkItemSubmissionReviewStatus.RevisionRequired]: 'revisionRequired',
};

/**
 * The full delivery history for one work item, oldest first. Earlier revisions keep their files and
 * the client's reason for rejecting them — that record is what makes a later dispute reviewable, so
 * it is never collapsed to "the latest upload".
 */
export const WorkItemSubmissionHistory = ({ submissions, labels }: WorkItemSubmissionHistoryProps) => {
  if (submissions.length === 0) {
    return <p className="text-xs text-slate-500">{labels.noSubmissions}</p>;
  }

  return (
    <ol className="space-y-3">
      {submissions.map(submission => (
        <li key={submission.submissionId} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-700">
              {labels.revision} {submission.revisionNumber}
            </span>
            <span className={`text-xs font-medium ${VERDICT_STYLES[Number(submission.reviewStatus)] ?? ''}`}>
              {labels[VERDICT_KEYS[Number(submission.reviewStatus)] ?? 'awaitingReview']}
            </span>
          </div>

          {submission.note ? (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-600">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{submission.note}</span>
            </p>
          ) : null}

          <ul className="mt-2 space-y-1">
            {submission.attachments.map(attachment => (
              <li key={attachment.id}>
                <a
                  href={attachment.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {attachment.file_name}
                </a>
              </li>
            ))}
          </ul>

          {submission.reviewReason ? (
            <p className="mt-2 rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              <span className="font-semibold">{labels.reason}: </span>
              {submission.reviewReason}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
};
