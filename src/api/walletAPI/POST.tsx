import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  CreateWalletTopUpRequest,
  CreateWalletTopUpResponse,
  SyncPayOsTopUpRequest,
  WalletTransactionResponse,
} from '../../types/models/Financial';

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
