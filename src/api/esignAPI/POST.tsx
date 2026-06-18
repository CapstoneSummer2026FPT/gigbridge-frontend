import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  ESignDocumentDto,
  ESignSignatureDto,
  CreateESignDocumentDto,
  CreateSignatureDto,
  SubmitESignSignatureDto,
  UpdateSignatureStatusDto,
} from '../../types/models/ESign';
import { SignatureType } from '../../types/models/ESign';
import { mapApiResponse, mapESignDocument, mapESignSignature } from './mappers';

const esignUrl = 'ESign';

const escapeSvgText = (value: string): string => {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const toBase64 = (value: string): string => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const toTypedSignatureDataUri = (value: string): string => {
  const safeValue = escapeSvgText(value.trim());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="540" height="220" viewBox="0 0 540 220"><rect width="540" height="220" fill="white"/><text x="270" y="122" fill="#0247a3" font-family="cursive" font-size="48" text-anchor="middle">${safeValue}</text></svg>`;
  return `data:image/svg+xml;base64,${toBase64(svg)}`;
};

const toSubmitSignaturePayload = (data: CreateSignatureDto | SubmitESignSignatureDto): SubmitESignSignatureDto => {
  const fallbackSignature = 'signatureData' in data && data.signatureData
    ? data.signatureType === SignatureType.TypedName || data.signatureType === SignatureType.Initials
      ? toTypedSignatureDataUri(data.signatureData)
      : data.signatureData
    : '';

  return {
    documentId: data.documentId,
    signatureImageUrl: data.signatureImageUrl ?? fallbackSignature,
    signatureWidth: data.signatureWidth ?? null,
    signatureHeight: data.signatureHeight ?? null,
  };
};

export const esignPostAPI = {
  /**
   * POST /api/ESign/documents
   * Legacy placeholder.
   */
  createDocument: async (
    data: CreateESignDocumentDto
  ): Promise<ApiResponse<ESignDocumentDto>> => {
    const response = await apiService.post<unknown>(`${esignUrl}/documents`, data);
    return mapApiResponse(response, mapESignDocument);
  },

  /**
   * POST /api/ESign/documents/from-job/{jobPostId}
   */
  createDocumentFromJob: async (
    jobPostId: string
  ): Promise<ApiResponse<ESignDocumentDto>> => {
    const response = await apiService.post<unknown>(`${esignUrl}/documents/from-job/${jobPostId}`, {});
    return mapApiResponse(response, mapESignDocument);
  },

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
   */
  createSignature: async (
    data: CreateSignatureDto | SubmitESignSignatureDto
  ): Promise<ApiResponse<ESignSignatureDto>> => {
    const response = await apiService.post<unknown>(
      `${esignUrl}/signatures`,
      toSubmitSignaturePayload(data)
    );
    return mapApiResponse(response, mapESignSignature);
  },

  completeSignature: async (
    signatureId: string
  ): Promise<ApiResponse<ESignSignatureDto>> => {
    const response = await apiService.post<unknown>(
      `${esignUrl}/signatures/${signatureId}/complete`,
      {}
    );
    return mapApiResponse(response, mapESignSignature);
  },

  declineSignature: async (
    signatureId: string,
    reason?: string
  ): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return apiService.post<{ success: boolean; message: string }>(
      `${esignUrl}/signatures/${signatureId}/decline`,
      { reason }
    );
  },

  recordAuditTrailEntry: async (
    documentId: string,
    action: string,
    details?: Record<string, unknown>
  ): Promise<ApiResponse<{ success: boolean }>> => {
    return apiService.post<{ success: boolean }>(
      `${esignUrl}/documents/${documentId}/audit-trail`,
      { action, details }
    );
  },
};
