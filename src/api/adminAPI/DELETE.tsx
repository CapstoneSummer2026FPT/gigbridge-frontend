import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
const Admin_Api_Base_Url = '/admin';


export const adminDeleteAPI = {
  revokeUserPremium: async (userId: string): Promise<ApiResponse<object>> =>
    apiService.delete<object>(`${Admin_Api_Base_Url}/users/${userId}/premium`),
  /**
   * DELETE /api/v1/admin/users
   * Permanently deletes the user with the given email.
   * Returns true on success, false if the user was not found.
   */
  deleteUser: async (email: string): Promise<ApiResponse<object>> => {
    return apiService.delete<object>(`${Admin_Api_Base_Url}/users`, { email });
  },

  deleteFAQ: async (id: number): Promise<ApiResponse<object>> => {
    return apiService.delete<object>(`${Admin_Api_Base_Url}/faq/${id}`);
  },

  deleteFAQCategory: async (id: number): Promise<ApiResponse<object>> => {
    return apiService.delete<object>(`${Admin_Api_Base_Url}/faq/categories/${id}`);
  },

  deleteJobPost: async (jobPostId: string): Promise<ApiResponse<boolean>> => {
    return apiService.delete<boolean>(`JobPosts/admin/${jobPostId}`);
  },

  deleteProposal: async (proposalId: string): Promise<ApiResponse<boolean>> => {
    return apiService.delete<boolean>(`Proposals/admin/${proposalId}`);
  },

  deleteTemplate: async (templateId: string): Promise<ApiResponse<boolean>> => {
    return apiService.delete<boolean>(`${Admin_Api_Base_Url}/templates/${templateId}`);
  },

  deleteMilestone: async (milestoneId: string): Promise<ApiResponse<boolean>> => {
    return apiService.delete<boolean>(`${Admin_Api_Base_Url}/milestones/${milestoneId}`);
  },
};

