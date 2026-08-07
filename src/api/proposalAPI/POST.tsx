import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  BatchJudgeResultDto,
  CreateProposalRequest,
  CompleteQuestionTimerRequest,
  InterviewReviewSessionDto,
  QuestionTimerStateDto,
} from '../../types/models/Proposal';

const proposalsUrl = 'Proposals';



export const proposalPostAPI = {
  /**
   * POST /api/Proposals
   * Creates a draft proposal for the current freelancer.
   */
  createProposal: async (data: CreateProposalRequest): Promise<ApiResponse<string>> => {
    return apiService.post<string>(proposalsUrl, data);
  },

  startQuestionTimer: async (
    proposalId: string,
    questionId: string
  ): Promise<ApiResponse<QuestionTimerStateDto>> => {
    return apiService.post<QuestionTimerStateDto>(`${proposalsUrl}/${proposalId}/question-timers/${questionId}/start`);
  },

  completeQuestionTimer: async (
    proposalId: string,
    questionId: string,
    data: CompleteQuestionTimerRequest
  ): Promise<ApiResponse<QuestionTimerStateDto>> => {
    return apiService.post<QuestionTimerStateDto>(`${proposalsUrl}/${proposalId}/question-timers/${questionId}/complete`, data);
  },

  startInterviewReview: async (
    proposalId: string
  ): Promise<ApiResponse<InterviewReviewSessionDto>> => {
    return apiService.post<InterviewReviewSessionDto>(`${proposalsUrl}/${proposalId}/interview-review/start`);
  },

  completeInterviewReview: async (
    proposalId: string
  ): Promise<ApiResponse<InterviewReviewSessionDto>> => {
    return apiService.post<InterviewReviewSessionDto>(`${proposalsUrl}/${proposalId}/interview-review/complete`);
  },

  acceptForNegotiation: async (proposalId: string): Promise<ApiResponse<string>> => {
    return apiService.post<string>(`${proposalsUrl}/${proposalId}/accept-for-negotiation`);
  },

  judgeAllProposals: async (
    jobPostId: string,
    batchSize: number = 10
  ): Promise<ApiResponse<BatchJudgeResultDto>> => {
    return apiService.post<BatchJudgeResultDto>(`${proposalsUrl}/job/${jobPostId}/ai-judge-all?batchSize=${batchSize}`);
  },

  generateAICoverLetter: async (jobTitle: string, freelancerSkills: string[]): Promise<string> => {
    const skills = freelancerSkills.length ? freelancerSkills.join(', ') : 'your skills';
    return `Hello,\n\nI am interested in helping with ${jobTitle}. My experience with ${skills} makes me confident I can deliver reliable, well-structured work for this project.\n\nI would be glad to discuss the scope, timeline, and expected outcomes in more detail.`;
  },
};
