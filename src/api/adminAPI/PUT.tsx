import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { AdminUserDto, UpdateUserPayload } from '../../types/models/User';

const AdminV1 = '/v1/admin';

export const adminPutAPI = {
  /**
   * PUT /api/v1/admin/users
   * Updates an existing user identified by their email.
   * Only provided fields are changed (partial update via nullable fields).
   */
  updateUser: async (email: string, payload: UpdateUserPayload): Promise<ApiResponse<AdminUserDto>> => {
    return apiService.put<AdminUserDto>(`${AdminV1}/users`, {
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
};
