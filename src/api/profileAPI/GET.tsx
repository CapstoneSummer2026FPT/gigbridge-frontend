import { apiService } from '../../service/apiService';
import type { ClientProfileDetailDto, FreelancerProfileDetailDto } from '../../types/models/Profile';

export const profileGetAPI = {
  getFreelancerProfile: async (userId: string) => {
    return await apiService.get<FreelancerProfileDetailDto>(`profile/freelancer/${userId}`);
  },

  getMyFreelancerProfile: async () => {
    return await apiService.get<FreelancerProfileDetailDto>('profile/freelancer/me');
  },

  getClientProfile: async (userId: string) => {
    return await apiService.get<ClientProfileDetailDto>(`profile/client/${userId}`);
  },

  getAllFreelancers: async (filters?: { skills?: string[]; availabilityStatus?: string; minRating?: number }) => {
    return await apiService.get<FreelancerProfileDetailDto[]>('profile/freelancer', filters || {});
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

