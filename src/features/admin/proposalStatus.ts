import { ContractStatus } from '../../types/models/Contract';
import { ProposalStatus } from '../../types/models/Proposal';

export const lifecycleLabels: Record<number, string> = {
  [ProposalStatus.Draft]: 'Draft', [ProposalStatus.Pending]: 'Pending', [ProposalStatus.Shortlisted]: 'Shortlisted',
  [ProposalStatus.Accepted]: 'Accepted', [ProposalStatus.Rejected]: 'Rejected', [ProposalStatus.Withdrawn]: 'Withdrawn',
};
export const moderationLabels: Record<number, string> = { 0: 'Active', 1: 'Invalidated' };
export const aiAttemptLabels: Record<number, string> = { 0: 'In Progress', 1: 'Completed', 2: 'Failed' };
export const aiDefinitionLabels: Record<number, string> = { 0: 'Awaiting Capability', 1: 'Active', 2: 'Closed' };
export const negotiationLabels: Record<number, string> = { 0: 'Pending Confirmation', 1: 'Accepted', 2: 'Rejected', 3: 'Change Requested', 4: 'Expired', 5: 'Cancelled' };
export const contractLabels: Record<number, string> = Object.fromEntries(Object.entries(ContractStatus).filter(([key]) => Number.isNaN(Number(key))).map(([key, value]) => [Number(value), key.replace(/([a-z])([A-Z])/g, '$1 $2')]));

export const statusLabel = (labels: Record<number, string>, value: number | null | undefined) => value === null || value === undefined ? 'Not available' : labels[value] || 'Unknown status';
export const statusTone = (value: string) => /active|accepted|completed/i.test(value) ? 'success' : /invalid|failed|rejected|cancelled|disputed|banned/i.test(value) ? 'danger' : 'warning';

