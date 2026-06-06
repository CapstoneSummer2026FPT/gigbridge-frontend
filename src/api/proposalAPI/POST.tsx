import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import { proposalHandlers } from '../../mock_backend';
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

  generateAICoverLetter: async (jobTitle: string, freelancerSkills: string[]) => {
    return await proposalHandlers.generateAICoverLetter(jobTitle, freelancerSkills);
  },
};
