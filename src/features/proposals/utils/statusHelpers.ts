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

type ProposalStatusInput = ProposalViewModel['status'] | number | string | null | undefined;

export const canSubmitDraftProposal = (status: ProposalStatusInput) =>
  Number(status) === ProposalStatus.Draft;

export const canWithdrawProposal = (status: ProposalStatusInput) => {
  const normalizedStatus = Number(status);
  return normalizedStatus === ProposalStatus.Pending || normalizedStatus === ProposalStatus.Shortlisted;
};

export const canEditProposal = (status: ProposalStatusInput) =>
  Number(status) === ProposalStatus.Draft;

export const canViewContract = (status: ProposalStatusInput) =>
  Number(status) === ProposalStatus.Accepted;

export const canViewProposalAnswers = (status: ProposalStatusInput) =>
  Number.isFinite(Number(status));

export const getStatusLabel = (status: ProposalStatusInput) => {
  const normalizedStatus = Number(status);
  if (normalizedStatus in proposalStatusLabels) {
    return proposalStatusLabels[normalizedStatus as ProposalStatus];
  }

  return 'Pending';
};

export const getStatusClass = (status: ProposalStatusInput) => {
  const label = getStatusLabel(status).toLowerCase();
  if (label === 'draft') return 'proposal-status proposal-status-draft';
  if (label === 'shortlisted') return 'proposal-status proposal-status-shortlisted';
  if (label === 'accepted') return 'proposal-status proposal-status-accepted';
  if (label === 'rejected') return 'proposal-status proposal-status-rejected';
  if (label === 'withdrawn') return 'proposal-status proposal-status-withdrawn';
  return 'proposal-status proposal-status-pending';
};