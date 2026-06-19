import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ContractDto, ContractQueryParams, Milestone, MilestoneAttachment } from '../../types/models/Contract';

const contractsUrl = 'Contracts';
const milestonesUrl = 'Milestones';

interface BackendContractResponse {
  contractsId?: string;
  ContractsId?: string;
  contractId?: string;
  ContractId?: string;
  jobPostsId?: string;
  JobPostsId?: string;
  jobPostId?: string;
  JobPostId?: string;
  clientProfilesId?: string;
  ClientProfilesId?: string;
  clientProfileId?: string;
  ClientProfileId?: string;
  freelancerProfilesId?: string | null;
  FreelancerProfilesId?: string | null;
  freelancerProfileId?: string | null;
  FreelancerProfileId?: string | null;
  proposalsId?: string | null;
  ProposalsId?: string | null;
  proposalId?: string | null;
  ProposalId?: string | null;
  title?: string;
  Title?: string;
  description?: string | null;
  Description?: string | null;
  totalBudget?: number;
  TotalBudget?: number;
  status?: number;
  Status?: number;
  startDate?: string | null;
  StartDate?: string | null;
  endDate?: string | null;
  EndDate?: string | null;
  completedAt?: string | null;
  CompletedAt?: string | null;
  esignContractPdfUrl?: string | null;
  EsignContractPdfUrl?: string | null;
  createdAt?: string;
  CreatedAt?: string;
  updatedAt?: string | null;
  UpdatedAt?: string | null;
  clientName?: string;
  ClientName?: string;
  freelancerName?: string | null;
  FreelancerName?: string | null;
}

interface BackendMilestoneResponse {
  id?: string;
  milestoneId?: string;
  MilestoneId?: string;
  milestonesId?: string;
  MilestonesId?: string;
  contract_id?: string;
  contractId?: string;
  ContractId?: string;
  contractsId?: string;
  ContractsId?: string;
  title?: string;
  Title?: string;
  amount?: number;
  Amount?: number;
  due_date?: string | null;
  dueDate?: string | null;
  DueDate?: string | null;
  status?: number;
  Status?: number;
  paid_at?: string | null;
  lastReleasedAt?: string | null;
  LastReleasedAt?: string | null;
  releasedAmount?: number;
  ReleasedAmount?: number;
}

const getValue = <T,>(source: Record<string, unknown>, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) {
      return value as T;
    }
  }
  return undefined;
};

const normalizeContract = (contract: BackendContractResponse): ContractDto => {
  const source = contract as Record<string, unknown>;

  return {
    contractsId: String(getValue(source, 'contractsId', 'ContractsId', 'contractId', 'ContractId') ?? ''),
    jobPostsId: String(getValue(source, 'jobPostsId', 'JobPostsId', 'jobPostId', 'JobPostId') ?? ''),
    clientProfilesId: String(getValue(source, 'clientProfilesId', 'ClientProfilesId', 'clientProfileId', 'ClientProfileId') ?? ''),
    freelancerProfilesId: getValue<string | null>(source, 'freelancerProfilesId', 'FreelancerProfilesId', 'freelancerProfileId', 'FreelancerProfileId') ?? null,
    proposalsId: getValue<string | null>(source, 'proposalsId', 'ProposalsId', 'proposalId', 'ProposalId') ?? null,
    title: String(getValue(source, 'title', 'Title') ?? 'Untitled Contract'),
    description: getValue<string | undefined>(source, 'description', 'Description'),
    totalBudget: Number(getValue(source, 'totalBudget', 'TotalBudget') ?? 0),
    status: Number(getValue(source, 'status', 'Status') ?? 0),
    startDate: getValue<string | undefined>(source, 'startDate', 'StartDate'),
    endDate: getValue<string | undefined>(source, 'endDate', 'EndDate'),
    completedAt: getValue<string | undefined>(source, 'completedAt', 'CompletedAt'),
    esignContractPdfUrl: getValue<string | undefined>(source, 'esignContractPdfUrl', 'EsignContractPdfUrl'),
    createdAt: String(getValue(source, 'createdAt', 'CreatedAt') ?? new Date().toISOString()),
    updatedAt: getValue<string | undefined>(source, 'updatedAt', 'UpdatedAt'),
    clientName: getValue<string | undefined>(source, 'clientName', 'ClientName'),
    freelancerName: getValue<string | null>(source, 'freelancerName', 'FreelancerName') ?? null,
  };
};

const normalizeMilestone = (milestone: BackendMilestoneResponse): Milestone => {
  const source = milestone as Record<string, unknown>;
  const id = String(getValue(source, 'id', 'milestoneId', 'MilestoneId', 'milestonesId', 'MilestonesId') ?? '');
  const contractId = String(getValue(source, 'contract_id', 'contractId', 'ContractId', 'contractsId', 'ContractsId') ?? '');
  const status = Number(getValue(source, 'status', 'Status') ?? 0);
  const paidAt = getValue<string | null>(source, 'paid_at', 'lastReleasedAt', 'LastReleasedAt');

  return {
    id,
    contract_id: contractId,
    title: String(getValue(source, 'title', 'Title') ?? 'Untitled Milestone'),
    amount: Number(getValue(source, 'amount', 'Amount') ?? 0),
    due_date: getValue<string | undefined>(source, 'due_date', 'dueDate', 'DueDate') ?? '',
    status,
    paid_at: paidAt ?? null,
  };
};

export const contractGetAPI = {
  /**
   * GET /api/Contracts/all
   * Admin-only contracts list with filters
   */
  getAllContracts: async (
    params: ContractQueryParams = {}
  ): Promise<ApiResponse<ContractDto[]>> => {
    return apiService.get<ContractDto[]>(`${contractsUrl}/all`, params);
  },

  /**
   * GET /api/Contracts/my-contracts
   * User contracts list (client or freelancer) via conversation lookups
   */
  getMyContracts: async (
    params: ContractQueryParams = {}
  ): Promise<ApiResponse<ContractDto[]>> => {
    try {
      const response = await apiService.get<BackendContractResponse[]>(`${contractsUrl}/my-contracts`, params);
      if (!response.success || !response.data) {
        return {
          success: response.success,
          statusCode: response.statusCode,
          message: response.message,
          errors: response.errors,
          data: [],
        };
      }
      return {
        success: true,
        statusCode: response.statusCode,
        message: response.message,
        data: response.data.map(normalizeContract),
      };
    } catch (err: unknown) {
      return {
        success: false,
        statusCode: 500,
        message: err instanceof Error ? err.message : 'Failed to retrieve user contracts',
        data: [],
      };
    }
  },

  /**
   * GET /api/Contracts/{id}
   * Get contract by ID via conversation lookups
   */
  getContractById: async (
    id: string
  ): Promise<ApiResponse<ContractDto>> => {
    try {
      const response = await apiService.get<BackendContractResponse>(`${contractsUrl}/${id}`);
      if (response.success && response.data) {
        return {
          success: true,
          statusCode: response.statusCode,
          message: response.message,
          data: normalizeContract(response.data),
        };
      }
      return {
        success: false,
        statusCode: response.statusCode,
        message: response.message || 'Contract not found',
        data: undefined,
      };
    } catch (err: unknown) {
      return {
        success: false,
        statusCode: 500,
        message: err instanceof Error ? err.message : 'Failed to get contract details',
        data: undefined,
      };
    }
  },

  /**
   * GET /api/Contracts/by-proposal/{proposalId}
   * Get contract by proposal ID
   */
  getContractByProposal: async (
    proposalId: string
  ): Promise<ApiResponse<ContractDto>> => {
    return apiService.get<ContractDto>(`${contractsUrl}/by-proposal/${proposalId}`);
  },

  /**
   * GET /api/Contracts/client/{clientId}
   * Get client contracts
   */
  getClientContracts: async (
    clientId: string,
    params: ContractQueryParams = {}
  ): Promise<ApiResponse<ContractDto[]>> => {
    return apiService.get<ContractDto[]>(`${contractsUrl}/client/${clientId}`, params);
  },

  /**
   * GET /api/Contracts/freelancer/{freelancerId}
   * Get freelancer contracts
   */
  getFreelancerContracts: async (
    freelancerId: string,
    params: ContractQueryParams = {}
  ): Promise<ApiResponse<ContractDto[]>> => {
    return apiService.get<ContractDto[]>(`${contractsUrl}/freelancer/${freelancerId}`, params);
  },

  /**
   * GET /api/Milestones/{milestoneId}
   * Get milestone details by ID
   */
  getMilestoneById: async (
    milestoneId: string
  ): Promise<ApiResponse<Milestone>> => {
    const response = await apiService.get<BackendMilestoneResponse>(`${milestonesUrl}/${milestoneId}`);
    return {
      ...response,
      data: response.data ? normalizeMilestone(response.data) : undefined,
    };
  },

  /**
   * GET /api/Milestones/contract/{contractId}
   * Get all milestones for a contract
   */
  getMilestonesByContract: async (
    contractId: string
  ): Promise<ApiResponse<Milestone[]>> => {
    const response = await apiService.get<BackendMilestoneResponse[]>(`${milestonesUrl}/contract/${contractId}`);
    return {
      ...response,
      data: response.data ? response.data.map(normalizeMilestone) : [],
    };
  },

  /**
   * GET /api/Milestones/{milestoneId}/attachments
   * Get milestone attachments
   */
  getMilestoneAttachments: async (
    milestoneId: string
  ): Promise<ApiResponse<MilestoneAttachment[]>> => {
    return apiService.get<MilestoneAttachment[]>(`${milestonesUrl}/${milestoneId}/attachments`);
  },
};
