import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { CreateProposalRequest } from '../../types/models/Proposal';

const proposalsUrl = 'Proposals';

export const proposalPostAPI = {
  /**
   * POST /api/Proposals
   * Freelancer-only proposal submission.
   */
  createProposal: async (data: CreateProposalRequest): Promise<ApiResponse<string>> => {
    return apiService.post<string>(proposalsUrl, data);
  },

  generateAICoverLetter: async (): Promise<ApiResponse<never>> => {
    return {
      success: false,
      statusCode: 501,
      message: 'AI cover letter generation is not exposed by ProposalsController.',
    };
  },
};
