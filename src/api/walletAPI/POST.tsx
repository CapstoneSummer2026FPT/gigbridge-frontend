import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { BankAccountResponse, WalletTransactionResponse, WithdrawalResponse } from './GET';

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

export interface CreateBankAccountRequest {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isDefault?: boolean;
}

export interface UpdateBankAccountRequest {
  bankCode?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  isDefault?: boolean;
}

export interface CreateWithdrawalRequest {
  tokenAmount: number;
  bankAccountId?: string | null;
  idempotencyKey?: string;
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

  /**
   * POST /api/wallet/bank-accounts
   * Store an encrypted bank account for freelancer withdrawals.
   */
  createBankAccount: async (payload: CreateBankAccountRequest): Promise<ApiResponse<BankAccountResponse>> => {
    return apiService.post<BankAccountResponse>('wallet/bank-accounts', payload);
  },

  /**
   * PATCH /api/wallet/bank-accounts/{id}
   * Update bank metadata or make an account the default.
   */
  updateBankAccount: async (
    bankAccountId: string,
    payload: UpdateBankAccountRequest
  ): Promise<ApiResponse<BankAccountResponse>> => {
    return apiService.patch<BankAccountResponse>(`wallet/bank-accounts/${bankAccountId}`, payload);
  },

  /**
   * DELETE /api/wallet/bank-accounts/{id}
   * Soft delete an account if it is not used by a pending withdrawal.
   */
  deleteBankAccount: async (bankAccountId: string): Promise<ApiResponse<object>> => {
    return apiService.delete<object>(`wallet/bank-accounts/${bankAccountId}`);
  },

  /**
   * POST /api/wallet/withdrawals
   * Lock wallet tokens and enqueue provider payout creation.
   */
  createWithdrawal: async (payload: CreateWithdrawalRequest): Promise<ApiResponse<WithdrawalResponse>> => {
    return apiService.post<WithdrawalResponse>('wallet/withdrawals', payload);
  },

  /**
   * POST /api/wallet/withdrawals/{id}/sync
   * Ask backend to reconcile provider payout status.
   */
  syncWithdrawal: async (withdrawalId: string): Promise<ApiResponse<WithdrawalResponse>> => {
    return apiService.post<WithdrawalResponse>(`wallet/withdrawals/${withdrawalId}/sync`);
  },
};
