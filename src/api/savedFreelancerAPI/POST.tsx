import { apiService } from '../../service/apiService';

const savedFreelancersUrl = 'SavedFreelancers';

export const savedFreelancerPostAPI = {
  saveFreelancer: async (freelancerProfileId: string): Promise<string> => {
    const response = await apiService.post<string>(`${savedFreelancersUrl}/${freelancerProfileId}`);

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Freelancer could not be saved.');
    }

    return response.data;
  },
};
