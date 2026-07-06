import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ClaimFinalPayoutResponse, ContractProductHandoffResponse, CreateContractDto, ContractDto, EndProjectResponse, GenerateContractPdfDto, Milestone, WithdrawMilestoneResponse } from '../../types/models/Contract';

const contractsUrl = 'Contracts';
const milestonesUrl = 'Milestones';

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
   * POST /api/Milestones/{milestoneId}/submit-deliverables
   * Submit deliverables for a milestone (freelancer only)
   */
  submitMilestoneDeliverables: async (
    milestoneId: string,
    formData: FormData
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiService.post<{ success: boolean; message: string }>(
      `${milestonesUrl}/${milestoneId}/submit-deliverables`,
      formData
    );
  },

  /**
   * POST /api/contracts/{contractId}/milestones/{milestoneId}/start
   */
  startMilestone: async (
    contractId: string,
    milestoneId: string
  ): Promise<ApiResponse<Milestone>> => {
    return apiService.post<Milestone>(`contracts/${contractId}/milestones/${milestoneId}/start`);
  },

  /**
   * POST /api/contracts/{contractId}/milestones/{milestoneId}/request-unlock
   */
  requestMilestoneUnlock: async (
    contractId: string,
    milestoneId: string
  ): Promise<ApiResponse<Record<string, never>>> => {
    return apiService.post<Record<string, never>>(`contracts/${contractId}/milestones/${milestoneId}/request-unlock`);
  },

  /**
   * POST /api/contracts/{contractId}/milestones/{milestoneId}/submit
   */
  submitMilestone: async (
    contractId: string,
    milestoneId: string,
    formData: FormData
  ): Promise<ApiResponse<Milestone>> => {
    return apiService.post<Milestone>(`contracts/${contractId}/milestones/${milestoneId}/submit`, formData);
  },

  /**
   * POST /api/contracts/{contractId}/milestones/{milestoneId}/approve
   */
  approveMilestone: async (
    contractId: string,
    milestoneId: string
  ): Promise<ApiResponse<Milestone>> => {
    return apiService.post<Milestone>(`contracts/${contractId}/milestones/${milestoneId}/approve`);
  },

  /**
   * POST /api/contracts/{contractId}/milestones/{milestoneId}/request-revision
   */
  requestMilestoneRevision: async (
    contractId: string,
    milestoneId: string
  ): Promise<ApiResponse<Milestone>> => {
    return apiService.post<Milestone>(`contracts/${contractId}/milestones/${milestoneId}/request-revision`);
  },

  /**
   * POST /api/contracts/{contractId}/milestones/{milestoneId}/withdraw
   */
  withdrawMilestone: async (
    contractId: string,
    milestoneId: string
  ): Promise<ApiResponse<WithdrawMilestoneResponse>> => {
    return apiService.post<WithdrawMilestoneResponse>(`contracts/${contractId}/milestones/${milestoneId}/withdraw`);
  },

  /**
   * POST /api/contracts/{contractId}/end-project
   */
  endProject: async (
    contractId: string
  ): Promise<ApiResponse<EndProjectResponse>> => {
    return apiService.post<EndProjectResponse>(`contracts/${contractId}/end-project`);
  },

  /** POST /api/contracts/{contractId}/claim-final-payout */
  claimFinalPayout: async (
    contractId: string
  ): Promise<ApiResponse<ClaimFinalPayoutResponse>> => {
    return apiService.post<ClaimFinalPayoutResponse>(`contracts/${contractId}/claim-final-payout`);
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
   * POST /api/contracts/{contractId}/product-handoffs/{handoffId}/acknowledge
   */
  acknowledgeProductHandoff: async (
    contractId: string,
    handoffId: string
  ): Promise<ApiResponse<ContractProductHandoffResponse>> => {
    return apiService.post<ContractProductHandoffResponse>(
      `contracts/${contractId}/product-handoffs/${handoffId}/acknowledge`
    );
  },

  /**
   * POST /api/Milestones/{milestoneId}/attachments
   * Upload milestone attachment files
   */
  uploadMilestoneAttachment: async (
    milestoneId: string,
    file: File
  ): Promise<ApiResponse<{ id: string; fileName: string; fileUrl: string }>> => {
    const formData = new FormData();
    formData.append('file', file);

    return apiService.post<{ id: string; fileName: string; fileUrl: string }>(
      `${milestonesUrl}/${milestoneId}/attachments`,
      formData
    );
  },

  /**
   * POST /api/contracts/{contractId}/details/submit
   */
  submitDetails: async (contractId: string): Promise<ApiResponse<any>> => {
    return apiService.post<any>(`contracts/${contractId}/details/submit`);
  },

  /**
   * POST /api/contracts/{contractId}/details/confirm
   */
  confirmDetails: async (contractId: string): Promise<ApiResponse<any>> => {
    return apiService.post<any>(`contracts/${contractId}/details/confirm`);
  },

  /**
   * POST /api/contracts/{contractId}/details/request-change
   */
  requestChange: async (contractId: string, reason: string): Promise<ApiResponse<any>> => {
    return apiService.post<any>(`contracts/${contractId}/details/request-change`, { reason });
  },

  /**
   * POST /api/contracts/{contractId}/milestones/accept
   */
  acceptMilestones: async (contractId: string): Promise<ApiResponse<any>> => {
    return apiService.post<any>(`contracts/${contractId}/milestones/accept`);
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
    payload: { signatureImageUrl: string; signatureWidth?: number; signatureHeight?: number }
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
