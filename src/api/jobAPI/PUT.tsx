import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  UpdateJobPostRequest,
  UpdateJobPostStatusRequest,
  UpdateJobPostVisibilityRequest,
} from '../../types/models/Job';

const jobPostsUrl = 'JobPosts';

export const jobPutAPI = {
  /**
   * PUT /api/JobPosts/{jobPostId}
   */
  updateJobPost: async (
    jobPostId: string,
    payload: UpdateJobPostRequest
  ): Promise<ApiResponse<boolean>> => {
    return apiService.put<boolean>(`${jobPostsUrl}/${jobPostId}`, payload);
  },

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