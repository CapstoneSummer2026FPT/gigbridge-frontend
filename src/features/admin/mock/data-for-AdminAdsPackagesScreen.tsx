export type AdPosition = 'home_hero' | 'browse_jobs_top' | 'sidebar' | 'dashboard_top';
export type AdStatus = 'active' | 'draft' | 'expired';

export interface AdminAdBannerRecord {
  id: string;
  title: string;
  imageName: string;
  imageUrl: string;
  targetUrl: string;
  position: AdPosition;
  durationDays: number;
  status: AdStatus;
  startsAt: string;
  endsAt: string;
}

export interface AdminSubscriptionPackageRecord {
  id: string;
  name: string;
  priceVnd: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  isActive: boolean;
}

export interface AdminTokenExchangeRecord {
  id: string;
  tokenName: string;
  vndPerToken: number;
  minimumPurchase: number;
  updatedAt: string;
}

export const ADMIN_AD_BANNERS: AdminAdBannerRecord[] = [
  {
    id: 'ad_001',
    title: 'Premium Freelancer Boost',
    imageName: 'premium-boost.png',
    imageUrl: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=900&auto=format&fit=crop',
    targetUrl: 'https://gigbridge.local/subscription',
    position: 'home_hero',
    durationDays: 21,
    status: 'active',
    startsAt: '2026-06-01',
    endsAt: '2026-06-22',
  },
  {
    id: 'ad_002',
    title: 'Client Hiring Campaign',
    imageName: 'client-hiring.jpg',
    imageUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=900&auto=format&fit=crop',
    targetUrl: 'https://gigbridge.local/jobs/post',
    position: 'dashboard_top',
    durationDays: 14,
    status: 'draft',
    startsAt: '2026-06-05',
    endsAt: '2026-06-19',
  },
  {
    id: 'ad_003',
    title: 'GigCoin Wallet Promo',
    imageName: 'gigcoin-wallet.png',
    imageUrl: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=900&auto=format&fit=crop',
    targetUrl: 'https://gigbridge.local/buy-gigcoin',
    position: 'browse_jobs_top',
    durationDays: 10,
    status: 'active',
    startsAt: '2026-05-30',
    endsAt: '2026-06-09',
  },
];

export const ADMIN_SUBSCRIPTION_PACKAGES: AdminSubscriptionPackageRecord[] = [
  {
    id: 'pkg_free',
    name: 'Free',
    priceVnd: 0,
    billingCycle: 'monthly',
    features: ['Browse jobs', 'Basic proposals', 'Standard support'],
    isActive: true,
  },
  {
    id: 'pkg_pro_monthly',
    name: 'Pro Monthly',
    priceVnd: 750000,
    billingCycle: 'monthly',
    features: ['AI proposal generator', 'Boost bid proposal', 'Competitor bid matrix'],
    isActive: true,
  },
  {
    id: 'pkg_pro_yearly',
    name: 'Pro Yearly',
    priceVnd: 7500000,
    billingCycle: 'yearly',
    features: ['All Pro Monthly features', 'Priority support', 'Lower service fee'],
    isActive: true,
  },
];

export const ADMIN_TOKEN_EXCHANGE: AdminTokenExchangeRecord = {
  id: 'token_gigcoin',
  tokenName: 'GigCoin',
  vndPerToken: 1000,
  minimumPurchase: 10,
  updatedAt: '2026-06-01T10:00:00Z',
};
