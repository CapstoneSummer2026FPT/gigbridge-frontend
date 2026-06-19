import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { UpdateJobPostRequest } from '../../types/models/Job';

const jobPostsUrl = 'JobPosts';

export const jobPutAPI = {
  /**
   * PUT /api/JobPosts/{jobPostId}
   * Client-only full editable JobPost update.
   */
  updateJobPost: async (
    jobPostId: string,
    data: UpdateJobPostRequest
  ): Promise<ApiResponse<boolean>> => {
    return apiService.put<boolean>(`${jobPostsUrl}/${jobPostId}`, data);
  },
};
