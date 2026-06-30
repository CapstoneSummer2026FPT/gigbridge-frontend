import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  CreateProposalAnswerRequest,
  CreateProposalRequest,
  CheatingEventLogResponse,
  CompleteQuestionTimerRequest,
  InterviewReviewSessionDto,
  LogProposalCheatingEventRequest,
  ProposalAnswerDto,
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

  /**
   * POST /api/Proposals/{proposalId}/answers
   */
  createProposalAnswer: async (
    proposalId: string,
    data: CreateProposalAnswerRequest
  ): Promise<ApiResponse<ProposalAnswerDto>> => {
    return apiService.post<ProposalAnswerDto>(`${proposalsUrl}/${proposalId}/answers`, data);
  },

  logCheatingEvent: async (
    proposalId: string,
    data: LogProposalCheatingEventRequest
  ): Promise<ApiResponse<CheatingEventLogResponse>> => {
    return apiService.post<CheatingEventLogResponse>(`${proposalsUrl}/${proposalId}/cheating-events`, data);
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

  generateAICoverLetter: async (jobTitle: string, freelancerSkills: string[]): Promise<string> => {
    const skills = freelancerSkills.length ? freelancerSkills.join(', ') : 'your skills';
    return `Hello,\n\nI am interested in helping with ${jobTitle}. My experience with ${skills} makes me confident I can deliver reliable, well-structured work for this project.\n\nI would be glad to discuss the scope, timeline, and expected outcomes in more detail.`;
  },
};
