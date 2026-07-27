import { apiService } from '../../service/apiService';
import type {
  ClientProfileDetailDto,
  FreelancerDirectoryQuery,
  FreelancerProfileDetailDto,
  FreelancerSummaryDto,
  PaginatedList,
} from '../../types/models/Profile';

const buildFreelancerDirectoryQuery = (query: FreelancerDirectoryQuery): string => {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 20),
    sort: query.sort ?? 'featured',
  });

  if (query.search) params.set('search', query.search);
  if (query.availabilityStatus) params.set('availabilityStatus', query.availabilityStatus);
  if (query.minRating !== undefined) params.set('minRating', String(query.minRating));
  query.skills?.forEach(skill => params.append('skills', skill));

  return params.toString();
};

export const profileGetAPI = {
  getFreelancerProfile: async (userId: string) => {
    return await apiService.get<FreelancerProfileDetailDto>(`profile/freelancer/${userId}`);
  },

  getMyFreelancerProfile: async () => {
    return await apiService.get<FreelancerProfileDetailDto>('profile/freelancer/me');
  },

  getMyClientProfile: async () => {
    return await apiService.get<ClientProfileDetailDto>('profile/client/me');
  },

  getClientProfile: async (userId: string) => {
    return await apiService.get<ClientProfileDetailDto>(`profile/client/${userId}`);
  },

  getFreelancers: async (query: FreelancerDirectoryQuery = {}) => {
    const queryString = buildFreelancerDirectoryQuery(query);
    return await apiService.get<PaginatedList<FreelancerSummaryDto>>(
      `profile/freelancers?${queryString}`,
    );
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

