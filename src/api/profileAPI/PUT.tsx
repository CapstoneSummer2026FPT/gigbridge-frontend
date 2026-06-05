import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { UpdateClientProfileDto, UpdateFreelancerProfileDto, ClientProfileResponseDto, FreelancerProfileResponseDto } from '../../types/models/Profile';


const profileUrl = 'Profile';

export const profilePutAPI = {
  /**
   * Update client profile
   * PUT /v1/profile/client
   */
  updateClientProfile: async (data: UpdateClientProfileDto): Promise<ApiResponse<ClientProfileResponseDto>> => {
    return apiService.put<ClientProfileResponseDto>(`${profileUrl}/client`, data);
  },

  /**
   * Update freelancer profile
   * PUT /v1/profile/freelancer
   */
  updateFreelancerProfile: async (data: UpdateFreelancerProfileDto): Promise<ApiResponse<FreelancerProfileResponseDto>> => {
    return apiService.put<FreelancerProfileResponseDto>(`${profileUrl}/freelancer`, data);
  },

  /**
   * Mark user setup as complete
   * PUT /v1/profile/setup-complete
   */
  markSetupComplete: async (): Promise<ApiResponse<any>> => {
    return apiService.put<any>(`${profileUrl}/setup-complete`, {});
  },
};
