import { apiService } from '../../service/apiService';

const savedFreelancersUrl = 'SavedFreelancers';

export const savedFreelancerDeleteAPI = {
  unsaveFreelancer: async (freelancerProfileId: string): Promise<boolean> => {
    const response = await apiService.delete<boolean>(`${savedFreelancersUrl}/${freelancerProfileId}`);

    if (!response.success) {
      throw new Error(response.message || 'Freelancer could not be unsaved.');
    }

    return response.data ?? true;
  },
};
