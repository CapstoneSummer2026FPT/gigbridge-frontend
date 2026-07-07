import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { CreateFAQCategoryPayload, CreateFAQPayload, FAQCategoryDto, FAQDto } from '../../types/models/FAQ';
import type { AdminUserDto, CreateUserPayload } from '../../types/models/User';
import type { WithdrawalResponse } from '../../types/models/Financial';

const Admin_Api_Base_Url = '/admin';

export interface AdminBroadcastNotificationPayload {
  target: number;
  targetUserId?: string | null;
  type: number;
  title: string;
  content?: string;
  referenceId?: string | null;
  referenceType?: string | null;
  sendEmail: boolean;
}

export const adminPostAPI = {
  /**
   * POST /api/v1/admin/users
   * Creates a new user. The backend hashes the password and sets
   * IsActive = true, IsEmailVerified = false by default.
   */
  createUser: async (payload: CreateUserPayload): Promise<ApiResponse<AdminUserDto>> => {
    return apiService.post<AdminUserDto>(`${Admin_Api_Base_Url}/users`, {
      fullName: payload.fullName,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      phoneNumber: payload.phoneNumber,
      isEmailVerified: payload.isEmailVerified ?? false,
    });
  },

  createFAQ: async (payload: CreateFAQPayload): Promise<ApiResponse<FAQDto>> => {
    return apiService.post<FAQDto>(`${Admin_Api_Base_Url}/faq`, payload);
  },

  createFAQCategory: async (payload: CreateFAQCategoryPayload): Promise<ApiResponse<FAQCategoryDto>> => {
    return apiService.post<FAQCategoryDto>(`${Admin_Api_Base_Url}/faq/categories`, payload);
  },

  broadcastNotification: async (payload: AdminBroadcastNotificationPayload): Promise<ApiResponse<null>> => {
    return apiService.post<null>('admin/notifications/broadcast', payload);
  },

  /**
   * POST /api/admin/wallets/{userId}/credit
   * Overrides and credits tokens directly to a user's wallet (Admin role required).
   */
  creditWallet: async (
    userId: string,
    payload: { tokenAmount: number; note?: string; idempotencyKey?: string }
  ): Promise<ApiResponse<any>> => {
    return apiService.post<any>(`admin/wallets/${userId}/credit`, payload);
  },

  debitWallet: async (
    userId: string,
    payload: { tokenAmount: number; note?: string; idempotencyKey?: string }
  ): Promise<ApiResponse<any>> => {
    return apiService.post<any>(`admin/wallets/${userId}/debit`, payload);
  },

  createTemplate: async (payload: {
    name: string;
    templateCode: string;
    htmlContent: string;
    version: number;
    placeholderSchema?: string;
    description?: string;
    isActive: boolean;
  }): Promise<ApiResponse<string>> => {
    return apiService.post<string>(`${Admin_Api_Base_Url}/templates`, payload);
  },

  overrideMilestone: async (
    milestoneId: string,
    payload: { action: string; note?: string }
  ): Promise<ApiResponse<boolean>> => {
    return apiService.post<boolean>(`${Admin_Api_Base_Url}/milestones/${milestoneId}/override`, payload);
  },

  createMilestone: async (
    contractId: string,
    payload: { title: string; amount: number; dueDate?: string; sortOrder?: number }
  ): Promise<ApiResponse<any>> => {
    return apiService.post<any>(`${Admin_Api_Base_Url}/milestones/contract/${contractId}`, payload);
  },

  syncWithdrawal: async (withdrawalId: string): Promise<ApiResponse<WithdrawalResponse>> => {
    return apiService.post<WithdrawalResponse>(`admin/withdrawals/${withdrawalId}/sync`);
  },

  retryWithdrawal: async (withdrawalId: string): Promise<ApiResponse<WithdrawalResponse>> => {
    return apiService.post<WithdrawalResponse>(`admin/withdrawals/${withdrawalId}/retry`);
  },

  markWithdrawalFailed: async (
    withdrawalId: string,
    payload: { reason: string }
  ): Promise<ApiResponse<WithdrawalResponse>> => {
    return apiService.post<WithdrawalResponse>(`admin/withdrawals/${withdrawalId}/mark-failed`, payload);
  },
};
