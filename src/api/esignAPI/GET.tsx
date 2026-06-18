import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ESignDocumentDto, ESignSignatureDto, SignatureAuditTrail } from '../../types/models/ESign';
import { mapApiResponse, mapESignDocument, mapESignSignature } from './mappers';

const esignUrl = 'ESign';

export const esignGetAPI = {
  /**
   * GET /api/ESign/documents/{documentId}
   */
  getDocumentById: async (
    documentId: string
  ): Promise<ApiResponse<ESignDocumentDto>> => {
    const response = await apiService.get<unknown>(`${esignUrl}/documents/${documentId}`);
    return mapApiResponse(response, mapESignDocument);
  },

  /**
   * GET /api/ESign/documents/by-job/{jobPostId}
   */
  getDocumentByJobPost: async (
    jobPostId: string
  ): Promise<ApiResponse<ESignDocumentDto>> => {
    const response = await apiService.get<unknown>(`${esignUrl}/documents/by-job/${jobPostId}`);
    return mapApiResponse(response, mapESignDocument);
  },

  /**
   * Legacy placeholder. Backend currently exposes document-by-id and document-by-job.
   */
  getDocumentsByContract: async (
    contractId: string
  ): Promise<ApiResponse<ESignDocumentDto[]>> => {
    const response = await apiService.get<unknown>(`${esignUrl}/documents/contract/${contractId}`);
    return {
      ...response,
      data: Array.isArray(response.data) ? response.data.map(mapESignDocument) : [],
    };
  },

  /**
   * Legacy placeholder. Signature lookup is returned inside document payload.
   */
  getSignatureById: async (
    signatureId: string
  ): Promise<ApiResponse<ESignSignatureDto>> => {
    const response = await apiService.get<unknown>(`${esignUrl}/signatures/${signatureId}`);
    return mapApiResponse(response, mapESignSignature);
  },

  /**
   * Signatures are returned in GET /api/ESign/documents/{documentId}.
   */
  getDocumentSignatures: async (
    documentId: string
  ): Promise<ApiResponse<ESignSignatureDto[]>> => {
    const response = await esignGetAPI.getDocumentById(documentId);
    return {
      ...response,
      data: response.data?.signatures ?? [],
    };
  },

  getPendingSignatures: async (): Promise<ApiResponse<ESignSignatureDto[]>> => {
    return apiService.get<ESignSignatureDto[]>(`${esignUrl}/signatures/pending`);
  },

  getDocumentAuditTrail: async (
    documentId: string
  ): Promise<ApiResponse<SignatureAuditTrail[]>> => {
    return apiService.get<SignatureAuditTrail[]>(
      `${esignUrl}/documents/${documentId}/audit-trail`
    );
  },

  getSignatureAuditTrail: async (
    signatureId: string
  ): Promise<ApiResponse<SignatureAuditTrail[]>> => {
    return apiService.get<SignatureAuditTrail[]>(
      `${esignUrl}/signatures/${signatureId}/audit-trail`
    );
  },
};
