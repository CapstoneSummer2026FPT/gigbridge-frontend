import { useEffect, useState } from 'react';
import { adminAnalyticsAPI } from '../../../api/adminAnalyticsAPI';
import type {
  AnalyticsKpi,
  AnalyticsPeriod,
  AnalyticsSeriesPoint,
  AnalyticsTab,
  MarketplaceAnalyticsResponse,
  TransactionFilters,
} from '../../../types/adminAnalytics';

export const CHART_COLORS = [
  '#494be7', // Brand Violet
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#8b5cf6', // Purple
  '#ef4444', // Rose/Red
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#3b82f6', // Blue
  '#6366f1', // Indigo
];

export const ANALYTICS_TABS: AnalyticsTab[] = ['revenue', 'transactions', 'premium', 'market'];
export const ANALYTICS_PERIODS: AnalyticsPeriod[] = ['month', 'quarter', 'year', 'custom'];
export const TABLE_PAGE_SIZE = 8;
export const SOURCE_VISIBILITY_KEY = 'gigbridge.adminAnalytics.hiddenRevenueSources';

export type RevenueScope = 'all' | 'job' | 'premium';
export type PromotionRoleFilter = 'all' | 'Client' | 'Freelancer';
export type OpportunityMode = 'skill' | 'query';
export type OpportunityItem = MarketplaceAnalyticsResponse['opportunities'][number];
export type OpportunityPoint = OpportunityItem & { x: number; y: number; z: number };

export const JOB_REVENUE_SOURCES = new Set([
  'ContractFundingFee',
  'ContractReleaseFee',
  'JobPromotionPurchase',
  'PromotionBoost',
]);

export const PREMIUM_REVENUE_SOURCES = new Set([
  'SubscriptionPurchase',
  'JobPromotionPurchase',
  'ProfilePromotionPurchase',
  'PromotionBoost',
]);

export const TAB_LABELS: Record<AnalyticsTab, string> = {
  revenue: 'Platform Revenue',
  transactions: 'Wallet Transactions',
  premium: 'Premium & Promotions',
  market: 'Marketplace Discovery',
};

export const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  month: 'This Month',
  quarter: 'This Quarter',
  year: 'This Year',
  custom: 'Custom Range',
};

export const KPI_LABELS: Record<string, string> = {
  grossRevenue: 'Gross Platform Revenue',
  revenueGrowth: 'Revenue Growth',
  contractTakeRate: 'Contract Take Rate',
  marketplaceGmv: 'Marketplace GMV',
  netCashMovement: 'Net Cash Movement',
  premiumRevenue: 'Premium Revenue',
  activePaidUsers: 'Active Paid Users',
  paidFeatureUsers: 'Paid Feature Users',
  promotionCtr: 'Promotion CTR',
  totalDisputePenalties: 'Total Dispute Penalties',
  views: 'Total Views',
  saves: 'Job Saves',
  proposals: 'Proposals Submitted',
  contracts: 'Contracts Formed',
};

const moneyFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

export function formatMoney(value: number): string {
  return moneyFormatter.format(value);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatKpi(kpi: AnalyticsKpi): string {
  if (kpi.unit === 'VND') return `${formatMoney(kpi.value)} ₫`;
  if (kpi.unit === 'percent') return `${formatNumber(kpi.value)}%`;
  return `${formatNumber(kpi.value)} ${kpi.unit}`;
}

export function getTabLabel(
  tab: AnalyticsTab,
  t?: (key: string, options?: { defaultValue: string }) => string
): string {
  const fallback = TAB_LABELS[tab] ?? tab;
  if (!t) return fallback;
  const result = t(`adminAnalytics.tabs.${tab}`, { defaultValue: fallback });
  return result && !result.startsWith('adminAnalytics.') ? result : fallback;
}

export function getPeriodLabel(
  period: AnalyticsPeriod,
  t?: (key: string, options?: { defaultValue: string }) => string
): string {
  const fallback = PERIOD_LABELS[period] ?? period;
  if (!t) return fallback;
  const result = t(`adminAnalytics.periods.${period}`, { defaultValue: fallback });
  return result && !result.startsWith('adminAnalytics.') ? result : fallback;
}

export function getKpiLabel(
  key: string,
  t?: (key: string, options?: { defaultValue: string }) => string
): string {
  const fallback =
    KPI_LABELS[key] ??
    key.replace(/([A-Z])/g, ' $1').replace(/^./, value => value.toUpperCase());
  if (!t) return fallback;
  const result = t(`adminAnalytics.kpis.${key}`, { defaultValue: fallback });
  return result && !result.startsWith('adminAnalytics.') ? result : fallback;
}

export function labelFor(
  key: string,
  t?: (key: string, options?: { defaultValue: string }) => string
): string {
  if (key in TAB_LABELS) return getTabLabel(key as AnalyticsTab, t);
  if (key in PERIOD_LABELS) return getPeriodLabel(key as AnalyticsPeriod, t);
  return getKpiLabel(key, t);
}

export function pivot(points: AnalyticsSeriesPoint[]): Array<Record<string, string | number>> {
  const rows = new Map<string, Record<string, string | number>>();
  (points ?? []).forEach(point => {
    const row = rows.get(point.bucket) ?? { bucket: point.bucket };
    row[point.series] = point.value;
    rows.set(point.bucket, row);
  });
  return [...rows.values()].sort((a, b) => String(a.bucket).localeCompare(String(b.bucket)));
}

export function sourceInScope(source: string, scope: RevenueScope): boolean {
  if (scope === 'job') return JOB_REVENUE_SOURCES.has(source);
  if (scope === 'premium') return PREMIUM_REVENUE_SOURCES.has(source);
  return true;
}

export function opportunityMeaning(item: OpportunityItem): string {
  if (item.kind === 'query') {
    return `${item.demand.toLocaleString()} searches produced ${formatNumber(item.resultCount)} results on average.`;
  }
  if (item.supply === 0) {
    return `${item.demand.toLocaleString()} open jobs currently have no matching available freelancer.`;
  }
  return `${item.demand.toLocaleString()} open jobs compete for ${item.supply.toLocaleString()} available freelancers.`;
}

export async function exportTransactionsCsv(
  filters: TransactionFilters,
  anchor: string
): Promise<{ success: boolean; message?: string }> {
  const response = await adminAnalyticsAPI.exportTransactions(filters);
  if (!response.success || !response.data) {
    return { success: false, message: response.message || 'CSV export failed.' };
  }
  const url = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = `platform-transactions-${anchor}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  return { success: true };
}

export function useTablePage(itemCount: number, pageSize = TABLE_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(itemCount / pageSize));

  useEffect(() => {
    setPage(current => Math.min(current, pageCount));
  }, [pageCount]);

  return {
    page,
    pageCount,
    setPage,
    from: (page - 1) * pageSize,
    to: Math.min(page * pageSize, itemCount),
  };
}
