import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ProposalDetailDto, ProposalDto, ProposalQueryParams } from '../../types/models/Proposal';

const proposalsUrl = 'Proposals';

export const proposalGetAPI = {
  /**
   * GET /api/Proposals/admin/all
   * Admin-only proposal list.
   */
  getAllProposals: async (
    params: ProposalQueryParams = {}
  ): Promise<ApiResponse<ProposalDto[]>> => {
    return apiService.get<ProposalDto[]>(`${proposalsUrl}/admin/all`, params);
  },

  /**
   * GET /api/Proposals/my-proposals
   * Freelancer-only proposal list.
   */
  getMyProposals: async (
    params: ProposalQueryParams = {}
  ): Promise<ApiResponse<ProposalDto[]>> => {
    return apiService.get<ProposalDto[]>(`${proposalsUrl}/my-proposals`, params);
  },

  /**
   * GET /api/Proposals/job/{jobPostId}/proposals
   * Client-only proposals for a job post.
   */
  getProposalsByJobPost: async (
    jobPostId: string,
    params: ProposalQueryParams = {}
  ): Promise<ApiResponse<ProposalDto[]>> => {
    return apiService.get<ProposalDto[]>(`${proposalsUrl}/job/${jobPostId}/proposals`, params);
  },

  /**
   * GET /api/Proposals/{proposalId}
   * Authenticated proposal detail for client/freelancer owners.
   */
  getProposalDetail: async (id: string): Promise<ApiResponse<ProposalDetailDto>> => {
    return apiService.get<ProposalDetailDto>(`${proposalsUrl}/${id}`);
  },

  /**
   * GET /api/Proposals/job/{jobPostId}/my-proposal
   * Freelancer-only proposal detail for a job post.
   */
  getMyProposalByJobPost: async (jobPostId: string): Promise<ApiResponse<ProposalDetailDto>> => {
    return apiService.get<ProposalDetailDto>(`${proposalsUrl}/job/${jobPostId}/my-proposal`);
  },

  // Older mock-only helpers are no longer backed by the current controller.
  getProposals: async (filters?: { jobId?: string; freelancerId?: string; clientId?: string }) => {
    if (filters?.jobId) {
      return proposalGetAPI.getProposalsByJobPost(filters.jobId);
    }

    return proposalGetAPI.getMyProposals();
  },

  getProposalById: async (id: string) => {
    const response = await proposalGetAPI.getProposalDetail(id);
    return response.data;
  },
};
