import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertCircle, ArrowLeft, CheckCircle2, ChevronDown, Clock, Download,
  ExternalLink, FileText, RotateCcw, ShieldCheck, Sparkles, Wallet,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import type { ContractDto, Milestone, MilestoneAttachment } from '../../../types/models/Contract';
import { MilestoneStatus } from '../../../types/models/Contract';
import {
  canApproveMilestone, formatContractAmount, formatContractDate, getMilestoneStatusLabel,
} from '../../../shared/utils/contractUtils';
import '../styles/approve-milestone-screen.css';

import { formatGigCoinToVnd } from '../../../shared/utils/gigcoin';
import { useTranslation } from '../../../hooks/useTranslation';

interface MilestoneWithAttachments extends Milestone {
  attachments?: MilestoneAttachment[];
}

const NOTES_LIMIT = 500;

export default function ApproveMilestoneScreen() {
  const { t } = useTranslation(['contracts', 'common']);
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
    <AppLayout>
      <div className="min-h-[60vh] flex items-center justify-center">
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
        <p className="text-xs font-medium text-text-muted mt-2 mb-6">{error || t('contracts.milestoneNotFound')}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 rounded-xl border border-border bg-surface-card hover:bg-surface-muted text-text-primary text-xs font-black inline-flex items-center gap-2 transition cursor-pointer"
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
  const statusLabel = getMilestoneStatusLabel(milestone.status);

  return (
    <AppLayout>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* CHAPTER 1: EXECUTIVE HERO BANNER */}
        <div className="relative rounded-3xl border border-brand/30 bg-gradient-to-r from-brand/15 via-background to-brand/10 p-6 sm:p-8 backdrop-blur-2xl shadow-xl overflow-hidden">
          {/* Ambient glow decoration */}
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex items-start gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-2xl bg-surface-card border border-border/80 hover:border-brand/50 text-text-muted hover:text-text-primary flex items-center justify-center transition shrink-0 cursor-pointer shadow-2xs mt-0.5"
              aria-label={t('contracts.back')}
            >
              <ArrowLeft size={18} />
            </button>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-brand/15 border border-brand/30 text-brand text-[10px] font-black uppercase tracking-widest shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-ping" />
                <Sparkles size={12} />
                {t('contracts.milestoneReviewEyebrow')}
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
                {t('contracts.reviewSubmittedWork')}
              </h1>
              <p className="text-xs font-semibold text-text-muted">{contract.title}</p>
            </div>
          </div>
        </div>

        {/* ALERTS */}
        {successMessage && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center justify-between gap-3 animate-fadeIn shadow-xs">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 dark:text-emerald-400 hover:opacity-75 font-black">&times;</button>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center justify-between gap-3 animate-fadeIn shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-destructive hover:opacity-75 font-black">&times;</button>
          </div>
        )}

        {/* CHAPTER 2: SPLIT LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT MAIN PANE (8 Columns) */}
          <div className="lg:col-span-8 space-y-6">
            {/* OVERVIEW CARD */}
            <section className="rounded-3xl border border-border/80 bg-background/80 backdrop-blur-xl p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand block">
                    {t('contracts.submittedMilestone')}
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-text-primary tracking-tight">{milestone.title}</h2>
                </div>
                <span className={`px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 shrink-0 ${
                  isApproved || isFullyReleased
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                }`}>
                  {isApproved || isFullyReleased ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                  {statusLabel}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-border/60">
                <div className="p-3.5 rounded-2xl bg-surface-card/60 border border-border/60">
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">{t('contracts.dueDateLabel')}</span>
                  <strong className="font-bold text-xs text-text-primary mt-1 block">{formatContractDate(milestone.due_date)}</strong>
                </div>
                <div className="p-3.5 rounded-2xl bg-surface-card/60 border border-border/60">
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">{t('contracts.currentStatusLabel')}</span>
                  <strong className="font-bold text-xs text-text-primary mt-1 block">{statusLabel}</strong>
                </div>
                {milestone.submittedAt && (
                  <div className="p-3.5 rounded-2xl bg-surface-card/60 border border-border/60">
                    <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">Submitted</span>
                    <strong className="font-bold text-xs text-brand mt-1 block">{formatContractDate(milestone.submittedAt)}</strong>
                  </div>
                )}
              </div>
            </section>

            {/* SUBMISSION NOTES CARD */}
            {milestone.submissionDescription && (
              <section className="rounded-3xl border border-border/80 bg-background/80 backdrop-blur-xl p-6 shadow-xs space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-brand block">
                  Freelancer Submission Note
                </span>
                <h3 className="text-sm font-black text-text-primary">Delivery Summary</h3>
                <div className="border-l-4 border-brand bg-brand/5 rounded-2xl p-5 border border-border/60">
                  <p className="whitespace-pre-wrap text-xs font-medium text-text-primary leading-relaxed">
                    {milestone.submissionDescription}
                  </p>
                </div>
              </section>
            )}

            {/* ESCROW PROTECTION SHIELD */}
            {canApprove && (
              <section className="rounded-3xl border border-brand/30 bg-brand/5 backdrop-blur-xl p-5 shadow-xs transition-all">
                <button
                  type="button"
                  onClick={() => setShowEscrowInfo(!showEscrowInfo)}
                  className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <strong className="text-xs font-black text-text-primary block">{t('contracts.protectedByEscrow')}</strong>
                      <span className="text-[11px] font-medium text-text-muted block mt-0.5">{t('contracts.seeWhatHappensAfterApproval')}</span>
                    </div>
                  </div>
                  <ChevronDown className={`transition-transform text-text-muted ${showEscrowInfo ? 'rotate-180' : ''}`} size={18} />
                </button>

                {showEscrowInfo && (
                  <div className="mt-3 pt-3 border-t border-brand/20 text-xs font-medium text-text-muted leading-relaxed pl-13">
                    {t('contracts.escrowProtectionDescription', { amount: formatContractAmount(milestone.amount) })}
                  </div>
                )}
              </section>
            )}

            {/* WORK BREAKDOWN STRUCTURE */}
            <section className="rounded-3xl border border-border/80 bg-background/80 backdrop-blur-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">Work Breakdown Structure</span>
                  <h3 className="text-sm font-black text-text-primary">Completed Work Items</h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-surface-muted border border-border text-[10px] font-black text-text-muted">
                  {(milestone.workItems || []).length} items
                </span>
              </div>

              <div className="space-y-3">
                {(milestone.workItems || []).map((workItem, index) => (
                  <div key={workItem.workItemId} className="rounded-2xl border border-border/70 bg-surface-card p-4 space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <strong className="text-xs font-bold text-text-primary">{index + 1}. {workItem.title}</strong>
                      <span className="text-[10px] font-bold text-text-muted">{workItem.estimatedDuration}</span>
                    </div>
                    {workItem.description && <p className="text-[11px] font-medium text-text-muted">{workItem.description}</p>}
                    {workItem.progressNote && <p className="text-[11px] font-medium text-brand mt-2"><strong>Progress Note:</strong> {workItem.progressNote}</p>}
                  </div>
                ))}
              </div>
            </section>

            {/* DELIVERABLES & ATTACHMENTS */}
            <section className="rounded-3xl border border-border/80 bg-background/80 backdrop-blur-xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">{t('contracts.reviewFiles')}</span>
                  <h3 className="text-sm font-black text-text-primary">{t('contracts.submittedDeliverablesTitle')}</h3>
                </div>
                <span className="px-3 py-1 rounded-full bg-surface-muted border border-border text-[10px] font-black text-text-muted">
                  {attachments.length === 1 ? t('contracts.filesCount', { count: 1 }) : t('contracts.filesCountPlural', { count: attachments.length })}
                </span>
              </div>

              {attachments.length ? (
                <div className="space-y-3">
                  {attachments.map((attachment, index) => {
                    const fileName = attachment.file_name?.trim() || `Attachment ${index + 1}`;
                    const fileUrl = attachment.file_url?.trim();
                    const fileExtension = fileName.includes('.') ? fileName.split('contracts..').pop()?.toUpperCase() : attachment.mime_type?.split('contracts./').pop()?.toUpperCase();

                    return (
                      <div key={attachment.id || `${attachment.milestone_id}-${index}`} className="rounded-2xl border border-border/70 bg-surface-card p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand shrink-0">
                            <FileText size={20} />
                          </div>
                          <div className="min-w-0">
                            <strong className="text-xs font-black text-text-primary block truncate">{fileName}</strong>
                            <span className="text-[10px] font-bold text-text-muted block mt-0.5">
                              {fileExtension || t('contracts.fileDefaultName')} â€¢ {fileUrl ? t('contracts.readyToReview') : t('contracts.unavailable')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {fileUrl && (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl border border-border/80 bg-background hover:bg-surface-hover text-text-muted hover:text-text-primary transition"
                              title={t('contracts.openFileTitle')}
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                          {fileUrl ? (
                            <a
                              href={fileUrl}
                              download={fileName}
                              className="p-2 rounded-xl border border-border/80 bg-background hover:bg-surface-hover text-text-muted hover:text-text-primary transition"
                              title={t('contracts.downloadFileTitle')}
                            >
                              <Download size={16} />
                            </a>
                          ) : (
                            <button type="button" disabled className="p-2 rounded-xl border border-border bg-background text-text-muted opacity-40">
                              <Download size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/80 p-6 flex items-center gap-3 text-text-muted">
                  <FileText size={24} className="shrink-0" />
                  <div>
                    <strong className="text-xs font-black text-text-primary block">{t('contracts.noAttachedFiles')}</strong>
                    <p className="text-[10px] font-medium text-text-muted mt-0.5">{t('contracts.noAttachedFilesDesc')}</p>
                  </div>
                </div>
              )}
            </section>
          </div>

          {/* RIGHT SIDEBAR (4 Columns) */}
          <div className="lg:col-span-4 space-y-6 sticky top-20">
            {/* ESCROW VALUE CARD */}
            <section className="rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/10 via-background to-background p-6 shadow-lg space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                  <Wallet size={16} className="text-brand" />
                  {t('contracts.milestoneValueLabel')}
                </span>
                <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-brand/10 border border-brand/20 text-brand">
                  1 GigCoin = 1.000 VNĐ
                </span>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <GigCoinLogo size={32} />
                  <strong className="text-2xl font-black text-text-primary tracking-tight">
                    {formatContractAmount(milestone.amount)}
                  </strong>
                </div>
                <div className="mt-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pl-11">
                  <span>≈ {formatGigCoinToVnd(milestone.amount)}</span>
                </div>
              </div>
              <p className="text-[11px] font-bold text-brand uppercase tracking-wider pt-2 border-t border-border/60">
                {canApprove ? t('contracts.securedInContractEscrow') : statusLabel}
              </p>
            </section>

            {/* DECISION STUDIO */}
            {canApprove && (
              <section className="rounded-3xl border border-border/80 bg-background/80 backdrop-blur-xl p-6 shadow-xs space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-brand block">
                    {t('contracts.finalStepKicker')}
                  </span>
                  <h2 className="text-sm font-black text-text-primary mt-0.5">{t('contracts.makeYourDecision')}</h2>
                  <p className="text-[11px] font-medium text-text-muted mt-1">{t('contracts.reviewBeforeActionDesc')}</p>
                </div>

                {/* Option Buttons */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={() => { setApprovalAction('approve'); setApprovalNotes(''); }}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                      approvalAction === 'approve'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/20'
                        : 'bg-surface-card border-border/80 hover:border-emerald-500/40 text-text-primary'
                    }`}
                  >
                    <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />
                    <div>
                      <strong className="text-xs font-black block">{t('contracts.approveWork')}</strong>
                      <span className="text-[10px] font-medium text-text-muted block mt-0.5">{t('contracts.acceptThisDelivery')}</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setApprovalAction('reject'); setApprovalNotes(''); }}
                    className={`w-full p-4 rounded-2xl border text-left transition flex items-center gap-3 cursor-pointer ${
                      approvalAction === 'reject'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 ring-2 ring-amber-500/20'
                        : 'bg-surface-card border-border/80 hover:border-amber-500/40 text-text-primary'
                    }`}
                  >
                    <RotateCcw size={20} className="text-amber-500 shrink-0" />
                    <div>
                      <strong className="text-xs font-black block">{t('contracts.requestRevisionOpt')}</strong>
                      <span className="text-[10px] font-medium text-text-muted block mt-0.5">{t('contracts.sendBackForChanges')}</span>
                    </div>
                  </button>
                </div>

                {/* CONFIRMATION BOX */}
                {approvalAction !== 'pending' && (
                  <div className="pt-4 border-t border-border/60 space-y-4 animate-fadeIn">
                    {approvalAction === 'approve' ? (
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400 space-y-1">
                        <strong className="font-black block">{t('contracts.confirmApprovalTitle')}</strong>
                        <p className="leading-relaxed">{t('contracts.confirmApprovalDesc', { amount: formatContractAmount(milestone.amount) })}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label htmlFor="revision-reason" className="text-xs font-black uppercase tracking-wider text-text-muted flex justify-between">
                          <span>{t('contracts.whatNeedsToBeChanged')}</span>
                          <span className="text-destructive">{t('contracts.requiredFieldLabel')}</span>
                        </label>
                        <textarea
                          id="revision-reason"
                          value={approvalNotes}
                          maxLength={NOTES_LIMIT + 1}
                          onChange={(event) => setApprovalNotes(event.target.value)}
                          placeholder={t('contracts.describeChangesPlaceholder')}
                          rows={4}
                          className="w-full bg-surface-card border border-border/80 focus:border-brand rounded-2xl p-3 text-xs font-medium text-text-primary focus:outline-none transition resize-none"
                        />
                        <div className="flex justify-between items-center text-[10px] font-bold text-text-muted">
                          <span>{t('contracts.validationOnlyNotice')}</span>
                          <span className={notesTooLong ? 'text-destructive font-black' : ''}>{approvalNotes.length}/{NOTES_LIMIT}</span>
                        </div>

                        {/* Revision Items Checkbox List */}
                        <div className="space-y-2 pt-2 border-t border-border/60">
                          <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
                            Select work items requiring revision
                          </span>
                          {(milestone.workItems || []).map(workItem => (
                            <label key={workItem.workItemId} className="flex items-center gap-2 text-xs font-medium text-text-primary cursor-pointer">
                              <input
                                type="checkbox"
                                checked={revisionWorkItemIds.includes(workItem.workItemId)}
                                onChange={event => setRevisionWorkItemIds(ids => event.target.checked ? [...ids, workItem.workItemId] : ids.filter(id => id !== workItem.workItemId))}
                                className="rounded border-border text-brand focus:ring-brand"
                              />
                              <span>{workItem.title}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setApprovalAction('pending')}
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 rounded-xl border border-border bg-surface-card hover:bg-surface-muted text-text-primary text-xs font-black transition cursor-pointer"
                      >
                        {t('contracts.cancelDecision')}
                      </button>
                      <button
                        type="button"
                        onClick={approvalAction === 'approve' ? handleApprove : handleReject}
                        disabled={isSubmitting || notesTooLong || (approvalAction === 'reject' && (!approvalNotes.trim() || revisionWorkItemIds.length === 0))}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-md disabled:opacity-50 ${
                          approvalAction === 'approve'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-amber-600 hover:bg-amber-700 text-white'
                        }`}
                      >
                        {isSubmitting ? (
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : approvalAction === 'approve' ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <RotateCcw size={16} />
                        )}
                        {isSubmitting ? t('contracts.submittingDecision') : approvalAction === 'approve' ? t('contracts.approveMilestoneBtn') : t('contracts.requestRevisionBtn')}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {(isApproved || isFullyReleased) && (
              <section className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center space-y-2">
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
              className="w-full py-3 rounded-2xl border border-border/80 bg-surface-card hover:bg-surface-muted text-text-primary text-xs font-black flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
            >
              <ArrowLeft size={16} /> {t('contracts.backToWorkspace')}
            </button>
          </div>
        </div>
      </main>
    </AppLayout>
  );
}


