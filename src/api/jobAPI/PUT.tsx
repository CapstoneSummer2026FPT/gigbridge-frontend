import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  UpdateJobPostStatusRequest,
  UpdateJobPostVisibilityRequest,
} from '../../types/models/Job';

const jobPostsUrl = 'JobPosts';

export const jobPutAPI = {
  /**
   * PATCH /api/JobPosts/{jobPostId}/status
   */
  updateJobPostStatus: async (
    jobPostId: string,
    payload: number | UpdateJobPostStatusRequest
  ): Promise<ApiResponse<boolean>> => {
    const body = typeof payload === 'number' ? { status: payload } : payload;
    return apiService.patch<boolean>(`${jobPostsUrl}/${jobPostId}/status`, body);
  },

  /**
   * PATCH /api/JobPosts/{jobPostId}/visibility
   */
  updateJobPostVisibility: async (
    jobPostId: string,
    payload: number | UpdateJobPostVisibilityRequest
  ): Promise<ApiResponse<boolean>> => {
    const body = typeof payload === 'number' ? { visibility: payload } : payload;
    return apiService.patch<boolean>(`${jobPostsUrl}/${jobPostId}/visibility`, body);
  },
};
