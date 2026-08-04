import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { SavedFreelancerDto } from '../../types/savedFreelancer';

const savedFreelancersUrl = 'SavedFreelancers';

const unwrap = <T,>(response: ApiResponse<T>, fallback: T): T => {
  if (!response.success) {
    throw new Error(response.message || 'Saved freelancer request failed.');
  }

  return response.data ?? fallback;
};

export const savedFreelancerGetAPI = {
  getMySavedFreelancers: async (): Promise<SavedFreelancerDto[]> => {
    const response = await apiService.get<SavedFreelancerDto[]>(
      `${savedFreelancersUrl}/my-saved-freelancers`,
      { pageIndex: 1, pageSize: 100 },
    );
    return unwrap(response, []);
  },

  checkSavedFreelancer: async (freelancerProfileId: string): Promise<boolean> => {
    const response = await apiService.get<boolean>(`${savedFreelancersUrl}/${freelancerProfileId}/check`);
    return unwrap(response, false);
  },
};
