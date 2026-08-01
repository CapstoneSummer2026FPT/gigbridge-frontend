import { describe, expect, it } from 'vitest';
import { ContractStatus, MilestoneStatus } from '../../types/models/Contract';
import { getEarlyWithdrawalEligibility } from './earlyWithdrawal';

const milestone = (
  status: MilestoneStatus | string,
  amount = 100,
  releasedAmount = 0,
) => ({ status, amount, releasedAmount });

describe('getEarlyWithdrawalEligibility', () => {
  it('requires approval of at least half the milestones, rounded up', () => {
    const milestones = [
      milestone(MilestoneStatus.Approved),
      milestone(MilestoneStatus.Approved),
      milestone(MilestoneStatus.Pending),
      milestone(MilestoneStatus.Pending),
      milestone(MilestoneStatus.Pending),
    ];

    const result = getEarlyWithdrawalEligibility(
      milestones,
      milestones[0],
      ContractStatus.Active,
      true,
    );

    expect(result.requiredApprovedMilestones).toBe(3);
    expect(result.approvedMilestones).toBe(2);
    expect(result.meetsApprovalThreshold).toBe(false);
    expect(result.canWithdraw).toBe(false);
  });

  it('rounds the 80% cap and remaining amount to two decimal places', () => {
    const milestones = [milestone('approved', 100.01, 20)];
    const result = getEarlyWithdrawalEligibility(milestones, milestones[0], ContractStatus.Active, true);

    expect(result.releaseCap).toBe(80.01);
    expect(result.availableAmount).toBe(60.01);
    expect(result.canWithdraw).toBe(true);
  });

  it('recognizes legacy releases at the 80% cap and prevents another withdrawal', () => {
    const milestones = [milestone(MilestoneStatus.PaymentConfirmed, 100, 80)];
    const result = getEarlyWithdrawalEligibility(milestones, milestones[0], ContractStatus.Active, true);

    expect(result.isApproved).toBe(true);
    expect(result.isAtCap).toBe(true);
    expect(result.availableAmount).toBe(0);
    expect(result.canWithdraw).toBe(false);
  });

  it('rejects non-freelancers and inactive contracts', () => {
    const milestones = [milestone(MilestoneStatus.Approved)];

    expect(getEarlyWithdrawalEligibility(milestones, milestones[0], ContractStatus.Completed, true).canWithdraw)
      .toBe(false);
    expect(getEarlyWithdrawalEligibility(milestones, milestones[0], ContractStatus.Active, false).canWithdraw)
      .toBe(false);
  });
});
