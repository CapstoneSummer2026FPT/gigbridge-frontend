import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  BankAccountResponse,
  FinancialOverviewPeriod,
  FinancialOverviewResponse,
  WalletResponse,
  WalletTransactionResponse,
  WalletTransactionsSummaryResponse,
  WithdrawalResponse,
  WithdrawalSettingsResponse,
  SupportedBankResponse,
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
   * GET /api/wallet/transactions/summary
   * Lifetime aggregates (all history, not capped at the 100-item list limit).
   * Drives the /wallet/history stat cards.
   */
  getTransactionsSummary: async (): Promise<ApiResponse<WalletTransactionsSummaryResponse>> => {
    return apiService.get<WalletTransactionsSummaryResponse>(`${walletUrl}/transactions/summary`);
  },

  /**
   * GET /api/wallet/bank-accounts
   * Fetch freelancer bank accounts stored for withdrawals.
   */
  getBankAccounts: async (): Promise<ApiResponse<BankAccountResponse[]>> => {
    return apiService.get<BankAccountResponse[]>(`${walletUrl}/bank-accounts`);
  },

  getWithdrawalSettings: async (): Promise<ApiResponse<WithdrawalSettingsResponse>> => {
    return apiService.get<WithdrawalSettingsResponse>(`${walletUrl}/withdrawal-settings`);
  },

  getSupportedBanks: async (): Promise<ApiResponse<SupportedBankResponse[]>> => {
    return apiService.get<SupportedBankResponse[]>(`${walletUrl}/supported-banks`);
  },

  /**
   * GET /api/wallet/withdrawals
   * Fetch freelancer withdrawal history.
   */
  getWithdrawals: async (limit = 50): Promise<ApiResponse<WithdrawalResponse[]>> => {
    return apiService.get<WithdrawalResponse[]>(`${walletUrl}/withdrawals`, { limit });
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
