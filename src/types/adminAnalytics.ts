export type AnalyticsPeriod = 'month' | 'quarter' | 'year' | 'custom';
export type AnalyticsTab = 'revenue' | 'transactions' | 'market';

export interface AnalyticsRangeParams {
  period: AnalyticsPeriod;
  anchor?: string;
  from?: string;
  to?: string;
}

export interface ResolvedAnalyticsRange {
  period: string;
  currentFromUtc: string;
  currentToUtc: string;
  comparisonFromUtc: string;
  comparisonToUtc: string;
  timeZone: string;
  bucketGranularity: string;
}

export interface AnalyticsMeta {
  range: ResolvedAnalyticsRange;
  generatedAt: string;
  availability: {
    collectionStartedAt: string | null;
    backfillCompletedAt: string | null;
    isPartial: boolean;
    note: string | null;
  };
  classifiedSourceCount: number;
  unclassifiedRetainedLookingRows: number;
}

export interface AnalyticsKpi {
  key: string;
  value: number;
  comparisonValue: number;
  changePercent: number | null;
  unit: string;
}

export interface AnalyticsSeriesPoint { bucket: string; series: string; value: number }
export interface AnalyticsBreakdown { key: string; label: string; value: number; count: number }

export interface FinanceAnalyticsResponse {
  meta: AnalyticsMeta;
  kpis: AnalyticsKpi[];
  revenueSources: AnalyticsBreakdown[];
  revenueSeries: AnalyticsSeriesPoint[];
  gmvSeries: AnalyticsSeriesPoint[];
  cashFlowSeries: AnalyticsSeriesPoint[];
  topUpInflowVnd: number;
  withdrawalPayoutVnd: number;
  escrowReleaseCount: number;
}

export interface PremiumAnalyticsResponse {
  meta: AnalyticsMeta;
  kpis: AnalyticsKpi[];
  plans: Array<{ plan: string; role: string; purchases: number; revenueGigCoin: number; revenueVnd: number }>;
  featureAdoption: Array<{ feature: string; events: number; distinctUsers: number; clickThroughRate: number | null }>;
  newPurchases: number;
  renewals: number;
  cancellations: number;
  historicalPromotionImpressions: number;
  historicalPromotionClicks: number;
}

export interface TransactionFilters extends AnalyticsRangeParams {
  userId?: string;
  contractId?: string;
  type?: number;
  status?: number;
  gateway?: string;
  revenueSource?: number;
  cursor?: string;
  pageSize?: number;
}

export interface AdminTransactionItem {
  id: string;
  occurredAt: string;
  userId: string;
  userName: string;
  contractId: string | null;
  contractTitle: string | null;
  type: number;
  typeLabel: string;
  status: number;
  statusLabel: string;
  direction: string;
  gigCoinAmount: number;
  vndAmount: number;
  gateway: string | null;
  reference: string | null;
  note: string | null;
  metadata: string | null;
  revenueSource: string | null;
}

export interface AdminTransactionPage {
  meta: AnalyticsMeta;
  items: AdminTransactionItem[];
  nextCursor: string | null;
  pageSize: number;
  filteredCount: number;
  typeBreakdown: AnalyticsBreakdown[];
  statusBreakdown: AnalyticsBreakdown[];
  countSeries: AnalyticsSeriesPoint[];
}

export interface MarketplaceAnalyticsResponse {
  meta: AnalyticsMeta;
  topSearches: Array<{ query: string; searches: number; distinctActors: number; zeroResultSearches: number; averageResultCount: number; opportunityScore: number }>;
  trendingJobs: Array<{ jobPostId: string; title: string; score: number; uniqueViews: number; saves: number; proposals: number; contracts: number; conversionPercent: number; sparkline: number[] }>;
  funnel: { views: number; saves: number; proposals: number; contracts: number };
  opportunities: Array<{ kind: string; key: string; label: string; score: number; demand: number; supply: number; resultCount: number; proposalCount: number; contractCount: number }>;
}
