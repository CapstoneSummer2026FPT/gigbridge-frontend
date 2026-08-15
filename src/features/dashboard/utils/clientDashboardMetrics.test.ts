import { describe, expect, it } from 'vitest';
import {
  ContractStatus,
  MilestoneStatus,
  type ContractDto,
  type Milestone,
} from '../../../types/models/Contract';
import { ProposalStatus, type ProposalDto } from '../../../types/models/Proposal';
import {
  countMilestonesAwaitingCompletion,
  countContractPipelineStatuses,
  countProposalStatuses,
} from './clientDashboardMetrics';

const proposal = (status: ProposalStatus): ProposalDto => ({
  proposalsId: `proposal-${status}`,
  jobPostsId: 'job-1',
  jobTitle: 'Dashboard test',
  freelancerProfilesId: 'freelancer-1',
  freelancerName: 'Freelancer',
  coverLetter: 'Test proposal',
  proposedBudget: 100,
  proposedDuration: '1 week',
  status,
  submittedAt: '2026-08-15T00:00:00Z',
});

const milestone = (status: MilestoneStatus): Milestone => ({
  id: `milestone-${status}`,
  contract_id: 'contract-1',
  title: 'Dashboard test',
  amount: 100,
  due_date: '2026-08-20T00:00:00Z',
  status,
  paid_at: null,
  workItems: [],
});

const contract = (status: ContractStatus): ContractDto => ({
  contractsId: `contract-${status}`,
  jobPostsId: 'job-1',
  clientProfilesId: 'client-1',
  title: 'Dashboard test',
  totalBudget: 100,
  status,
  createdAt: '2026-08-15T00:00:00Z',
});

describe('client dashboard metrics', () => {
  it('counts only the proposal statuses represented by the chart', () => {
    const result = countProposalStatuses([
      proposal(ProposalStatus.Pending),
      proposal(ProposalStatus.Pending),
      proposal(ProposalStatus.Accepted),
      proposal(ProposalStatus.Rejected),
      proposal(ProposalStatus.Shortlisted),
    ]);

    expect(result).toEqual({ pending: 2, accepted: 1, rejected: 1 });
  });

  it('counts milestones that still require work or a client decision', () => {
    const result = countMilestonesAwaitingCompletion([
      milestone(MilestoneStatus.Pending),
      milestone(MilestoneStatus.InProgress),
      milestone(MilestoneStatus.Submitted),
      milestone(MilestoneStatus.Disputed),
      milestone(MilestoneStatus.Approved),
      milestone(MilestoneStatus.Completed),
      milestone(MilestoneStatus.Cancelled),
    ]);

    expect(result).toBe(4);
  });

  it('counts actionable contract stages in the delivery pipeline', () => {
    const result = countContractPipelineStatuses([
      contract(ContractStatus.PendingSignature),
      contract(ContractStatus.PendingSignature),
      contract(ContractStatus.PendingEscrow),
      contract(ContractStatus.Active),
      contract(ContractStatus.Completed),
    ]);

    expect(result).toEqual({ pendingSignature: 2, pendingEscrow: 1, active: 1 });
  });
});
