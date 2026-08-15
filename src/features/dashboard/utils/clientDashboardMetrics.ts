import {
  MilestoneStatus,
  type Milestone,
} from '../../../types/models/Contract';
import {
  ProposalStatus,
  type ProposalDto,
} from '../../../types/models/Proposal';

export interface ProposalStatusCounts {
  pending: number;
  accepted: number;
  rejected: number;
}

export const countProposalStatuses = (
  proposals: ProposalDto[],
): ProposalStatusCounts => proposals.reduce<ProposalStatusCounts>((counts, proposal) => {
  const status = Number(proposal.status);

  if (status === ProposalStatus.Pending) counts.pending += 1;
  if (status === ProposalStatus.Accepted) counts.accepted += 1;
  if (status === ProposalStatus.Rejected) counts.rejected += 1;

  return counts;
}, { pending: 0, accepted: 0, rejected: 0 });

const CLOSED_MILESTONE_STATUSES = new Set<number>([
  MilestoneStatus.Approved,
  MilestoneStatus.PaymentProofUploaded,
  MilestoneStatus.PaymentConfirmed,
  MilestoneStatus.Cancelled,
  MilestoneStatus.Completed,
]);

export const isMilestoneAwaitingCompletion = (milestone: Milestone): boolean =>
  !CLOSED_MILESTONE_STATUSES.has(Number(milestone.status));

export const countMilestonesAwaitingCompletion = (milestones: Milestone[]): number =>
  milestones.filter(isMilestoneAwaitingCompletion).length;

