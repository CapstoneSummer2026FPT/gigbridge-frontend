import { apiService } from '../../service/apiService';
import { walletGetAPI } from '../../api/walletAPI';
import type {
  PremiumPoints, PremiumSubscription, Promotion, PromotionPackage, RankProtection, SubscriptionPlan,
} from './types';

const subscriptions = 'freelancer/subscriptions';
const premium = 'freelancer/premium';

export const premiumAPI = {
  plans: () => apiService.get<SubscriptionPlan[]>(`${subscriptions}/plans`),
  currentSubscription: () => apiService.get<PremiumSubscription | null>(`${subscriptions}/current`),
  subscriptionHistory: () => apiService.get<PremiumSubscription[]>(`${subscriptions}/history`),
  cancelSubscription: () => apiService.post<PremiumSubscription>(`${subscriptions}/cancel`),
  points: () => apiService.get<PremiumPoints>(`${premium}/points`),
  rankProtection: () => apiService.get<RankProtection | null>(`${premium}/rank-protection`),
  activateRankProtection: (endsAt: string, reason?: string) =>
    apiService.post<RankProtection>(`${premium}/rank-protection/activate`, { endsAt, reason }),
  cancelRankProtection: () =>
    apiService.post<RankProtection>(`${premium}/rank-protection/cancel`),
  promotionPackages: () => apiService.get<PromotionPackage[]>(`${premium}/promotions/packages`),
  currentPromotion: () => apiService.get<Promotion | null>(`${premium}/promotions/current`),
  promotionHistory: () => apiService.get<Promotion[]>(`${premium}/promotions/history`),
  purchasePromotion: (packageId: string, idempotencyKey: string) =>
    apiService.post<Promotion>(`${premium}/promotions`, { packageId, idempotencyKey }),
  wallet: walletGetAPI.getMyWallet,
  walletTransactions: () => walletGetAPI.getTransactions(100),
};

