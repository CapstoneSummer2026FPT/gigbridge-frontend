import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { UpdateProposalRequest } from '../../types/models/Proposal';

const proposalsUrl = 'Proposals';

export const proposalPutAPI = {
  /**
   * PUT /api/Proposals/{proposalId}
   */
  updateProposal: async (
    proposalId: string,
    data: UpdateProposalRequest
  ): Promise<ApiResponse<boolean>> => {
    return apiService.put<boolean>(`${proposalsUrl}/${proposalId}`, data);
  },

  /**
   * POST /api/conversations/proposal/{proposalId}/negotiation
   */
  startNegotiation: async (proposalId: string): Promise<ApiResponse<string>> => {
    return apiService.post<string>(`conversations/proposal/${proposalId}/negotiation`);
  },
};