import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  UpdateClientProfileDto,
  UpdateFreelancerProfileDto,
  ClientProfileResponseDto,
  FreelancerProfileResponseDto,
  UpdateUserProfileDto,
  UserProfileDto,
} from '../../types/models/Profile';

const profileUrl = 'profile';

export const profilePutAPI = {
  /**
   * Update client profile
   * PUT /api/profile/client
   */
  updateClientProfile: async (data: UpdateClientProfileDto): Promise<ApiResponse<ClientProfileResponseDto>> => {
    return apiService.put<ClientProfileResponseDto>(`${profileUrl}/client`, data);
  },

  /**
   * Update freelancer profile
   * PUT /api/profile/freelancer
   */
  updateFreelancerProfile: async (data: UpdateFreelancerProfileDto): Promise<ApiResponse<FreelancerProfileResponseDto>> => {
    return apiService.put<FreelancerProfileResponseDto>(`${profileUrl}/freelancer`, data);
  },

  /**
   * Update user basic profile (fullName, avatar, phoneNumber)
   * PUT /api/profile/user
   */
  updateUserProfile: async (data: UpdateUserProfileDto): Promise<ApiResponse<UserProfileDto>> => {
    return apiService.put<UserProfileDto>('profile/user', data);
  },
};
