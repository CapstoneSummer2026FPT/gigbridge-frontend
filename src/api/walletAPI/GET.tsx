import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';

export interface WalletResponse {
  walletId: string;
  userId: string;
  availableTokens: number;
  heldTokens: number;
  availableVnd: number;
  heldVnd: number;
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

export const walletGetAPI = {
  /**
   * GET /api/wallet
   * Get the current user's wallet balances.
   */
  getMyWallet: async (): Promise<ApiResponse<WalletResponse>> => {
    return apiService.get<WalletResponse>('wallet');
  },

  /**
   * GET /api/wallet/transactions
   * Get wallet transaction history.
   */
  getTransactions: async (limit: number = 50): Promise<ApiResponse<WalletTransactionResponse[]>> => {
    return apiService.get<WalletTransactionResponse[]>('wallet/transactions', { limit });
  },
};
