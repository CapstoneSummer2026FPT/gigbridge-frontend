import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';

const jobPostsUrl = 'JobPosts';

export const jobDeleteAPI = {
  /**
   * DELETE /api/JobPosts/{jobPostId}/draft
   */
  deleteEmptyDraftJobPost: async (jobPostId: string): Promise<ApiResponse<boolean>> => {
    return apiService.delete<boolean>(`${jobPostsUrl}/${jobPostId}/draft`);
  },

  /**
   * DELETE /api/JobPosts/{jobPostId}/questions/{questionId}
   */
  deleteJobPostQuestion: async (
    jobPostId: string,
    questionId: string
  ): Promise<ApiResponse<boolean>> => {
    return apiService.delete<boolean>(`${jobPostsUrl}/${jobPostId}/questions/${questionId}`);
  },
};
