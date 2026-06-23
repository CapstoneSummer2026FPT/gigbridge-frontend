import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ESignDocumentDto, ESignSignatureDto, SignatureAuditTrail } from '../../types/models/ESign';

const esignUrl = 'ESign';

export const esignGetAPI = {
  /**
   * GET /api/ESign/documents/{documentId}
   * Get document details
   */
  getDocumentById: async (
    documentId: string
  ): Promise<ApiResponse<ESignDocumentDto>> => {
    return apiService.get<ESignDocumentDto>(`${esignUrl}/documents/${documentId}`);
  },

  /**
   * GET /api/ESign/documents/by-job/{jobPostId}
   * Get document for a job post
   */
  getDocumentByJob: async (
    jobPostId: string
  ): Promise<ApiResponse<ESignDocumentDto>> => {
    return apiService.get<ESignDocumentDto>(
      `${esignUrl}/documents/by-job/${jobPostId}`
    );
  },

  /**
   * GET /api/ESign/documents/by-contract/{contractId}
   * Get document for a contract
   */
  getDocumentByContract: async (
    contractId: string
  ): Promise<ApiResponse<ESignDocumentDto>> => {
    return apiService.get<ESignDocumentDto>(
      `${esignUrl}/documents/by-contract/${contractId}`
    );
  },

  /**
   * GET /api/ESign/signatures/{signatureId}
   * Get signature details
   */
  getSignatureById: async (
    signatureId: string
  ): Promise<ApiResponse<ESignSignatureDto>> => {
    return apiService.get<ESignSignatureDto>(`${esignUrl}/signatures/${signatureId}`);
  },

  /**
   * GET /api/ESign/documents/{documentId}/signatures
   * Get all signatures for a document
   */
  getDocumentSignatures: async (
    documentId: string
  ): Promise<ApiResponse<ESignSignatureDto[]>> => {
    return apiService.get<ESignSignatureDto[]>(
      `${esignUrl}/documents/${documentId}/signatures`
    );
  },

  /**
   * GET /api/ESign/signatures/pending
   * Get pending signatures for current user
   */
  getPendingSignatures: async (): Promise<ApiResponse<ESignSignatureDto[]>> => {
    return apiService.get<ESignSignatureDto[]>(`${esignUrl}/signatures/pending`);
  },

  /**
   * GET /api/ESign/documents/{documentId}/audit-trail
   * Get audit trail for document
   */
  getDocumentAuditTrail: async (
    documentId: string
  ): Promise<ApiResponse<SignatureAuditTrail[]>> => {
    return apiService.get<SignatureAuditTrail[]>(
      `${esignUrl}/documents/${documentId}/audit-trail`
    );
  },

  /**
   * GET /api/ESign/signatures/{signatureId}/audit-trail
   * Get audit trail for signature
   */
  getSignatureAuditTrail: async (
    signatureId: string
  ): Promise<ApiResponse<SignatureAuditTrail[]>> => {
    return apiService.get<SignatureAuditTrail[]>(
      `${esignUrl}/signatures/${signatureId}/audit-trail`
    );
  },
};
