import { ContractStatus, MilestoneStatus } from '../../types/models/Contract';

import { formatGigCoin } from './gigcoin';
/**
 * Get human-readable status label for contract status enum
 */
export const getContractStatusLabel = (status: ContractStatus | number): string => {
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
 * Validate contract form data
 */
export interface ContractValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const validateContractForm = (data: {
  title?: string;
  totalBudget?: number;
  startDate?: string;
  endDate?: string;
}): ContractValidationResult => {
  const errors: Record<string, string> = {};

  if (!data.title || data.title.trim().length < 5) {
    errors.title = 'Title must be at least 5 characters';
  }

  if (data.title && data.title.length > 255) {
    errors.title = 'Title must be at most 255 characters';
  }

  if (!data.totalBudget || data.totalBudget <= 0) {
    errors.totalBudget = 'Budget must be greater than 0';
  }

  if (!data.startDate) {
    errors.startDate = 'Start date is required';
  }

  if (data.endDate && data.startDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);

    if (endDate <= startDate) {
      errors.endDate = 'End date must be after start date';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
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

/**
 * Calculate contract duration in days
 */
export const calculateContractDuration = (startDate: string, endDate?: string): number => {
  if (!endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Generate contract summary text
 */
export const generateContractSummary = (data: {
  title: string;
  freelancerName: string;
  clientName: string;
  amount: number;
  startDate: string;
  endDate?: string;
}): string => {
  const duration = data.endDate ? calculateContractDuration(data.startDate, data.endDate) : 0;

  return `Contract: ${data.title}
Client: ${data.clientName}
Freelancer: ${data.freelancerName}
Amount: ${formatContractAmount(data.amount)} (Fixed Price)
Amount: ${formatContractAmount(data.amount)} (Fixed Price)
Duration: ${duration} days
Start Date: ${formatContractDate(data.startDate)}
${data.endDate ? `End Date: ${formatContractDate(data.endDate)}` : ''}`;
};

/**
 * Check if contract can be modified
 */
export const canModifyContract = (status: ContractStatus | number): boolean => {
  return status === ContractStatus.Draft ||
    status === ContractStatus.PendingContractDetails ||
    status === ContractStatus.PendingContractConfirmation ||
    status === ContractStatus.PendingSignature ||
    status === ContractStatus.Active;
};

/**
 * Check if contract can be cancelled
 */
export const canCancelContract = (status: ContractStatus | number): boolean => {
  return status === ContractStatus.Draft ||
    status === ContractStatus.PendingContractDetails ||
    status === ContractStatus.PendingContractConfirmation ||
    status === ContractStatus.PendingSignature ||
    status === ContractStatus.Active;
};

/**
 * Generate PDF filename based on contract data
 */
export const generatePdfFilename = (contractTitle: string, date: Date = new Date()): string => {
  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const sanitized = contractTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  return `contract_${sanitized}_${dateStr}.pdf`;
};

/**
 * Extract contract ID from URL
 */
export const extractContractIdFromUrl = (url: string): string | null => {
  const match = url.match(/contracts\/([a-f0-9-]+)/i);
  return match ? match[1] : null;
};

/**
 * Check if email is valid
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Generate placeholder signature image (base64 PNG)
 */
export const getPlaceholderSignature = (): string => {
  // Simple placeholder signature (1x1 transparent PNG)
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
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
  };
  return `milestone-status ${statusMap[status] || 'milestone-status-unknown'}`;
};

/**
 * Check if milestone is overdue
 */
export const isMilestoneOverdue = (dueDate: string | Date): boolean => {
  const due = new Date(dueDate);
  return due < new Date();
};

/**
 * Calculate milestone completion percentage
 */
export const calculateMilestoneCompletion = (status: MilestoneStatus | number): number => {
  const completionMap: Record<number, number> = {
    0: 0,    // Pending
    1: 25,   // In Progress
    2: 50,   // Submitted
    3: 75,   // Approved
    4: 90,   // PaymentProofUploaded
    5: 100,  // PaymentConfirmed
    6: 80,   // Disputed
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
