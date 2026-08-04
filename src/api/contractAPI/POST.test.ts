import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiService } from '../../service/apiService';
import { contractPostAPI } from './POST';

vi.mock('../../service/apiService', () => ({
  apiService: { post: vi.fn() },
}));

vi.mock('./GET', () => ({
  normalizeMilestone: vi.fn(value => value),
}));

describe('contractPostAPI.withdrawMilestone', () => {
  beforeEach(() => vi.clearAllMocks());

  it('posts to the milestone early-withdrawal endpoint and returns its response', async () => {
    const response = {
      success: true,
      statusCode: 200,
      message: 'Released',
      data: {
        contractId: 'contract-1',
        milestoneId: 'milestone-1',
        escrowId: 'escrow-1',
        releasedAmountVnd: 80,
        releasedTokens: 80,
        milestoneReleasedAmountVnd: 80,
        escrowReleasedAmountVnd: 80,
        escrowStatus: 1,
      },
    };
    vi.mocked(apiService.post).mockResolvedValue(response);

    await expect(contractPostAPI.withdrawMilestone('contract-1', 'milestone-1')).resolves.toEqual(response);
    expect(apiService.post).toHaveBeenCalledWith(
      'contracts/contract-1/milestones/milestone-1/withdraw'
    );
  });
});
