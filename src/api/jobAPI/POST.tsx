import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  CreateBulkJobPostQuestionsRequest,
  CreateDraftJobPostResponse,
  CreateJobPostQuestionRequest,
  CreateJobPostRequest,
  GenerateJobDescriptionRequest,
  GenerateJobDescriptionResponse,
  JobPostPromotionDto,
  PromoteJobPostRequest,
  JobPromotionInteractionDto,
  CreateAiInterviewRequest,
  AiInterviewDefinitionDto,
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
   * POST /api/JobPosts/draft
   * Client-only draft-first job post creation.
   */
  createDraftJobPost: async (): Promise<ApiResponse<CreateDraftJobPostResponse>> => {
    return apiService.post<CreateDraftJobPostResponse>(`${jobPostsUrl}/draft`);
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

  generateAIDescription: async (
    vettingQuestions: string[] | GenerateJobDescriptionRequest
  ): Promise<ApiResponse<GenerateJobDescriptionResponse>> => {
    const data = Array.isArray(vettingQuestions)
      ? { vettingQuestions }
      : vettingQuestions;

    return apiService.post<GenerateJobDescriptionResponse>(`${jobPostsUrl}/ai/generate`, data);
  },

  promoteJobPost: async (jobPostId: string, data: PromoteJobPostRequest): Promise<ApiResponse<JobPostPromotionDto>> =>
    apiService.post<JobPostPromotionDto>(`${jobPostsUrl}/${jobPostId}/promote`, data),

  trackJobPromotionImpression: async (promotionId: string): Promise<ApiResponse<JobPromotionInteractionDto>> =>
    apiService.post<JobPromotionInteractionDto>(`job-promotions/${promotionId}/impression`),

  trackJobPromotionClick: async (promotionId: string): Promise<ApiResponse<JobPromotionInteractionDto>> =>
    apiService.post<JobPromotionInteractionDto>(`job-promotions/${promotionId}/click`),

  uploadJobPromotionImage: async (file: File): Promise<ApiResponse<string>> => {
    const form = new FormData();
    form.append('file', file);
    return apiService.post<string>(`${jobPostsUrl}/promotion-image`, form);
  },

  createAiInterview: async (
    jobPostId: string,
    data: CreateAiInterviewRequest,
  ): Promise<ApiResponse<AiInterviewDefinitionDto>> =>
    apiService.post<AiInterviewDefinitionDto>(`${jobPostsUrl}/${jobPostId}/ai-interviews`, data),

  applyJob: async (): Promise<ApiResponse<never>> => {
    return {
      success: false,
      statusCode: 501,
      message: 'Apply is handled by ProposalsController, not JobPostsController.',
    };
  },
};
