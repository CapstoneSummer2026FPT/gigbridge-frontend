import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  ProposalStatus,
  UpdateProposalRequest,
  UpdateProposalStatusRequest,
} from '../../types/models/Proposal';

const proposalsUrl = 'Proposals';

export const proposalPutAPI = {
  /**
   * PATCH /api/Proposals/{proposalId}/status
   * Client owner can shortlist/accept/reject, freelancer owner can withdraw.
   */
  updateProposalStatus: async (
    id: string,
    status: ProposalStatus | number | UpdateProposalStatusRequest
  ): Promise<ApiResponse<boolean>> => {
    const body = typeof status === 'object' ? status : { status: Number(status) };
    return apiService.patch<boolean>(`${proposalsUrl}/${id}/status`, body);
  },

  /**
   * PUT /api/Proposals/{proposalId}
   * Freelancer-only draft proposal update.
   */
  updateProposal: async (
    id: string,
    payload: UpdateProposalRequest
  ): Promise<ApiResponse<boolean>> => {
    return apiService.put<boolean>(`${proposalsUrl}/${id}`, payload);
  },

  /**
   * POST /api/conversations/proposal/{proposalId}/negotiation
   */
  startNegotiation: async (proposalId: string): Promise<ApiResponse<string>> => {
    return apiService.post<string>(`conversations/proposal/${proposalId}/negotiation`);
  },
};
