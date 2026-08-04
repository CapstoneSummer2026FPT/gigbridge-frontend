import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { SavedJobDto } from '../../types/savedJob';

const savedJobsUrl = 'SavedJobs';

const unwrap = <T,>(response: ApiResponse<T>, fallback: T): T => {
  if (!response.success) {
    throw new Error(response.message || 'Saved job request failed.');
  }

  return response.data ?? fallback;
};

export const savedJobGetAPI = {
  getMySavedJobs: async (): Promise<SavedJobDto[]> => {
    const response = await apiService.get<SavedJobDto[]>(`${savedJobsUrl}/my-saved-jobs`);
    return unwrap(response, []);
  },

  checkSavedJob: async (jobPostId: string): Promise<boolean> => {
    const response = await apiService.get<boolean>(`${savedJobsUrl}/${jobPostId}/check`);
    return unwrap(response, false);
  },
};
