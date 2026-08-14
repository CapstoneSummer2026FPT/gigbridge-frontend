import type {
  ProposalMilestonePlanDto,
  ProposalWorkBreakdownItemDto,
} from '../../../types/models/Proposal';
import { computeChainedDueDates } from '../../jobs/utils/jobDuration';

const normalizeText = (value?: string | null) => value?.trim() || '';

const dateOnly = (value?: string | null): string | null => {
  const candidate = value?.slice(0, 10);
  return candidate && /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null;
};

export const currentLocalDate = (now = new Date()): string => {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeMilestones = (milestones: ProposalMilestonePlanDto[]) =>
  milestones.map((milestone, orderIndex) => ({ ...milestone, orderIndex }));

const linkedWorkItems = (
  milestone: ProposalMilestonePlanDto,
  milestoneIndex: number,
  workItems: ProposalWorkBreakdownItemDto[],
) => workItems.filter(item =>
  item.milestoneOrderIndex === milestoneIndex ||
  Boolean(item.milestonePlanId && milestone.id && item.milestonePlanId === milestone.id));

export const isGeneratedWorkItem = (
  item: ProposalWorkBreakdownItemDto,
  milestone: ProposalMilestonePlanDto,
): boolean =>
  normalizeText(item.title) === normalizeText(milestone.title) &&
  normalizeText(item.description) === normalizeText(milestone.deliverables) &&
  normalizeText(item.deliverables) === normalizeText(milestone.deliverables) &&
  normalizeText(item.estimatedDuration) === normalizeText(milestone.estimatedDuration);

export interface EditableProposalWorkItems {
  customWorkItems: ProposalWorkBreakdownItemDto[];
  customMilestoneIndexes: number[];
}

export const extractCustomWorkItems = (
  milestones: ProposalMilestonePlanDto[],
  workItems: ProposalWorkBreakdownItemDto[],
): EditableProposalWorkItems => {
  const customWorkItems: ProposalWorkBreakdownItemDto[] = [];
  const customMilestoneIndexes: number[] = [];

  normalizeMilestones(milestones).forEach((milestone, milestoneIndex) => {
    const linked = linkedWorkItems(milestone, milestoneIndex, workItems);
    if (linked.length === 1 && isGeneratedWorkItem(linked[0], milestone)) return;
    if (linked.length > 0) customMilestoneIndexes.push(milestoneIndex);
    linked.forEach((item, orderIndex) => customWorkItems.push({
      ...item,
      milestonePlanId: milestone.id || null,
      milestoneOrderIndex: milestoneIndex,
      orderIndex,
    }));
  });

  workItems.forEach(item => {
    const belongsToKnownMilestone = milestones.some((milestone, milestoneIndex) =>
      item.milestoneOrderIndex === milestoneIndex ||
      Boolean(item.milestonePlanId && milestone.id && item.milestonePlanId === milestone.id));
    if (!belongsToKnownMilestone) customWorkItems.push(item);
  });

  return { customWorkItems, customMilestoneIndexes };
};

export interface ResolvedProposalMilestonePlan {
  milestonePlans: ProposalMilestonePlanDto[];
  workBreakdownItems: ProposalWorkBreakdownItemDto[];
}

// Milestone Deadline is derived from the freelancer-entered Duration, not the other way
// around: Milestone 1 starts the day after the job's closing date (proposalClosingDate),
// and each following milestone starts the day after the previous one's computed deadline.
export const resolveProposalMilestonePlan = (
  milestones: ProposalMilestonePlanDto[],
  customWorkItems: ProposalWorkBreakdownItemDto[],
  defaultAcceptanceCriteria: string,
  proposalClosingDate?: string | null,
): ResolvedProposalMilestonePlan => {
  const orderedMilestones = normalizeMilestones(milestones);
  const dueDates = computeChainedDueDates(
    dateOnly(proposalClosingDate),
    orderedMilestones.map(milestone => milestone.estimatedDuration),
  );
  const flatWorkItems: ProposalWorkBreakdownItemDto[] = [];

  const milestonePlans = orderedMilestones.map((milestone, milestoneIndex) => {
    const customItems = linkedWorkItems(milestone, milestoneIndex, customWorkItems);
    const resolvedItems = (customItems.length > 0 ? customItems : [{
      title: normalizeText(milestone.title),
      description: normalizeText(milestone.deliverables),
      deliverables: normalizeText(milestone.deliverables),
      estimatedDuration: milestone.estimatedDuration,
      orderIndex: 0,
    }]).map((item, orderIndex) => ({
      ...item,
      milestonePlanId: milestone.id || null,
      milestoneOrderIndex: milestoneIndex,
      orderIndex,
    }));

    resolvedItems.forEach(item => flatWorkItems.push({
      ...item,
      orderIndex: flatWorkItems.length,
    }));

    return {
      ...milestone,
      amount: Number(milestone.amount) || 0,
      dueDate: dueDates[milestoneIndex],
      acceptanceCriteria: normalizeText(milestone.acceptanceCriteria) || defaultAcceptanceCriteria,
      workItems: resolvedItems,
    };
  });

  return { milestonePlans, workBreakdownItems: flatWorkItems };
};
