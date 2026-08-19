import {
  ContractStatus,
  MilestoneStatus,
  type ContractDto,
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

export interface ContractPipelineCounts {
  pendingSignature: number;
  pendingEscrow: number;
  active: number;
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

export const countContractPipelineStatuses = (
  contracts: ContractDto[],
): ContractPipelineCounts => contracts.reduce<ContractPipelineCounts>((counts, contract) => {
  const status = Number(contract.status);

  if (status === ContractStatus.PendingSignature) counts.pendingSignature += 1;
  if (status === ContractStatus.PendingEscrow) counts.pendingEscrow += 1;
  if (status === ContractStatus.Active) counts.active += 1;

  return counts;
}, { pendingSignature: 0, pendingEscrow: 0, active: 0 });
