import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ContractProductHandoffResponse, ContractWorkflowResponse, CreateContractDto, ContractDto, EndProjectResponse, GenerateContractPdfDto, Milestone, MilestoneEarlyStartRequest, WithdrawMilestoneResponse } from '../../types/models/Contract';
import { normalizeMilestone } from './GET';

const contractsUrl = 'Contracts';
export const contractPostAPI = {
  /**
   * POST /api/Contracts/from-proposal
   * Create contract from accepted proposal
   */
  createContractFromProposal: async (
    data: CreateContractDto
  ): Promise<ApiResponse<ContractDto>> => {
    return apiService.post<ContractDto>(`${contractsUrl}/from-proposal`, data);
  },

  /**
   * POST /api/Contracts/{contractId}/generate-pdf
   * Generate PDF document for contract
   */
  generateContractPdf: async (
    contractId: string,
    data?: GenerateContractPdfDto
  ): Promise<ApiResponse<{ pdfUrl: string }>> => {
    return apiService.post<{ pdfUrl: string }>(`${contractsUrl}/${contractId}/generate-pdf`, data || {});
  },

  /**
   * POST /api/Contracts/{contractId}/send-for-signature
   * Send contract to freelancer for signature
   */
  sendForSignature: async (
    contractId: string,
    freelancerEmail?: string
  ): Promise<ApiResponse<{ signatureUrl: string }>> => {
    return apiService.post<{ signatureUrl: string }>(`${contractsUrl}/${contractId}/send-for-signature`, {
      freelancerEmail,
    });
  },

  /**
   * POST /api/contracts/{contractId}/milestones/{milestoneId}/request-unlock
   */
  requestMilestoneUnlock: async (
    contractId: string,
    milestoneId: string,
    reason: string,
  ): Promise<ApiResponse<Record<string, never>>> => {
    return apiService.post<Record<string, never>>(`contracts/${contractId}/milestones/${milestoneId}/early-start-requests`, { reason });
  },

  /**
   * POST /api/contracts/{contractId}/milestones/{milestoneId}/submit
   */
  submitMilestone: async (
    contractId: string,
    milestoneId: string,
    formData: FormData
  ): Promise<ApiResponse<Milestone>> => {
    const response = await apiService.post<unknown>(
      `contracts/${contractId}/milestones/${milestoneId}/submit`,
      formData,
    );
    return {
      ...response,
      data: response.data ? normalizeMilestone(response.data) : undefined,
    };
  },

  /**
   * POST /api/contracts/{contractId}/milestones/{milestoneId}/approve
   */
  approveMilestone: async (
    contractId: string,
    milestoneId: string
  ): Promise<ApiResponse<Milestone>> => {
    const response = await apiService.post<unknown>(
      `contracts/${contractId}/milestones/${milestoneId}/approve`,
    );
    return {
      ...response,
      data: response.data ? normalizeMilestone(response.data) : undefined,
    };
  },

  /**
   * POST /api/contracts/{contractId}/milestones/{milestoneId}/request-revision
   */
  requestMilestoneRevision: async (
    contractId: string,
    milestoneId: string,
    reason: string,
    workItemIds: string[],
  ): Promise<ApiResponse<Milestone>> => {
    const response = await apiService.post<unknown>(
      `contracts/${contractId}/milestones/${milestoneId}/request-revision`,
      { reason, workItemIds },
    );
    return {
      ...response,
      data: response.data ? normalizeMilestone(response.data) : undefined,
    };
  },

  respondEarlyStartRequest: async (
    contractId: string,
    requestId: string,
    approve: boolean,
    note?: string,
  ): Promise<ApiResponse<MilestoneEarlyStartRequest>> =>
    apiService.post<MilestoneEarlyStartRequest>(
      `contracts/${contractId}/milestones/early-start-requests/${requestId}/respond`,
      { approve, note },
    ),

  /**
   * POST /api/contracts/{contractId}/milestones/{milestoneId}/withdraw
   */
  withdrawMilestone: async (
    contractId: string,
    milestoneId: string
  ): Promise<ApiResponse<WithdrawMilestoneResponse>> => {
    return apiService.post<WithdrawMilestoneResponse>(
      `contracts/${contractId}/milestones/${milestoneId}/withdraw`
    );
  },

  /**
   * POST /api/contracts/{contractId}/end-project
   */
  endProject: async (
    contractId: string
  ): Promise<ApiResponse<EndProjectResponse>> => {
    return apiService.post<EndProjectResponse>(`contracts/${contractId}/end-project`);
  },

  /**
   * POST /api/contracts/{contractId}/product-handoffs
   * Client sends product/work materials to the freelancer.
   */
  submitProductHandoff: async (
    contractId: string,
    formData: FormData
  ): Promise<ApiResponse<ContractProductHandoffResponse>> => {
    return apiService.post<ContractProductHandoffResponse>(
      `contracts/${contractId}/product-handoffs`,
      formData
    );
  },

  /**
   * POST /api/contracts/{contractId}/details/submit
   */
  submitDetails: async (contractId: string): Promise<ApiResponse<ContractWorkflowResponse>> => {
    return apiService.post<ContractWorkflowResponse>(`contracts/${contractId}/details/submit`);
  },

  /**
   * POST /api/contracts/{contractId}/details/confirm
   */
  confirmDetails: async (contractId: string): Promise<ApiResponse<ContractWorkflowResponse>> => {
    return apiService.post<ContractWorkflowResponse>(`contracts/${contractId}/details/confirm`);
  },

  /**
   * POST /api/contracts/{contractId}/details/request-change
   */
  requestChange: async (contractId: string, reason: string): Promise<ApiResponse<ContractWorkflowResponse>> => {
    return apiService.post<ContractWorkflowResponse>(`contracts/${contractId}/details/request-change`, { reason });
  },

  /**
   * POST /api/contracts/{contractId}/milestones/request-change
   */
  requestMilestoneChange: async (contractId: string, reason: string): Promise<ApiResponse<any>> => {
    return apiService.post<any>(`contracts/${contractId}/milestones/request-change`, { reason });
  },

  /**
   * POST /api/contracts/{contractId}/escrow/fund
   */
  fundEscrow: async (contractId: string): Promise<ApiResponse<any>> => {
    return apiService.post<any>(`contracts/${contractId}/escrow/fund`);
  },

  /**
   * POST /api/contracts/{contractId}/sign
   */
  sign: async (
    contractId: string,
    payload: {
      signatureImageUrl?: string | null;
      signatureWidth?: number;
      signatureHeight?: number;
      identityOrTaxCode: string;
      identityVerificationTicket?: string | null;
      policyAccepted: boolean;
      policyVersion: string;
    }
  ): Promise<ApiResponse<any>> => {
    return apiService.post<any>(`contracts/${contractId}/sign`, payload);
  },

  /**
   * POST /api/contracts/{contractId}/job-post-setup/complete
   */
  completeJobPostSetup: async (contractId: string): Promise<ApiResponse<any>> => {
    return apiService.post<any>(`contracts/${contractId}/job-post-setup/complete`);
  },
};
