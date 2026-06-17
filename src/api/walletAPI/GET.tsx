import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';

const walletUrl = 'wallet';

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
};
