import { apiService } from '../../service/apiService';

const savedFreelancersUrl = 'SavedFreelancers';

export const savedFreelancerPostAPI = {
  saveFreelancer: async (freelancerProfileId: string, matchRunId?: string): Promise<string> => {
    const attribution = matchRunId ? `?matchRunId=${encodeURIComponent(matchRunId)}` : '';
    const response = await apiService.post<string>(
      `${savedFreelancersUrl}/${freelancerProfileId}${attribution}`,
    );

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Freelancer could not be saved.');
    }

    return response.data;
  },
};
