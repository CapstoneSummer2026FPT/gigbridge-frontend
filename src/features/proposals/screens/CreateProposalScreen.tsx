import { useRef } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  FileText,
  Save,
  Send,
  Sparkles,
  DollarSign,
  Briefcase,
  Clock,
  Globe,
  Award,
  CheckCircle2,
  AlertCircle,
  Ban,
  ExternalLink,
  Lock,
  Layers,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { getStatusLabel } from '../utils/statusHelpers';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { GigCoinBudget } from '../../../shared/components/GigCoinAmount';
import { MarkdownEditor } from '../../../shared/components/MarkdownEditor';
import { NestedMilestonePlanEditor } from '../../../shared/components/NestedMilestonePlanEditor';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { useCreateProposal } from '../hooks/useCreateProposal';
import { JOB_DURATION_UNITS } from '../../jobs/utils/jobDuration';
import '../styles/create-proposal-screen.css';

export default function CreateProposalScreen() {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    t,
    navigate,
    proposalId,
    jobPost,
    proposal,
    coverLetter,
    setCoverLetter,
    proposalApproach,
    setProposalApproach,
    deliverables,
    setDeliverables,
    assumptions,
    setAssumptions,
    outOfScope,
    setOutOfScope,
    expandedMilestone,
    setExpandedMilestone,
    advancedMilestoneIndexes,
    setAdvancedMilestoneIndexes,
    milestoneErrors,
    narrativeErrors,
    clearNarrativeError,
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
    handleSaveDraft,
    handleSubmit,
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
      <AppLayout>
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
    <AppLayout>
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

        {/* ── STEP ANCHOR PROGRESS BAR ── */}
        <div className="cps-step-bar cps-gsap-section">
          <div className="cps-step-item active">
            <FileText size={14} /> {t('createProposal.step1')}
          </div>
          <ChevronRight size={14} className="text-text-muted shrink-0" />
          <div className="cps-step-item active">
            <Layers size={14} /> {t('createProposal.step2')}
          </div>
          <ChevronRight size={14} className="text-text-muted shrink-0" />
          <div className="cps-step-item active">
            <DollarSign size={14} /> {t('createProposal.step3')}
          </div>
        </div>

        {/* Read-Only Banner for Approved/Submitted proposals */}
        {locked ? (
          <div className="cps-glass-card rounded-2xl p-6 text-center text-sm font-semibold text-text-muted flex items-center justify-center gap-2">
            <Lock size={16} className="text-amber-500" />
            <span>{t('createProposal.readOnlyNotice', { status: getStatusLabel(proposal?.status) })}</span>
          </div>
        ) : (
          <div className="space-y-8">

            {/* ══════ SECTION 1: EXECUTIVE SUMMARY & STRATEGY ══════ */}
            <section className="cps-glass-card rounded-2xl p-6 md:p-8 cps-gsap-section">
              <h2 className="cps-section-title">{t('createProposal.section1Title')}</h2>

              <div className="grid gap-6 lg:grid-cols-12 mt-4">
                {/* ── LEFT COLUMN (6 cols): Cover Letter & Solution Strategy ── */}
                <div className="lg:col-span-6 space-y-6">
                  {/* Cover Letter */}
                  <div data-field="coverLetter">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-text-primary">
                        {t('createProposal.coverLetterLabel')}
                      </label>
                      <span className="text-[11px] font-semibold text-text-muted">
                        {t('createProposal.charCount', { count: coverLetter.length })}
                      </span>
                    </div>
                    <MarkdownEditor
                      label=""
                      value={coverLetter}
                      onChange={v => { setCoverLetter(v); clearNarrativeError('coverLetter'); }}
                      rows={5}
                      placeholder={t('createProposal.coverLetterPlaceholder')}
                      error={narrativeErrors.coverLetter}
                    />
                  </div>

                  <div data-field="proposalApproach">
                    <div className="mb-2">
                      <span className="block text-xs font-extrabold uppercase tracking-wider text-text-primary">
                        {t('createProposal.solutionStrategyLabel')}
                      </span>
                      <span className="text-[11px] text-text-muted font-medium">
                        {t('createProposal.solutionStrategySubtitle')}
                      </span>
                    </div>
                    <MarkdownEditor
                      label=""
                      value={proposalApproach}
                      onChange={v => { setProposalApproach(v); clearNarrativeError('proposalApproach'); }}
                      rows={7}
                      placeholder={t('createProposal.solutionStrategyPlaceholder')}
                      error={narrativeErrors.proposalApproach}
                    />
                  </div>
                </div>

                {/* ── RIGHT COLUMN (6 cols): Additional Scope & Assumptions (Optional) ── */}
                <div className="lg:col-span-6 space-y-5">
                  <div className="p-4 rounded-xl bg-surface-muted/60 border border-border">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-text-primary flex items-center gap-2 mb-1">
                      <Sparkles size={14} className="text-brand" /> {t('createProposal.additionalScopeTitle')}
                    </h3>
                    <p className="text-[11px] font-medium text-text-muted">
                      {t('createProposal.additionalScopeSubtitle')}
                    </p>
                  </div>

                  <div>
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-text-primary mb-2">
                      <CheckCircle2 size={13} className="text-emerald-500" /> {t('createProposal.overallDeliverables')}
                    </span>
                    <MarkdownEditor label="" value={deliverables} onChange={setDeliverables} rows={3} placeholder={t('createProposal.overallDeliverablesPlaceholder')} />
                  </div>

                  <div>
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-text-primary mb-2">
                      <AlertCircle size={13} className="text-amber-500" /> {t('createProposal.keyAssumptions')}
                    </span>
                    <MarkdownEditor label="" value={assumptions} onChange={setAssumptions} rows={3} placeholder={t('createProposal.keyAssumptionsPlaceholder')} />
                  </div>

                  <div>
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-text-primary mb-2">
                      <Ban size={13} className="text-rose-500" /> {t('createProposal.outOfScope')}
                    </span>
                    <MarkdownEditor label="" value={outOfScope} onChange={setOutOfScope} rows={3} placeholder={t('createProposal.outOfScopePlaceholder')} />
                  </div>
                </div>
              </div>
            </section>

            {/* ══════ SECTION 2: MILESTONES & WBS ══════ */}
            <section className="cps-glass-card rounded-2xl p-6 md:p-8 cps-gsap-section">
              <h2 className="cps-section-title">{t('createProposal.section2Title')}</h2>

              <NestedMilestonePlanEditor
                value={nestedMilestones}
                onChange={updateNestedPlan}
                targetBudget={jobPost?.budgetMax || jobPost?.budgetMin || null}
                title={t('proposalMilestoneEditor.title')}
                description={t('proposalMilestoneEditor.description')}
                showDueDate
                dueDateReadOnly
                simplifiedMilestoneFields
                durationUnits={JOB_DURATION_UNITS.map(unit => ({ value: unit, label: t(`proposalMilestoneEditor.durationUnits.${unit}`) }))}
                uiCopy={{
                  optional: t('postJobWizard.plan.milestoneCopy.optional'),
                  addMilestone: t('postJobWizard.plan.milestoneCopy.addMilestone'),
                  fixedProjectBudget: t('postJobWizard.plan.milestoneCopy.fixedProjectBudget'),
                  noBaselinePlan: t('postJobWizard.plan.milestoneCopy.noBaselinePlan'),
                  noBaselinePlanDescription: t('postJobWizard.plan.milestoneCopy.noBaselinePlanDescription'),
                  addFirstMilestone: t('postJobWizard.plan.milestoneCopy.addFirstMilestone'),
                  untitledMilestone: t('postJobWizard.plan.milestoneCopy.untitledMilestone'),
                  milestoneLabel: t('postJobWizard.plan.milestoneLabel', 'Mốc {{number}}'),
                  workItems: t('postJobWizard.plan.milestoneCopy.workItems'),
                  moveUp: t('postJobWizard.plan.milestoneCopy.moveUp'),
                  moveDown: t('postJobWizard.plan.milestoneCopy.moveDown'),
                  deleteMilestone: t('postJobWizard.plan.milestoneCopy.deleteMilestone'),
                  milestoneTitle: t('postJobWizard.plan.milestoneCopy.milestoneTitle'),
                  amount: t('postJobWizard.plan.milestoneCopy.amount'),
                  duration: t('postJobWizard.plan.milestoneCopy.duration'),
                  durationUnit: t('postJobWizard.plan.milestoneCopy.durationUnit'),
                  deadline: t('postJobWizard.plan.milestoneCopy.deadline'),
                  description: t('postJobWizard.plan.milestoneCopy.description'),
                  deliverables: t('postJobWizard.plan.milestoneCopy.deliverables'),
                  acceptanceCriteria: t('postJobWizard.plan.milestoneCopy.acceptanceCriteria'),
                  workBreakdown: t('postJobWizard.plan.milestoneCopy.workBreakdown'),
                  addWorkItem: t('postJobWizard.plan.milestoneCopy.addWorkItem'),
                  workItem: t('postJobWizard.plan.milestoneCopy.workItem'),
                  deleteWorkItem: t('postJobWizard.plan.milestoneCopy.deleteWorkItem'),
                  workItemTitle: t('postJobWizard.plan.milestoneCopy.workItemTitle'),
                  estimatedDuration: t('postJobWizard.plan.milestoneCopy.estimatedDuration'),
                  taskDescription: t('postJobWizard.plan.milestoneCopy.taskDescription'),
                  workItemDeliverables: t('postJobWizard.plan.milestoneCopy.workItemDeliverables'),
                  autoBalanceOn: t('postJobWizard.plan.milestoneCopy.autoBalanceOn', '⚡ Auto-balance: ON'),
                  autoBalanceOff: t('postJobWizard.plan.milestoneCopy.autoBalanceOff', '⚡ Auto-balance: OFF'),
                  autoBalanceOnDesc: t('postJobWizard.plan.milestoneCopy.autoBalanceOnDesc', 'Editing any milestone automatically rebalances the remaining budget across all unlocked milestones.'),
                  autoBalanceOffDesc: t('postJobWizard.plan.milestoneCopy.autoBalanceOffDesc', 'Auto-balance is OFF. Every milestone will keep the exact value you enter.'),
                  resetBalance: t('postJobWizard.plan.milestoneCopy.resetBalance', '↺ Reset & Split Budget'),
                  resetBalanceTooltip: t('postJobWizard.plan.milestoneCopy.resetBalanceTooltip', 'Clear all user locks and split budget equally across milestones'),
                  userLocked: t('postJobWizard.plan.milestoneCopy.userLocked', 'Fixed'),
                  userLockedTitle: t('postJobWizard.plan.milestoneCopy.userLockedTitle', 'Fixed milestone (User-locked). Click to unlock auto-balancing.'),
                  autoBalanced: t('postJobWizard.plan.milestoneCopy.autoBalanced', 'Auto'),
                  autoBalancedTitle: t('postJobWizard.plan.milestoneCopy.autoBalancedTitle', 'Dynamically calculated. Click to lock amount.'),
                }}
                expandedIndex={expandedMilestone}
                onExpandedChange={setExpandedMilestone}
                advancedIndexes={advancedMilestoneIndexes}
                onAdvancedIndexesChange={setAdvancedMilestoneIndexes}
                errors={milestoneErrors}
              />
            </section>

            {/* ══════ SECTION 3: FINANCIAL & DURATION SUMMARY ══════ */}
            <section className="cps-glass-card rounded-2xl p-6 md:p-8 cps-gsap-section space-y-6">
              <h2 className="cps-section-title">{t('createProposal.section3Title')}</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="cps-budget-box" aria-label="Calculated proposal budget">
                  <span className="block text-[11px] font-extrabold uppercase tracking-wider text-text-secondary mb-1">
                    {t('createProposal.proposedRate')}
                  </span>
                  <div className="text-2xl font-black text-brand tracking-tight">
                    {formatGigCoin(proposedBudget || 0)}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-text-muted font-medium">
                    <span>{t('createProposal.syncedToMilestones')}</span>
                    {jobPost && (
                      <span>{t('createProposal.clientTargetBudget')} <strong>{formatGigCoin(jobPost.budgetMax || jobPost.budgetMin || 0)}</strong></span>
                    )}
                  </div>
                </div>

                <div className="cps-budget-box" aria-label="Overall proposal duration">
                  <span className="block text-[11px] font-extrabold uppercase tracking-wider text-text-secondary mb-1">
                    {t('createProposal.estimatedDuration')}
                  </span>
                  <div className="text-2xl font-black text-text-primary tracking-tight">
                    {proposedDuration || t('createProposal.calculated')}
                  </div>
                  <div className="mt-1 text-xs text-text-muted font-medium">
                    {t('createProposal.derivedDurationHint')}
                  </div>
                </div>
              </div>
            </section>

          </div>
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
                  onClick={handleSubmit}
                  disabled={submitting}
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
        )}

      </div>
    </AppLayout>
  );
}
