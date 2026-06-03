import { apiService } from '../../service/apiService';
import type { FreelancerProfileDetailDto } from '../../types/models/Profile';

export const profileGetAPI = {
  getFreelancerProfile: async (userId: string) => {
    return await apiService.get<FreelancerProfileDetailDto>(`Profile/freelancer/${userId}`);
  },

  getMyFreelancerProfile: async () => {
    return await apiService.get<FreelancerProfileDetailDto>('Profile/freelancer/me');
  },

  getClientProfile: async (userId: string) => {
    return await apiService.get(`Profile/client/${userId}`);
  },

  getAllFreelancers: async (filters?: { skills?: string[]; availabilityStatus?: string; minRating?: number }) => {
    return await apiService.get('Profile/freelancer', filters || {});
  },
};
