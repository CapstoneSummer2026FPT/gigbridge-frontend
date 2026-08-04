import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  SaveDraftJobPostRequest,
  UpdateJobPostRequest,
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
   * PUT /api/JobPosts/{jobPostId}/draft
   */
  saveDraftJobPost: async (
    jobPostId: string,
    payload: SaveDraftJobPostRequest
  ): Promise<ApiResponse<boolean>> => {
    return apiService.put<boolean>(`${jobPostsUrl}/${jobPostId}/draft`, payload);
  },

};
