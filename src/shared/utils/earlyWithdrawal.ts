import { ContractStatus, MilestoneStatus } from '../../types/models/Contract';

export const EARLY_WITHDRAWAL_PERCENTAGE = 0.8;

export type EarlyWithdrawalMilestoneStatus = MilestoneStatus | string | number;

export interface EarlyWithdrawalMilestone {
  amount: number;
  releasedAmount?: number | null;
  status: EarlyWithdrawalMilestoneStatus;
}

export interface EarlyWithdrawalEligibility {
  totalMilestones: number;
  approvedMilestones: number;
  requiredApprovedMilestones: number;
  meetsApprovalThreshold: boolean;
  releaseCap: number;
  availableAmount: number;
  isApproved: boolean;
  isContractActive: boolean;
  isFreelancer: boolean;
  isAtCap: boolean;
  canWithdraw: boolean;
}

const roundMoney = (amount: number): number => Number(amount.toFixed(2));

export const isApprovedMilestoneStatus = (status: EarlyWithdrawalMilestoneStatus): boolean =>
  status === 'approved' ||
  Number(status) === MilestoneStatus.Approved ||
  Number(status) === MilestoneStatus.PaymentProofUploaded ||
  Number(status) === MilestoneStatus.PaymentConfirmed;

export const getEarlyWithdrawalEligibility = (
  milestones: EarlyWithdrawalMilestone[],
  milestone: EarlyWithdrawalMilestone,
  contractStatus: ContractStatus | number | null | undefined,
  isFreelancer: boolean,
): EarlyWithdrawalEligibility => {
  const totalMilestones = milestones.length;
  const approvedMilestones = milestones.filter(
    item => isApprovedMilestoneStatus(item.status) || Number(item.status) === MilestoneStatus.Completed,
  ).length;
  const requiredApprovedMilestones = Math.ceil(totalMilestones * 0.5);
  const meetsApprovalThreshold = totalMilestones > 0 && approvedMilestones >= requiredApprovedMilestones;
  const releaseCap = roundMoney(Math.max(0, Number(milestone.amount || 0)) * EARLY_WITHDRAWAL_PERCENTAGE);
  const releasedAmount = Math.max(0, Number(milestone.releasedAmount ?? 0));
  const availableAmount = roundMoney(Math.max(0, releaseCap - releasedAmount));
  const isApproved = isApprovedMilestoneStatus(milestone.status);
  const isContractActive = Number(contractStatus) === ContractStatus.Active;
  const isAtCap = availableAmount <= 0;

  return {
    totalMilestones,
    approvedMilestones,
    requiredApprovedMilestones,
    meetsApprovalThreshold,
    releaseCap,
    availableAmount,
    isApproved,
    isContractActive,
    isFreelancer,
    isAtCap,
    canWithdraw: isFreelancer && isContractActive && isApproved && meetsApprovalThreshold && !isAtCap,
  };
};
