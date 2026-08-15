import type {
  NegotiationMilestoneDto,
  NegotiationWorkItemDto,
} from '../../../types/models/Message';
import {
  calculateProposalBudget,
  calculateProposalDuration,
} from '../../proposals/utils/proposalTotals';
import {
  currentLocalDate,
  isGeneratedMilestoneWorkItem,
  normalizeMilestonePlan,
  prepareMilestonePlanForEditing,
  resolveMilestonePlan,
  validateMilestonePlan,
  type MilestonePlanValidationCode,
  type MilestonePlanValidationResult,
} from '../../../shared/utils/milestonePlanWorkflow';

export const normalizeNegotiationMilestones = (
  milestones: readonly NegotiationMilestoneDto[],
): NegotiationMilestoneDto[] => normalizeMilestonePlan(milestones);

export const isGeneratedNegotiationWorkItem = (
  item: NegotiationWorkItemDto,
  milestone: NegotiationMilestoneDto,
): boolean => isGeneratedMilestoneWorkItem(item, milestone);

export interface EditableNegotiationMilestonePlan {
  milestones: NegotiationMilestoneDto[];
  advancedIndexes: number[];
}

export const prepareNegotiationMilestonesForEditing = (
  milestones: readonly NegotiationMilestoneDto[],
): EditableNegotiationMilestonePlan => {
  const prepared = prepareMilestonePlanForEditing(milestones);
  return { milestones: prepared.milestones, advancedIndexes: prepared.advancedIndexes };
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
): NegotiationMilestoneDto[] => resolveMilestonePlan(milestones, {
  anchorDate: today,
  defaultAcceptanceCriteria,
});

export const calculateNegotiationDuration = (
  milestones: readonly NegotiationMilestoneDto[],
): string | null => calculateProposalDuration(milestones.map(item => item.estimatedDuration));

export const calculateNegotiationBudget = (
  milestones: readonly NegotiationMilestoneDto[],
): number => calculateProposalBudget(milestones.map(item => item.amount));

export type NegotiationPlanValidationCode = MilestonePlanValidationCode;
export type NegotiationPlanValidationResult = MilestonePlanValidationResult;

export const validateNegotiationMilestones = (
  milestones: readonly NegotiationMilestoneDto[],
): NegotiationPlanValidationResult => validateMilestonePlan(milestones);
