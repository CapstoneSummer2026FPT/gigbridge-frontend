import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { CreateJobPostRequest } from '../../types/models/Job';

const jobPostsUrl = 'JobPosts';

export const jobPostAPI = {
  /**
   * POST /api/JobPosts
   * Client-only create job post.
   */
  createJobPost: async (data: CreateJobPostRequest): Promise<ApiResponse<string>> => {
    return apiService.post<string>(jobPostsUrl, data);
  },

  // Backward-compatible alias for older screens/forms.
  createJob: async (data: CreateJobPostRequest): Promise<ApiResponse<string>> => {
    return jobPostAPI.createJobPost(data);
  },

  generateAIDescription: async (): Promise<ApiResponse<never>> => {
    return {
      success: false,
      statusCode: 501,
      message: 'AI job description generation is not exposed by JobPostsController.',
    };
  },

  applyJob: async (): Promise<ApiResponse<never>> => {
    return {
      success: false,
      statusCode: 501,
      message: 'Apply is handled by ProposalsController, not JobPostsController.',
    };
  },
};
