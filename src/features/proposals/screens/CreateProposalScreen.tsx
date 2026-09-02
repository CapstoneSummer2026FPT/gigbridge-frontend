import { useRef, useState, useMemo, useEffect } from 'react';
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
  Plus,
  RotateCcw,
  Copy,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { getStatusLabel } from '../utils/statusHelpers';
import { formatGigCoin } from '../../../shared/utils/gigcoin';
import { GigCoinBudget } from '../../../shared/components/GigCoinAmount';
import { MarkdownEditor } from '../../../shared/components/MarkdownEditor';
import { NestedMilestonePlanEditor, type EditableMilestonePlan } from '../../../shared/components/NestedMilestonePlanEditor';
import { MilestonePlanComparison } from '../../../shared/components/MilestonePlanComparison';
import { usePageGSAP } from '../../../shared/hooks/usePageGSAP';
import { LemniscateBloomLoader } from '../../../shared/components/LemniscateBloomLoader';
import { useCreateProposal } from '../hooks/useCreateProposal';
import {
  JOB_DURATION_UNITS,
  WORK_ITEM_DURATION_UNITS,
  computeChainedDueDates,
  parseJobDuration,
  formatJobDuration,
  parseWorkItemDuration,
} from '../../jobs/utils/jobDuration';
import { currentLocalDate } from '../utils/proposalMilestonePlan';
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
    expandedMilestones,
    setExpandedMilestones,
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

  const hasClientMilestones = Boolean(jobPost?.milestonePlans && jobPost.milestonePlans.length > 0);

  const clientMilestones: EditableMilestonePlan[] = useMemo(() => {
    if (!jobPost?.milestonePlans?.length) return [];

    const anchorDate = (jobPost.endDate && jobPost.endDate.slice(0, 10)) || currentLocalDate();
    const computedDueDates = computeChainedDueDates(
      anchorDate,
      jobPost.milestonePlans.map(m => m.estimatedDuration)
    );

    return jobPost.milestonePlans.map((m, idx) => {
      const parsedDuration = parseJobDuration(m.estimatedDuration);
      const formattedDuration = (parsedDuration.value ? formatJobDuration(parsedDuration.value, parsedDuration.unit) : null) || m.estimatedDuration || '1 week';
      return {
        orderIndex: idx,
        milestoneOrderIndex: idx,
        title: m.title || `Mốc ${idx + 1}`,
        amount: m.amount || 0,
        estimatedDuration: formattedDuration,
        durationUnit: parsedDuration.unit || 'weeks',
        dueDate: (m.dueDate ? m.dueDate.slice(0, 10) : computedDueDates[idx]) || undefined,
        deliverables: m.deliverables || '',
        description: m.description || '',
        acceptanceCriteria: m.acceptanceCriteria || '',
        workItems: (m.workItems || []).map((w, wIdx) => {
          const parsedWDuration = parseWorkItemDuration(w.estimatedDuration);
          const formattedWDuration = parsedWDuration
            ? `${parsedWDuration.value} ${Number(parsedWDuration.value) === 1 ? parsedWDuration.unit.replace(/s$/, '') : parsedWDuration.unit}`
            : (w.estimatedDuration || '1 day');
          return {
            orderIndex: wIdx,
            title: w.title || `Hạng mục ${wIdx + 1}`,
            estimatedDuration: formattedWDuration,
            durationUnit: parsedWDuration ? parsedWDuration.unit : 'days',
            description: w.description || '',
            deliverables: w.deliverables || '',
          };
        }),
      };
    });
  }, [jobPost?.milestonePlans, jobPost?.endDate]);

  const [isCustomPlan, setIsCustomPlan] = useState<boolean>(() => Boolean(proposalId));
  const [planModeInitialized, setPlanModeInitialized] = useState(false);

  const [clientExpandedIndexes, setClientExpandedIndexes] = useState<number[]>(() =>
    clientMilestones.map((_, i) => i)
  );
  const [clientAdvancedIndexes, setClientAdvancedIndexes] = useState<number[]>([]);

  useEffect(() => {
    if (clientMilestones.length > 0) {
      setClientExpandedIndexes(clientMilestones.map((_, i) => i));
    }
  }, [clientMilestones]);

  useEffect(() => {
    if (!planModeInitialized && proposal) {
      if (proposal.milestonePlans && proposal.milestonePlans.length > 0) {
        setIsCustomPlan(true);
      }
      setPlanModeInitialized(true);
    }
  }, [proposal, planModeInitialized]);

  const handleStartCustomPlan = () => {
    setIsCustomPlan(true);
    // Initialize in a clean/blank state so user can customize their own milestone plan
    const blankMilestone: EditableMilestonePlan = {
      orderIndex: 0,
      title: '',
      amount: 0,
      estimatedDuration: '1 week',
      deliverables: '',
      description: '',
      acceptanceCriteria: '',
      workItems: [],
    };
    updateNestedPlan([blankMilestone]);
    setExpandedMilestones([0]);
    setAdvancedMilestoneIndexes([]);
  };

  const handleCopyClientPlan = () => {
    if (clientMilestones.length > 0) {
      const cloned: EditableMilestonePlan[] = JSON.parse(JSON.stringify(clientMilestones));
      updateNestedPlan(cloned);
      setExpandedMilestones(cloned.map((_, i) => i));
      setAdvancedMilestoneIndexes([]);
      setIsCustomPlan(true);
    }
  };

  const handleRevertToClientPlan = () => {
    setIsCustomPlan(false);
    if (clientMilestones.length > 0) {
      updateNestedPlan(clientMilestones);
      setExpandedMilestones(clientMilestones.map((_, i) => i));
    }
  };

  const milestoneEditorUiCopy = useMemo(() => ({
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
    resetBalance: t('postJobWizard.plan.milestoneCopy.resetBalance', 'Reset & Split Budget'),
    resetBalanceTooltip: t('postJobWizard.plan.milestoneCopy.resetBalanceTooltip', 'Clear all user locks and split budget equally across milestones'),
    userLocked: t('postJobWizard.plan.milestoneCopy.userLocked', 'Fixed'),
    userLockedTitle: t('postJobWizard.plan.milestoneCopy.userLockedTitle', 'Fixed milestone (User-locked). Click to unlock auto-balancing.'),
    autoBalanced: t('postJobWizard.plan.milestoneCopy.autoBalanced', 'Auto'),
    expandAll: t('proposalMilestoneEditor.expandAll', 'Mở rộng tất cả'),
    collapseAll: t('proposalMilestoneEditor.collapseAll', 'Thu gọn tất cả'),
    percentOfBudget: t('postJobWizard.plan.milestoneCopy.percentOfBudget', '{{percent}}% tổng ngân sách'),
    budgetShort: t('postJobWizard.plan.milestoneCopy.budgetShort', 'NS'),
    dragToReorder: t('postJobWizard.plan.milestoneCopy.dragToReorder', 'Kéo để sắp xếp lại mốc'),
    diffHigherAmount: t('proposalMilestoneEditor.diffHigherAmount', '+{{amount}} G so với gốc'),
    diffLowerAmount: t('proposalMilestoneEditor.diffLowerAmount', '{{amount}} G so với gốc'),
    diffEqualAmount: t('proposalMilestoneEditor.diffEqualAmount', 'Khớp mốc gốc'),
    diffLongerDuration: t('proposalMilestoneEditor.diffLongerDuration', 'Dài hơn (+{{duration}} so với gốc)'),
    diffShorterDuration: t('proposalMilestoneEditor.diffShorterDuration', 'Ngắn hơn ({{duration}} so với gốc)'),
    diffEqualDuration: t('proposalMilestoneEditor.diffEqualDuration', 'Khớp thời gian gốc'),
    diffHigherAmountTitle: t('proposalMilestoneEditor.diffHigherAmountTitle', 'Cao hơn gốc +{{amount}} G-coin'),
    diffLowerAmountTitle: t('proposalMilestoneEditor.diffLowerAmountTitle', 'Thấp hơn gốc {{amount}} G-coin'),
    diffLongerDurationTitle: t('proposalMilestoneEditor.diffLongerDurationTitle', 'Dài hơn gốc +{{duration}}'),
    diffShorterDurationTitle: t('proposalMilestoneEditor.diffShorterDurationTitle', 'Ngắn hơn gốc {{duration}}'),
    weeksUnit: t('proposalMilestoneEditor.weeksUnit', 'tuần'),
    daysUnit: t('proposalMilestoneEditor.daysUnit', 'ngày'),
  }), [t]);

  const milestoneFieldHints = useMemo(() => ({
    fixedProjectBudget: t('postJob.baselineBudgetHint'),
    milestoneTitle: t('postJob.baselineMilestoneTitleHint'),
    amount: t('postJob.baselineAmountHint'),
    duration: t('postJob.baselineDurationHint'),
    deadline: t('postJob.baselineDeadlineHint'),
    description: t('postJob.baselineDescriptionHint'),
    deliverables: t('postJob.baselineDeliverablesHint'),
    acceptanceCriteria: t('postJob.baselineAcceptanceCriteriaHint'),
    workBreakdown: t('postJob.baselineWorkBreakdownHint'),
    workItemTitle: t('postJob.baselineWorkItemTitleHint'),
    workItemDuration: t('postJob.baselineWorkItemDurationHint'),
    workItemDescription: t('postJob.baselineWorkItemDescriptionHint'),
    workItemDeliverables: t('postJob.baselineWorkItemDeliverablesHint'),
  }), [t]);

  const milestoneFieldPlaceholders = useMemo(() => ({
    milestoneTitle: t('postJob.baselineMilestoneTitlePlaceholder'),
    amount: t('postJob.baselineAmountPlaceholder'),
    duration: t('postJob.baselineDurationPlaceholder'),
    description: t('postJob.baselineDescriptionPlaceholder'),
    deliverables: t('postJob.baselineDeliverablesPlaceholder'),
    acceptanceCriteria: t('postJob.baselineAcceptanceCriteriaPlaceholder'),
    workItemTitle: t('postJob.baselineWorkItemTitlePlaceholder'),
    workItemDuration: t('postJob.baselineWorkItemDurationPlaceholder'),
    workItemDescription: t('postJob.baselineWorkItemDescriptionPlaceholder'),
    workItemDeliverables: t('postJob.baselineWorkItemDeliverablesPlaceholder'),
  }), [t]);

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
            <section className="cps-glass-card rounded-2xl p-6 md:p-8 cps-gsap-section space-y-5 transition-all duration-300">
              <div className="flex items-center justify-between gap-4 flex-wrap pb-3 border-b border-border/40">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="cps-section-title !mb-0">{t('createProposal.section2Title')}</h2>
                  {hasClientMilestones && (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all ${
                      isCustomPlan
                        ? 'bg-[var(--gb-indigo,#6366f1)]/10 text-[var(--gb-indigo,#6366f1)] border-[var(--gb-indigo,#6366f1)]/20'
                        : 'bg-muted text-muted-foreground border-border'
                    }`}>
                      {isCustomPlan ? (
                        <>
                          <Sparkles size={12} className="text-[var(--gb-indigo,#6366f1)]" />
                          <span>{t('createProposal.customPlanActiveBadge', 'Đang dùng kế hoạch đề xuất của bạn')}</span>
                        </>
                      ) : (
                        <>
                          <Lock size={12} className="text-muted-foreground" />
                          <span>{t('createProposal.clientBaselineBadge', 'Kế hoạch gốc của Client (Chỉ xem)')}</span>
                        </>
                      )}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {hasClientMilestones && isCustomPlan && (
                    <>
                      <button
                        type="button"
                        onClick={handleCopyClientPlan}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand hover:text-brand/90 bg-brand/10 hover:bg-brand/15 border border-brand/25 transition-all cursor-pointer shadow-2xs active:scale-95"
                        title={t('createProposal.copyClientPlanTooltip', 'Sao chép toàn bộ mốc và đầu việc của Client vào kế hoạch đề xuất để chỉnh sửa')}
                      >
                        <Copy size={13} />
                        <span>{t('createProposal.copyClientPlan', 'Sao chép kế hoạch gốc của Client')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleRevertToClientPlan}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground bg-muted/80 hover:bg-muted border border-border/80 transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        <RotateCcw size={13} />
                        <span>{t('createProposal.revertToClientPlan', 'Dùng lại kế hoạch của Client')}</span>
                      </button>
                    </>
                  )}

                  {!hasClientMilestones && nestedMilestones.length > 1 && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--gb-indigo,#6366f1)] hover:text-[var(--gb-indigo,#6366f1)]/80 cursor-pointer bg-[var(--gb-indigo,#6366f1)]/10 hover:bg-[var(--gb-indigo,#6366f1)]/18 px-3 py-1.5 rounded-lg transition-all"
                      onClick={() => {
                        if (expandedMilestones.length === nestedMilestones.length) {
                          setExpandedMilestones([]);
                        } else {
                          setExpandedMilestones(nestedMilestones.map((_, i) => i));
                        }
                      }}
                    >
                      {expandedMilestones.length === nestedMilestones.length ? (
                        <>
                          <ChevronRight size={14} className="rotate-90" />
                          {t('proposalMilestoneEditor.collapseAll', 'Thu gọn tất cả')}
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} />
                          {t('proposalMilestoneEditor.expandAll', 'Mở rộng tất cả')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* DUAL COLUMN RESPONSIVE LAYOUT */}
              {hasClientMilestones ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch transition-all duration-300">
                  
                  {/* ── CỘT BÊN TRÁI: Kế hoạch gốc của Client (Chỉ xem) ── */}
                  <div className={`${isCustomPlan ? 'lg:col-span-6' : 'lg:col-span-8'} flex flex-col min-w-0 transition-all duration-300`}>
                    <div className="flex-1 bg-surface-muted rounded-2xl border border-border p-3.5 sm:p-4.5 transition-all opacity-85 overflow-hidden">
                      <NestedMilestonePlanEditor
                        value={clientMilestones}
                        onChange={() => {}}
                        targetBudget={jobPost?.budgetMax || jobPost?.budgetMin || null}
                        title={t('createProposal.clientMilestoneColumnTitle', 'Kế hoạch từ Client (Gốc)')}
                        titleIcon={<Lock size={15} className="text-muted-foreground shrink-0" />}
                        titleBadge={
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                            {t('createProposal.viewOnly', 'Chỉ xem')}
                          </span>
                        }
                        hideTopBorder
                        description={t('proposalMilestoneEditor.description')}
                        readOnly={true}
                        showDueDate
                        dueDateReadOnly
                        simplifiedMilestoneFields
                        durationUnits={JOB_DURATION_UNITS.map(unit => ({
                          value: unit,
                          label: t(`proposalMilestoneEditor.durationUnits.${unit}`),
                        }))}
                        workItemDurationUnits={WORK_ITEM_DURATION_UNITS.map(unit => ({
                          value: unit,
                          label: t(`proposalMilestoneEditor.durationUnits.${unit}`),
                        }))}
                        uiCopy={milestoneEditorUiCopy}
                        fieldHints={milestoneFieldHints}
                        fieldPlaceholders={milestoneFieldPlaceholders}
                        expandedIndexes={clientExpandedIndexes}
                        onExpandedIndexesChange={setClientExpandedIndexes}
                        advancedIndexes={clientAdvancedIndexes}
                        onAdvancedIndexesChange={setClientAdvancedIndexes}
                      />
                    </div>
                  </div>

                  {/* ── CỘT BÊN PHẢI: Kế hoạch của Freelancer đề xuất ── */}
                  <div className={`${isCustomPlan ? 'lg:col-span-6' : 'lg:col-span-4'} flex flex-col transition-all duration-300`}>
                    {!isCustomPlan ? (
                      /* TRẠNG THÁI CHƯA BẤM (+): Ô dọc viền nét đứt */
                      <div
                        className="h-full min-h-[340px] rounded-2xl border-2 border-dashed border-border hover:border-brand/70 bg-card/40 hover:bg-brand/[0.04] transition-all p-6 md:p-8 flex flex-col items-center justify-center text-center group shadow-xs hover:shadow-md"
                      >
                        <div className="w-16 h-16 rounded-2xl bg-brand/10 text-brand border border-brand/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-brand group-hover:text-white transition-all shadow-xs">
                          <Plus size={30} className="stroke-[2.5]" />
                        </div>

                        <h3 className="text-base md:text-lg font-bold text-foreground mb-2 group-hover:text-brand transition-colors">
                          {t('createProposal.customPlanPromptTitle', 'Đề xuất kế hoạch mới của bạn')}
                        </h3>

                        <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-xs mb-6">
                          {t(
                            'createProposal.customPlanPromptDesc',
                            'Nếu không hài lòng với kế hoạch của Client, bạn có thể tạo ra kế hoạch thực hiện dự án riêng của mình.'
                          )}
                        </p>

                        <div className="flex items-center gap-2.5 flex-wrap justify-center">
                          <button
                            type="button"
                            onClick={handleCopyClientPlan}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface border-2 border-brand/30 text-brand hover:bg-brand/10 text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95"
                            title={t('createProposal.copyClientPlanTooltip', 'Sao chép toàn bộ mốc và đầu việc của Client vào kế hoạch đề xuất để chỉnh sửa')}
                          >
                            <Copy size={14} />
                            <span>{t('createProposal.copyClientPlan', 'Sao chép kế hoạch gốc của Client')}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleStartCustomPlan}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand text-white text-xs font-bold shadow-md hover:bg-brand/90 transition-all cursor-pointer hover:shadow-lg active:scale-95"
                          >
                            <Plus size={15} />
                            <span>{t('createProposal.createCustomPlanBtn', 'Tạo kế hoạch của bạn')}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* TRẠNG THÁI ĐÃ BẤM (+): Mở rộng 50% trình tạo milestone tương tác đầy đủ với nền Solid Monochromatic */
                      <div className="flex flex-col flex-1 min-w-0 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex-1 bg-surface rounded-2xl border-2 border-brand/40 p-3.5 sm:p-4.5 transition-all shadow-xs">
                          <NestedMilestonePlanEditor
                            value={nestedMilestones}
                            baselineMilestones={clientMilestones}
                            onChange={updateNestedPlan}
                            targetBudget={jobPost?.budgetMax || jobPost?.budgetMin || null}
                            title={t('createProposal.freelancerMilestoneColumnTitle', 'Kế hoạch bạn đề xuất (Mới)')}
                            titleIcon={<Sparkles size={15} className="text-brand shrink-0" />}
                            titleBadge={
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-brand/10 text-brand border border-brand/20">
                                {t('createProposal.editing', 'Đang chỉnh sửa')}
                              </span>
                            }
                            hideTopBorder
                            description={t('proposalMilestoneEditor.description')}
                            showDueDate
                            dueDateReadOnly
                            simplifiedMilestoneFields
                            durationUnits={JOB_DURATION_UNITS.map(unit => ({
                              value: unit,
                              label: t(`proposalMilestoneEditor.durationUnits.${unit}`),
                            }))}
                            workItemDurationUnits={WORK_ITEM_DURATION_UNITS.map(unit => ({
                              value: unit,
                              label: t(`proposalMilestoneEditor.durationUnits.${unit}`),
                            }))}
                            uiCopy={milestoneEditorUiCopy}
                            fieldHints={milestoneFieldHints}
                            fieldPlaceholders={milestoneFieldPlaceholders}
                            expandedIndexes={expandedMilestones}
                            onExpandedIndexesChange={setExpandedMilestones}
                            advancedIndexes={advancedMilestoneIndexes}
                            onAdvancedIndexesChange={setAdvancedMilestoneIndexes}
                            errors={milestoneErrors}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Job without client milestones: Standard 1-column full width */
                <NestedMilestonePlanEditor
                  value={nestedMilestones}
                  onChange={updateNestedPlan}
                  targetBudget={jobPost?.budgetMax || jobPost?.budgetMin || null}
                  title={t('proposalMilestoneEditor.title')}
                  description={t('proposalMilestoneEditor.description')}
                  showDueDate
                  dueDateReadOnly
                  simplifiedMilestoneFields
                  durationUnits={JOB_DURATION_UNITS.map(unit => ({
                    value: unit,
                    label: t(`proposalMilestoneEditor.durationUnits.${unit}`),
                  }))}
                  workItemDurationUnits={WORK_ITEM_DURATION_UNITS.map(unit => ({
                    value: unit,
                    label: t(`proposalMilestoneEditor.durationUnits.${unit}`),
                  }))}
                  uiCopy={milestoneEditorUiCopy}
                  fieldHints={milestoneFieldHints}
                  fieldPlaceholders={milestoneFieldPlaceholders}
                  expandedIndexes={expandedMilestones}
                  onExpandedIndexesChange={setExpandedMilestones}
                  advancedIndexes={advancedMilestoneIndexes}
                  onAdvancedIndexesChange={setAdvancedMilestoneIndexes}
                  errors={milestoneErrors}
                />
              )}

              {hasClientMilestones && isCustomPlan && jobPost?.milestonePlans?.length ? (
                <div className="mt-6 pt-4 border-t border-border/50">
                  <MilestonePlanComparison
                    clientMilestones={clientMilestones}
                    freelancerMilestones={nestedMilestones}
                    title={t('proposalMilestoneComparison.title')}
                    clientLabel={t('proposalMilestoneComparison.clientLabel')}
                    freelancerLabel={t('proposalMilestoneComparison.freelancerLabel')}
                    addedLabel={t('proposalMilestoneComparison.addedLabel')}
                    removedLabel={t('proposalMilestoneComparison.removedLabel')}
                    emptyLabel={t('proposalMilestoneComparison.emptyLabel')}
                    workItemsLabel={t('proposalMilestoneComparison.workItemsLabel')}
                  />
                </div>
              ) : null}
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
