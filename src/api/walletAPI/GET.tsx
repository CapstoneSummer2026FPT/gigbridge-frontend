import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import {
  BankAccountStatus,
  WithdrawalStatus,
} from '../../types/models/Financial';
import type {
  BankAccountResponse,
  FinancialOverviewPeriod,
  FinancialOverviewResponse,
  WalletResponse,
  WalletTransactionResponse,
  WithdrawalResponse,
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
   * GET /api/wallet/bank-accounts
   * Fetch freelancer bank accounts stored for withdrawals.
   */
  getBankAccounts: async (): Promise<ApiResponse<BankAccountResponse[]>> => {
    return apiService.get<BankAccountResponse[]>(`${walletUrl}/bank-accounts`);
  },

  /**
   * GET /api/wallet/withdrawals
   * Fetch freelancer withdrawal history.
   */
  getWithdrawals: async (limit = 50): Promise<ApiResponse<WithdrawalResponse[]>> => {
    return apiService.get<WithdrawalResponse[]>(`${walletUrl}/withdrawals`, { limit });
  },

  /**
   * GET /api/wallet/withdrawals/{id}
   * Fetch one freelancer withdrawal with provider references.
   */
  getWithdrawalDetail: async (withdrawalId: string): Promise<ApiResponse<WithdrawalResponse>> => {
    return apiService.get<WithdrawalResponse>(`${walletUrl}/withdrawals/${withdrawalId}`);
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
