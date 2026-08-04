import type { ProposalViewModel } from '../../../types/models/Proposal';
import { ProposalStatus } from '../../../types/models/Proposal';

export const getStatusLabel = (status: ProposalViewModel['status'] | string | null | undefined) => {
  const normalizedStatus = Number(status ?? 0);
  if (normalizedStatus === ProposalStatus.Draft) return 'Draft';
  if (normalizedStatus === ProposalStatus.Pending) return 'Pending';
  if (normalizedStatus === ProposalStatus.Shortlisted) return 'Shortlisted';
  if (normalizedStatus === ProposalStatus.Accepted) return 'Accepted';
  if (normalizedStatus === ProposalStatus.Rejected) return 'Rejected';
  if (normalizedStatus === ProposalStatus.Withdrawn) return 'Withdrawn';
  return 'Unknown';
};

export const canWithdrawProposal = (status: number | string | null | undefined) => {
  const value = Number(status);
  return value === ProposalStatus.Pending;
};

export const canEditProposal = (status: number | string | null | undefined) =>
  Number(status) === ProposalStatus.Draft;

export const canViewProposalAnswers = (status: number | string | null | undefined) =>
  Number.isFinite(Number(status));
