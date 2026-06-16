import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';

export const proposalPutAPI = {
  /**
   * PATCH /api/Proposals/{id}/status
   */
  updateProposalStatus: async (id: string, status: number): Promise<ApiResponse<boolean>> => {
    return apiService.patch<boolean>(`Proposals/${id}/status`, { status });
  },

  /**
   * POST /api/conversations/proposal/{proposalId}/negotiation
   */
  startNegotiation: async (proposalId: string): Promise<ApiResponse<string>> => {
    return apiService.post<string>(`conversations/proposal/${proposalId}/negotiation`);
  },
};
