import { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ExternalLink,
  FileText,
  Lock,
  MessageSquareText,
  Pencil,
  Save,
  Send,
  X,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { isValidationResponse, showValidationToast } from '../../../shared/utils/validationToast';
import { proposalPatchAPI } from '../../../api/proposalAPI/PATCH';
import { ProposalStatus } from '../../../types/models/Proposal';
import { useCreateProposal } from '../hooks/useCreateProposal';
import { useProposalInterviewAnswers } from '../hooks/useProposalInterviewAnswers';
import { ProposalStepper } from '../components/ProposalStepper';
import { ProposalDetailsEditor } from '../components/ProposalDetailsEditor';
import { ProposalDetailsSummary } from '../components/ProposalDetailsSummary';
import { ProposalInterviewAnswerList } from '../components/ProposalInterviewAnswerList';
import { canEditProposal, getStatusLabel } from '../utils/statusHelpers';
import '../styles/create-proposal-screen.css';

/**
 * Step 3 of the proposal flow. Everything from step 1 and step 2 is reviewed here, and only
 * the "Submit Proposal" button on this screen moves the proposal from Draft to Pending.
 */
export default function ProposalReviewSubmitScreen() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const {
    t,
    navigate,
    jobPost,
    proposal,
    narrativeValues,
    setNarrativeField,
    narrativeErrors,
    expandedMilestones,
    setExpandedMilestones,
    advancedMilestoneIndexes,
    setAdvancedMilestoneIndexes,
    milestoneErrors,
    loading,
    submitting: savingEdits,
    error,
    proposedBudget,
    proposedDuration,
    nestedMilestones,
    updateNestedPlan,
    undoDeleteController,
    handleSaveDraft,
    handleSaveEdits,
    resetEdits,
  } = useCreateProposal();

  const proposalId = proposal?.proposalId || '';
  const jobPostId = proposal?.jobPostId || jobPost?.jobPostsId || '';
  const interview = useProposalInterviewAnswers(proposalId, jobPostId);

  usePageGSAP({
    containerRef,
    loading,
    groups: [
      { selector: '.cps-gsap-header', y: 20, duration: 0.55 },
      { selector: '.cps-step-item', y: 12, duration: 0.4, stagger: 0.08 },
      { selector: '.cps-gsap-section', y: 24, duration: 0.5, stagger: 0.12 },
      { selector: '.cps-sticky-bar', y: 40, duration: 0.5 },
    ],
  });

  const isDraft = canEditProposal(proposal?.status);
  const hasNoInterviewQuestions = !interview.loading && !interview.error && interview.answers.length === 0;

  const handleDoneEditing = async () => {
    const saved = await handleSaveEdits();
    if (saved) setIsEditing(false);
  };

  const handleCancelEditing = () => {
    resetEdits();
    setIsEditing(false);
  };

  const handleSubmitProposal = async () => {
    if (!proposalId) return;
    if (!isDraft) {
      toast.info(t('createProposal.readOnlyNotice', { status: getStatusLabel(proposal?.status) }));
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    const response = await proposalPatchAPI.updateProposalStatus(proposalId, { status: ProposalStatus.Pending });
    setSubmitting(false);
    if (!response.success) {
      const fallback = response.message || t('proposalSubmitReview.errSubmit');
      if (isValidationResponse(response)) showValidationToast(response, { fallback });
      setSubmitError(fallback);
      return;
    }
    toast.success(t('createProposal.submittedSuccessToast'));
    navigate('/proposals', { state: { submittedProposalId: proposalId } });
  };

  if (loading) {
    return (
      <AppLayout hideAIWidget>
        <div className="mx-auto max-w-7xl px-4 py-16 flex items-center justify-center min-h-[60vh]">
          <LemniscateBloomLoader
            label={t('proposalSubmitReview.loading')}
            tag={t('createProposal.preparingWorkspace')}
          />
        </div>
      </AppLayout>
    );
  }

  if (!proposal) {
    return (
      <AppLayout hideAIWidget>
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <AlertCircle size={32} className="mx-auto text-rose-500" />
          <p className="mt-4 text-sm font-bold text-text-primary">
            {error || t('createProposal.errLoadProposal')}
          </p>
          <button
            type="button"
            onClick={() => navigate('/proposals')}
            className="cps-btn-secondary mt-6"
          >
            <ArrowLeft size={15} /> {t('proposalSubmitReview.backToProposals')}
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout hideAIWidget>
      <div ref={containerRef} className="cps-page max-w-7xl mx-auto px-4 py-6">

        <div className="flex items-center justify-between gap-4 mb-6 cps-gsap-header">
          <button
            onClick={() => navigate('/proposals')}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface-muted/80 text-xs font-bold text-text-secondary hover:text-brand hover:border-brand transition-all"
          >
            <ArrowLeft size={14} /> {t('proposalSubmitReview.backToProposals')}
          </button>

          {jobPostId && (
            <button
              onClick={() => navigate(`/jobs/${jobPostId}`)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
            >
              {t('createProposal.viewFullJob')} <ExternalLink size={12} />
            </button>
          )}
        </div>

        <header className="mb-6 cps-gsap-header">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-extrabold uppercase tracking-widest text-brand bg-brand/10 px-2.5 py-0.5 rounded-full border border-brand/20">
                  {t('proposalSubmitReview.eyebrow')}
                </span>
                <span className="text-xs font-bold text-text-muted">
                  · {t('createProposal.status')} <span className="text-text-primary uppercase">{getStatusLabel(proposal.status)}</span>
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight">
                {t('proposalSubmitReview.title')}
              </h1>
              <p className="mt-1 text-sm font-medium text-text-secondary">
                {jobPost?.title || proposal.jobPostTitle || t('proposalSubmitReview.subtitle')}
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand/15 to-purple-500/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
              <FileText size={22} />
            </div>
          </div>
        </header>

        {(error || submitError) && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-xs font-semibold text-red-500 flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{submitError || error}</span>
          </div>
        )}

        {!isDraft && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs font-semibold text-amber-600 flex items-center gap-2.5">
            <Lock size={16} className="shrink-0" />
            <span>{t('createProposal.readOnlyNotice', { status: getStatusLabel(proposal.status) })}</span>
          </div>
        )}

        <ProposalStepper currentStep={3} skippedSteps={hasNoInterviewQuestions ? [2] : []} />

        <div className="space-y-8">
          {/* ══════ STEP 1 RECAP ══════ */}
          <section className="cps-glass-card rounded-2xl p-6 md:p-8 cps-gsap-section">
            <div className="cps-review-section-head">
              <h2 className="cps-section-title !mb-0">{t('proposalSubmitReview.detailsSectionTitle')}</h2>
              {isDraft && (
                isEditing ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCancelEditing}
                      disabled={savingEdits}
                      className="cps-btn-secondary"
                    >
                      <X size={15} /> {t('proposalSubmitReview.cancelEdit')}
                    </button>
                    <button
                      type="button"
                      onClick={handleDoneEditing}
                      disabled={savingEdits}
                      className="cps-btn-primary"
                    >
                      {savingEdits ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>{t('createProposal.saving')}</span>
                        </>
                      ) : (
                        <>
                          <Check size={15} /> {t('proposalSubmitReview.doneEdit')}
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="cps-btn-secondary"
                  >
                    <Pencil size={14} /> {t('proposalSubmitReview.editDetails')}
                  </button>
                )
              )}
            </div>

            {isEditing ? (
              <ProposalDetailsEditor
                narrativeValues={narrativeValues}
                narrativeErrors={narrativeErrors}
                onNarrativeChange={setNarrativeField}
                proposedBudget={proposedBudget}
                proposedDuration={proposedDuration}
                jobPost={jobPost}
                proposal={proposal}
                defaultCustomPlan
                nestedMilestones={nestedMilestones}
                updateNestedPlan={updateNestedPlan}
                undoDeleteController={undoDeleteController}
                expandedMilestones={expandedMilestones}
                setExpandedMilestones={setExpandedMilestones}
                advancedMilestoneIndexes={advancedMilestoneIndexes}
                setAdvancedMilestoneIndexes={setAdvancedMilestoneIndexes}
                milestoneErrors={milestoneErrors}
              />
            ) : (
              <ProposalDetailsSummary
                jobPost={jobPost}
                narrativeValues={narrativeValues}
                nestedMilestones={nestedMilestones}
                proposedBudget={proposedBudget}
                proposedDuration={proposedDuration}
              />
            )}
          </section>

          {/* ══════ STEP 2 RECAP (READ-ONLY) ══════ */}
          <section className="cps-glass-card rounded-2xl p-6 md:p-8 cps-gsap-section">
            <div className="cps-review-section-head">
              <h2 className="cps-section-title !mb-0">{t('proposalSubmitReview.interviewSectionTitle')}</h2>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-text-muted bg-surface-muted border border-border rounded-lg px-2.5 py-1">
                <MessageSquareText size={12} /> {t('proposalSubmitReview.readOnlyAnswers')}
              </span>
            </div>

            <ProposalInterviewAnswerList
              answers={interview.answers}
              loading={interview.loading}
              error={interview.error}
              onRetry={interview.reload}
            />
          </section>
        </div>

        {/* ── STICKY BOTTOM ACTION TOOLBAR ── */}
        <div className="cps-sticky-bar">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-xs font-bold text-text-secondary">
                {t('createProposal.totalBudget')} <span className="text-brand font-black">{formatGigCoin(proposedBudget || 0)}</span>
              </div>
              <span className="text-text-muted text-xs">·</span>
              <div className="text-xs font-bold text-text-secondary">
                {t('createProposal.duration')} <span className="text-text-primary font-black">{proposedDuration || '—'}</span>
              </div>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={!isDraft || isEditing || savingEdits || submitting}
                className="cps-btn-secondary"
              >
                <Save size={15} /> {t('createProposal.saveAndExit')}
              </button>

              <button
                type="button"
                onClick={handleSubmitProposal}
                disabled={!isDraft || isEditing || savingEdits || submitting}
                className="cps-btn-primary"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{t('createProposal.submitting')}</span>
                  </>
                ) : (
                  <>
                    <Send size={15} /> {t('createProposal.submitProposal')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
