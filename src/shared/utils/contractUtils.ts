import { ContractStatus, MilestoneStatus } from '../../types/models/Contract';

import { formatGigCoin } from './gigcoin';
/**
 * Get human-readable status label for contract status enum
 */
export const getContractStatusLabel = (
  status: ContractStatus | number,
  t?: (key: string, options?: any) => string
): string => {
  if (t) {
    switch (Number(status)) {
      case ContractStatus.Draft:
        return t('contracts.legal.status.draft', { defaultValue: 'Draft' });
      case ContractStatus.PendingFreelancerSelection:
        return t('contracts.pendingFreelancerSelection', { defaultValue: 'Pending Freelancer Selection' });
      case ContractStatus.InNegotiation:
        return t('contracts.inNegotiation', { defaultValue: 'In Negotiation' });
      case ContractStatus.PendingContractDetails:
        return t('contracts.pendingContractDetails', { defaultValue: 'Pending Contract Details' });
      case ContractStatus.PendingContractConfirmation:
        return t('contracts.pendingContractConfirmation', { defaultValue: 'Pending Contract Confirmation' });
      case ContractStatus.PendingEscrow:
        return t('contracts.pendingEscrow', { defaultValue: 'Pending Escrow' });
      case ContractStatus.PendingSignature:
        return t('contracts.pendingSignature', { defaultValue: 'Pending Signature' });
      case ContractStatus.Active:
        return t('contracts.active', { defaultValue: 'Active' });
      case ContractStatus.Completed:
        return t('contracts.completed', { defaultValue: 'Completed' });
      case ContractStatus.Cancelled:
        return t('contracts.statusLabels.cancelled', { defaultValue: 'Cancelled' });
      case ContractStatus.Disputed:
        return t('contracts.disputeTerms', { defaultValue: 'Disputed' });
      default:
        return t('common.unknown', { defaultValue: 'Unknown' });
    }
  }

  const statusMap: Record<number, string> = {
    0: 'Draft',
    1: 'Pending Freelancer Selection',
    2: 'In Negotiation',
    3: 'Pending Contract Details',
    4: 'Pending Contract Confirmation',
    5: 'Pending Escrow',
    6: 'Pending Signature',
    7: 'Active',
    8: 'Completed',
    9: 'Cancelled',
    10: 'Disputed',
  };
  return statusMap[status] || 'Unknown';
};

/**
 * Get CSS class for contract status
 */
export const getContractStatusClass = (status: ContractStatus | number): string => {
  const statusMap: Record<number, string> = {
    0: 'contract-status-draft',
    1: 'contract-status-pending',
    2: 'contract-status-pending',
    3: 'contract-status-pending',
    4: 'contract-status-pending',
    5: 'contract-status-pending',
    6: 'contract-status-pending-signature',
    7: 'contract-status-active',
    8: 'contract-status-completed',
    9: 'contract-status-cancelled',
    10: 'contract-status-disputed',
  };
  return `contract-status ${statusMap[status] || 'contract-status-unknown'}`;
};

/**
 * Format contract details for display
 */
export const formatContractAmount = (amount: number): string => formatGigCoin(amount);

/**
 * Format date for contract display
 */
export const formatContractDate = (date: string | Date | null | undefined): string => {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

export const getMilestoneStatusLabel = (status: MilestoneStatus | number): string => {
  const statusMap: Record<number, string> = {
    0: 'Pending',
    1: 'In Progress',
    2: 'Submitted',
    3: 'Approved',
    4: 'Payment Proof Uploaded',
    5: 'Payment Confirmed',
    6: 'Disputed',
    7: 'Cancelled',
    8: 'Completed',
  };
  return statusMap[status] || 'Unknown';
};

/**
 * Get CSS class for milestone status
 */
export const getMilestoneStatusClass = (status: MilestoneStatus | number): string => {
  const statusMap: Record<number, string> = {
    0: 'milestone-status-pending',
    1: 'milestone-status-in-progress',
    2: 'milestone-status-submitted',
    3: 'milestone-status-approved',
    4: 'milestone-status-proof-uploaded',
    5: 'milestone-status-confirmed',
    6: 'milestone-status-disputed',
    7: 'milestone-status-cancelled',
    8: 'milestone-status-completed',
  };
  return `milestone-status ${statusMap[status] || 'milestone-status-unknown'}`;
};

/**
 * Calculate milestone completion percentage
 */
export const calculateMilestoneCompletion = (status: MilestoneStatus | number): number => {
  const completionMap: Record<number, number> = {
    0: 0,    // Pending
    1: 25,   // In Progress
    2: 50,   // Submitted
    3: 100,  // Approved
    4: 100,  // Deprecated legacy payment state, normalized to Approved
    5: 100,  // Deprecated legacy payment state, normalized to Approved
    6: 80,   // Disputed
    8: 100,  // Completed
  };
  return completionMap[status] || 0;
};

export const canEditMilestone = (status: MilestoneStatus | number): boolean => {
  return status === MilestoneStatus.Pending;
};

export const canSubmitMilestoneDeliverable = (status: MilestoneStatus | number): boolean => {
  return status === MilestoneStatus.InProgress;
};

export const canApproveMilestone = (status: MilestoneStatus | number): boolean => {
  return status === MilestoneStatus.Submitted;
};
