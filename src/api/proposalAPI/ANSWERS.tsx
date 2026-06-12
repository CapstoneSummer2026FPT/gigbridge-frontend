import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  CreateProposalAnswerRequest,
  ProposalAnswerDto,
  UpdateBulkProposalAnswersRequest,
  UpdateProposalAnswerRequest,
} from '../../types/models/Proposal';

const proposalsUrl = 'Proposals';

export const proposalAnswerAPI = {
  /**
   * GET /api/Proposals/{proposalId}/answers
   */
  getProposalAnswers: async (
    proposalId: string
  ): Promise<ApiResponse<ProposalAnswerDto[]>> => {
    return apiService.get<ProposalAnswerDto[]>(`${proposalsUrl}/${proposalId}/answers`);
  },

  /**
   * POST /api/Proposals/{proposalId}/answers
   */
  createProposalAnswer: async (
    proposalId: string,
    payload: CreateProposalAnswerRequest
  ): Promise<ApiResponse<ProposalAnswerDto>> => {
    return apiService.post<ProposalAnswerDto>(`${proposalsUrl}/${proposalId}/answers`, payload);
  },

  /**
   * PATCH /api/Proposals/{proposalId}/answers/{answerId}
   */
  updateProposalAnswer: async (
    proposalId: string,
    answerId: string,
    payload: UpdateProposalAnswerRequest
  ): Promise<ApiResponse<ProposalAnswerDto>> => {
    return apiService.patch<ProposalAnswerDto>(
      `${proposalsUrl}/${proposalId}/answers/${answerId}`,
      payload
    );
  },

  /**
   * PATCH /api/Proposals/{proposalId}/answers/bulk
   */
  updateBulkProposalAnswers: async (
    proposalId: string,
    payload: UpdateBulkProposalAnswersRequest
  ): Promise<ApiResponse<ProposalAnswerDto[]>> => {
    return apiService.patch<ProposalAnswerDto[]>(
      `${proposalsUrl}/${proposalId}/answers/bulk`,
      payload
    );
  },
};
