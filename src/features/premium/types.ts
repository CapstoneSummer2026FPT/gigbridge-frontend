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
}

export interface PremiumSubscription {
  id: string;
  planId: string;
  planName: string;
  status: PremiumSubscriptionStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
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
}

