import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ProposalAnswerDto, ProposalDetailDto, ProposalDto, ProposalJudgingListDto, ProposalQueryParams, ProposalListPageDto } from '../../types/models/Proposal';

const proposalsUrl = 'Proposals';

interface PaginatedProposalResponse {
  items?: ProposalDto[];
  Items?: ProposalDto[];
  pageNumber?: number;
  PageNumber?: number;
  totalPages?: number;
  TotalPages?: number;
  totalCount?: number;
  TotalCount?: number;
  hasPreviousPage?: boolean;
  HasPreviousPage?: boolean;
  hasNextPage?: boolean;
  HasNextPage?: boolean;
}

export const normalizeProposalList = (data: unknown): ProposalDto[] => {
  if (Array.isArray(data)) return data as ProposalDto[];
  if (!data || typeof data !== 'object') return [];

  const page = data as PaginatedProposalResponse;
  const items = page.items ?? page.Items;
  return Array.isArray(items) ? items : [];
};

const hasProposalListShape = (data: unknown): boolean => {
  if (Array.isArray(data)) return true;
  if (!data || typeof data !== 'object') return false;

  const page = data as PaginatedProposalResponse;
  return Array.isArray(page.items ?? page.Items);
};

export const normalizeProposalPage = (data: unknown): ProposalListPageDto => {
  const page = data && typeof data === 'object' && !Array.isArray(data)
    ? data as PaginatedProposalResponse
    : {};
  const items = normalizeProposalList(data);

  return {
    items,
    pageNumber: Number(page.pageNumber ?? page.PageNumber) || 1,
    totalPages: Number(page.totalPages ?? page.TotalPages) || 1,
    totalCount: Number(page.totalCount ?? page.TotalCount) || items.length,
    hasPreviousPage: Boolean(page.hasPreviousPage ?? page.HasPreviousPage),
    hasNextPage: Boolean(page.hasNextPage ?? page.HasNextPage),
  };
};

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
   * Freelancer-only proposal list (paginated).
   */
  getMyProposals: async (
    params: ProposalQueryParams = {}
  ): Promise<ApiResponse<ProposalListPageDto>> => {
    const response = await apiService.get<unknown>(`${proposalsUrl}/my-proposals`, params);
    const hasValidData = hasProposalListShape(response.data);

    return {
      ...response,
      success: response.success && hasValidData,
      message: response.success && !hasValidData
        ? 'The proposals API returned an invalid list response.'
        : response.message,
      data: normalizeProposalPage(response.data),
    };
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
};
