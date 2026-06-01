import { apiService } from '../../service/apiService';
import type { FreelancerProfileDetailDto, UpdateFreelancerProfileDto } from '../../types/models/Profile';

export const profileGetAPI = {
  getFreelancerProfile: async (userId: string) => {
    return await apiService.get<FreelancerProfileDetailDto>(`/api/freelancerprofile/${userId}`);
  },

  getMyFreelancerProfile: async () => {
    return await apiService.get<FreelancerProfileDetailDto>('/api/freelancerprofile/me');
  },

  getClientProfile: async (userId: string) => {
    return await apiService.get(`/api/clientprofile/${userId}`);
  },

  getAllFreelancers: async (filters?: { skills?: string[]; availabilityStatus?: string; minRating?: number }) => {
    return await apiService.get('/api/freelancerprofile', filters || {});
  },
};
