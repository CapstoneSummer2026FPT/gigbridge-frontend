import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  CreateBulkJobPostQuestionsRequest,
  CreateJobPostQuestionRequest,
  CreateJobPostRequest,
  JobPostQuestionDto,
} from '../../types/models/Job';

const jobPostsUrl = 'JobPosts';

export const jobPostAPI = {
  /**
   * POST /api/JobPosts
   * Client-only create job post.
   */
  createJobPost: async (data: CreateJobPostRequest): Promise<ApiResponse<string>> => {
    return apiService.post<string>(jobPostsUrl, data);
  },

  /**
   * POST /api/JobPosts/{jobPostId}/questions
   * Client-only create one question for a draft job post.
   */
  createJobPostQuestion: async (
    jobPostId: string,
    data: CreateJobPostQuestionRequest
  ): Promise<ApiResponse<JobPostQuestionDto>> => {
    return apiService.post<JobPostQuestionDto>(`${jobPostsUrl}/${jobPostId}/questions`, data);
  },

  /**
   * POST /api/JobPosts/{jobPostId}/questions/bulk
   * Client-only bulk create questions for a draft job post.
   */
  createBulkJobPostQuestions: async (
    jobPostId: string,
    data: CreateBulkJobPostQuestionsRequest
  ): Promise<ApiResponse<JobPostQuestionDto[]>> => {
    return apiService.post<JobPostQuestionDto[]>(`${jobPostsUrl}/${jobPostId}/questions/bulk`, data);
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
