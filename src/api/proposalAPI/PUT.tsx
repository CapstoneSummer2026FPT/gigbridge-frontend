import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ProposalStatus } from '../../types/models/Proposal';

const proposalsUrl = 'Proposals';

export const proposalPutAPI = {
  /**
   * PATCH /api/Proposals/{proposalId}/status
   * Client owner can shortlist/accept/reject, freelancer owner can withdraw.
   */
  updateProposalStatus: async (
    id: string,
    status: ProposalStatus | number
  ): Promise<ApiResponse<boolean>> => {
    return apiService.patch<boolean>(`${proposalsUrl}/${id}/status`, { status: Number(status) });
  },
};
