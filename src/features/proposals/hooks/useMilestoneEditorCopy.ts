import { useMemo } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import type {
  MilestonePlanFieldCopy,
  MilestonePlanUiCopy,
} from '../../../shared/components/NestedMilestonePlanEditor';

export interface MilestoneEditorCopy {
  uiCopy: MilestonePlanUiCopy;
  fieldHints: MilestonePlanFieldCopy;
  fieldPlaceholders: MilestonePlanFieldCopy;
}

/**
 * The NestedMilestonePlanEditor takes every label as a prop. Both step 1 and the inline
 * editor on the review step render it, so the translated copy lives here instead of being
 * duplicated per screen.
 */
export function useMilestoneEditorCopy(): MilestoneEditorCopy {
  const { t } = useTranslation(['proposals', 'common']);

  const uiCopy = useMemo<MilestonePlanUiCopy>(() => ({
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

  const fieldHints = useMemo<MilestonePlanFieldCopy>(() => ({
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

  const fieldPlaceholders = useMemo<MilestonePlanFieldCopy>(() => ({
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

  return { uiCopy, fieldHints, fieldPlaceholders };
}
