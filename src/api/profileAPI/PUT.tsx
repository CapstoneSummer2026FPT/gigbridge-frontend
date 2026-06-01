import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { UpdateClientProfileDto, UpdateFreelancerProfileDto, ClientProfileResponseDto, FreelancerProfileResponseDto } from '../../types/models/Profile';

const profileV1Url = 'v1/profile';

export const profilePutAPI = {
  /**
   * Update client profile
   * PUT /v1/profile/client
   */
  updateClientProfile: async (data: UpdateClientProfileDto): Promise<ApiResponse<ClientProfileResponseDto>> => {
    return apiService.put<ClientProfileResponseDto>(`${profileV1Url}/client`, data);
  },

  /**
   * Update freelancer profile
   * PUT /v1/profile/freelancer
   */
  updateFreelancerProfile: async (data: UpdateFreelancerProfileDto): Promise<ApiResponse<FreelancerProfileResponseDto>> => {
    return apiService.put<FreelancerProfileResponseDto>(`${profileV1Url}/freelancer`, data);
  },

  /**
   * Mark user setup as complete
   * PUT /v1/profile/setup-complete
   */
  markSetupComplete: async (): Promise<ApiResponse<any>> => {
    return apiService.put<any>(`${profileV1Url}/setup-complete`, {});
  },
};
