import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  CreateDraftJobPostResponse,
  CreateJobPostQuestionRequest,
  GenerateJobDescriptionRequest,
  GenerateJobDescriptionResponse,
  JobPostPromotionDto,
  PromoteJobPostRequest,
  JobPromotionInteractionDto,
  CreateAiInterviewRequest,
  AiInterviewDefinitionDto,
  JobPostQuestionDto,
  JobPostAttachmentDto,
} from '../../types/models/Job';

const jobPostsUrl = 'JobPosts';

export const jobPostAPI = {
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

  endJobPromotion: async (jobPostId: string): Promise<ApiResponse<JobPostPromotionDto>> =>
    apiService.post<JobPostPromotionDto>(`${jobPostsUrl}/${jobPostId}/promotion/end`),

  trackJobPromotionImpression: async (promotionId: string): Promise<ApiResponse<JobPromotionInteractionDto>> =>
    apiService.post<JobPromotionInteractionDto>(`job-promotions/${promotionId}/impression`),

  trackJobPromotionClick: async (promotionId: string): Promise<ApiResponse<JobPromotionInteractionDto>> =>
    apiService.post<JobPromotionInteractionDto>(`job-promotions/${promotionId}/click`),

  uploadJobPromotionImage: async (file: File): Promise<ApiResponse<string>> => {
    const form = new FormData();
    form.append('file', file);
    return apiService.post<string>(`${jobPostsUrl}/promotion-image`, form);
  },

  uploadJobPostAttachment: async (
    jobPostId: string,
    file: File,
  ): Promise<ApiResponse<JobPostAttachmentDto>> => {
    const form = new FormData();
    form.append('file', file);
    return apiService.post<JobPostAttachmentDto>(`${jobPostsUrl}/${jobPostId}/attachments`, form);
  },

  createAiInterview: async (
    jobPostId: string,
    data: CreateAiInterviewRequest,
  ): Promise<ApiResponse<AiInterviewDefinitionDto>> =>
    apiService.post<AiInterviewDefinitionDto>(`${jobPostsUrl}/${jobPostId}/ai-interviews`, data),

};
