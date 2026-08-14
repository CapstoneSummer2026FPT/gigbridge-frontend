import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  ESignDocumentDto,
  ESignSignatureDto,
  CreateSignatureDto,
  SubmitESignSignatureDto,
  ESignPdfArtifactDto,
} from '../../types/models/ESign';

const esignUrl = 'ESign';

export const esignPostAPI = {
  previewDocumentPdf: (
    documentId: string,
    signatureImageUrl: string | undefined,
    signatureWidth: number | undefined,
    signatureHeight: number | undefined,
    identityOrTaxCode: string,
  ): Promise<ApiResponse<Blob>> =>
    apiService.postDownload(`${esignUrl}/documents/${documentId}/pdf/preview-signature`, {
      signatureImageUrl,
      signatureWidth,
      signatureHeight,
      identityOrTaxCode,
    }),

  saveDocumentPdf: (
    documentId: string,
    file: Blob,
    fileName: string,
    signatureCount: number,
  ): Promise<ApiResponse<ESignPdfArtifactDto>> => {
    const formData = new FormData();
    formData.append('file', file, fileName);
    formData.append('signatureCount', String(signatureCount));
    return apiService.post<ESignPdfArtifactDto>(`${esignUrl}/documents/${documentId}/pdf/upload`, formData);
  },

  generateDocumentPdf: (
    documentId: string,
  ): Promise<ApiResponse<ESignPdfArtifactDto>> =>
    apiService.post<ESignPdfArtifactDto>(`${esignUrl}/documents/${documentId}/pdf`, {}),

  /**
   * POST /api/ESign/documents/from-job/{jobPostId}
   * Create a new job post e-sign document
   */
  createDocumentFromJob: async (
    jobPostId: string
  ): Promise<ApiResponse<ESignDocumentDto>> => {
    return apiService.post<ESignDocumentDto>(
      `${esignUrl}/documents/from-job/${jobPostId}`,
      {}
    );
  },

  /**
   * POST /api/ESign/signatures
   * Submit e-sign signature
   */
  submitSignature: async (
    data: SubmitESignSignatureDto
  ): Promise<ApiResponse<ESignSignatureDto>> => {
    return apiService.post<ESignSignatureDto>(`${esignUrl}/signatures`, data);
  },

  /**
   * POST /api/ESign/signatures
   * Legacy signing payload kept for older signing screens.
   */
  createSignature: async (
    data: CreateSignatureDto
  ): Promise<ApiResponse<ESignSignatureDto>> => {
    return apiService.post<ESignSignatureDto>(`${esignUrl}/signatures`, {
      documentId: data.documentId,
      signatureImageUrl: data.signatureData,
    });
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
