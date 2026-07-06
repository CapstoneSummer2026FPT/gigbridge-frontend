import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { FAQCategoryDto, FAQDto, UpdateFAQCategoryPayload, UpdateFAQPayload } from '../../types/models/FAQ';
import type { AdminUserDto, UpdateUserPayload } from '../../types/models/User';

const Admin_Api_Base_Url = '/admin';

export const adminPutAPI = {
  /**
   * PUT /api/v1/admin/users
   * Updates an existing user identified by their email.
   * Only provided fields are changed (partial update via nullable fields).
   */
  updateUser: async (email: string, payload: UpdateUserPayload): Promise<ApiResponse<AdminUserDto>> => {
    return apiService.put<AdminUserDto>(`${Admin_Api_Base_Url}/users`, {
      email,
      request: {
        fullName: payload.fullName,
        phoneNumber: payload.phoneNumber,
        avatar: payload.avatar,
        preferredLanguage: payload.preferredLanguage,
        isActive: payload.isActive,
      },
    });
  },

  /**
   * Convenience: ban a user by setting IsActive = false.
   */
  banUser: async (email: string): Promise<ApiResponse<AdminUserDto>> => {
    return adminPutAPI.updateUser(email, { isActive: false });
  },

  /**
   * Convenience: unban a user by setting IsActive = true.
   */
  unbanUser: async (email: string): Promise<ApiResponse<AdminUserDto>> => {
    return adminPutAPI.updateUser(email, { isActive: true });
  },

  updateFAQ: async (id: number, payload: UpdateFAQPayload): Promise<ApiResponse<FAQDto>> => {
    return apiService.put<FAQDto>(`${Admin_Api_Base_Url}/faq/${id}`, payload);
  },

  updateFAQCategory: async (id: number, payload: UpdateFAQCategoryPayload): Promise<ApiResponse<FAQCategoryDto>> => {
    return apiService.put<FAQCategoryDto>(`${Admin_Api_Base_Url}/faq/categories/${id}`, payload);
  },

  lockJobPost: async (jobPostId: string): Promise<ApiResponse<boolean>> => {
    return apiService.put<boolean>(`JobPosts/admin/${jobPostId}/lock`);
  },

  updateTemplate: async (
    templateId: string,
    payload: {
      name: string;
      templateCode: string;
      htmlContent: string;
      version: number;
      placeholderSchema?: string;
      description?: string;
      isActive: boolean;
    }
  ): Promise<ApiResponse<boolean>> => {
    return apiService.put<boolean>(`${Admin_Api_Base_Url}/templates/${templateId}`, payload);
  },

  updateMilestone: async (
    milestoneId: string,
    payload: { title: string; amount: number; dueDate?: string; status: number; sortOrder?: number }
  ): Promise<ApiResponse<any>> => {
    return apiService.put<any>(`${Admin_Api_Base_Url}/milestones/${milestoneId}`, payload);
  },

  updateContract: async (
    contractId: string,
    payload: { title: string; description: string; totalBudget: number; status: number; startDate?: string; endDate?: string; esignContractPdfUrl?: string }
  ): Promise<ApiResponse<any>> => {
    return apiService.put<any>(`${Admin_Api_Base_Url}/contracts/${contractId}`, payload);
  },
};

