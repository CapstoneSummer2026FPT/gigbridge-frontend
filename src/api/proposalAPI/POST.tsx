import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  BatchJudgeResultDto,
  CreateProposalRequest,
  CompleteQuestionTimerRequest,
  InterviewReviewSessionDto,
  QuestionTimerStateDto,
  VettingEvaluationResponseDto,
} from '../../types/models/Proposal';

const proposalsUrl = 'Proposals';

/** Snake_case payload shape returned by the AI interview-judging endpoint. */
interface RawVettingGradedQuestion {
  question_index: number;
  question_text: string;
  question_type: string;
  difficulty: string;
  candidate_answer: string;
  score: number;
  feedback: string;
}

interface RawVettingEvaluationResponse {
  score: number;
  summary: string;
  technical_skills: string[] | null;
  soft_skills: string[] | null;
  recommended_hire: boolean;
  holistic_adjustment: number | null;
  holistic_adjustment_reason: string | null;
  graded_questions: RawVettingGradedQuestion[] | null;
}

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

  evaluateVettingAnswers: async (
    proposalId: string,
    onlyIfCached: boolean = false
  ): Promise<ApiResponse<VettingEvaluationResponseDto>> => {
    const url = `${proposalsUrl}/${proposalId}/answer-evaluation${onlyIfCached ? '?onlyIfCached=true' : ''}`;
    const response = await apiService.post<RawVettingEvaluationResponse>(url);
    if (response.success && response.data) {
      const raw = response.data;
      const mapped: VettingEvaluationResponseDto = {
        score: raw.score,
        summary: raw.summary,
        technicalSkills: raw.technical_skills ?? [],
        softSkills: raw.soft_skills ?? [],
        recommendedHire: !!raw.recommended_hire,
        holisticAdjustment: raw.holistic_adjustment ?? 0,
        holisticAdjustmentReason: raw.holistic_adjustment_reason ?? '',
        gradedQuestions: (raw.graded_questions ?? []).map(q => ({
          questionIndex: q.question_index,
          questionText: q.question_text,
          questionType: q.question_type,
          difficulty: q.difficulty,
          candidateAnswer: q.candidate_answer,
          score: q.score,
          feedback: q.feedback,
        })),
      };
      return {
        ...response,
        data: mapped,
      };
    }
    // On failure the payload carries no data; normalize it explicitly so the
    // error branch satisfies the DTO-typed response contract.
    return { ...response, data: undefined };
  },

  generateAICoverLetter: async (jobTitle: string, freelancerSkills: string[]): Promise<string> => {
    const skills = freelancerSkills.length ? freelancerSkills.join(', ') : 'your skills';
    return `Hello,\n\nI am interested in helping with ${jobTitle}. My experience with ${skills} makes me confident I can deliver reliable, well-structured work for this project.\n\nI would be glad to discuss the scope, timeline, and expected outcomes in more detail.`;
  },
};
