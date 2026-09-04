import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { UserRole } from '../../../types/models/User';
import { MilestoneStatus } from '../../../types/models/Contract';
import { MilestoneCompletedModal } from '../components/MilestoneCompletedModal';
import { WorkItemDeliveryRow } from '../components/WorkItemDeliveryRow';
import { WorkItemReviewRow } from '../components/WorkItemReviewRow';
import { useDeliverySpace } from '../hooks/useDeliverySpace';
import { isValidationResponse, showValidationToast } from '../../../shared/utils/validationToast';

/**
 * The milestone's delivery ledger, shared by both parties.
 *
 * Client and freelancer see the same work items, the same statuses and the same file history; only
 * the control on each row differs. That is deliberate — the previous design split this across two
 * screens with two hooks and two realtime subscriptions, and they drifted.
 */
const DeliverySpaceScreen = () => {
  const { contractId, milestoneId } = useParams<{ contractId: string; milestoneId?: string }>();
  const navigate = useNavigate();
  const { role } = useApp();
  const { t } = useTranslation(['contracts', 'workspace', 'common']);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [revisionReason, setRevisionReason] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  const revisionReasonRef = useRef<HTMLTextAreaElement>(null);

  const space = useDeliverySpace(contractId, milestoneId);
  const isClient = role === UserRole.Client;

  const labels: Record<string, string> = {
    todo: t('contracts.workItemStatus.todo', 'To do'),
    inProgress: t('contracts.workItemStatus.inProgress', 'In progress'),
    completed: t('contracts.workItemStatus.completed', 'Completed'),
    revisionRequired: t('contracts.workItemStatus.revisionRequired', 'Needs changes'),
    submitted: t('contracts.workItemStatus.submitted', 'Awaiting review'),
    approved: t('contracts.workItemStatus.approved', 'Approved'),
    awaitingReview: t('contracts.workItemStatus.submitted', 'Awaiting review'),
    notePlaceholder: t('contracts.deliverySpace.notePlaceholder', 'Add a note for the client (optional)'),
    attachFile: t('contracts.deliverySpace.attachFile', 'Attach file'),
    removeFile: t('common.remove', 'Remove'),
    noSubmissions: t('contracts.deliverySpace.noSubmissions', 'Nothing submitted yet.'),
    revision: t('contracts.deliverySpace.revision', 'Revision'),
    reason: t('contracts.deliverySpace.reason', 'Reason'),
    selectForReview: t('contracts.deliverySpace.selectForReview', 'Select'),
  };

  const modalLabels: Record<string, string> = {
    title: t('contracts.deliverySpace.milestoneCompleteTitle', 'Milestone complete'),
    completedMovingTo: t('contracts.deliverySpace.milestoneCompleteMovingTo', 'is complete. Moving on to'),
    completedFinal: t('contracts.deliverySpace.milestoneCompleteFinal', 'is complete.'),
    dismiss: t('common.close', 'Close'),
  };

  if (space.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-hidden />
      </div>
    );
  }

  if (space.error || !space.activeMilestone) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {space.error ?? t('contracts.deliverySpace.noMilestone', 'This contract has no milestone to deliver yet.')}
        </p>
      </div>
    );
  }

  const milestone = space.activeMilestone;
  const isMilestoneComplete =
    Number(milestone?.status) === MilestoneStatus.Completed ||
    Number(milestone?.status) === MilestoneStatus.Approved ||
    (space.workItems.length > 0 && space.deliveredCount === space.workItems.length);

  const runSubmit = async () => {
    if (space.readyToSubmitIds.length === 0) {
      showValidationToast('Attach a file to at least one work item before submitting.', {
        fallback: 'Prepare at least one work item before submitting.',
      });
      return;
    }
    const failure = await space.submitSelected();
    if (failure?.response && isValidationResponse(failure.response)) {
      showValidationToast(failure.response, { fallback: failure.message });
      return;
    }
    setFeedback(failure?.message ?? t('contracts.deliverySpace.submitSuccess', 'Deliverables submitted.'));
  };

  const runReview = async (approve: boolean) => {
    const validationMessages: string[] = [];
    if (space.selectedIds.length === 0) validationMessages.push('Select at least one work item.');
    if (!approve && !revisionReason.trim()) validationMessages.push('Enter the requested revision details.');
    if (validationMessages.length > 0) {
      showValidationToast(validationMessages, { fallback: 'Complete the required review details.' });
      if (!approve && !revisionReason.trim()) revisionReasonRef.current?.focus();
      return;
    }
    const failure = await space.reviewSelected(approve, revisionReason);
    if (!failure) {
      setRevisionReason('');
      setIsRevising(false);
    }
    if (failure?.response && isValidationResponse(failure.response)) {
      showValidationToast(failure.response, { fallback: failure.message });
      if (!approve) revisionReasonRef.current?.focus();
      return;
    }
    setFeedback(failure?.message ?? t('contracts.deliverySpace.reviewSuccess', 'Review saved.'));
  };

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6">
      <button
        type="button"
        onClick={() => navigate(`/workspace/${contractId}`)}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t('contracts.deliverySpace.backToWorkspace', 'Back to workspace')}
      </button>

      <header className="mb-5">
        <h1 className="text-lg font-semibold text-slate-900">{milestone.title}</h1>
        <p className="mt-1 text-sm text-slate-600">
          {t('contracts.deliverySpace.progress', 'Approved')}: {space.deliveredCount}/{space.workItems.length}
          {space.pendingReviewCount > 0
            ? ` · ${space.pendingReviewCount} ${t('contracts.deliverySpace.awaitingReview', 'awaiting review')}`
            : ''}
        </p>
      </header>

      {/* A disputed contract rejects every submit and review server-side. Say so, rather than
          leaving buttons that can only fail. */}
      {space.isDisputed ? (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {t('contracts.deliverySpace.disputedNotice',
            'This contract is under dispute. Submitting and reviewing are paused until an admin resolves it.')}
        </p>
      ) : null}

      {!space.usesWorkItems ? (
        <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
          {t('contracts.deliverySpace.legacyNotice',
            'This contract delivers at milestone level. Use the milestone submit and approve actions in the workspace.')}
        </p>
      ) : null}

      {feedback ? (
        <p className="mb-4 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700">{feedback}</p>
      ) : null}

      <ul className="space-y-3">
        {space.workItems.map(workItem =>
          isClient ? (
            <WorkItemReviewRow
              key={workItem.workItemId}
              workItem={workItem}
              selected={space.selectedIds.includes(workItem.workItemId)}
              disabled={space.isBusy || space.isDisputed || !space.usesWorkItems}
              labels={labels}
              onToggle={() => space.toggleSelected(workItem.workItemId)}
            />
          ) : (
            <WorkItemDeliveryRow
              key={workItem.workItemId}
              workItem={workItem}
              draft={space.getDraft(workItem.workItemId)}
              disabled={space.isBusy || space.isDisputed || !space.usesWorkItems}
              labels={labels}
              onAttach={file => {
                const failure = space.attachFile(workItem.workItemId, file);
                if (failure) showValidationToast(t(`workspace.${failure}FileError`, 'That file was rejected.'), { fallback: 'That file was rejected.' });
              }}
              onDetach={fileName => space.detachFile(workItem.workItemId, fileName)}
              onNoteChange={note => space.updateNote(workItem.workItemId, note)}
            />
          ))}
      </ul>

      {space.usesWorkItems && !space.isDisputed ? (
        <div className="sticky bottom-0 mt-5 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          {isMilestoneComplete ? (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {t('contracts.deliverySpace.allDeliverablesApproved', 'All deliverables have been approved')}
                  </p>
                  <p className="text-xs text-slate-500">
                    {t('contracts.deliverySpace.milestoneFullyCompleted', 'This milestone is fully completed.')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          ) : isClient ? (
            space.pendingReviewCount === 0 ? (
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {t('contracts.deliverySpace.noItemsAwaitingReview', 'No deliverables are currently awaiting your review')}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t('contracts.deliverySpace.awaitingFreelancerSubmissionHint', 'The freelancer is working and will submit deliverables here.')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {t('common.close', 'Close')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {isRevising ? (
                  <textarea
                    ref={revisionReasonRef}
                    value={revisionReason}
                    aria-invalid={!revisionReason.trim()}
                    onChange={event => setRevisionReason(event.target.value)}
                    rows={2}
                    placeholder={t('contracts.deliverySpace.revisionReasonPlaceholder',
                      'Explain what needs to change')}
                    className="w-full rounded-lg border border-slate-200 p-2 text-sm"
                  />
                ) : null}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-slate-600">
                    {space.selectedIds.length} {t('contracts.deliverySpace.selected', 'selected')}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={space.isBusy || space.selectedIds.length === 0}
                      onClick={() => (isRevising ? void runReview(false) : setIsRevising(true))}
                      className="rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('contracts.deliverySpace.requestRevision', 'Request revision')}
                    </button>
                    <button
                      type="button"
                      disabled={space.isBusy || space.selectedIds.length === 0}
                      onClick={() => void runReview(true)}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('contracts.deliverySpace.approveSelected', 'Approve selected')}
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-slate-600">
                {space.readyToSubmitIds.length} {t('contracts.deliverySpace.readyToSubmit', 'ready to submit')}
                {space.uploadProgress !== null ? ` · ${space.uploadProgress}%` : ''}
              </span>
              <button
                type="button"
                disabled={space.isBusy || space.readyToSubmitIds.length === 0}
                onClick={() => void runSubmit()}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('contracts.deliverySpace.submitSelected', 'Submit selected')}
              </button>
            </div>
          )}
        </div>
      ) : null}

      {space.completion ? (
        <MilestoneCompletedModal
          completion={space.completion}
          labels={modalLabels}
          onDismiss={space.dismissCompletion}
        />
      ) : null}
    </div>
  );
};

export default DeliverySpaceScreen;
