import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  ESignDocumentDto,
  ESignSignatureDto,
  CreateESignDocumentDto,
  CreateSignatureDto,
  UpdateSignatureStatusDto,
} from '../../types/models/ESign';

const esignUrl = 'ESign';

export const esignPostAPI = {
  /**
   * POST /api/ESign/documents
   * Create a new e-sign document
   */
  createDocument: async (
    data: CreateESignDocumentDto
  ): Promise<ApiResponse<ESignDocumentDto>> => {
    return apiService.post<ESignDocumentDto>(`${esignUrl}/documents`, data);
  },

  /**
   * POST /api/ESign/documents/{documentId}/send
   * Send document for signing
   */
  sendDocumentForSigning: async (
    documentId: string,
    signers: string[]
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiService.post<{ success: boolean; message: string }>(
      `${esignUrl}/documents/${documentId}/send`,
      { signers }
    );
  },

  /**
   * POST /api/ESign/signatures
   * Create/submit a signature
   */
  createSignature: async (
    data: CreateSignatureDto
  ): Promise<ApiResponse<ESignSignatureDto>> => {
    return apiService.post<ESignSignatureDto>(`${esignUrl}/signatures`, data);
  },

  /**
   * POST /api/ESign/signatures/{signatureId}/complete
   * Mark signature as complete (after capture)
   */
  completeSignature: async (
    signatureId: string
  ): Promise<ApiResponse<ESignSignatureDto>> => {
    return apiService.post<ESignSignatureDto>(
      `${esignUrl}/signatures/${signatureId}/complete`,
      {}
    );
  },

  /**
   * POST /api/ESign/signatures/{signatureId}/decline
   * Decline to sign a document
   */
  declineSignature: async (
    signatureId: string,
    reason?: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiService.post<{ success: boolean; message: string }>(
      `${esignUrl}/signatures/${signatureId}/decline`,
      { reason }
    );
  },

  /**
   * POST /api/ESign/documents/{documentId}/audit-trail
   * Get audit trail for document (logged endpoint)
   */
  recordAuditTrailEntry: async (
    documentId: string,
    action: string,
    details?: Record<string, any>
  ): Promise<ApiResponse<{ success: boolean }>> => {
    return apiService.post<{ success: boolean }>(
      `${esignUrl}/documents/${documentId}/audit-trail`,
      { action, details }
    );
  },
};
