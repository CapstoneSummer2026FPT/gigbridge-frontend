import { apiService } from '../../service/apiService';

const savedJobsUrl = 'SavedJobs';

export const savedJobDeleteAPI = {
  unsaveJob: async (jobPostId: string): Promise<boolean> => {
    const response = await apiService.delete<boolean>(`${savedJobsUrl}/${jobPostId}`);

    if (!response.success) {
      throw new Error(response.message || 'Job could not be unsaved.');
    }

    return response.data ?? true;
  },
};
