import type { ProposalViewModel } from '../types';

export const getStatusLabel = (status: ProposalViewModel['status'] | string | null | undefined) => {
  const normalizedStatus = Number(status ?? 0);
  if (normalizedStatus === 0) return 'Pending';
  if (normalizedStatus === 1) return 'Shortlisted';
  if (normalizedStatus === 2) return 'Accepted';
  if (normalizedStatus === 3) return 'Rejected';
  if (normalizedStatus === 4) return 'Withdrawn';
  return 'Pending';
};

export const getStatusClass = (status: ProposalViewModel['status'] | string | null | undefined) => {
  const label = getStatusLabel(status).toLowerCase();
  if (label === 'shortlisted') return 'proposal-status proposal-status-shortlisted';
  if (label === 'accepted') return 'proposal-status proposal-status-accepted';
  if (label === 'rejected') return 'proposal-status proposal-status-rejected';
  if (label === 'withdrawn') return 'proposal-status proposal-status-withdrawn';
  return 'proposal-status proposal-status-pending';
};
