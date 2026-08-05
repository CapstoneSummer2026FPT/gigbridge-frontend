import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { CreateFAQCategoryPayload, CreateFAQPayload, FAQCategoryDto, FAQDto } from '../../types/models/FAQ';
import type { AdminUserDto, CreateUserPayload } from '../../types/models/User';
import type { WithdrawalResponse } from '../../types/models/Financial';
import type { AdminDisputeDetail, UserViolationType } from '../../types/models/AdminDispute';
import type { DisputeEvidence, DisputeMilestoneOutcome, DisputeResolution, EvidenceRequestTarget } from '../../types/models/Dispute';
import { normalizeAdminDisputeDetail } from './disputeUtils';
import { normalizeAdminProposalDetail } from './proposalUtils';
import { normalizeEvidence } from '../disputeAPI/utils';
import type { MessageResponse } from '../messageAPI/GET';
import type { EnforcementPayload } from '../../types/models/AdminPhase1';
import type { AdminContractReportDetail, ContractReportAdminResolutionAction, ContractReportInformationTarget } from '../../types/models/AdminContractReport';
import type { AdminProposalDetail } from '../../types/models/AdminProposal';
import type {
  AdminEloAdjustmentPayload,
  AdminResolveEloAppealPayload,
  EloAppeal,
  EloTransaction,
} from '../../types/elo';

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
  addProposalNote: async (proposalId: string, content: string): Promise<ApiResponse<AdminProposalDetail>> => {
    const response = await apiService.post<unknown>(`/Proposals/admin/${proposalId}/internal-notes`, { content });
    return { ...response, data: response.data ? normalizeAdminProposalDetail(response.data) : undefined };
  },
  assignContractReport: (reportId:string, adminId?:string): Promise<ApiResponse<AdminContractReportDetail>> => apiService.post(`${Admin_Api_Base_Url}/contract-reports/${reportId}/assign`, {adminId:adminId||null}),
  requestContractReportInformation: (reportId:string, payload:{requestId:string;target:ContractReportInformationTarget;message:string;requestedEvidenceOrClarification?:string;dueAt?:string}): Promise<ApiResponse<AdminContractReportDetail>> => apiService.post(`${Admin_Api_Base_Url}/contract-reports/${reportId}/request-information`,payload),
  closeContractReport: (reportId:string,payload:{resolutionAction:ContractReportAdminResolutionAction;resolutionSummary:string;internalNote?:string}): Promise<ApiResponse<AdminContractReportDetail>> => apiService.post(`${Admin_Api_Base_Url}/contract-reports/${reportId}/close`,payload),
  dismissContractReport: (reportId:string,payload:{reason:string;internalNote?:string}): Promise<ApiResponse<AdminContractReportDetail>> => apiService.post(`${Admin_Api_Base_Url}/contract-reports/${reportId}/dismiss`,payload),
  addContractReportNote: (reportId:string,content:string): Promise<ApiResponse<AdminContractReportDetail>> => apiService.post(`${Admin_Api_Base_Url}/contract-reports/${reportId}/internal-notes`,{content}),
  linkContractReportDispute: (reportId:string,disputeId:string,reason:string): Promise<ApiResponse<AdminContractReportDetail>> => apiService.post(`${Admin_Api_Base_Url}/contract-reports/${reportId}/link-dispute`,{disputeId,reason}),
  escalateContractReport: (reportId:string,payload:{title:string;description:string;claimedAmount?:number;requestedResolution:string;urgency:number;reason:string}): Promise<ApiResponse<AdminContractReportDetail>> => apiService.post(`${Admin_Api_Base_Url}/contract-reports/${reportId}/escalate`,payload),
  enforceUser: (userId: string, action: 'warning' | 'suspend' | 'ban', payload: EnforcementPayload): Promise<ApiResponse<unknown>> =>
    apiService.post(`${Admin_Api_Base_Url}/users/${userId}/${action}`, payload),
  clearUserSuspension: (userId: string, reason: string): Promise<ApiResponse<unknown>> =>
    apiService.post(`${Admin_Api_Base_Url}/users/${userId}/clear-suspension`, { reason }),
  restoreUser: (userId: string, reason: string): Promise<ApiResponse<unknown>> =>
    apiService.post(`${Admin_Api_Base_Url}/users/${userId}/restore`, { reason }),
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

  // --- Elo management ---

  resolveEloAppeal: (appealId: string, payload: AdminResolveEloAppealPayload): Promise<ApiResponse<EloAppeal>> =>
    apiService.post(`${Admin_Api_Base_Url}/elo/appeals/${appealId}/resolve`, payload),

  applyAdminEloAdjustment: (payload: AdminEloAdjustmentPayload): Promise<ApiResponse<EloTransaction | null>> =>
    apiService.post(`${Admin_Api_Base_Url}/elo/adjustments`, payload),
};
