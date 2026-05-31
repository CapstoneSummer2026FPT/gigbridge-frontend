import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { AdminUserDto, CreateUserPayload } from '../../types/models/User';

const AdminV1 = '/v1/admin';

export const adminPostAPI = {
  /**
   * POST /api/v1/admin/users
   * Creates a new user. The backend hashes the password and sets
   * IsActive = true, IsEmailVerified = false by default.
   */
  createUser: async (payload: CreateUserPayload): Promise<ApiResponse<AdminUserDto>> => {
    return apiService.post<AdminUserDto>(`${AdminV1}/users`, {
      fullName: payload.fullName,
      email: payload.email,
      password: payload.password,
      role: payload.role,
      phoneNumber: payload.phoneNumber,
    });
  },
};
