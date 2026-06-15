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
    return await apiService.get<FreelancerProfileDetailDto[]>('Profile/freelancer', filters || {});
  },

  getCompanySizes: async () => {
    return await apiService.get<{ id: number; name: string }[]>('Profile/company-sizes');
  },

  getIndustries: async () => {
    return await apiService.get<string[]>('Profile/industries');
  },

  getAvailabilityStatuses: async () => {
    return await apiService.get<{ id: number; name: string }[]>('Profile/availability-statuses');
  },
};

