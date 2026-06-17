import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
const Admin_Api_Base_Url = '/admin';


export const adminDeleteAPI = {
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

  deleteNotification: async (id: string): Promise<ApiResponse<object>> => {
    return apiService.delete<object>(`${Admin_Api_Base_Url}/notifications/${id}`);
  },
};
