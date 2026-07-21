import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ProposalAnswerDto, ProposalDetailDto, ProposalDto, ProposalJudgingListDto, ProposalQueryParams } from '../../types/models/Proposal';

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
   * GET /api/Proposals/{proposalId}
   * Proposal detail for the owning client or freelancer.
   */
  getProposalDetail: async (
    proposalId: string
  ): Promise<ApiResponse<ProposalDetailDto>> => {
    return apiService.get<ProposalDetailDto>(`${proposalsUrl}/${proposalId}`);
  },

  /**
   * GET /api/Proposals/job/{jobPostId}/my-proposal
   * Current freelancer's proposal for a job post.
   */
  getMyProposalByJobPost: async (
    jobPostId: string
  ): Promise<ApiResponse<ProposalDetailDto>> => {
    return apiService.get<ProposalDetailDto>(`${proposalsUrl}/job/${jobPostId}/my-proposal`);
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
   * GET /api/Proposals/job/{jobPostId}/ai-judging-list
   * Client-only ranked AI proposal judging list and summary stats for a job post.
   */
  getProposalJudgingList: async (
    jobPostId: string,
    params: { recommendedOnly?: boolean; minScore?: number; sortBy?: string } = {}
  ): Promise<ApiResponse<ProposalJudgingListDto>> => {
    return apiService.get<ProposalJudgingListDto>(`${proposalsUrl}/job/${jobPostId}/ai-judging-list`, params);
  },

  /**
   * GET /api/Proposals/{proposalId}/answers
   * Proposal answers visible to the owning client or freelancer.
   */
  getProposalAnswers: async (
    proposalId: string
  ): Promise<ApiResponse<ProposalAnswerDto[]>> => {
    return apiService.get<ProposalAnswerDto[]>(`${proposalsUrl}/${proposalId}/answers`);
  },

  // Backward-compatible helpers for older screens.
  getProposals: async (filters?: { jobId?: string; freelancerId?: string; clientId?: string }) => {
    if (filters?.jobId) {
      return proposalGetAPI.getProposalsByJobPost(filters.jobId);
    }

    return proposalGetAPI.getAllProposals();
  },

  getProposalById: async (id: string) => {
    const response = await proposalGetAPI.getProposalDetail(id);
    return response.data;
  },
};
