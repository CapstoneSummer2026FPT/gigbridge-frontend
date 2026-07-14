import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  AdminCheatingEventsResponse,
  AdminCheatingViolationDetailDto,
  AdminCheatingViolationsResponse,
  GetAdminCheatingEventsParams,
  GetAdminCheatingViolationsParams,
} from '../../types/models/Cheating';
import type { FAQCategoryDto, FAQDto } from '../../types/models/FAQ';
import type { GetUsersParams, PaginatedUsersResponse } from '../../types/models/User';
import type { WithdrawalResponse, WithdrawalStatus } from '../../types/models/Financial';

const Admin_Api_Base_Url = '/admin';

export const adminGetAPI = {
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

  getCheatingEvents: async (
    params: GetAdminCheatingEventsParams = {}
  ): Promise<ApiResponse<AdminCheatingEventsResponse>> => {
    return apiService.get<AdminCheatingEventsResponse>(`${Admin_Api_Base_Url}/cheating/events`, params);
  },

  getCheatingViolations: async (
    params: GetAdminCheatingViolationsParams = {}
  ): Promise<ApiResponse<AdminCheatingViolationsResponse>> => {
    return apiService.get<AdminCheatingViolationsResponse>(`${Admin_Api_Base_Url}/cheating/violations`, params);
  },

  getCheatingViolationDetail: async (
    violationId: string
  ): Promise<ApiResponse<AdminCheatingViolationDetailDto>> => {
    return apiService.get<AdminCheatingViolationDetailDto>(
      `${Admin_Api_Base_Url}/cheating/violations/${violationId}`
    );
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

  getWithdrawalDetail: async (withdrawalId: string): Promise<ApiResponse<WithdrawalResponse>> => {
    return apiService.get<WithdrawalResponse>(`${Admin_Api_Base_Url}/withdrawals/${withdrawalId}`);
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

  getProposalDetail: async (proposalId: string): Promise<ApiResponse<any>> => {
    return apiService.get<any>(`Proposals/admin/${proposalId}`);
  },

  getContracts: async (params?: { status?: number; jobPostId?: string }): Promise<ApiResponse<any[]>> => {
    return apiService.get<any[]>(`${Admin_Api_Base_Url}/contracts`, params || {});
  },

  getTemplates: async (): Promise<ApiResponse<any[]>> => {
    return apiService.get<any[]>(`${Admin_Api_Base_Url}/templates`);
  },

  getTemplateById: async (templateId: string): Promise<ApiResponse<any>> => {
    return apiService.get<any>(`${Admin_Api_Base_Url}/templates/${templateId}`);
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


