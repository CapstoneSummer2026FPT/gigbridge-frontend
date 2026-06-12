import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';

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

export interface PayOsTopUpCallbackRequest {
  orderCode?: number;
  success?: boolean;
  code?: string;
  desc?: string;
  gatewayTransactionCode?: string;
  amountVnd?: number;
  signature?: string;
  data?: {
    orderCode?: number;
    amount?: number;
    reference?: string;
    paymentLinkId?: string;
    code?: string;
    desc?: string;
  };
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
   * POST /api/wallet/top-ups/payos/callback
   * Development mock callback for confirming a PayOS wallet top-up.
   */
  confirmPayOsTopUp: async (payload: PayOsTopUpCallbackRequest): Promise<ApiResponse<unknown>> => {
    return apiService.post<unknown>('wallet/top-ups/payos/callback', payload);
  },
};
