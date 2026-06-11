import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  CreateBulkJobPostQuestionsRequest,
  CreateJobPostQuestionRequest,
  JobPostQuestionDto,
  UpdateBulkJobPostQuestionsRequest,
  UpdateJobPostQuestionRequest,
  UpdateJobPostQuestionRequiredRequest,
} from '../../types/models/Job';

const jobPostsUrl = 'JobPosts';

export const jobQuestionAPI = {
  /**
   * GET /api/JobPosts/{jobPostId}/questions
   */
  getJobPostQuestions: async (
    jobPostId: string
  ): Promise<ApiResponse<JobPostQuestionDto[]>> => {
    return apiService.get<JobPostQuestionDto[]>(`${jobPostsUrl}/${jobPostId}/questions`);
  },

  /**
   * POST /api/JobPosts/{jobPostId}/questions
   */
  createJobPostQuestion: async (
    jobPostId: string,
    payload: CreateJobPostQuestionRequest
  ): Promise<ApiResponse<JobPostQuestionDto>> => {
    return apiService.post<JobPostQuestionDto>(`${jobPostsUrl}/${jobPostId}/questions`, payload);
  },

  /**
   * POST /api/JobPosts/{jobPostId}/questions/bulk
   */
  createBulkJobPostQuestions: async (
    jobPostId: string,
    payload: CreateBulkJobPostQuestionsRequest
  ): Promise<ApiResponse<JobPostQuestionDto[]>> => {
    return apiService.post<JobPostQuestionDto[]>(`${jobPostsUrl}/${jobPostId}/questions/bulk`, payload);
  },

  /**
   * PATCH /api/JobPosts/{jobPostId}/questions/{questionId}
   */
  updateJobPostQuestion: async (
    jobPostId: string,
    questionId: string,
    payload: UpdateJobPostQuestionRequest
  ): Promise<ApiResponse<JobPostQuestionDto>> => {
    return apiService.patch<JobPostQuestionDto>(
      `${jobPostsUrl}/${jobPostId}/questions/${questionId}`,
      payload
    );
  },

  /**
   * PATCH /api/JobPosts/{jobPostId}/questions/{questionId}/required
   */
  updateJobPostQuestionRequired: async (
    jobPostId: string,
    questionId: string,
    payload: UpdateJobPostQuestionRequiredRequest
  ): Promise<ApiResponse<JobPostQuestionDto>> => {
    return apiService.patch<JobPostQuestionDto>(
      `${jobPostsUrl}/${jobPostId}/questions/${questionId}/required`,
      payload
    );
  },

  /**
   * PATCH /api/JobPosts/{jobPostId}/questions/bulk
   */
  updateBulkJobPostQuestions: async (
    jobPostId: string,
    payload: UpdateBulkJobPostQuestionsRequest
  ): Promise<ApiResponse<JobPostQuestionDto[]>> => {
    return apiService.patch<JobPostQuestionDto[]>(
      `${jobPostsUrl}/${jobPostId}/questions/bulk`,
      payload
    );
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
