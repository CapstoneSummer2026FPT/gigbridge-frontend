import {
  ContractStatus,
  type ContractDto,
  type Milestone,
} from '../../../types/models/Contract';
import { ProposalStatus, type ProposalDto } from '../../../types/models/Proposal';
import { isMilestoneAwaitingCompletion } from './clientDashboardMetrics';

export interface FreelancerWorkStatusCounts {
  pending: number;
  active: number;
  completed: number;
}

export interface FreelancerMilestoneTableItem {
  id: string;
  contractId: string;
  jobTitle: string;
  title: string;
  status: number;
  dueDate: string;
  sortOrder: number;
}

/**
 * Maps the freelancer's real workflow into the three states shown on the
 * dashboard: proposals awaiting a decision, active contracts, and completed
 * contracts.
 */
export const countFreelancerWorkStatuses = (
  proposals: ProposalDto[],
  contracts: ContractDto[],
): FreelancerWorkStatusCounts => ({
  pending: proposals.filter(
    proposal => Number(proposal.status) === ProposalStatus.Pending,
  ).length,
  active: contracts.filter(
    contract => Number(contract.status) === ContractStatus.Active,
  ).length,
  completed: contracts.filter(
    contract => Number(contract.status) === ContractStatus.Completed,
  ).length,
});

export const buildFreelancerMilestoneTable = (
  contracts: ContractDto[],
  milestones: Milestone[],
): FreelancerMilestoneTableItem[] => {
  const activeContractsById = new Map(
    contracts
      .filter(contract => Number(contract.status) === ContractStatus.Active)
      .map(contract => [contract.contractsId, contract] as const),
  );

  return milestones
    .filter(isMilestoneAwaitingCompletion)
    .flatMap(milestone => {
      const contract = activeContractsById.get(milestone.contract_id);
      if (!contract) return [];

      return [{
        id: milestone.id,
        contractId: contract.contractsId,
        jobTitle: contract.jobTitle || contract.title || 'Untitled job',
        title: milestone.title,
        status: Number(milestone.status),
        dueDate: milestone.due_date,
        sortOrder: Number(milestone.sortOrder ?? Number.MAX_SAFE_INTEGER),
      }];
    })
    .sort((left, right) => (
      left.jobTitle.localeCompare(right.jobTitle)
      || left.sortOrder - right.sortOrder
      || left.title.localeCompare(right.title)
    ));
};
