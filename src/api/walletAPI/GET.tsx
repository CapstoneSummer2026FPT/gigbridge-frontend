import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  FinancialOverviewPeriod,
  FinancialOverviewResponse,
  WalletResponse,
  WalletTransactionResponse,
} from '../../types/models/Financial';

const walletUrl = 'wallet';

export interface WalletResponse {
  walletId: string;
  userId: string;
  availableTokens: number;
  heldTokens: number;
  pendingWithdrawalTokens: number;
  availableVnd: number;
  heldVnd: number;
  pendingWithdrawalVnd: number;
}

export interface WalletTransactionResponse {
  walletTransactionId: string;
  walletId: string;
  userId: string;
  tokenAmount: number;
  vndAmount: number;
  type: number;
  status: number;
  idempotencyKey?: string | null;
  gatewayProvider?: string | null;
  gatewayOrderCode?: string | null;
  gatewayTransactionCode?: string | null;
  contractId?: string | null;
  contractEscrowId?: string | null;
  note?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export enum WithdrawalStatus {
  Pending = 0,
  Processing = 1,
  SyncRequired = 2,
  Success = 3,
  Failed = 4,
  Cancelled = 5,
}

export enum BankAccountStatus {
  Active = 0,
  Disabled = 1,
}

export interface BankAccountResponse {
  bankAccountId: string;
  userId: string;
  bankCode: string;
  bankName: string;
  accountNumberMasked: string;
  accountName: string;
  status: BankAccountStatus;
  isDefault: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface WithdrawalResponse {
  withdrawalId: string;
  userId: string;
  walletId: string;
  bankAccountId?: string | null;
  bankCode: string;
  bankName: string;
  bankAccountNumberMasked: string;
  bankAccountName: string;
  tokenAmount: number;
  vndAmount: number;
  feeVnd: number;
  netVndAmount: number;
  status: WithdrawalStatus;
  provider: string;
  providerOrderCode: string;
  providerPayoutId?: string | null;
  providerTransactionCode?: string | null;
  providerRawStatus?: string | null;
  failureReason?: string | null;
  lastSyncError?: string | null;
  createdAt: string;
  processingStartedAt?: string | null;
  lastSyncedAt?: string | null;
  completedAt?: string | null;
}

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
