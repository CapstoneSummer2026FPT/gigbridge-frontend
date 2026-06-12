import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  ContractDetailResponse,
  ContractDto,
  ContractQueryParams,
  Milestone,
  MilestoneAttachment,
} from '../../types/models/Contract';

const contractsUrl = 'Contracts';
const workflowContractsUrl = 'contracts';

const normalizeContract = (contract: any): ContractDto => {
  const contractId = contract.contractId ?? contract.contractsId ?? '';
  const jobPostId = contract.jobPostId ?? contract.jobPostsId ?? '';
  const clientProfileId = contract.clientProfileId ?? contract.clientProfilesId ?? '';
  const freelancerProfileId = contract.freelancerProfileId ?? contract.freelancerProfilesId ?? null;
  const proposalId = contract.proposalId ?? contract.proposalsId ?? null;

  return {
    contractId,
    jobPostId,
    clientProfileId,
    freelancerProfileId,
    proposalId,
    title: contract.title ?? '',
    description: contract.description ?? null,
    totalBudget: Number(contract.totalBudget ?? 0),
    scopeOfWork: contract.scopeOfWork ?? null,
    paymentTerms: contract.paymentTerms ?? null,
    intellectualPropertyTerms: contract.intellectualPropertyTerms ?? null,
    confidentialityTerms: contract.confidentialityTerms ?? null,
    cancellationTerms: contract.cancellationTerms ?? null,
    disputeTerms: contract.disputeTerms ?? null,
    status: contract.status ?? 0,
    startDate: contract.startDate ?? null,
    endDate: contract.endDate ?? null,
    createdAt: contract.createdAt ?? new Date().toISOString(),
    updatedAt: contract.updatedAt ?? null,
    escrow: contract.escrow ?? null,

    contractsId: contractId,
    jobPostsId: jobPostId,
    clientProfilesId: clientProfileId,
    freelancerProfilesId: freelancerProfileId,
    proposalsId: proposalId,
    completedAt: contract.completedAt ?? null,
    esignContractPdfUrl: contract.esignContractPdfUrl ?? null,
    milestones: contract.milestones,
  };
};

const normalizeMilestone = (milestone: any): Milestone => {
  const milestoneId = milestone.milestoneId ?? milestone.id ?? '';
  const contractId = milestone.contractId ?? milestone.contract_id ?? '';
  const dueDate = milestone.dueDate ?? milestone.due_date ?? null;
  const lastReleasedAt = milestone.lastReleasedAt ?? milestone.paid_at ?? null;

  return {
    milestoneId,
    contractId,
    title: milestone.title ?? '',
    amount: Number(milestone.amount ?? 0),
    dueDate,
    status: milestone.status ?? 0,
    sortOrder: milestone.sortOrder ?? null,
    startedAt: milestone.startedAt ?? null,
    submittedAt: milestone.submittedAt ?? null,
    approvedAt: milestone.approvedAt ?? null,
    releasedAmount: milestone.releasedAmount ?? null,
    lastReleasedAt,

    id: milestoneId,
    contract_id: contractId,
    due_date: dueDate,
    paid_at: lastReleasedAt,
    percentageComplete: milestone.percentageComplete,
    isOverdue: milestone.isOverdue,
  };
};

function withData<T>(response: ApiResponse<any>, data: T): ApiResponse<T> {
  return {
    ...response,
    data,
  };
}

export const contractGetAPI = {
  /**
   * GET /api/Contracts/all
   * Admin-only contracts list if exposed by the backend.
   */
  getAllContracts: async (
    params: ContractQueryParams = {}
  ): Promise<ApiResponse<ContractDto[]>> => {
    const response = await apiService.get<any[]>(`${contractsUrl}/all`, params);
    return withData(response, (response.data || []).map(normalizeContract));
  },

  /**
   * User contracts list. Current backend exposes contract detail by job post,
   * so this helper resolves contracts through conversations when available.
   */
  getMyContracts: async (): Promise<ApiResponse<ContractDto[]>> => {
    try {
      const conversationsResponse = await apiService.get<any[]>('conversations');
      if (!conversationsResponse.success || !conversationsResponse.data) {
        return {
          success: conversationsResponse.success,
          statusCode: conversationsResponse.statusCode,
          message: conversationsResponse.message,
          data: [],
        };
      }

      const uniqueJobPostIds = Array.from(new Set(
        conversationsResponse.data
          .map(conversation => conversation.jobPostId ?? conversation.JobPostId)
          .filter(Boolean)
      ));

      const contracts: ContractDto[] = [];
      for (const jobPostId of uniqueJobPostIds) {
        const contractResponse = await contractGetAPI.getContractByJobPost(String(jobPostId));
        if (contractResponse.success && contractResponse.data) {
          contracts.push(contractResponse.data);
        }
      }

      return {
        success: true,
        statusCode: 200,
        message: 'Success',
        data: contracts,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: error instanceof Error ? error.message : 'Failed to retrieve user contracts',
        data: [],
      };
    }
  },

  /**
   * GET /api/Contracts/job/{jobPostId}
   */
  getContractByJobPost: async (
    jobPostId: string
  ): Promise<ApiResponse<ContractDto>> => {
    const response = await apiService.get<ContractDetailResponse>(`${contractsUrl}/job/${jobPostId}`);
    return withData(response, response.data ? normalizeContract(response.data) : undefined as any);
  },

  /**
   * Resolve a contract route id through conversations, then fetch by job post.
   */
  getContractById: async (
    id: string
  ): Promise<ApiResponse<ContractDto>> => {
    try {
      const conversationsResponse = await apiService.get<any[]>('conversations');
      if (conversationsResponse.success && conversationsResponse.data) {
        const conversation = conversationsResponse.data.find(item =>
          String(item.contractId ?? item.ContractId ?? '') === id
        );
        const jobPostId = conversation?.jobPostId ?? conversation?.JobPostId;

        if (jobPostId) {
          return contractGetAPI.getContractByJobPost(String(jobPostId));
        }
      }

      return {
        success: false,
        statusCode: 404,
        message: 'Contract not found for this route id.',
        data: undefined,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        message: error instanceof Error ? error.message : 'Failed to get contract details',
        data: undefined,
      };
    }
  },

  /**
   * No current backend route exists for proposal-to-contract lookup.
   */
  getContractByProposal: async (_proposalId?: string): Promise<ApiResponse<ContractDto>> => {
    return {
      success: false,
      statusCode: 501,
      message: 'Contract lookup by proposal is not exposed by the current backend contract API.',
      data: undefined,
    };
  },

  getClientContracts: async (
    _clientId?: string,
    _params: ContractQueryParams = {}
  ): Promise<ApiResponse<ContractDto[]>> => {
    return contractGetAPI.getMyContracts();
  },

  getFreelancerContracts: async (
    _freelancerId?: string,
    _params: ContractQueryParams = {}
  ): Promise<ApiResponse<ContractDto[]>> => {
    return contractGetAPI.getMyContracts();
  },

  /**
   * GET /api/contracts/{contractId}/milestones
   */
  getMilestonesByContract: async (
    contractId: string
  ): Promise<ApiResponse<Milestone[]>> => {
    const response = await apiService.get<any[]>(`${workflowContractsUrl}/${contractId}/milestones`);
    return withData(response, (response.data || []).map(normalizeMilestone));
  },

  getMilestoneById: async (
    contractIdOrMilestoneId: string,
    maybeMilestoneId?: string
  ): Promise<ApiResponse<Milestone>> => {
    const contractId = maybeMilestoneId ? contractIdOrMilestoneId : '';
    const milestoneId = maybeMilestoneId || contractIdOrMilestoneId;

    if (!contractId) {
      return {
        success: false,
        statusCode: 501,
        message: 'Milestone detail by id is not exposed by the current backend contract API.',
        data: undefined,
      };
    }

    const response = await contractGetAPI.getMilestonesByContract(contractId);
    return withData(
      response,
      response.data?.find(milestone => milestone.milestoneId === milestoneId) as Milestone
    );
  },

  getMilestoneAttachments: async (): Promise<ApiResponse<MilestoneAttachment[]>> => {
    return {
      success: false,
      statusCode: 501,
      message: 'Milestone attachments are not exposed by the current backend contract API.',
      data: [],
    };
  },
};
