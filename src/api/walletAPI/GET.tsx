import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  FinancialOverviewPeriod,
  FinancialOverviewResponse,
  WalletResponse,
  WalletTransactionResponse,
} from '../../types/models/Financial';

const walletUrl = 'wallet';

export const walletGetAPI = {
  /**
   * GET /api/wallet
   * Fetch the current user's token wallet.
   */
  getMyWallet: async (): Promise<ApiResponse<WalletResponse>> => {
    return apiService.get<WalletResponse>(walletUrl);
  },

  /**
   * GET /api/wallet/transactions
   * Fetch recent wallet transaction history for the current user.
   */
  getTransactions: async (limit = 50): Promise<ApiResponse<WalletTransactionResponse[]>> => {
    return apiService.get<WalletTransactionResponse[]>(`${walletUrl}/transactions`, { limit });
  },

  /**
   * GET /api/wallet/financial-overview
   * Fetch persisted project finance statistics for a rolling period ending now.
   */
  getFinancialOverview: async (
    period: FinancialOverviewPeriod
  ): Promise<ApiResponse<FinancialOverviewResponse>> => {
    return apiService.get<FinancialOverviewResponse>(`${walletUrl}/financial-overview`, { period });
  },
};
