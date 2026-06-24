import { apiService } from '../../service/apiService';

const savedJobsUrl = 'SavedJobs';

export const savedJobPostAPI = {
  saveJob: async (jobPostId: string): Promise<string> => {
    const response = await apiService.post<string>(`${savedJobsUrl}/${jobPostId}`);

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Job could not be saved.');
    }

    return response.data;
  },
};
