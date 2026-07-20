import { apiService } from '../../../service/apiService';
import { walletGetAPI } from '../../../api/walletAPI';
import type {
  PremiumPoints, PremiumSubscription, Promotion, PromotionPackage, RankProtection, SubscriptionPlan,
  PromotionDraft, PromotionManager, PromotionCardInput, PublicPromotionCard, PromotionInteractionResult,
} from '../types/premium';

const subscriptions = 'freelancer/subscriptions';
const clientSubscriptions = 'client/subscriptions';
const premium = 'freelancer/premium';

export const premiumAPI = {
  plans: () => apiService.get<SubscriptionPlan[]>(`${subscriptions}/plans`),
  currentSubscription: () => apiService.get<PremiumSubscription | null>(`${subscriptions}/current`),
  subscriptionHistory: () => apiService.get<PremiumSubscription[]>(`${subscriptions}/history`),
  cancelSubscription: () => apiService.post<PremiumSubscription>(`${subscriptions}/cancel`),
  updateAutoRenew: (autoRenew: boolean) =>
    apiService.put<PremiumSubscription>(`${subscriptions}/auto-renew`, { autoRenew }),
  purchaseSubscription: (planId: string, idempotencyKey: string) =>
    apiService.post<PremiumSubscription>(`${subscriptions}/purchase`, { planId, idempotencyKey }),
  points: () => apiService.get<PremiumPoints>(`${premium}/points`),
  rankProtection: () => apiService.get<RankProtection | null>(`${premium}/rank-protection`),
  activateRankProtection: (endsAt: string, reason?: string) =>
    apiService.post<RankProtection>(`${premium}/rank-protection/activate`, { endsAt, reason }),
  cancelRankProtection: () =>
    apiService.post<RankProtection>(`${premium}/rank-protection/cancel`),
  promotionPackages: () => apiService.get<PromotionPackage[]>(`${premium}/promotions/packages`),
  currentPromotion: () => apiService.get<Promotion | null>(`${premium}/promotions/current`),
  promotionHistory: () => apiService.get<Promotion[]>(`${premium}/promotions/history`),
  promotionDraft: () => apiService.get<PromotionDraft>(`${premium}/promotions/draft`),
  promotionManager: () => apiService.get<PromotionManager>(`${premium}/promotions/manager`),
  purchasePromotion: (tokenAmount: number, idempotencyKey: string, card: PromotionCardInput) =>
    apiService.post<Promotion>(`${premium}/promotions`, { tokenAmount, idempotencyKey, ...card }),
  boostPromotion: (promotionId: string, tokenAmount: number, idempotencyKey: string) =>
    apiService.post<Promotion>(`${premium}/promotions/${promotionId}/boost`, { tokenAmount, idempotencyKey }),
  promotionFeed: (limit?: number) => apiService.get<PublicPromotionCard[]>('promotions/feed', limit ? { limit } : {}),
  trackPromotionImpression: (promotionId: string, visitorKey: string) =>
    apiService.post<PromotionInteractionResult>(`promotions/${promotionId}/impression`, {}, { 'X-Promotion-Visitor': visitorKey }),
  trackPromotionClick: (promotionId: string, visitorKey: string) =>
    apiService.post<PromotionInteractionResult>(`promotions/${promotionId}/click`, {}, { 'X-Promotion-Visitor': visitorKey }),
  uploadPromotionPhoto: (file: File) => {
    const form = new FormData(); form.append('file', file);
    return apiService.post<string>(`${premium}/promotions/photo`, form);
  },
  wallet: walletGetAPI.getMyWallet,
  walletTransactions: () => walletGetAPI.getTransactions(100),
};

export const clientPremiumAPI = {
  plans: () => apiService.get<SubscriptionPlan[]>(`${clientSubscriptions}/plans`),
  currentSubscription: () => apiService.get<PremiumSubscription | null>(`${clientSubscriptions}/current`),
  subscriptionHistory: () => apiService.get<PremiumSubscription[]>(`${clientSubscriptions}/history`),
  cancelSubscription: () => apiService.post<PremiumSubscription>(`${clientSubscriptions}/cancel`),
  updateAutoRenew: (autoRenew: boolean) =>
    apiService.put<PremiumSubscription>(`${clientSubscriptions}/auto-renew`, { autoRenew }),
  purchaseSubscription: (planId: string, idempotencyKey: string) =>
    apiService.post<PremiumSubscription>(`${clientSubscriptions}/purchase`, { planId, idempotencyKey }),
  wallet: walletGetAPI.getMyWallet,
};

