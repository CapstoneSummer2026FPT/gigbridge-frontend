import { apiService } from '../service/apiService';
import type {
  AdminTransactionPage,
  AnalyticsRangeParams,
  FinanceAnalyticsResponse,
  MarketplaceAnalyticsResponse,
  PremiumAnalyticsResponse,
  TransactionFilters,
} from '../types/adminAnalytics';

const base = 'admin/analytics';

export const adminAnalyticsAPI = {
  finance: (range: AnalyticsRangeParams) => apiService.get<FinanceAnalyticsResponse>(`${base}/finance`, range),
  premium: (range: AnalyticsRangeParams) => apiService.get<PremiumAnalyticsResponse>(`${base}/premium`, range),
  transactions: (filters: TransactionFilters) => apiService.get<AdminTransactionPage>(`${base}/transactions`, filters),
  marketplace: (range: AnalyticsRangeParams) => apiService.get<MarketplaceAnalyticsResponse>(`${base}/marketplace`, range),
  exportTransactions: (filters: TransactionFilters) => apiService.download(`${base}/transactions/export`, filters),
};
