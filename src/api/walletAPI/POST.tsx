import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { WalletTransactionResponse } from './GET';

export interface CreateWalletTopUpRequest {
  tokenAmount: number;
  returnUrl?: string;
  cancelUrl?: string;
  idempotencyKey?: string;
}

export interface CreateWalletTopUpResponse {
  walletTransactionId: string;
  tokenAmount: number;
  amountVnd: number;
  gatewayProvider: string;
  gatewayOrderCode: string;
  gatewayTransactionCode?: string | null;
  checkoutUrl?: string | null;
  status: number;
}

export interface SyncPayOsTopUpRequest {
  orderCode: number;
}

export const walletPostAPI = {
  /**
   * POST /api/wallet/top-ups
   * Initialize a wallet top-up (e.g. creating PayOS payment).
   */
  createTopUp: async (payload: CreateWalletTopUpRequest): Promise<ApiResponse<CreateWalletTopUpResponse>> => {
    return apiService.post<CreateWalletTopUpResponse>('wallet/top-ups', payload);
  },

  /**
   * POST /api/wallet/top-ups/payos/sync
   * Sync PayOS status after hosted checkout redirects back to the app.
   */
  syncPayOsTopUp: async (payload: SyncPayOsTopUpRequest): Promise<ApiResponse<WalletTransactionResponse>> => {
    return apiService.post<WalletTransactionResponse>('wallet/top-ups/payos/sync', payload);
  },
};
