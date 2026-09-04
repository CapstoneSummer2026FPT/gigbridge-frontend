import { useRef } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  Save,
  ChevronRight,
  DollarSign,
  Briefcase,
  Clock,
  Globe,
  Award,
  AlertCircle,
  ExternalLink,
  Lock,
  Layers,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { getStatusLabel } from '../utils/statusHelpers';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { GigCoinBudget } from '../../../shared/components/GigCoinAmount';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { useCreateProposal } from '../hooks/useCreateProposal';
import { ProposalStepper } from '../components/ProposalStepper';
import { ProposalDetailsEditor } from '../components/ProposalDetailsEditor';
import '../styles/create-proposal-screen.css';

export default function CreateProposalScreen() {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    t,
    navigate,
    proposalId,
    jobPost,
    proposal,
    narrativeValues,
    setNarrativeField,
    expandedMilestones,
    setExpandedMilestones,
    advancedMilestoneIndexes,
    setAdvancedMilestoneIndexes,
    milestoneErrors,
    narrativeErrors,
    showJobBrief,
    setShowJobBrief,
    loading,
    submitting,
    error,
    notice,
    proposedBudget,
    proposedDuration,
    nestedMilestones,
    updateNestedPlan,
    undoDeleteController,
    handleSaveDraft,
    handleContinue,
  } = useCreateProposal();

  // Reusable GSAP Entrance Hook
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

  if (loading) {
    return (
      <AppLayout hideAIWidget>
        <div className="mx-auto max-w-7xl px-4 py-16 flex items-center justify-center min-h-[60vh]">
          <LemniscateBloomLoader
            label={t('createProposal.loadingEditor')}
            tag={t('createProposal.preparingWorkspace')}
          />
        </div>
      </AppLayout>
    );
  }

  const locked = proposal && proposal.status !== undefined && proposal.status !== null && (proposal.status as number) > 0;

  return (
    <AppLayout hideAIWidget>
      <div ref={containerRef} className="cps-page max-w-7xl mx-auto px-4 py-6">

        {/* ── Top Bar & Back Button ── */}
        <div className="flex items-center justify-between gap-4 mb-6 cps-gsap-header">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface-muted/80 text-xs font-bold text-text-secondary hover:text-brand hover:border-brand transition-all"
          >
            <ArrowLeft size={14} /> {t('createProposal.back')}
          </button>

          {jobPost && (
            <button
              onClick={() => navigate(`/jobs/${jobPost.jobPostsId}`)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
            >
              {t('createProposal.viewFullJob')} <ExternalLink size={12} />
            </button>
          )}
        </div>

        {/* ── Main Header ── */}
        <header className="mb-6 cps-gsap-header">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-extrabold uppercase tracking-widest text-brand bg-brand/10 px-2.5 py-0.5 rounded-full border border-brand/20">
                  {proposalId ? t('createProposal.editProposal') : t('createProposal.newProposal')}
                </span>
                {proposal && (
                  <span className="text-xs font-bold text-text-muted">
                    · {t('createProposal.status')} <span className="text-text-primary uppercase">{getStatusLabel(proposal.status)}</span>
                  </span>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight">
                {proposalId ? t('createProposal.editProposalTitle') : t('createProposal.submitProposalTitle')}
              </h1>
              <p className="mt-1 text-sm font-medium text-text-secondary">
                {jobPost?.title || proposal?.jobPostTitle || 'Project Request'}
              </p>
            </div>

            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand/15 to-purple-500/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
              <FileText size={22} />
            </div>
          </div>
        </header>

        {/* Notice & Error Banners */}
        {notice && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-brand/10 via-purple-500/10 to-brand/5 border border-brand/20 text-xs font-bold text-text-primary flex items-center gap-3.5 shadow-xs">
            <div className="w-9 h-9 rounded-xl bg-brand/15 border border-brand/25 flex items-center justify-center text-brand shrink-0">
              <Layers size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="block text-[10px] uppercase tracking-wider text-brand font-extrabold mb-0.5">
                {t('createProposal.clientBaselineLoaded')}
              </span>
              <span className="text-text-secondary leading-relaxed font-semibold">{notice}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/25 text-xs font-semibold text-red-500 flex items-center gap-2.5">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── JOB BRIEF PREVIEW ACCORDION ── */}
        {jobPost && (
          <div className="mb-6 cps-glass-card rounded-2xl border border-border overflow-hidden cps-gsap-section">
            <button
              onClick={() => setShowJobBrief(!showJobBrief)}
              className="w-full flex items-center justify-between p-4 md:px-6 bg-surface-muted/50 hover:bg-surface-muted transition-colors text-left border-none cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand shrink-0">
                  <Briefcase size={16} />
                </div>
                <div className="min-w-0">
                  <span className="block text-xs font-black text-text-primary truncate">
                    {t('createProposal.projectBriefTitle')}
                  </span>
                  <span className="text-[11px] font-semibold text-text-muted">
                    {showJobBrief ? t('createProposal.projectBriefSubtitleCollapse') : t('createProposal.projectBriefSubtitleExpand')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <GigCoinBudget min={jobPost.budgetMin} max={jobPost.budgetMax} className="text-xs" />
                <ChevronDown size={18} className={`text-text-muted transition-transform duration-200 ${showJobBrief ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {showJobBrief && (
              <div className="p-4 md:p-6 border-t border-border bg-background/50 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-surface-muted/60 border border-border/80">
                    <span className="text-[10px] font-bold uppercase text-text-muted flex items-center gap-1.5 mb-1">
                      <Briefcase size={12} /> {t('createProposal.category')}
                    </span>
                    <span className="font-extrabold text-text-primary truncate block">{jobPost.categoryName || 'General'}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-muted/60 border border-border/80">
                    <span className="text-[10px] font-bold uppercase text-text-muted flex items-center gap-1.5 mb-1">
                      <Globe size={12} /> {t('createProposal.location')}
                    </span>
                    <span className="font-extrabold text-text-primary truncate block">{jobPost.location || 'Remote'}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-muted/60 border border-border/80">
                    <span className="text-[10px] font-bold uppercase text-text-muted flex items-center gap-1.5 mb-1">
                      <DollarSign size={12} /> {t('createProposal.budget')}
                    </span>
                    <span className="font-extrabold text-brand truncate block">{formatGigCoin(jobPost.budgetMax || jobPost.budgetMin || 0)}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-muted/60 border border-border/80">
                    <span className="text-[10px] font-bold uppercase text-text-muted flex items-center gap-1.5 mb-1">
                      <Clock size={12} /> {t('createProposal.deadline', { defaultValue: 'Hạn chót' })}
                    </span>
                    <span className="font-extrabold text-text-primary truncate block">
                      {jobPost.endDate ? jobPost.endDate.split('T')[0] : t('createProposal.flexible', { defaultValue: 'Linh hoạt' })}
                    </span>
                  </div>
                </div>

                {jobPost.description && (
                  <div className="p-4 rounded-xl bg-surface-muted/30 border border-border/60">
                    <span className="block text-[11px] font-black text-text-primary mb-1 uppercase tracking-wider">
                      {t('createProposal.descriptionPreview')}
                    </span>
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-4 whitespace-pre-line">
                      {jobPost.description}
                    </p>
                  </div>
                )}

                {jobPost.skills && jobPost.skills.length > 0 && (
                  <div>
                    <span className="block text-[11px] font-black text-text-primary mb-2 uppercase tracking-wider flex items-center gap-1">
                      <Award size={12} className="text-brand" /> {t('createProposal.requiredSkills')}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {jobPost.skills.map((skill, index) => (
                        <span key={index} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-brand/10 border border-brand/20 text-brand">
                          {skill.skillName}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── PROPOSAL STEPPER ── */}
        <ProposalStepper currentStep={1} />

        {/* Read-Only Banner for Approved/Submitted proposals */}
        {locked ? (
          <div className="cps-glass-card rounded-2xl p-6 text-center text-sm font-semibold text-text-muted flex items-center justify-center gap-2">
            <Lock size={16} className="text-amber-500" />
            <span>{t('createProposal.readOnlyNotice', { status: getStatusLabel(proposal?.status) })}</span>
          </div>
        ) : (
          <ProposalDetailsEditor
            narrativeValues={narrativeValues}
            narrativeErrors={narrativeErrors}
            onNarrativeChange={setNarrativeField}
            proposedBudget={proposedBudget}
            proposedDuration={proposedDuration}
            jobPost={jobPost}
            proposal={proposal}
            defaultCustomPlan={Boolean(proposalId)}
            nestedMilestones={nestedMilestones}
            updateNestedPlan={updateNestedPlan}
            undoDeleteController={undoDeleteController}
            expandedMilestones={expandedMilestones}
            setExpandedMilestones={setExpandedMilestones}
            advancedMilestoneIndexes={advancedMilestoneIndexes}
            setAdvancedMilestoneIndexes={setAdvancedMilestoneIndexes}
            milestoneErrors={milestoneErrors}
          />
        )}

        {/* ── STICKY BOTTOM ACTION TOOLBAR ── */}
        {!locked && (
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
                  disabled={submitting}
                  className="cps-btn-secondary"
                >
                  <Save size={15} /> {t('createProposal.saveDraft')}
                </button>

                <button
                  type="button"
                  onClick={handleContinue}
                  disabled={submitting}
                  className="cps-btn-primary"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{t('createProposal.saving')}</span>
                    </>
                  ) : (
                    <>
                      {t('createProposal.continue')} <ChevronRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
