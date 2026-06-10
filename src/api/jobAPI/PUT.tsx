import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';

const jobPostsUrl = 'JobPosts';

export const jobPutAPI = {
  /**
   * PATCH /api/JobPosts/{jobPostId}/status
   */
  updateJobPostStatus: async (
    jobPostId: string,
    status: number
  ): Promise<ApiResponse<boolean>> => {
    return apiService.patch<boolean>(`${jobPostsUrl}/${jobPostId}/status`, { status });
  },

  /**
   * PATCH /api/JobPosts/{jobPostId}/visibility
   */
  updateJobPostVisibility: async (
    jobPostId: string,
    visibility: number
  ): Promise<ApiResponse<boolean>> => {
    return apiService.patch<boolean>(`${jobPostsUrl}/${jobPostId}/visibility`, { visibility });
  },
};
