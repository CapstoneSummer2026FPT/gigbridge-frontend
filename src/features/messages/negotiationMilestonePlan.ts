import type {
  NegotiationMilestoneDto,
  NegotiationWorkItemDto,
} from '../../types/models/Message';
import { currentLocalDate } from '../proposals/utils/proposalMilestonePlan';
import {
  calculateProposalBudget,
  calculateProposalDuration,
} from '../proposals/utils/proposalTotals';
import { computeChainedDueDates, parseJobDuration } from '../jobs/utils/jobDuration';

const MAX_AMOUNT = 9_999_999_999_999_999.99;

const normalizeText = (value?: string | null) => value?.trim() || '';

const normalizeWorkItems = (items: readonly NegotiationWorkItemDto[]) =>
  items.map((item, orderIndex) => ({ ...item, orderIndex }));

export const normalizeNegotiationMilestones = (
  milestones: readonly NegotiationMilestoneDto[],
): NegotiationMilestoneDto[] => milestones.map((milestone, orderIndex) => ({
  ...milestone,
  amount: Math.round((Number(milestone.amount) || 0) * 100) / 100,
  orderIndex,
  workItems: normalizeWorkItems(milestone.workItems || []),
}));

export const isGeneratedNegotiationWorkItem = (
  item: NegotiationWorkItemDto,
  milestone: NegotiationMilestoneDto,
): boolean =>
  normalizeText(item.title) === normalizeText(milestone.title) &&
  normalizeText(item.description) === normalizeText(milestone.deliverables) &&
  normalizeText(item.deliverables) === normalizeText(milestone.deliverables) &&
  normalizeText(item.estimatedDuration) === normalizeText(milestone.estimatedDuration);

export interface EditableNegotiationMilestonePlan {
  milestones: NegotiationMilestoneDto[];
  advancedIndexes: number[];
}

export const prepareNegotiationMilestonesForEditing = (
  milestones: readonly NegotiationMilestoneDto[],
): EditableNegotiationMilestonePlan => {
  const advancedIndexes: number[] = [];
  const editable = normalizeNegotiationMilestones(milestones).map((milestone, index) => {
    const workItems = milestone.workItems || [];
    if (workItems.length === 1 && isGeneratedNegotiationWorkItem(workItems[0], milestone)) {
      return { ...milestone, workItems: [] };
    }
    if (workItems.length > 0) advancedIndexes.push(index);
    return milestone;
  });

  return { milestones: editable, advancedIndexes };
};

// Milestone Deadline is derived from the user-entered Duration, not the other way around:
// Milestone 1 starts the day after "today" (the negotiation always anchors to the current
// date — by the time a deal is negotiated, the job's application-closing date is normally
// already in the past), and each following milestone starts the day after the previous
// one's computed deadline.
export const resolveNegotiationMilestones = (
  milestones: readonly NegotiationMilestoneDto[],
  defaultAcceptanceCriteria: string,
  today = currentLocalDate(),
): NegotiationMilestoneDto[] => {
  const ordered = normalizeNegotiationMilestones(milestones);
  const dueDates = computeChainedDueDates(today, ordered.map(milestone => milestone.estimatedDuration));

  return ordered.map((milestone, index) => {
    const customWorkItems = milestone.workItems || [];
    const workItems = normalizeWorkItems(customWorkItems.length > 0 ? customWorkItems : [{
      title: normalizeText(milestone.title),
      description: normalizeText(milestone.deliverables),
      deliverables: normalizeText(milestone.deliverables),
      estimatedDuration: milestone.estimatedDuration,
      orderIndex: 0,
    }]);

    return {
      ...milestone,
      dueDate: dueDates[index],
      acceptanceCriteria: normalizeText(milestone.acceptanceCriteria) || defaultAcceptanceCriteria,
      workItems,
    };
  });
};

export const calculateNegotiationDuration = (
  milestones: readonly NegotiationMilestoneDto[],
): string | null => calculateProposalDuration(milestones.map(item => item.estimatedDuration));

export const calculateNegotiationBudget = (
  milestones: readonly NegotiationMilestoneDto[],
): number => calculateProposalBudget(milestones.map(item => item.amount));

export type NegotiationPlanValidationCode =
  | 'milestoneRequired'
  | 'titleRequired'
  | 'amountInvalid'
  | 'durationInvalid'
  | 'deliverablesRequired'
  | 'workItemTitleRequired'
  | 'workItemDescriptionRequired';

export interface NegotiationPlanValidationResult {
  valid: boolean;
  errors: Record<string, NegotiationPlanValidationCode>;
  firstError?: NegotiationPlanValidationCode;
  advancedIndexes: number[];
}

export const validateNegotiationMilestones = (
  milestones: readonly NegotiationMilestoneDto[],
): NegotiationPlanValidationResult => {
  if (milestones.length === 0) {
    return {
      valid: false,
      errors: {},
      firstError: 'milestoneRequired',
      advancedIndexes: [],
    };
  }

  const errors: Record<string, NegotiationPlanValidationCode> = {};
  const advancedIndexes = new Set<number>();

  normalizeNegotiationMilestones(milestones).forEach((milestone, milestoneIndex) => {
    if (!normalizeText(milestone.title)) errors[`${milestoneIndex}.title`] = 'titleRequired';
    const amount = Number(milestone.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT || Math.round(amount * 100) / 100 !== amount) {
      errors[`${milestoneIndex}.amount`] = 'amountInvalid';
    }
    if (!parseJobDuration(milestone.estimatedDuration).value) {
      errors[`${milestoneIndex}.estimatedDuration`] = 'durationInvalid';
    }
    if (!normalizeText(milestone.deliverables)) {
      errors[`${milestoneIndex}.deliverables`] = 'deliverablesRequired';
    }

    (milestone.workItems || []).forEach((workItem, workIndex) => {
      if (!normalizeText(workItem.title)) {
        errors[`${milestoneIndex}.workItems.${workIndex}.title`] = 'workItemTitleRequired';
        advancedIndexes.add(milestoneIndex);
      }
      if (!normalizeText(workItem.description)) {
        errors[`${milestoneIndex}.workItems.${workIndex}.description`] = 'workItemDescriptionRequired';
        advancedIndexes.add(milestoneIndex);
      }
    });
  });

  const firstError = Object.values(errors)[0];
  return {
    valid: !firstError,
    errors,
    firstError,
    advancedIndexes: [...advancedIndexes],
  };
};
