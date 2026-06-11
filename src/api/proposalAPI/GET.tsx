import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ProposalDto, ProposalQueryParams } from '../../types/models/Proposal';
import { jobGetAPI } from '../jobAPI/GET';

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
   * Client all proposals assembler
   * Combines all job posts and their proposals.
   */
  getClientAllProposals: async (): Promise<ApiResponse<ProposalDto[]>> => {
    try {
      const jobsRes = await jobGetAPI.getMyJobPosts({ pageIndex: 1, pageSize: 100 });
      if (!jobsRes.success || !jobsRes.data) {
        return { success: false, statusCode: jobsRes.statusCode, message: jobsRes.message, data: [] };
      }
      const allProposals: ProposalDto[] = [];
      for (const job of jobsRes.data) {
        const proposalsRes = await proposalGetAPI.getProposalsByJobPost(job.jobPostsId, { pageIndex: 1, pageSize: 100 });
        if (proposalsRes.success && proposalsRes.data) {
          allProposals.push(...proposalsRes.data);
        }
      }
      return { success: true, statusCode: 200, message: 'Success', data: allProposals };
    } catch (err: any) {
      return { success: false, statusCode: 500, message: err.message || 'Failed to get client proposals', data: [] };
    }
  },

  // Older mock-only helpers are no longer backed by the current controller.
  getProposals: async (filters?: { jobId?: string; freelancerId?: string; clientId?: string }) => {
    if (filters?.jobId) {
      return proposalGetAPI.getProposalsByJobPost(filters.jobId);
    }

    return proposalGetAPI.getAllProposals();
  },

  getProposalById: async (id: string): Promise<ApiResponse<ProposalDto>> => {
    return apiService.get<ProposalDto>(`${proposalsUrl}/${id}`);
  },
};
