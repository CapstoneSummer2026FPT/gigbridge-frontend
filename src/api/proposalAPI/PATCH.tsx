import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  ProposalAnswerDto,
  UpdateBulkProposalAnswersRequest,
  UpdateProposalStatusRequest,
  UpdateProposalStatusResponse,
} from '../../types/models/Proposal';

const proposalsUrl = 'Proposals';

export const proposalPatchAPI = {
  /**
   * PATCH /api/Proposals/{proposalId}/status
   */
  updateProposalStatus: async (
    proposalId: string,
    data: UpdateProposalStatusRequest
  ): Promise<ApiResponse<UpdateProposalStatusResponse>> => {
    return apiService.patch<UpdateProposalStatusResponse>(`${proposalsUrl}/${proposalId}/status`, data);
  },

  /**
   * PATCH /api/Proposals/{proposalId}/answers/bulk
   */
  updateBulkProposalAnswers: async (
    proposalId: string,
    data: UpdateBulkProposalAnswersRequest
  ): Promise<ApiResponse<ProposalAnswerDto[]>> => {
    return apiService.patch<ProposalAnswerDto[]>(`${proposalsUrl}/${proposalId}/answers/bulk`, data);
  },
};
