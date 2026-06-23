import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { CreateContractDto, ContractDto, GenerateContractPdfDto } from '../../types/models/Contract';

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
