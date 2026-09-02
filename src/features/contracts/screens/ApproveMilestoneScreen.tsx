import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  ExternalLink,
  FileCode,
  FileText,
  Layers,
  MessageSquare,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import GCoinIcon from '../../../shared/components/GCoinIcon';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import type { ContractDto, Milestone, MilestoneAttachment } from '../../../types/models/Contract';
import { MilestoneStatus, MilestoneDeliveryMode } from '../../../types/models/Contract';
import {
  canApproveMilestone,
  formatContractDate,
  getMilestoneStatusLabel,
} from '../../../shared/utils/contractUtils';
import { formatGigCoinNumber, formatGigCoinToVnd } from '../../../shared/utils/gigcoin';
import { useTranslation } from '../../../hooks/useTranslation';
import '../styles/approve-milestone-screen.css';

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
        setError('contracts.contractNotFound');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const contractResponse = await contractGetAPI.getContractById(contractId);
        if (!contractResponse.success || !contractResponse.data) {
          throw new Error(contractResponse.message || 'contracts.loadingContract');
        }
        setContract(contractResponse.data);
        const milestoneResponse = await contractGetAPI.getMilestoneById(contractId, milestoneId);
        if (!milestoneResponse.success || !milestoneResponse.data) {
          throw new Error(milestoneResponse.message || 'contracts.loadingMilestone');
        }

        // A work item contract delivers and reviews per work item. Bookmarks, emails and
        // notifications sent before that change still point here, so redirect rather than showing a
        // milestone-level screen that the API will refuse.
        if (Number(milestoneResponse.data.deliveryMode ?? 0) === MilestoneDeliveryMode.WorkItem) {
          navigate(`/deliveryspace/${contractId}/milestones/${milestoneId}`, { replace: true });
          return;
        }

        setMilestone(milestoneResponse.data);
        const attachmentsResponse = await contractGetAPI.getMilestoneAttachments(contractId, milestoneId);
        if (attachmentsResponse.success && attachmentsResponse.data) setAttachments(attachmentsResponse.data);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'contracts.anErrorOccurred');
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
      setSuccessMessage('contracts.milestoneApproved');
      setTimeout(() => navigate(`/workspace/${contractId}`), 2000);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'contracts.anErrorOccurred');
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
      setSuccessMessage('contracts.revisionRequested');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'contracts.anErrorOccurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <AppLayout>
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <LemniscateBloomLoader
          size={160}
          label={t('contracts.preparingReview')}
          tag={t('contracts.loadingMilestone', { defaultValue: 'Loading milestone deliverables...' })}
        />
      </div>
    </AppLayout>
  );

  if (!contract || !milestone) return (
    <AppLayout>
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-3xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} />
        </div>
        <h1 className="text-lg font-black text-text-primary">{t('contracts.unableOpenMilestone')}</h1>
        <p className="text-xs font-medium text-text-muted mt-2 mb-6">{t(error || 'contracts.milestoneNotFound', { defaultValue: error || 'Milestone not found' })}</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-xl border border-border bg-background hover:bg-surface-muted text-text-primary text-xs font-black inline-flex items-center gap-2 transition cursor-pointer"
        >
          <ArrowLeft size={16} /> {t('contracts.back')}
        </button>
      </div>
    </AppLayout>
  );

  const canApprove = canApproveMilestone(milestone.status);
  const isApproved = milestone.status === MilestoneStatus.Approved;
  const isFullyReleased = (milestone.releasedAmount ?? 0) >= milestone.amount;
  const notesTooLong = approvalNotes.length > NOTES_LIMIT;
  const statusLabel = getMilestoneStatusLabel(milestone.status, t);

  return (
    <AppLayout>
      <main className="ams-container">

        {/* HERO BANNER */}
        <div className="ams-hero-card">
          <div className="ams-hero-accent-bar" />

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="ams-back-btn"
            aria-label={t('contracts.back')}
          >
            <ArrowLeft size={18} />
          </button>

          <div className="ams-hero-content">
            <div className="ams-eyebrow">
              <Sparkles size={13} />
              <span>{t('contracts.milestoneReviewEyebrow')}</span>
            </div>
            <h1 className="ams-hero-title">
              {t('contracts.reviewSubmittedWork')}
            </h1>
            <p className="ams-hero-subtitle">{contract.jobTitle || contract.title}</p>
          </div>
        </div>

        {/* ALERTS */}
        {successMessage && (
          <div className="ams-alert-banner ams-alert-success">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="shrink-0" />
              <span>{t(successMessage, { defaultValue: successMessage })}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="ams-alert-dismiss"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {error && (
          <div className="ams-alert-banner ams-alert-error">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{t(error, { defaultValue: error })}</span>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="ams-alert-dismiss"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* SPLIT LAYOUT GRID */}
        <div className="ams-layout-grid">

          {/* LEFT MAIN PANE (8 Columns) */}
          <div className="ams-main-col">

            {/* OVERVIEW CARD */}
            <section className="ams-card">
              <div className="ams-card-header">
                <div className="ams-card-title-group">
                  <span className="ams-card-eyebrow">
                    <Layers size={13} />
                    <span>{t('contracts.submittedMilestone')}</span>
                  </span>
                  <h2 className="ams-card-title">{milestone.title}</h2>
                </div>
                <span className={`ams-status-pill ${isApproved || isFullyReleased ? 'ams-status-approved' : 'ams-status-pending'}`}>
                  {isApproved || isFullyReleased ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                  <span>{statusLabel}</span>
                </span>
              </div>

              <div className="ams-facts-grid">
                <div className="ams-fact-box">
                  <span className="ams-fact-label">
                    <Calendar size={12} />
                    <span>{t('contracts.dueDateLabel')}</span>
                  </span>
                  <span className="ams-fact-value">{formatContractDate(milestone.due_date)}</span>
                </div>
                <div className="ams-fact-box">
                  <span className="ams-fact-label">
                    <Clock size={12} />
                    <span>{t('contracts.currentStatusLabel')}</span>
                  </span>
                  <span className="ams-fact-value">{statusLabel}</span>
                </div>
                {milestone.submittedAt && (
                  <div className="ams-fact-box">
                    <span className="ams-fact-label">
                      <Send size={12} />
                      <span>{t('contracts.submittedAtLabel')}</span>
                    </span>
                    <span className="ams-fact-value text-[var(--brand,#494be7)]">{formatContractDate(milestone.submittedAt)}</span>
                  </div>
                )}
              </div>
            </section>

            {/* FREELANCER SUBMISSION NOTE */}
            {milestone.submissionDescription && (
              <section className="ams-card">
                <div className="ams-card-title-group">
                  <span className="ams-card-eyebrow">
                    <MessageSquare size={13} />
                    <span>{t('contracts.freelancerSubmissionNote')}</span>
                  </span>
                  <h3 className="ams-card-title">{t('contracts.deliverySummary')}</h3>
                </div>
                <div className="ams-note-box">
                  {milestone.submissionDescription}
                </div>
              </section>
            )}

            {/* ESCROW PROTECTION ACCORDION */}
            {canApprove && (
              <section className="ams-escrow-box">
                <button
                  type="button"
                  onClick={() => setShowEscrowInfo(!showEscrowInfo)}
                  className="ams-escrow-toggle-btn"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="ams-escrow-icon-wrap">
                      <ShieldCheck size={20} />
                    </div>
                    <div className="min-w-0">
                      <strong className="text-xs font-black text-text-primary block truncate">{t('contracts.protectedByEscrow')}</strong>
                      <span className="text-[11px] font-semibold text-text-muted block mt-0.5">{t('contracts.seeWhatHappensAfterApproval')}</span>
                    </div>
                  </div>
                  <ChevronDown className={`ams-escrow-chevron ${showEscrowInfo ? 'is-open' : ''}`} size={18} />
                </button>

                {showEscrowInfo && (
                  <div className="ams-escrow-desc">
                    {t('contracts.escrowProtectionDescription', { amount: formatGigCoinNumber(milestone.amount) })}
                  </div>
                )}
              </section>
            )}

            {/* WORK BREAKDOWN STRUCTURE */}
            <section className="ams-card">
              <div className="ams-card-header">
                <div className="ams-card-title-group">
                  <span className="ams-card-eyebrow">
                    <FileCode size={13} />
                    <span>{t('contracts.wbsTitle')}</span>
                  </span>
                  <h3 className="ams-card-title">{t('contracts.completedWorkItems')}</h3>
                </div>
                <span className="ams-badge-count">
                  {t('contracts.workItemsCount', { count: (milestone.workItems || []).length })}
                </span>
              </div>

              <div className="ams-wbs-list">
                {(milestone.workItems || []).map((workItem, index) => (
                  <div key={workItem.workItemId || index} className="ams-wbs-item">
                    <div className="ams-wbs-header">
                      <h4 className="ams-wbs-title">#{index + 1}. {workItem.title}</h4>
                      {workItem.estimatedDuration && (
                        <span className="ams-wbs-duration">{workItem.estimatedDuration}</span>
                      )}
                    </div>
                    {workItem.description && (
                      <p className="ams-wbs-desc">{workItem.description}</p>
                    )}
                    {workItem.progressNote && (
                      <div className="ams-wbs-note">
                        <strong>{t('contracts.progressNote')}</strong> {workItem.progressNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* DELIVERABLES & ATTACHMENTS */}
            <section className="ams-card">
              <div className="ams-card-header">
                <div className="ams-card-title-group">
                  <span className="ams-card-eyebrow">
                    <FileText size={13} />
                    <span>{t('contracts.reviewFiles')}</span>
                  </span>
                  <h3 className="ams-card-title">{t('contracts.submittedDeliverablesTitle')}</h3>
                </div>
                <span className="ams-badge-count">
                  {attachments.length === 1
                    ? t('contracts.filesCount', { count: 1 })
                    : t('contracts.filesCountPlural', { count: attachments.length })}
                </span>
              </div>

              {attachments.length ? (
                <div className="ams-files-list">
                  {attachments.map((attachment, index) => {
                    const fileName = attachment.file_name?.trim() || `Attachment ${index + 1}`;
                    const fileUrl = attachment.file_url?.trim();
                    const fileExtension = fileName.includes('.')
                      ? fileName.split('.').pop()?.toUpperCase()
                      : attachment.mime_type?.split('/').pop()?.toUpperCase();

                    return (
                      <div key={attachment.id || `${attachment.milestone_id}-${index}`} className="ams-file-card">
                        <div className="ams-file-main">
                          <div className="ams-file-icon">
                            <FileText size={18} />
                          </div>
                          <div className="min-w-0">
                            <strong className="ams-file-name block" title={fileName}>{fileName}</strong>
                            <span className="ams-file-meta block">
                              {fileExtension || t('contracts.fileDefaultName')} • {fileUrl ? t('contracts.readyToReview') : t('contracts.unavailable')}
                            </span>
                          </div>
                        </div>

                        <div className="ams-file-actions">
                          {fileUrl && (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ams-file-btn"
                              title={t('contracts.openFileTitle')}
                            >
                              <ExternalLink size={15} />
                            </a>
                          )}
                          {fileUrl ? (
                            <a
                              href={fileUrl}
                              download={fileName}
                              className="ams-file-btn"
                              title={t('contracts.downloadFileTitle')}
                            >
                              <Download size={15} />
                            </a>
                          ) : (
                            <button type="button" disabled className="ams-file-btn opacity-40 cursor-not-allowed">
                              <Download size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="ams-empty-files">
                  <FileText size={22} className="shrink-0" />
                  <div>
                    <strong className="text-xs font-black text-text-primary block">{t('contracts.noAttachedFiles')}</strong>
                    <p className="text-[11px] font-medium text-text-muted mt-0.5">{t('contracts.noAttachedFilesDesc')}</p>
                  </div>
                </div>
              )}
            </section>

          </div>

          {/* RIGHT SIDEBAR (4 Columns) */}
          <div className="ams-sidebar-col">

            {/* ESCROW VALUE CARD */}
            <section className="ams-value-card">
              <div className="ams-value-header">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5">
                  <Wallet size={15} className="text-[var(--brand,#494be7)]" />
                  <span>{t('contracts.milestoneValueLabel')}</span>
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-[var(--brand)]/10 border border-[var(--brand)]/20 text-[var(--brand,#494be7)]">
                  1 G-coin = 1.000 VNĐ
                </span>
              </div>

              <div>
                <div className="ams-amount-display">
                  <GCoinIcon size={24} />
                  <span>{formatGigCoinNumber(milestone.amount)} G-coin</span>
                </div>
                <div className="ams-vnd-estimate">
                  <span>≈ {formatGigCoinToVnd(milestone.amount)}</span>
                </div>
              </div>

              <p className="ams-value-footer">
                {canApprove ? t('contracts.securedInContractEscrow') : statusLabel}
              </p>
            </section>

            {/* DECISION STUDIO */}
            {canApprove && (
              <section className="ams-card">
                <div>
                  <span className="ams-card-eyebrow block">
                    <Sparkles size={12} />
                    <span>{t('contracts.finalStepKicker')}</span>
                  </span>
                  <h2 className="text-sm font-black text-text-primary mt-0.5">{t('contracts.makeYourDecision')}</h2>
                  <p className="text-[11px] font-medium text-text-muted mt-1">{t('contracts.reviewBeforeActionDesc')}</p>
                </div>

                {/* Option Buttons */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => { setApprovalAction('approve'); setApprovalNotes(''); }}
                    className={`ams-decision-btn ${approvalAction === 'approve' ? 'active-approve' : ''}`}
                  >
                    <div className="ams-decision-icon-wrap ams-decision-icon-approve">
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <strong className="text-xs font-black block">{t('contracts.approveWork')}</strong>
                      <span className="text-[10px] font-medium text-text-muted block mt-0.5">{t('contracts.acceptThisDelivery')}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setApprovalAction('reject'); setApprovalNotes(''); }}
                    className={`ams-decision-btn ${approvalAction === 'reject' ? 'active-reject' : ''}`}
                  >
                    <div className="ams-decision-icon-wrap ams-decision-icon-reject">
                      <RotateCcw size={18} />
                    </div>
                    <div>
                      <strong className="text-xs font-black block">{t('contracts.requestRevisionOpt')}</strong>
                      <span className="text-[10px] font-medium text-text-muted block mt-0.5">{t('contracts.sendBackForChanges')}</span>
                    </div>
                  </button>
                </div>

                {/* CONFIRMATION BOX */}
                {approvalAction !== 'pending' && (
                  <div className="pt-3 border-t border-border space-y-3.5 animate-fadeIn">
                    {approvalAction === 'approve' ? (
                      <div className="ams-confirm-approve-callout">
                        <strong className="font-black block">{t('contracts.confirmApprovalTitle')}</strong>
                        <span>{t('contracts.confirmApprovalDesc', { amount: formatGigCoinNumber(milestone.amount) })}</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label htmlFor="revision-reason" className="text-xs font-black uppercase tracking-wider text-text-muted flex justify-between">
                          <span>{t('contracts.whatNeedsToBeChanged')}</span>
                          <span className="text-rose-500 font-bold">{t('contracts.requiredFieldLabel')}</span>
                        </label>
                        <textarea
                          id="revision-reason"
                          value={approvalNotes}
                          maxLength={NOTES_LIMIT + 1}
                          onChange={(event) => setApprovalNotes(event.target.value)}
                          placeholder={t('contracts.describeChangesPlaceholder')}
                          rows={4}
                          className="ams-revision-textarea"
                        />
                        <div className="flex justify-between items-center text-[10px] font-bold text-text-muted">
                          <span>{t('contracts.validationOnlyNotice')}</span>
                          <span className={notesTooLong ? 'text-rose-500 font-black' : ''}>{approvalNotes.length}/{NOTES_LIMIT}</span>
                        </div>

                        {/* Revision Items Checkbox List */}
                        <div className="space-y-2 pt-2 border-t border-border">
                          <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
                            {t('contracts.selectWorkItemsForRevision')}
                          </span>
                          {(milestone.workItems || []).map((workItem, idx) => (
                            <label key={workItem.workItemId || idx} className="ams-checkbox-item">
                              <input
                                type="checkbox"
                                checked={revisionWorkItemIds.includes(workItem.workItemId)}
                                onChange={event => setRevisionWorkItemIds(ids => event.target.checked ? [...ids, workItem.workItemId] : ids.filter(id => id !== workItem.workItemId))}
                                className="rounded border-border text-[var(--brand)] focus:ring-[var(--brand)] cursor-pointer"
                              />
                              <span>{workItem.title}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setApprovalAction('pending')}
                        disabled={isSubmitting}
                        className="ams-btn-cancel flex-1"
                      >
                        {t('contracts.cancelDecision')}
                      </button>
                      <button
                        type="button"
                        onClick={approvalAction === 'approve' ? handleApprove : handleReject}
                        disabled={isSubmitting || notesTooLong || (approvalAction === 'reject' && (!approvalNotes.trim() || revisionWorkItemIds.length === 0))}
                        className={`flex-1 ${approvalAction === 'approve' ? 'ams-btn-approve-submit' : 'ams-btn-revision-submit'} disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {isSubmitting ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : approvalAction === 'approve' ? (
                          <CheckCircle2 size={15} />
                        ) : (
                          <RotateCcw size={15} />
                        )}
                        <span>
                          {isSubmitting
                            ? t('contracts.submittingDecision')
                            : approvalAction === 'approve'
                              ? t('contracts.approveMilestoneBtn')
                              : t('contracts.requestRevisionBtn')}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {(isApproved || isFullyReleased) && (
              <section className="p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <h3 className="text-sm font-black text-text-primary">{isFullyReleased ? t('contracts.escrowReleasedTitle') : t('contracts.milestoneApprovedTitle')}</h3>
                <p className="text-xs font-medium text-text-muted">{isFullyReleased ? t('contracts.escrowReleasedDesc') : t('contracts.milestoneApprovedDescText')}</p>
              </section>
            )}

            <button
              type="button"
              onClick={() => navigate(`/workspace/${contractId}`)}
              className="ams-workspace-btn"
            >
              <ArrowLeft size={16} />
              <span>{t('contracts.backToWorkspace')}</span>
            </button>
          </div>

        </div>

      </main>
    </AppLayout>
  );
}


