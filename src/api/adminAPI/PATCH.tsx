import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';

const Admin_Api_Base_Url = '/admin';

export const adminPatchAPI = {
  /**
   * PATCH /api/v1/admin/users/toggle-activity
   * Toggles the IsActive flag for the user with the given email.
   * - If the user was active (IsActive = true), they become inactive (banned).
   * - If the user was inactive (IsActive = false), they become active (unbanned).
   *
   * Returns true on success, false if the user was not found.
   */
  toggleUserActivity: async (email: string): Promise<ApiResponse<object>> => {
    return apiService.patch<object>(`${Admin_Api_Base_Url}/users/toggle-activity`, {
      email,
    });
  },

  toggleFAQActivity: async (id: number): Promise<ApiResponse<object>> => {
    return apiService.patch<object>(`${Admin_Api_Base_Url}/faq/${id}/toggle-activity`);
  },

  toggleFAQCategoryActivity: async (id: number): Promise<ApiResponse<object>> => {
    return apiService.patch<object>(`${Admin_Api_Base_Url}/faq/categories/${id}/toggle-activity`);
  },
};
