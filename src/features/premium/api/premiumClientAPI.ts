import { apiService } from '../../../service/apiService';
import type { ApiResponse } from '../../../types/common';
import type {
  AiInterviewDefinition,
  AiInterviewResults,
  JobPostPromotion,
  JobPromotionPolicy,
  TalentMatchingResult,
} from '../types/premiumClient';

const jobUrl = 'JobPosts';

export const premiumClientAPI = {
  promoteJob: (jobPostId: string, idempotencyKey: string): Promise<ApiResponse<JobPostPromotion>> =>
    apiService.post(`${jobUrl}/${jobPostId}/promote`, { idempotencyKey }),

  getTalentMatches: (jobPostId: string, topK = 10): Promise<ApiResponse<TalentMatchingResult>> =>
    apiService.get(`${jobUrl}/${jobPostId}/talent-matches`, { topK }),

  createAiInterview: (
    jobPostId: string,
    request: { language: string; mode: string; questionCount: number }
  ): Promise<ApiResponse<AiInterviewDefinition>> =>
    apiService.post(`${jobUrl}/${jobPostId}/ai-interviews`, request),

  getAiInterviewResults: (jobPostId: string, interviewId: string): Promise<ApiResponse<AiInterviewResults>> =>
    apiService.get(`${jobUrl}/${jobPostId}/ai-interviews/${interviewId}/results`),

  getPromotionPolicy: (): Promise<ApiResponse<JobPromotionPolicy>> =>
    apiService.get('admin/job-promotion-policy'),

  updatePromotionPolicy: (policy: JobPromotionPolicy): Promise<ApiResponse<JobPromotionPolicy>> =>
    apiService.put('admin/job-promotion-policy', policy),
};
