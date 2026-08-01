import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { CreateFAQCategoryPayload, CreateFAQPayload, FAQCategoryDto, FAQDto } from '../../types/models/FAQ';
import type { AdminUserDto, CreateUserPayload } from '../../types/models/User';
import type { WithdrawalResponse } from '../../types/models/Financial';
import type { AdminDisputeDetail, UserViolationType } from '../../types/models/AdminDispute';
import type { DisputeEvidence, DisputeMilestoneOutcome, DisputeResolution, EvidenceRequestTarget } from '../../types/models/Dispute';
import { normalizeAdminDisputeDetail } from './disputeUtils';
import { normalizeEvidence } from '../disputeAPI/utils';
import type { MessageResponse } from '../messageAPI/GET';

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

export interface AdminResolveDisputePayload {
  resolution: DisputeResolution;
  resolutionNote: string;
  internalNotes?: string;
  milestoneAllocations: {
    milestoneId: string;
    outcome: DisputeMilestoneOutcome;
    freelancerAward: number;
    clientRefund: number;
    penaltyAmount: number;
    reason?: string | null;
  }[];
  contractAction: number;
  clientViolation: AdminViolationPayload;
  freelancerViolation: AdminViolationPayload;
}

export interface AdminViolationPayload {
  isViolation: boolean;
  violationType: UserViolationType | null;
  reason: string | null;
  description: string | null;
}

export const adminPostAPI = {
  sendDisputeMessage: async (
    disputeId: string,
    conversationId: string,
    content: string,
    attachments: File[],
  ): Promise<ApiResponse<MessageResponse>> => {
    const formData = new FormData();
    if (content.trim()) formData.append('content', content.trim());
    for (const file of attachments) formData.append('attachments', file);
    return apiService.post<MessageResponse>(
      `${Admin_Api_Base_Url}/disputes/${disputeId}/conversations/${conversationId}/messages`,
      formData,
    );
  },

  resolveDispute: async (
    disputeId: string,
    payload: AdminResolveDisputePayload
  ): Promise<ApiResponse<AdminDisputeDetail>> => {
    const response = await apiService.post<unknown>(
      `${Admin_Api_Base_Url}/disputes/${disputeId}/resolve`,
      payload
    );
    return {
      ...response,
      data: response.data ? normalizeAdminDisputeDetail(response.data) : undefined,
    };
  },

  requestEvidence: async (
    disputeId: string,
    reason: string,
    deadline: string | null,
    target: EvidenceRequestTarget,
  ): Promise<ApiResponse<AdminDisputeDetail>> => {
    const response = await apiService.post<unknown>(
      `${Admin_Api_Base_Url}/disputes/${disputeId}/request-evidence`,
      { reason, deadline: deadline || null, target }
    );
    return {
      ...response,
      data: response.data ? normalizeAdminDisputeDetail(response.data) : undefined,
    };
  },

  reviewDisputeEvidence: async (
    disputeId: string,
    evidenceId: string,
    reviewNote?: string,
  ): Promise<ApiResponse<DisputeEvidence>> => {
    const response = await apiService.post<unknown>(
      `${Admin_Api_Base_Url}/disputes/${disputeId}/evidence/${evidenceId}/review`,
      { reviewNote: reviewNote?.trim() || null },
    );
    return { ...response, data: response.data ? normalizeEvidence(response.data) : undefined };
  },

  grantUserPremium: async (userId: string): Promise<ApiResponse<object>> =>
    apiService.post<object>(`${Admin_Api_Base_Url}/users/${userId}/premium`),
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

};
