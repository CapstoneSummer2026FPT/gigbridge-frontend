import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  CreateDraftJobPostResponse,
  CreateJobPostQuestionRequest,
  GenerateJobDescriptionRequest,
  GenerateJobDescriptionDetailsResponse,
  GenerateJobHiringPlanRequest,
  GenerateJobHiringPlanResponse,
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


  generateAIDetails: async (
    data: GenerateJobDescriptionRequest
  ): Promise<ApiResponse<GenerateJobDescriptionDetailsResponse>> => {
    return apiService.post<GenerateJobDescriptionDetailsResponse>(`${jobPostsUrl}/ai/generate/details`, data);
  },

  generateAIHiringPlan: async (
    data: GenerateJobHiringPlanRequest,
    signal?: AbortSignal,
  ): Promise<ApiResponse<GenerateJobHiringPlanResponse>> => {
    return apiService.post<GenerateJobHiringPlanResponse>(`${jobPostsUrl}/ai/generate/hiring-plan`, data, {}, signal);
  },

  promoteJobPost: async (jobPostId: string, data: PromoteJobPostRequest): Promise<ApiResponse<JobPostPromotionDto>> =>
    apiService.post<JobPostPromotionDto>(`${jobPostsUrl}/${jobPostId}/promote`, data),

  endJobPromotion: async (jobPostId: string): Promise<ApiResponse<JobPostPromotionDto>> =>
    apiService.post<JobPostPromotionDto>(`${jobPostsUrl}/${jobPostId}/promotion/end`),

  trackJobPromotionImpression: async (
    promotionId: string,
    visitorKey: string,
  ): Promise<ApiResponse<JobPromotionInteractionDto>> =>
    apiService.post<JobPromotionInteractionDto>(
      `job-promotions/${promotionId}/impression`, {}, { 'X-Promotion-Visitor': visitorKey }),

  trackJobPromotionClick: async (
    promotionId: string,
    visitorKey: string,
  ): Promise<ApiResponse<JobPromotionInteractionDto>> =>
    apiService.post<JobPromotionInteractionDto>(
      `job-promotions/${promotionId}/click`, {}, { 'X-Promotion-Visitor': visitorKey }),

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
