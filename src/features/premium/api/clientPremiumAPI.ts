import { apiService } from '../../../service/apiService';
import { walletGetAPI } from '../../../api/walletAPI';
import type { PremiumSubscription, SubscriptionPlan } from '../types';

const subscriptions = 'client/subscriptions';

export const clientPremiumAPI = {
  plans: () => apiService.get<SubscriptionPlan[]>(`${subscriptions}/plans`),
  currentSubscription: () => apiService.get<PremiumSubscription | null>(`${subscriptions}/current`),
  purchaseSubscription: (planId: string, idempotencyKey: string) =>
    apiService.post<PremiumSubscription>(`${subscriptions}/purchase`, { planId, idempotencyKey }),
  wallet: walletGetAPI.getMyWallet,
};
