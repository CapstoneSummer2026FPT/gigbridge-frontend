import type {
  Milestone,
  UpdateContractDetailsRequest,
} from '../../../types/models/Contract';
import type { EditableMilestonePlan } from '../../../shared/components/NestedMilestonePlanEditor';
import {
  calculateMilestonePlanBudget,
  currentLocalDate,
  prepareMilestonePlanForEditing,
  resolveMilestonePlan,
  toDateOnly,
  validateMilestonePlan,
} from '../../../shared/utils/milestonePlanWorkflow';

const clean = (value?: string | null): string | null => value?.trim() || null;

export interface PreparedContractMilestonePlan {
  milestones: EditableMilestonePlan[];
  advancedIndexes: number[];
  generatedWorkItemIdsByMilestoneId: Record<string, string>;
}

export const prepareContractMilestonesForEditing = (
  milestones: readonly Milestone[],
): PreparedContractMilestonePlan => {
  const ordered = milestones
    .map((milestone, originalIndex) => ({ milestone, originalIndex }))
    .sort((left, right) =>
      (left.milestone.sortOrder ?? left.originalIndex) -
      (right.milestone.sortOrder ?? right.originalIndex))
    .map(({ milestone }, orderIndex): EditableMilestonePlan => ({
      id: milestone.id,
      title: milestone.title,
      description: milestone.description,
      amount: Number(milestone.amount) || 0,
      estimatedDuration: milestone.estimatedDuration,
      dueDate: toDateOnly(milestone.due_date),
      deliverables: milestone.deliverables,
      acceptanceCriteria: milestone.acceptanceCriteria,
      orderIndex,
      workItems: [...(milestone.workItems || [])]
        .sort((left, right) => left.orderIndex - right.orderIndex)
        .map((workItem, workItemIndex) => ({
          id: workItem.workItemId,
          title: workItem.title,
          description: workItem.description,
          deliverables: workItem.deliverables,
          estimatedDuration: workItem.estimatedDuration,
          orderIndex: workItemIndex,
        })),
    }));

  return prepareMilestonePlanForEditing(ordered);
};

export const resolveContractMilestones = (
  milestones: readonly EditableMilestonePlan[],
  defaultAcceptanceCriteria: string,
  generatedWorkItemIdsByMilestoneId: Readonly<Record<string, string>>,
  today = currentLocalDate(),
): EditableMilestonePlan[] => resolveMilestonePlan(milestones, {
  anchorDate: today,
  defaultAcceptanceCriteria,
  generatedWorkItemIdsByMilestoneId,
});

export const toUpdateContractDetailsRequest = (
  milestones: readonly EditableMilestonePlan[],
): UpdateContractDetailsRequest => ({
  milestones: milestones.map((milestone, sortOrder) => ({
    milestoneId: milestone.id || null,
    title: milestone.title?.trim() || '',
    description: clean(milestone.description),
    amount: Math.round((Number(milestone.amount) || 0) * 100) / 100,
    dueDate: toDateOnly(milestone.dueDate),
    sortOrder,
    estimatedDuration: clean(milestone.estimatedDuration),
    deliverables: clean(milestone.deliverables),
    acceptanceCriteria: clean(milestone.acceptanceCriteria),
    workItems: (milestone.workItems || []).map((workItem, orderIndex) => ({
      workItemId: workItem.id || null,
      title: workItem.title?.trim() || '',
      description: clean(workItem.description),
      deliverables: clean(workItem.deliverables),
      estimatedDuration: clean(workItem.estimatedDuration),
      orderIndex,
    })),
  })),
});

export const validateContractMilestones = validateMilestonePlan;
export const calculateContractMilestoneBudget = calculateMilestonePlanBudget;
