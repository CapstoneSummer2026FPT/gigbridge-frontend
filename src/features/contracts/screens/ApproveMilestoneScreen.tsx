import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, Clock, Download,
  ExternalLink, FileText, RotateCcw, ShieldCheck, Wallet,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import type { ContractDto, Milestone, MilestoneAttachment } from '../../../types/models/Contract';
import { MilestoneStatus } from '../../../types/models/Contract';
import {
  canApproveMilestone, formatContractAmount, formatContractDate, getMilestoneStatusLabel,
} from '../../../shared/utils/contractUtils';
import '../styles/approve-milestone-screen.css';

import { useTranslation } from '../../../hooks/useTranslation';

interface MilestoneWithAttachments extends Milestone {
  attachments?: MilestoneAttachment[];
}

const NOTES_LIMIT = 500;

export default function ApproveMilestoneScreen() {
  const { t } = useTranslation();
  const { contractId, milestoneId } = useParams<{ contractId: string; milestoneId: string }>();
  const navigate = useNavigate();
  const [contract, setContract] = useState<ContractDto | null>(null);
  const [milestone, setMilestone] = useState<MilestoneWithAttachments | null>(null);
  const [attachments, setAttachments] = useState<MilestoneAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [approvalAction, setApprovalAction] = useState<'pending' | 'approve' | 'reject'>('pending');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [revisionWorkItemIds, setRevisionWorkItemIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEscrowInfo, setShowEscrowInfo] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!contractId || !milestoneId) {
        setError(t('contracts.contractNotFound'));
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const contractResponse = await contractGetAPI.getContractById(contractId);
        if (!contractResponse.success || !contractResponse.data) {
          throw new Error(contractResponse.message || t('contracts.loadingContract'));
        }
        setContract(contractResponse.data);
        const milestoneResponse = await contractGetAPI.getMilestoneById(contractId, milestoneId);
        if (!milestoneResponse.success || !milestoneResponse.data) {
          throw new Error(milestoneResponse.message || t('contracts.loadingMilestone', { defaultValue: 'Failed to load milestone' }));
        }
        setMilestone(milestoneResponse.data);
        const attachmentsResponse = await contractGetAPI.getMilestoneAttachments(contractId, milestoneId);
        if (attachmentsResponse.success && attachmentsResponse.data) setAttachments(attachmentsResponse.data);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : t('contracts.anErrorOccurred'));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [contractId, milestoneId]);

  const handleApprove = async () => {
    if (!milestone || !contractId) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await contractPostAPI.approveMilestone(contractId, milestone.id);
      if (!response.success) throw new Error(response.message || 'Failed to approve milestone.');
      setMilestone({ ...milestone, status: MilestoneStatus.Approved });
      setApprovalAction('pending');
      setSuccessMessage(t('contracts.milestoneApproved'));
      setTimeout(() => navigate(`/workspace/${contractId}`), 2000);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('contracts.anErrorOccurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!milestone || !contractId) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await contractPostAPI.requestMilestoneRevision(contractId, milestone.id, approvalNotes.trim(), revisionWorkItemIds);
      if (!response.success) throw new Error(response.message || 'Failed to request revisions.');
      setMilestone({ ...milestone, status: MilestoneStatus.InProgress });
      setApprovalAction('pending');
      setApprovalNotes('');
      setRevisionWorkItemIds([]);
      setSuccessMessage(t('contracts.revisionRequested'));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : t('contracts.anErrorOccurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <AppLayout><div className="approve-milestone-wrapper">
      <div className="approve-milestone-state" role="status" aria-live="polite">
        <span className="approve-milestone-spinner" aria-hidden="true" />
        <h1>{t('contracts.preparingReview')}</h1><p>{t('contracts.loadingMilestone', { defaultValue: 'Loading the milestone and submitted deliverables...' })}</p>
      </div>
    </div></AppLayout>
  );

  if (!contract || !milestone) return (
    <AppLayout><div className="approve-milestone-wrapper">
      <div className="approve-milestone-state approve-milestone-state--error" role="alert">
        <AlertCircle size={48} /><h1>{t('contracts.unableOpenMilestone')}</h1>
        <p>{error || t('contracts.milestoneNotFound')}</p>
        <button onClick={() => navigate(-1)} className="approve-milestone-secondary-button">
          <ArrowLeft size={18} /> {t('contracts.back')}
        </button>
      </div>
    </div></AppLayout>
  );

  const canApprove = canApproveMilestone(milestone.status);
  const isApproved = milestone.status === MilestoneStatus.Approved;
  const isFullyReleased = (milestone.releasedAmount ?? 0) >= milestone.amount;
  const notesTooLong = approvalNotes.length > NOTES_LIMIT;
  const statusLabel = getMilestoneStatusLabel(milestone.status);

  return (
    <AppLayout>
      <div className="approve-milestone-wrapper">
        <header className="approve-milestone-header">
          <button onClick={() => navigate(-1)} className="approve-milestone-back" aria-label={t('contracts.back')}><ArrowLeft size={20} /></button>
          <div><span className="approve-milestone-eyebrow">{t('contracts.milestoneReviewEyebrow')}</span><h1>{t('contracts.reviewSubmittedWork')}</h1><p>{contract.title}</p></div>
        </header>

        {successMessage && <div className="approve-milestone-alert approve-milestone-alert--success" role="status" aria-live="polite">
          <CheckCircle2 size={20} /><p>{successMessage}</p><button onClick={() => setSuccessMessage(null)} aria-label="Dismiss message">&times;</button>
        </div>}
        {error && <div className="approve-milestone-alert approve-milestone-alert--error" role="alert">
          <AlertCircle size={20} /><p>{error}</p><button onClick={() => setError(null)} aria-label="Dismiss error">&times;</button>
        </div>}

        <div className="approve-milestone-layout">
          <main className="approve-milestone-main">
            <section className="approve-milestone-card approve-milestone-overview" aria-labelledby="milestone-title">
              <div className="approve-milestone-section-heading">
                <div><span className="approve-milestone-kicker">{t('contracts.submittedMilestone')}</span><h2 id="milestone-title">{milestone.title}</h2></div>
                <span className={`approve-milestone-status approve-milestone-status--${milestone.status}`}>
                  {isApproved || isFullyReleased ? <CheckCircle2 size={16} /> : <Clock size={16} />}{statusLabel}
                </span>
              </div>
              <div className="approve-milestone-facts">
                <div><span>{t('contracts.dueDateLabel')}</span><strong>{formatContractDate(milestone.due_date)}</strong></div>
                <div><span>{t('contracts.currentStatusLabel')}</span><strong>{statusLabel}</strong></div>
                {milestone.paid_at && <div><span>{t('contracts.paymentReleasedLabel')}</span><strong>{formatContractDate(milestone.paid_at)}</strong></div>}
                {milestone.submittedAt && <div><span>Submitted</span><strong>{formatContractDate(milestone.submittedAt)}</strong></div>}
              </div>
            </section>

            {milestone.submissionDescription && <section className="approve-milestone-card" aria-labelledby="submission-summary-title">
              <div className="approve-milestone-section-heading">
                <div><span className="approve-milestone-kicker">Freelancer submission</span><h2 id="submission-summary-title">Delivery summary</h2></div>
              </div>
              <p className="whitespace-pre-wrap text-sm text-secondary">{milestone.submissionDescription}</p>
            </section>}

            {canApprove && <section className="approve-milestone-card approve-milestone-escrow">
              <button type="button" className="approve-milestone-escrow-toggle" onClick={() => setShowEscrowInfo(!showEscrowInfo)} aria-expanded={showEscrowInfo} aria-controls="escrow-explanation">
                <span className="approve-milestone-icon"><ShieldCheck size={20} /></span>
                <span><strong>{t('contracts.protectedByEscrow')}</strong><small>{t('contracts.seeWhatHappensAfterApproval')}</small></span>
                <ChevronDown className={showEscrowInfo ? 'is-open' : ''} size={20} />
              </button>
              {showEscrowInfo && <div id="escrow-explanation" className="approve-milestone-escrow-copy">
                {t('contracts.escrowProtectionDescription', { amount: formatContractAmount(milestone.amount) })}
              </div>}
            </section>}

            <section className="approve-milestone-card">
              <div className="approve-milestone-section-heading"><div><span className="approve-milestone-kicker">Work Breakdown Structure</span><h2>Completed work items</h2></div><span className="approve-milestone-count">{(milestone.workItems || []).length}</span></div>
              <div className="space-y-2">{(milestone.workItems || []).map((workItem, index) => <div key={workItem.workItemId} className="rounded-lg border border-border p-3 text-sm"><div className="flex justify-between gap-2"><strong>{index + 1}. {workItem.title}</strong><span className="text-xs text-muted-foreground">{workItem.estimatedDuration}</span></div>{workItem.description && <p className="mt-1 text-xs text-muted-foreground">{workItem.description}</p>}{workItem.progressNote && <p className="mt-2 text-xs"><strong>Progress note:</strong> {workItem.progressNote}</p>}</div>)}</div>
            </section>

            <section className="approve-milestone-card" aria-labelledby="deliverables-title">
              <div className="approve-milestone-section-heading">
                <div><span className="approve-milestone-kicker">{t('contracts.reviewFiles')}</span><h2 id="deliverables-title">{t('contracts.submittedDeliverablesTitle')}</h2></div>
                <span className="approve-milestone-count">{attachments.length === 1 ? t('contracts.filesCount', { count: 1 }) : t('contracts.filesCountPlural', { count: attachments.length })}</span>
              </div>
              {attachments.length ? <div className="approve-milestone-files">{attachments.map((attachment, index) => {
                const fileName = attachment.file_name?.trim() || `Attachment ${index + 1}`;
                const fileUrl = attachment.file_url?.trim();
                const fileExtension = fileName.includes('.') ? fileName.split('.').pop()?.toUpperCase() : attachment.mime_type?.split('/').pop()?.toUpperCase();
                return <div key={attachment.id || `${attachment.milestone_id}-${index}`} className="approve-milestone-file">
                  <span className="approve-milestone-file-icon"><FileText size={20} /></span>
                  <div className="approve-milestone-file-info"><strong>{fileName}</strong><span>{fileExtension || t('contracts.fileDefaultName')} · {fileUrl ? t('contracts.readyToReview') : t('contracts.unavailable')}</span></div>
                  <div className="approve-milestone-file-actions">
                    {fileUrl && <a href={fileUrl} target="_blank" rel="noopener noreferrer" aria-label={t('contracts.openFileAria', { fileName })} title={t('contracts.openFileTitle')}><ExternalLink size={18} /></a>}
                    {fileUrl ? <a href={fileUrl} download={fileName} aria-label={t('contracts.downloadFileAria', { fileName })} title={t('contracts.downloadFileTitle')}><Download size={18} /></a>
                      : <button type="button" aria-label={t('contracts.fileUnavailableAria', { fileName })} title={t('contracts.fileUnavailableTitle')} disabled><Download size={18} /></button>}
                  </div>
                </div>;
              })}</div> : <div className="approve-milestone-empty-files"><FileText size={26} /><div><strong>{t('contracts.noAttachedFiles')}</strong><p>{t('contracts.noAttachedFilesDesc')}</p></div></div>}
            </section>
          </main>

          <aside className="approve-milestone-sidebar">
            <div className="approve-milestone-sidebar-sticky">
              <section className="approve-milestone-card approve-milestone-payment" aria-label={t('contracts.milestoneValueLabel')}>
                <span><Wallet size={18} /> {t('contracts.milestoneValueLabel')}</span><div><GigCoinLogo size={28} /><strong>{formatContractAmount(milestone.amount)}</strong></div>
                <small>{canApprove ? t('contracts.securedInContractEscrow') : statusLabel}</small>
              </section>

              {canApprove && <section className="approve-milestone-card approve-milestone-decision" aria-labelledby="decision-title">
                <span className="approve-milestone-kicker">{t('contracts.finalStepKicker')}</span><h2 id="decision-title">{t('contracts.makeYourDecision')}</h2><p>{t('contracts.reviewBeforeActionDesc')}</p>
                <div className="approve-milestone-options" role="group" aria-label={t('contracts.makeYourDecision')}>
                  <button type="button" onClick={() => { setApprovalAction('approve'); setApprovalNotes(''); }} className={approvalAction === 'approve' ? 'is-selected is-approve' : ''} aria-pressed={approvalAction === 'approve'}>
                    <CheckCircle2 size={20} /><span><strong>{t('contracts.approveWork')}</strong><small>{t('contracts.acceptThisDelivery')}</small></span>
                  </button>
                  <button type="button" onClick={() => { setApprovalAction('reject'); setApprovalNotes(''); }} className={approvalAction === 'reject' ? 'is-selected is-revision' : ''} aria-pressed={approvalAction === 'reject'}>
                    <RotateCcw size={20} /><span><strong>{t('contracts.requestRevisionOpt')}</strong><small>{t('contracts.sendBackForChanges')}</small></span>
                  </button>
                  <button type="button" onClick={() => navigate(`/contracts/${contractId}/disputes/create?milestoneId=${milestone.id}`)}>
                    <AlertCircle size={20} /><span><strong>Open dispute</strong><small>Escalate this submitted milestone</small></span>
                  </button>
                </div>
                {approvalAction !== 'pending' && <div className={`approve-milestone-confirmation approve-milestone-confirmation--${approvalAction}`}>
                  {approvalAction === 'approve' ? <p><strong>{t('contracts.confirmApprovalTitle')}</strong>{t('contracts.confirmApprovalDesc', { amount: formatContractAmount(milestone.amount) })}</p> : <>
                    <label htmlFor="revision-reason">{t('contracts.whatNeedsToBeChanged')} <span>{t('contracts.requiredFieldLabel')}</span></label>
                    <textarea id="revision-reason" value={approvalNotes} maxLength={NOTES_LIMIT + 1} onChange={(event) => setApprovalNotes(event.target.value)} placeholder={t('contracts.describeChangesPlaceholder')} rows={4} aria-describedby="revision-note revision-count" aria-invalid={notesTooLong} />
                    <fieldset className="mt-3 space-y-2"><legend className="text-xs font-bold">Select work items requiring revision</legend>{(milestone.workItems || []).map(workItem => <label key={workItem.workItemId} className="flex items-start gap-2 text-xs"><input type="checkbox" checked={revisionWorkItemIds.includes(workItem.workItemId)} onChange={event => setRevisionWorkItemIds(ids => event.target.checked ? [...ids, workItem.workItemId] : ids.filter(id => id !== workItem.workItemId))} /><span>{workItem.title}</span></label>)}</fieldset>
                    <div className="approve-milestone-textarea-meta"><small id="revision-note">{t('contracts.validationOnlyNotice')}</small><span id="revision-count" className={notesTooLong ? 'is-over' : ''}>{approvalNotes.length}/{NOTES_LIMIT}</span></div>
                  </>}
                  <div className="approve-milestone-decision-actions">
                    <button type="button" onClick={() => setApprovalAction('pending')} disabled={isSubmitting}>{t('contracts.cancelDecision')}</button>
                    <button type="button" className={approvalAction === 'approve' ? 'is-approve' : 'is-revision'} onClick={approvalAction === 'approve' ? handleApprove : handleReject} disabled={isSubmitting || notesTooLong || (approvalAction === 'reject' && (!approvalNotes.trim() || revisionWorkItemIds.length === 0))}>
                      {isSubmitting ? <span className="approve-milestone-spinner approve-milestone-spinner--small" /> : approvalAction === 'approve' ? <CheckCircle2 size={18} /> : <RotateCcw size={18} />}
                      {isSubmitting ? t('contracts.submittingDecision') : approvalAction === 'approve' ? t('contracts.approveMilestoneBtn') : t('contracts.requestRevisionBtn')}
                    </button>
                  </div>
                </div>}
              </section>}

              {(isApproved || isFullyReleased) && <section className="approve-milestone-card approve-milestone-complete" role="status">
                <span><CheckCircle2 size={24} /></span><h2>{isFullyReleased ? t('contracts.escrowReleasedTitle') : t('contracts.milestoneApprovedTitle')}</h2>
                <p>{isFullyReleased ? t('contracts.escrowReleasedDesc') : t('contracts.milestoneApprovedDescText')}</p>
              </section>}
              <button type="button" onClick={() => navigate(`/workspace/${contractId}`)} className="approve-milestone-workspace-button"><ArrowLeft size={18} /> {t('contracts.backToWorkspace')}</button>
            </div>
          </aside>
        </div>
      </div>
    </AppLayout>
  );
}
