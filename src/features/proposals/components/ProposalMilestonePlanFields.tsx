import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Lock, Plus, RotateCcw, Sparkles } from 'lucide-react';
import {
  NestedMilestonePlanEditor,
  type EditableMilestonePlan,
} from '../../../shared/components/NestedMilestonePlanEditor';
import { MilestonePlanComparison } from '../../../shared/components/MilestonePlanComparison';
import type { UndoableDeleteController } from '../../../shared/hooks/useUndoableDeleteScope';
import { useTranslation } from '../../../hooks/useTranslation';
import type { JobPostDetailDto } from '../../../types/models/Job';
import type { ProposalDetailDto } from '../../../types/models/Proposal';
import {
  JOB_DURATION_UNITS,
  WORK_ITEM_DURATION_UNITS,
  computeChainedDueDates,
  formatJobDuration,
  parseJobDuration,
  parseWorkItemDuration,
} from '../../jobs/utils/jobDuration';
import { currentLocalDate } from '../utils/proposalMilestonePlan';
import { useMilestoneEditorCopy } from '../hooks/useMilestoneEditorCopy';

export interface ProposalMilestonePlanFieldsProps {
  jobPost: JobPostDetailDto | null;
  proposal: ProposalDetailDto | null;
  nestedMilestones: EditableMilestonePlan[];
  updateNestedPlan: (plans: EditableMilestonePlan[]) => void;
  undoDeleteController: UndoableDeleteController;
  expandedMilestones: number[];
  setExpandedMilestones: React.Dispatch<React.SetStateAction<number[]>>;
  advancedMilestoneIndexes: number[];
  setAdvancedMilestoneIndexes: React.Dispatch<React.SetStateAction<number[]>>;
  milestoneErrors: Record<string, string>;
  /** True when an existing draft is being edited, so its own plan is shown right away. */
  defaultCustomPlan?: boolean;
}

/**
 * Section 2 of the proposal form: the client's frozen baseline plan beside the freelancer's
 * own milestone plan. Owns only its presentational state (which column is expanded, whether
 * a custom plan has been started); the plan data itself stays in useCreateProposal.
 */
export function ProposalMilestonePlanFields({
  jobPost,
  proposal,
  nestedMilestones,
  updateNestedPlan,
  undoDeleteController,
  expandedMilestones,
  setExpandedMilestones,
  advancedMilestoneIndexes,
  setAdvancedMilestoneIndexes,
  milestoneErrors,
  defaultCustomPlan = false,
}: ProposalMilestonePlanFieldsProps) {
  const { t } = useTranslation(['proposals', 'common']);
  const { uiCopy, fieldHints, fieldPlaceholders } = useMilestoneEditorCopy();

  const hasClientMilestones = Boolean(jobPost?.milestonePlans && jobPost.milestonePlans.length > 0);

  const clientMilestones: EditableMilestonePlan[] = useMemo(() => {
    if (!jobPost?.milestonePlans?.length) return [];

    const anchorDate = (jobPost.endDate && jobPost.endDate.slice(0, 10)) || currentLocalDate();
    const computedDueDates = computeChainedDueDates(
      anchorDate,
      jobPost.milestonePlans.map(milestone => milestone.estimatedDuration)
    );

    return jobPost.milestonePlans.map((milestone, index) => {
      const parsedDuration = parseJobDuration(milestone.estimatedDuration);
      const formattedDuration = (parsedDuration.value ? formatJobDuration(parsedDuration.value, parsedDuration.unit) : null)
        || milestone.estimatedDuration
        || '1 week';
      return {
        orderIndex: index,
        milestoneOrderIndex: index,
        title: milestone.title || `Mốc ${index + 1}`,
        amount: milestone.amount || 0,
        estimatedDuration: formattedDuration,
        durationUnit: parsedDuration.unit || 'weeks',
        dueDate: (milestone.dueDate ? milestone.dueDate.slice(0, 10) : computedDueDates[index]) || undefined,
        deliverables: milestone.deliverables || '',
        description: milestone.description || '',
        acceptanceCriteria: milestone.acceptanceCriteria || '',
        workItems: (milestone.workItems || []).map((workItem, workItemIndex) => {
          const parsedWorkItemDuration = parseWorkItemDuration(workItem.estimatedDuration);
          const formattedWorkItemDuration = parsedWorkItemDuration
            ? `${parsedWorkItemDuration.value} ${Number(parsedWorkItemDuration.value) === 1 ? parsedWorkItemDuration.unit.replace(/s$/, '') : parsedWorkItemDuration.unit}`
            : (workItem.estimatedDuration || '1 day');
          return {
            orderIndex: workItemIndex,
            title: workItem.title || `Hạng mục ${workItemIndex + 1}`,
            estimatedDuration: formattedWorkItemDuration,
            durationUnit: parsedWorkItemDuration ? parsedWorkItemDuration.unit : 'days',
            description: workItem.description || '',
            deliverables: workItem.deliverables || '',
          };
        }),
      };
    });
  }, [jobPost?.milestonePlans, jobPost?.endDate]);

  const [isCustomPlan, setIsCustomPlan] = useState<boolean>(() => defaultCustomPlan || Boolean(proposal?.milestonePlans?.length));
  const [planModeInitialized, setPlanModeInitialized] = useState(false);
  const [clientExpandedIndexes, setClientExpandedIndexes] = useState<number[]>(() =>
    clientMilestones.map((_, index) => index)
  );
  const [clientAdvancedIndexes, setClientAdvancedIndexes] = useState<number[]>([]);

  useEffect(() => {
    if (clientMilestones.length > 0) {
      setClientExpandedIndexes(clientMilestones.map((_, index) => index));
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

  const durationUnitOptions = useMemo(
    () => JOB_DURATION_UNITS.map(unit => ({ value: unit, label: t(`proposalMilestoneEditor.durationUnits.${unit}`) })),
    [t]
  );
  const workItemDurationUnitOptions = useMemo(
    () => WORK_ITEM_DURATION_UNITS.map(unit => ({ value: unit, label: t(`proposalMilestoneEditor.durationUnits.${unit}`) })),
    [t]
  );

  const handleStartCustomPlan = async (): Promise<void> => {
    await undoDeleteController.finalizeAll();
    setIsCustomPlan(true);
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

  const handleCopyClientPlan = async (): Promise<void> => {
    await undoDeleteController.finalizeAll();
    if (clientMilestones.length === 0) return;
    const cloned: EditableMilestonePlan[] = JSON.parse(JSON.stringify(clientMilestones));
    updateNestedPlan(cloned);
    setExpandedMilestones(cloned.map((_, index) => index));
    setAdvancedMilestoneIndexes([]);
    setIsCustomPlan(true);
  };

  const handleRevertToClientPlan = async (): Promise<void> => {
    await undoDeleteController.finalizeAll();
    setIsCustomPlan(false);
    if (clientMilestones.length === 0) return;
    updateNestedPlan(clientMilestones);
    setExpandedMilestones(clientMilestones.map((_, index) => index));
  };

  return (
    <>
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
                onClick={() => void handleCopyClientPlan()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-brand hover:text-brand/90 bg-brand/10 hover:bg-brand/15 border border-brand/25 transition-all cursor-pointer shadow-2xs active:scale-95"
                title={t('createProposal.copyClientPlanTooltip', 'Sao chép toàn bộ mốc và đầu việc của Client vào kế hoạch đề xuất để chỉnh sửa')}
              >
                <Copy size={13} />
                <span>{t('createProposal.copyClientPlan', 'Sao chép kế hoạch gốc của Client')}</span>
              </button>

              <button
                type="button"
                onClick={() => void handleRevertToClientPlan()}
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
                setExpandedMilestones(expandedMilestones.length === nestedMilestones.length
                  ? []
                  : nestedMilestones.map((_, index) => index));
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

      {hasClientMilestones ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch transition-all duration-300">
          {/* Client baseline (read-only) */}
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
                readOnly
                showDueDate
                dueDateReadOnly
                simplifiedMilestoneFields
                compactLayout
                durationUnits={durationUnitOptions}
                workItemDurationUnits={workItemDurationUnitOptions}
                uiCopy={uiCopy}
                fieldHints={fieldHints}
                fieldPlaceholders={fieldPlaceholders}
                expandedIndexes={clientExpandedIndexes}
                onExpandedIndexesChange={setClientExpandedIndexes}
                advancedIndexes={clientAdvancedIndexes}
                onAdvancedIndexesChange={setClientAdvancedIndexes}
              />
            </div>
          </div>

          {/* Freelancer plan */}
          <div className={`${isCustomPlan ? 'lg:col-span-6' : 'lg:col-span-4'} flex flex-col transition-all duration-300`}>
            {!isCustomPlan ? (
              <div className="h-full min-h-[340px] rounded-2xl border-2 border-dashed border-border hover:border-brand/70 bg-card/40 hover:bg-brand/[0.04] transition-all p-6 md:p-8 flex flex-col items-center justify-center text-center group shadow-xs hover:shadow-md">
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
                    onClick={() => void handleCopyClientPlan()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface border-2 border-brand/30 text-brand hover:bg-brand/10 text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer active:scale-95"
                    title={t('createProposal.copyClientPlanTooltip', 'Sao chép toàn bộ mốc và đầu việc của Client vào kế hoạch đề xuất để chỉnh sửa')}
                  >
                    <Copy size={14} />
                    <span>{t('createProposal.copyClientPlan', 'Sao chép kế hoạch gốc của Client')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleStartCustomPlan()}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand text-white text-xs font-bold shadow-md hover:bg-brand/90 transition-all cursor-pointer hover:shadow-lg active:scale-95"
                  >
                    <Plus size={15} />
                    <span>{t('createProposal.createCustomPlanBtn', 'Tạo kế hoạch của bạn')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 min-w-0 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="flex-1 bg-surface rounded-2xl border-2 border-brand/40 p-3.5 sm:p-4.5 transition-all shadow-xs">
                  <NestedMilestonePlanEditor
                    value={nestedMilestones}
                    baselineMilestones={clientMilestones}
                    onChange={updateNestedPlan}
                    undoDeleteController={undoDeleteController}
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
                    compactLayout
                    durationUnits={durationUnitOptions}
                    workItemDurationUnits={workItemDurationUnitOptions}
                    uiCopy={uiCopy}
                    fieldHints={fieldHints}
                    fieldPlaceholders={fieldPlaceholders}
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
        <NestedMilestonePlanEditor
          value={nestedMilestones}
          onChange={updateNestedPlan}
          undoDeleteController={undoDeleteController}
          targetBudget={jobPost?.budgetMax || jobPost?.budgetMin || null}
          title={t('proposalMilestoneEditor.title')}
          description={t('proposalMilestoneEditor.description')}
          showDueDate
          dueDateReadOnly
          simplifiedMilestoneFields
          durationUnits={durationUnitOptions}
          workItemDurationUnits={workItemDurationUnitOptions}
          uiCopy={uiCopy}
          fieldHints={fieldHints}
          fieldPlaceholders={fieldPlaceholders}
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
    </>
  );
}
