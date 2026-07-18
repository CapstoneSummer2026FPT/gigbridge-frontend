import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, post, put } = vi.hoisted(() => ({
  get: vi.fn(), post: vi.fn(), put: vi.fn(),
}));

vi.mock('../../../service/apiService', () => ({
  apiService: { get, post, put },
}));

vi.mock('../../../api/walletAPI', () => ({
  walletGetAPI: { getMyWallet: vi.fn(), getTransactions: vi.fn() },
}));

import { clientPremiumAPI } from './premiumAPI';

describe('client Premium API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the role-specific client subscription pipeline', async () => {
    await clientPremiumAPI.plans();
    await clientPremiumAPI.currentSubscription();
    await clientPremiumAPI.subscriptionHistory();

    expect(get).toHaveBeenNthCalledWith(1, 'client/subscriptions/plans');
    expect(get).toHaveBeenNthCalledWith(2, 'client/subscriptions/current');
    expect(get).toHaveBeenNthCalledWith(3, 'client/subscriptions/history');
  });

  it('preserves cancellation, auto-renew, and idempotent purchase contracts', async () => {
    await clientPremiumAPI.cancelSubscription();
    await clientPremiumAPI.updateAutoRenew(true);
    await clientPremiumAPI.purchaseSubscription('plan-1', 'purchase-1');

    expect(post).toHaveBeenCalledWith('client/subscriptions/cancel');
    expect(put).toHaveBeenCalledWith('client/subscriptions/auto-renew', { autoRenew: true });
    expect(post).toHaveBeenCalledWith('client/subscriptions/purchase', {
      planId: 'plan-1',
      idempotencyKey: 'purchase-1',
    });
  });
});
