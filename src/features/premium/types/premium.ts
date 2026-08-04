export enum PremiumSubscriptionStatus {
  Active = 0,
  Expired = 1,
  Cancelled = 2,
}

export enum PromotionStatus {
  Pending = 0,
  Active = 1,
  Expired = 2,
  Cancelled = 3,
}

export enum WalletTransactionType {
  AdminCredit = 0,
  TopUp = 1,
  EscrowHold = 2,
  EscrowRelease = 3,
  EscrowRefund = 4,
  Adjustment = 5,
  WithdrawalLock = 6,
  WithdrawalSuccess = 7,
  WithdrawalRefund = 8,
  WithdrawalFee = 9,
  SubscriptionPurchase = 10,
  PromotionPurchase = 11,
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  durationInDays: number;
  features?: string | null;
  sortOrder?: number | null;
  billingPeriod: 'monthly' | 'yearly';
}

export interface PremiumSubscription {
  id: string;
  planId: string;
  planName: string;
  status: PremiumSubscriptionStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  isPremium: boolean;
  cancelledAt?: string | null;
  createdAt: string;
}

export interface EloPointTransaction {
  id: string;
  pointsDelta: number;
  pointsBefore: number;
  pointsAfter: number;
  reason: number;
  sourceEntityType?: string | null;
  createdAt: string;
}

export interface PremiumPoints {
  eloPoints: number;
  isPremium: boolean;
  tierName?: string | null;
  tierThreshold?: number | null;
  nextTierName?: string | null;
  nextTierThreshold?: number | null;
  tierProgress?: number | null;
  recentTransactions: EloPointTransaction[];
}

export interface RankProtection {
  id: string;
  isEnabled: boolean;
  startsAt: string;
  endsAt: string;
  reason?: string | null;
  cancelledAt?: string | null;
}

export interface PromotionPackage {
  id: string;
  name: string;
  description?: string | null;
  durationDays: number;
  tokenPrice: number;
  boostWeight: number;
  maxQueuedCampaigns: number;
  isActive: boolean;
  sortOrder: number;
}

export interface Promotion {
  id: string;
  packageId: string;
  packageName: string;
  tokenCost: number;
  boostWeight: number;
  startsAt: string;
  endsAt: string;
  status: PromotionStatus;
  walletTransactionId: string;
  createdAt: string;
  photoUrl: string;
  displayName: string;
  quote?: string | null;
  showQuote: boolean;
  jobTitle?: string | null;
  showJobTitle: boolean;
  impressionCount: number;
  clickCount: number;
  targetClickCount: number;
  queuePosition: number;
}

export interface PromotionPolicy {
  baseTargetClicks: number;
  targetClicksPerCoin: number;
  boostWeightPerCoin: number;
  minimumBoostCoins: number;
  maximumBoostCoinsPerTransaction: number;
  displayNameMaxLength: number;
  quoteMaxLength: number;
  jobTitleMaxLength: number;
  photoUrlMaxLength: number;
  maximumPhotoBytes: number;
  visitorKeyMaxLength: number;
  defaultFeedLimit: number;
  maximumFeedLimit: number;
  interactionDeduplicationSeconds: number;
  defaultDurationDays: number;
  maxQueuedCampaigns: number;
}

export interface PromotionDraft { photoUrl: string; displayName: string; jobTitle?: string | null; policy: PromotionPolicy; }
export interface PromotionQueueEntry { queuePosition: number; boostWeight: number; isCurrent: boolean; }
export interface PromotionManager { active?: Promotion | null; queued: Promotion[]; history: Promotion[]; policy: PromotionPolicy; availableTokens: number; queue: PromotionQueueEntry[]; }
export interface PromotionCardInput { photoUrl: string; displayName: string; quote?: string; showQuote: boolean; jobTitle?: string; showJobTitle: boolean; }
export interface PublicPromotionCard extends PromotionCardInput { id: string; freelancerUserId: string; }
export interface PromotionInteractionResult { promotionId: string; status: PromotionStatus; clickCount: number; targetClickCount: number; }

