import type { ContractStatus, PaymentType, MilestoneStatus } from '../../types/models/Contract';

/**
 * Get human-readable status label for contract status enum
 */
export const getContractStatusLabel = (status: ContractStatus | number): string => {
  const statusMap: Record<number, string> = {
    [-1]: 'Draft',
    0: 'Active',
    1: 'Completed',
    2: 'Cancelled',
    3: 'Disputed',
    4: 'Pending Signature',
  };
  return statusMap[status] || 'Unknown';
};

/**
 * Get CSS class for contract status
 */
export const getContractStatusClass = (status: ContractStatus | number): string => {
  const statusMap: Record<number, string> = {
    [-1]: 'contract-status-draft',
    0: 'contract-status-active',
    1: 'contract-status-completed',
    2: 'contract-status-cancelled',
    3: 'contract-status-disputed',
    4: 'contract-status-pending-signature',
  };
  return `contract-status ${statusMap[status] || 'contract-status-unknown'}`;
};

/**
 * Get human-readable label for payment type
 */
export const getPaymentTypeLabel = (paymentType: PaymentType | number): string => {
  const typeMap: Record<number, string> = {
    0: 'Fixed Price',
    1: 'Hourly Rate',
  };
  return typeMap[paymentType] || 'Unknown';
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
export const formatContractAmount = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

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
  paymentType: PaymentType | number;
}): string => {
  const duration = data.endDate ? calculateContractDuration(data.startDate, data.endDate) : 0;
  const paymentLabel = getPaymentTypeLabel(data.paymentType);

  return `Contract: ${data.title}
Client: ${data.clientName}
Freelancer: ${data.freelancerName}
Amount: ${formatContractAmount(data.amount)} (${paymentLabel})
Duration: ${duration} days
Start Date: ${formatContractDate(data.startDate)}
${data.endDate ? `End Date: ${formatContractDate(data.endDate)}` : ''}`;
};

/**
 * Check if contract can be modified
 */
export const canModifyContract = (status: ContractStatus | number): boolean => {
  return status === -1 || status === 4 || status === 0;
};

/**
 * Check if contract can be cancelled
 */
export const canCancelContract = (status: ContractStatus | number): boolean => {
  return status === -1 || status === 4 || status === 0;
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


/**
 * Get human-readable label for milestone status
 */
export const getMilestoneStatusLabel = (status: MilestoneStatus | number): string => {
  const statusMap: Record<number, string> = {
    0: 'Pending',
    1: 'Approved',
    2: 'Paid',
    3: 'Not Started',
    4: 'In Progress',
    5: 'Submitted for Review',
    6: 'Revision Required',
  };
  return statusMap[status] || 'Unknown';
};

/**
 * Get CSS class for milestone status
 */
export const getMilestoneStatusClass = (status: MilestoneStatus | number): string => {
  const statusMap: Record<number, string> = {
    0: 'milestone-status-pending',
    1: 'milestone-status-approved',
    2: 'milestone-status-paid',
    3: 'milestone-status-not-started',
    4: 'milestone-status-in-progress',
    5: 'milestone-status-submitted',
    6: 'milestone-status-revision',
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
    1: 50,   // Approved
    2: 100,  // Paid
    3: 0,    // Not Started
    4: 45,   // In Progress
    5: 80,   // Submitted for Review
    6: 55,   // Revision Required
  };
  return completionMap[status] || 0;
};

export const canEditMilestone = (status: MilestoneStatus | number): boolean => {
  return status === MilestoneStatus.NotStarted || status === MilestoneStatus.Pending;
};

export const canSubmitMilestoneDeliverable = (status: MilestoneStatus | number): boolean => {
  return (
    status === MilestoneStatus.Pending ||
    status === MilestoneStatus.InProgress ||
    status === MilestoneStatus.RevisionRequired
  );
};

export const canApproveMilestone = (status: MilestoneStatus | number): boolean => {
  return status === MilestoneStatus.SubmittedForReview || status === MilestoneStatus.Pending;
};
