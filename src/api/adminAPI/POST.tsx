import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { CreateFAQCategoryPayload, CreateFAQPayload, FAQCategoryDto, FAQDto } from '../../types/models/FAQ';
import type { AdminUserDto, CreateUserPayload } from '../../types/models/User';

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
};
