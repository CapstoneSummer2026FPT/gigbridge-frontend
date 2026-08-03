import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { FAQCategoryDto, FAQDto } from '../../types/models/FAQ';
import type { GetUsersParams, PaginatedUsersResponse } from '../../types/models/User';
import type { WithdrawalResponse, WithdrawalStatus } from '../../types/models/Financial';
import type {
  AdminDisputeDetail,
  AdminDisputeListParams,
  AdminDisputeListResult,
} from '../../types/models/AdminDispute';
import type { DisputeEvidenceDownload } from '../../types/models/Dispute';
import type { ConversationMessageResponse } from '../messageAPI/GET';
import type { AccountReportDetail, AccountReportItem, AdminAuditLog, AdminUserDetail, PageResult } from '../../types/models/AdminPhase1';
import type { AdminContractReportDetail, AdminContractReportListParams, AdminContractReportPage } from '../../types/models/AdminContractReport';
import type { AdminProposalDetail, AdminProposalListItem, AdminProposalListParams, PageResult as ProposalPage } from '../../types/models/AdminProposal';
import type { SystemTrackingSnapshot } from '../../types/systemTracking';
import {
  normalizeAdminDisputeDetail,
  normalizeAdminDisputeListResult,
} from './disputeUtils';
import { normalizeAdminProposalDetail } from './proposalUtils';

const Admin_Api_Base_Url = '/admin';

export const adminGetAPI = {
  getProposals: (params: AdminProposalListParams = {}): Promise<ApiResponse<ProposalPage<AdminProposalListItem>>> => apiService.get('/Proposals/admin/all', params),
  getProposalDetail: async (proposalId: string): Promise<ApiResponse<AdminProposalDetail>> => {
    const response = await apiService.get<unknown>(`/Proposals/admin/${proposalId}`);
    return {
      ...response,
      data: response.data ? normalizeAdminProposalDetail(response.data) : undefined,
    };
  },
  getContractReports: (params: AdminContractReportListParams = {}): Promise<ApiResponse<AdminContractReportPage>> => apiService.get(`${Admin_Api_Base_Url}/contract-reports`, params),
  getContractReportDetail: (reportId: string): Promise<ApiResponse<AdminContractReportDetail>> => apiService.get(`${Admin_Api_Base_Url}/contract-reports/${reportId}`),
  getContractReportAttachmentDownload: (reportId:string, attachmentId:string): Promise<ApiResponse<{attachmentId:string;fileName:string;downloadUrl:string}>> => apiService.get(`${Admin_Api_Base_Url}/contract-reports/${reportId}/attachments/${attachmentId}/download`),
  getUserDetail: (userId: string): Promise<ApiResponse<AdminUserDetail>> => apiService.get(`${Admin_Api_Base_Url}/users/${userId}`),
  getAccountReports: (params: Record<string, unknown> = {}): Promise<ApiResponse<PageResult<AccountReportItem>>> => apiService.get('/reports/admin/accounts', params),
  getAccountReportDetail: (reportId: string): Promise<ApiResponse<AccountReportDetail>> => apiService.get(`/reports/admin/accounts/${reportId}`),
  getAccountReportEvidenceDownload: (reportId: string, evidenceId: string): Promise<ApiResponse<{ evidenceId: string; fileName: string; downloadUrl: string }>> => apiService.get(`/reports/admin/accounts/${reportId}/evidence/${evidenceId}/download`),
  getAuditLogs: (params: Record<string, unknown> = {}): Promise<ApiResponse<PageResult<AdminAuditLog>>> => apiService.get(`${Admin_Api_Base_Url}/audit-logs`, params),
  getSystemTracking: async (limit = 100): Promise<ApiResponse<SystemTrackingSnapshot>> => {
    return apiService.get<SystemTrackingSnapshot>(`${Admin_Api_Base_Url}/system-tracking`, { limit });
  },

  getDisputes: async (
    params: AdminDisputeListParams = {}
  ): Promise<ApiResponse<AdminDisputeListResult>> => {
    const response = await apiService.get<unknown>(`${Admin_Api_Base_Url}/disputes`, params);
    return {
      ...response,
      data: response.data ? normalizeAdminDisputeListResult(response.data) : undefined,
    };
  },

  getDisputeDetail: async (disputeId: string): Promise<ApiResponse<AdminDisputeDetail>> => {
    const response = await apiService.get<unknown>(`${Admin_Api_Base_Url}/disputes/${disputeId}`);
    return {
      ...response,
      data: response.data ? normalizeAdminDisputeDetail(response.data) : undefined,
    };
  },

  getDisputeConversationMessages: async (
    disputeId: string,
    conversationId: string,
    before?: string,
    pageSize = 100,
  ): Promise<ApiResponse<ConversationMessageResponse[]>> =>
    apiService.get<ConversationMessageResponse[]>(
      `${Admin_Api_Base_Url}/disputes/${disputeId}/conversations/${conversationId}/messages`,
      { before, pageSize },
    ),

  getDisputeEvidenceDownload: async (
    disputeId: string,
    evidenceId: string
  ): Promise<ApiResponse<DisputeEvidenceDownload>> => {
    const response = await apiService.get<Record<string, unknown>>(
      `${Admin_Api_Base_Url}/disputes/${disputeId}/evidence/${evidenceId}/download`
    );
    const source = response.data;
    return {
      ...response,
      data: source ? {
        evidenceId: String(source.disputeEvidenceId ?? source.DisputeEvidenceId ?? ''),
        fileName: String(source.fileName ?? source.FileName ?? ''),
        downloadUrl: String(source.downloadUrl ?? source.DownloadUrl ?? ''),
      } : undefined,
    };
  },

  /**
   * GET /api/v1/admin/users
   * Returns a paginated, searchable list of users.
   * Backend Status: 1 = active, 0 = inactive (banned), null = all.
   */
  getUsers: async (params: GetUsersParams = {}): Promise<ApiResponse<PaginatedUsersResponse>> => {
    return apiService.get<PaginatedUsersResponse>(`${Admin_Api_Base_Url}/users`, params);
  },

  /**
   * Fetch all users matching the given search/filter by requesting page 1
   * with a high page size.
   */
  getAllUsers: async (search?: string, status?: number): Promise<ApiResponse<PaginatedUsersResponse>> => {
    return adminGetAPI.getUsers({
      Page: 1,
      PageSize: 200,
      Search: search,
      Status: status,
      Premium: undefined,
    });
  },

  getFAQs: async (categoryId?: number): Promise<ApiResponse<FAQDto[]>> => {
    return apiService.get<FAQDto[]>(`${Admin_Api_Base_Url}/faq`, categoryId ? { categoryId } : {});
  },

  getFAQCategories: async (): Promise<ApiResponse<FAQCategoryDto[]>> => {
    return apiService.get<FAQCategoryDto[]>(`${Admin_Api_Base_Url}/faq/categories`);
  },

  getWithdrawals: async (
    params: { status?: WithdrawalStatus | 'all'; limit?: number } = {}
  ): Promise<ApiResponse<WithdrawalResponse[]>> => {
    const query = {
      ...(params.status !== undefined && params.status !== 'all' ? { status: params.status } : {}),
      limit: params.limit ?? 100,
    };

    return apiService.get<WithdrawalResponse[]>(`${Admin_Api_Base_Url}/withdrawals`, query);
  },

  getWalletBalance: async (userId: string): Promise<ApiResponse<any>> => {
    return apiService.get<any>(`${Admin_Api_Base_Url}/wallets/${userId}/balance`);
  },

  getWalletHistory: async (userId: string, limit: number = 50): Promise<ApiResponse<any[]>> => {
    return apiService.get<any[]>(`${Admin_Api_Base_Url}/wallets/${userId}/history`, { limit });
  },

  getJobPostDetail: async (jobPostId: string): Promise<ApiResponse<any>> => {
    return apiService.get<any>(`JobPosts/admin/${jobPostId}`);
  },

  getContracts: async (params?: { status?: number; jobPostId?: string }): Promise<ApiResponse<any[]>> => {
    return apiService.get<any[]>(`${Admin_Api_Base_Url}/contracts`, params || {});
  },

  getTemplates: async (): Promise<ApiResponse<any[]>> => {
    return apiService.get<any[]>(`${Admin_Api_Base_Url}/templates`);
  },

  getAssets: async (params?: {
    search?: string;
    jobPostId?: string;
    uploadedByUserId?: string;
  }): Promise<ApiResponse<any[]>> => {
    return apiService.get<any[]>(`${Admin_Api_Base_Url}/assets`, params || {});
  },

  getContractMilestones: async (contractId: string): Promise<ApiResponse<any[]>> => {
    return apiService.get<any[]>(`${Admin_Api_Base_Url}/milestones/contract/${contractId}`);
  },
};


