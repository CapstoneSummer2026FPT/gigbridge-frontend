import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { CreateContractDto, ContractDto, GenerateContractPdfDto } from '../../types/models/Contract';

export const contractPostAPI = {
  /**
   * POST /api/Contracts/from-proposal
   * Create contract from accepted proposal
   */
  createContractFromProposal: async (
    _data: CreateContractDto
  ): Promise<ApiResponse<ContractDto>> => {
    return {
      success: false,
      statusCode: 501,
      message: 'Creating contracts from proposals is handled by the backend workflow and is not exposed as a direct frontend API route.',
      data: undefined,
    };
  },

  /**
   * POST /api/Contracts/{contractId}/generate-pdf
   * Generate PDF document for contract
   */
  generateContractPdf: async (
    _contractId: string,
    _data?: GenerateContractPdfDto
  ): Promise<ApiResponse<{ pdfUrl: string }>> => {
    return {
      success: false,
      statusCode: 501,
      message: 'Contract PDF generation is not exposed by the current backend contract API.',
      data: undefined,
    };
  },

  /**
   * POST /api/Contracts/{contractId}/send-for-signature
   * Send contract to freelancer for signature
   */
  sendForSignature: async (
    _contractId: string,
    _freelancerEmail?: string
  ): Promise<ApiResponse<{ signatureUrl: string }>> => {
    return {
      success: false,
      statusCode: 501,
      message: 'Sending contracts for signature is handled by the current sign endpoint.',
      data: undefined,
    };
  },

  /**
   * POST /api/Milestones/{milestoneId}/submit-deliverables
   * Submit deliverables for a milestone (freelancer only)
   */
  submitMilestoneDeliverables: async (
    _milestoneId: string,
    _formData: FormData
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return {
      success: false,
      statusCode: 501,
      message: 'Milestone deliverable uploads are not exposed by the current backend contract API.',
      data: undefined,
    };
  },

  /**
   * POST /api/Milestones/{milestoneId}/attachments
   * Upload milestone attachment files
   */
  uploadMilestoneAttachment: async (
    _milestoneId: string,
    _file: File
  ): Promise<ApiResponse<{ id: string; fileName: string; fileUrl: string }>> => {
    return {
      success: false,
      statusCode: 501,
      message: 'Milestone attachments are not exposed by the current backend contract API.',
      data: undefined,
    };
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
};
