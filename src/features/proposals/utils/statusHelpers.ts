import type { ProposalViewModel } from '../types';
import { ProposalStatus } from '../../../types/models/Proposal';

export const proposalStatusLabels: Record<ProposalStatus, string> = {
  [ProposalStatus.Draft]: 'Draft',
  [ProposalStatus.Pending]: 'Pending',
  [ProposalStatus.Shortlisted]: 'Shortlisted',
  [ProposalStatus.Accepted]: 'Accepted',
  [ProposalStatus.Rejected]: 'Rejected',
  [ProposalStatus.Withdrawn]: 'Withdrawn',
};

export const canWithdrawProposal = (status: ProposalViewModel['status'] | number | null | undefined) => {
  const normalizedStatus = Number(status);
  return normalizedStatus === ProposalStatus.Pending || normalizedStatus === ProposalStatus.Shortlisted;
};

export const canEditProposal = (status: ProposalViewModel['status'] | number | null | undefined) =>
  Number(status) === ProposalStatus.Draft;

export const canViewContract = (status: ProposalViewModel['status'] | number | null | undefined) =>
  Number(status) === ProposalStatus.Accepted;

export const getStatusLabel = (status: ProposalViewModel['status'] | string | null | undefined) => {
  const normalizedStatus = Number(status);
  if (normalizedStatus in proposalStatusLabels) {
    return proposalStatusLabels[normalizedStatus as ProposalStatus];
  }

  return 'Pending';
};

export const getStatusClass = (status: ProposalViewModel['status'] | string | null | undefined) => {
  const label = getStatusLabel(status).toLowerCase();
  if (label === 'draft') return 'proposal-status proposal-status-draft';
  if (label === 'shortlisted') return 'proposal-status proposal-status-shortlisted';
  if (label === 'accepted') return 'proposal-status proposal-status-accepted';
  if (label === 'rejected') return 'proposal-status proposal-status-rejected';
  if (label === 'withdrawn') return 'proposal-status proposal-status-withdrawn';
  return 'proposal-status proposal-status-pending';
};
