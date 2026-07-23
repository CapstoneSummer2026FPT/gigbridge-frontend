import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ContractDto, ContractProductHandoffResponse, ContractQueryParams, ContractWorkItem, Milestone, MilestoneAttachment, MilestoneEarlyStartRequest } from '../../types/models/Contract';

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
  jobTitle?: string;
  JobTitle?: string;
  jobDescription?: string | null;
  JobDescription?: string | null;
  clientEmail?: string;
  ClientEmail?: string;
  freelancerEmail?: string | null;
  FreelancerEmail?: string | null;
  conversationId?: string | null;
  ConversationId?: string | null;
  canReview?: boolean;
  CanReview?: boolean;
  hasReviewedByCurrentUser?: boolean;
  HasReviewedByCurrentUser?: boolean;
  revisionNumber?: number;
  RevisionNumber?: number;
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
  description?: string | null;
  Description?: string | null;
  estimatedDuration?: string | null;
  EstimatedDuration?: string | null;
  deliverables?: string | null;
  Deliverables?: string | null;
  acceptanceCriteria?: string | null;
  AcceptanceCriteria?: string | null;
  workItems?: ContractWorkItem[];
  WorkItems?: ContractWorkItem[];
}

interface BackendMilestoneAttachmentResponse {
  id?: string;
  Id?: string;
  milestoneAttachmentId?: string;
  MilestoneAttachmentId?: string;
  milestoneAttachmentsId?: string;
  MilestoneAttachmentsId?: string;
  milestone_id?: string;
  milestoneId?: string;
  MilestoneId?: string;
  milestonesId?: string;
  MilestonesId?: string;
  file_name?: string | null;
  fileName?: string | null;
  FileName?: string | null;
  file_url?: string | null;
  fileUrl?: string | null;
  FileUrl?: string | null;
  file_size?: number | null;
  fileSize?: number | null;
  FileSize?: number | null;
  source_type?: number;
  sourceType?: number;
  SourceType?: number;
  mime_type?: string | null;
  mimeType?: string | null;
  MimeType?: string | null;
  uploaded_by_user_id?: string | null;
  uploadedByUserId?: string | null;
  UploadedByUserId?: string | null;
  created_at?: string;
  createdAt?: string;
  CreatedAt?: string;
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
    jobTitle: getValue<string | undefined>(source, 'jobTitle', 'JobTitle'),
    jobDescription: getValue<string | undefined>(source, 'jobDescription', 'JobDescription'),
    clientEmail: getValue<string | undefined>(source, 'clientEmail', 'ClientEmail'),
    freelancerEmail: getValue<string | undefined>(source, 'freelancerEmail', 'FreelancerEmail'),
    conversationId: getValue<string | null>(source, 'conversationId', 'ConversationId') ?? null,
    canReview: Boolean(getValue<boolean>(source, 'canReview', 'CanReview') ?? false),
    hasReviewedByCurrentUser: Boolean(getValue<boolean>(source, 'hasReviewedByCurrentUser', 'HasReviewedByCurrentUser') ?? false),
    revisionNumber: Number(getValue(source, 'revisionNumber', 'RevisionNumber') ?? 1),
  };
};

export const normalizeMilestoneAttachment = (
  attachment: BackendMilestoneAttachmentResponse
): MilestoneAttachment => {
  const source = attachment as Record<string, unknown>;

  return {
    id: String(getValue(source, 'id', 'Id', 'milestoneAttachmentId', 'MilestoneAttachmentId', 'milestoneAttachmentsId', 'MilestoneAttachmentsId') ?? ''),
    milestone_id: String(getValue(source, 'milestone_id', 'milestoneId', 'MilestoneId', 'milestonesId', 'MilestonesId') ?? ''),
    file_name: String(getValue(source, 'file_name', 'fileName', 'FileName') ?? ''),
    file_url: String(getValue(source, 'file_url', 'fileUrl', 'FileUrl') ?? ''),
    file_size: getValue<number | null>(source, 'file_size', 'fileSize', 'FileSize') ?? null,
    source_type: Number(getValue(source, 'source_type', 'sourceType', 'SourceType') ?? 0),
    mime_type: getValue<string | null>(source, 'mime_type', 'mimeType', 'MimeType') ?? null,
    uploaded_by_user_id: getValue<string | null>(source, 'uploaded_by_user_id', 'uploadedByUserId', 'UploadedByUserId') ?? null,
    created_at: getValue<string | undefined>(source, 'created_at', 'createdAt', 'CreatedAt'),
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
    releasedAmount: Number(getValue(source, 'releasedAmount', 'ReleasedAmount') ?? 0),
    lastReleasedAt: paidAt ?? null,
    description: getValue<string | null>(source, 'description', 'Description') ?? null,
    estimatedDuration: getValue<string | null>(source, 'estimatedDuration', 'EstimatedDuration') ?? null,
    deliverables: getValue<string | null>(source, 'deliverables', 'Deliverables') ?? null,
    acceptanceCriteria: getValue<string | null>(source, 'acceptanceCriteria', 'AcceptanceCriteria') ?? null,
    workItems: (getValue<ContractWorkItem[]>(source, 'workItems', 'WorkItems') || []).map(item => ({
      ...item,
      workItemId: String((item as any).workItemId ?? (item as any).WorkItemId ?? ''),
      milestoneId: String((item as any).milestoneId ?? (item as any).MilestoneId ?? id),
      orderIndex: Number((item as any).orderIndex ?? (item as any).OrderIndex ?? 0),
      status: Number((item as any).status ?? (item as any).Status ?? 0),
    })),
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
    const response = await apiService.get<BackendContractResponse>(`${contractsUrl}/by-proposal/${proposalId}`);
    return {
      ...response,
      data: response.data ? normalizeContract(response.data) : undefined,
    };
  },

  /**
   * GET /api/Contracts/job/{jobPostId}
   * Get contract by job post ID
   */
  getContractByJobPost: async (
    jobPostId: string
  ): Promise<ApiResponse<ContractDto>> => {
    try {
      const response = await apiService.get<BackendContractResponse>(`${contractsUrl}/job/${jobPostId}`);
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
    const response = await apiService.get<BackendMilestoneAttachmentResponse[]>(`${milestonesUrl}/${milestoneId}/attachments`);
    return {
      ...response,
      data: response.data ? response.data.map(normalizeMilestoneAttachment) : [],
    };
  },

  /**
   * GET /api/contracts/{contractId}/product-handoffs/current
   * Get current client-provided product/work materials.
   */
  getCurrentProductHandoff: async (
    contractId: string
  ): Promise<ApiResponse<ContractProductHandoffResponse | null>> => {
    return apiService.get<ContractProductHandoffResponse | null>(
      `contracts/${contractId}/product-handoffs/current`
    );
  },

  /**
   * GET /api/contracts/{contractId}/product-handoffs
   * Get client-provided product/work material history.
   */
  getProductHandoffs: async (
    contractId: string
  ): Promise<ApiResponse<ContractProductHandoffResponse[]>> => {
    return apiService.get<ContractProductHandoffResponse[]>(
      `contracts/${contractId}/product-handoffs`
    );
  },

  getEarlyStartRequests: async (contractId: string): Promise<ApiResponse<MilestoneEarlyStartRequest[]>> =>
    apiService.get<MilestoneEarlyStartRequest[]>(`contracts/${contractId}/milestones/early-start-requests`),
};
