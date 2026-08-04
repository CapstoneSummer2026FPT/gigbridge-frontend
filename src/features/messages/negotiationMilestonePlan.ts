import type {
  NegotiationMilestoneDto,
  NegotiationWorkItemDto,
} from '../../types/models/Message';
import {
  currentLocalDate,
  deriveMilestoneDuration,
} from '../proposals/utils/proposalMilestonePlan';
import {
  calculateProposalBudget,
  calculateProposalDuration,
} from '../proposals/utils/proposalTotals';

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

export const resolveNegotiationMilestones = (
  milestones: readonly NegotiationMilestoneDto[],
  defaultAcceptanceCriteria: string,
  today = currentLocalDate(),
): NegotiationMilestoneDto[] => {
  let intervalStart = today;

  return normalizeNegotiationMilestones(milestones).map(milestone => {
    const estimatedDuration = deriveMilestoneDuration(intervalStart, milestone.dueDate);
    const customWorkItems = milestone.workItems || [];
    const workItems = normalizeWorkItems(customWorkItems.length > 0 ? customWorkItems : [{
      title: normalizeText(milestone.title),
      description: normalizeText(milestone.deliverables),
      deliverables: normalizeText(milestone.deliverables),
      estimatedDuration,
      orderIndex: 0,
    }]);

    if (milestone.dueDate) intervalStart = milestone.dueDate.slice(0, 10);

    return {
      ...milestone,
      estimatedDuration,
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
  | 'deadlineRequired'
  | 'deadlinePast'
  | 'deadlineSequence'
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
  today = currentLocalDate(),
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
  let previousDueDate: string | null = null;

  normalizeNegotiationMilestones(milestones).forEach((milestone, milestoneIndex) => {
    if (!normalizeText(milestone.title)) errors[`${milestoneIndex}.title`] = 'titleRequired';
    const amount = Number(milestone.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT || Math.round(amount * 100) / 100 !== amount) {
      errors[`${milestoneIndex}.amount`] = 'amountInvalid';
    }
    const dueDate = milestone.dueDate?.slice(0, 10) || '';
    if (!dueDate) {
      errors[`${milestoneIndex}.dueDate`] = 'deadlineRequired';
    } else {
      if (dueDate < today) errors[`${milestoneIndex}.dueDate`] = 'deadlinePast';
      if (previousDueDate && dueDate <= previousDueDate) {
        errors[`${milestoneIndex}.dueDate`] = 'deadlineSequence';
      }
      previousDueDate = dueDate;
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
