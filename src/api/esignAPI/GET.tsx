import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type { ESignDocumentDto, ESignSignatureDto, SignatureAuditTrail } from '../../types/models/ESign';

const esignUrl = 'ESign';

interface BackendESignSignatureResponse {
  signatureId?: string;
  SignatureId?: string;
  documentId?: string;
  DocumentId?: string;
  userId?: string;
  UserId?: string;
  signerRole?: number;
  SignerRole?: number;
  signatureImageUrl?: string | null;
  SignatureImageUrl?: string | null;
  signatureWidth?: number | null;
  SignatureWidth?: number | null;
  signatureHeight?: number | null;
  SignatureHeight?: number | null;
  status?: number;
  Status?: number;
  signedAt?: string | null;
  SignedAt?: string | null;
  declinedAt?: string | null;
  DeclinedAt?: string | null;
  declineReason?: string | null;
  DeclineReason?: string | null;
  ipAddress?: string | null;
  IpAddress?: string | null;
  userAgent?: string | null;
  UserAgent?: string | null;
  createdAt?: string;
  CreatedAt?: string;
}

interface BackendESignDocumentResponse {
  documentId?: string;
  DocumentId?: string;
  jobPostId?: string;
  JobPostId?: string;
  contractId?: string | null;
  ContractId?: string | null;
  templateId?: string;
  TemplateId?: string;
  documentCode?: string;
  DocumentCode?: string;
  renderedHtmlContent?: string;
  RenderedHtmlContent?: string;
  status?: number;
  Status?: number;
  documentHash?: string | null;
  DocumentHash?: string | null;
  expiresAt?: string | null;
  ExpiresAt?: string | null;
  finalizedAt?: string | null;
  FinalizedAt?: string | null;
  exportedPdfUrl?: string | null;
  ExportedPdfUrl?: string | null;
  createdAt?: string;
  CreatedAt?: string;
  updatedAt?: string | null;
  UpdatedAt?: string | null;
  signatures?: BackendESignSignatureResponse[];
  Signatures?: BackendESignSignatureResponse[];
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

export const normalizeESignSignature = (
  signature: BackendESignSignatureResponse
): ESignSignatureDto => {
  const source = signature as Record<string, unknown>;

  return {
    signatureId: String(getValue(source, 'signatureId', 'SignatureId') ?? ''),
    documentId: String(getValue(source, 'documentId', 'DocumentId') ?? ''),
    userId: String(getValue(source, 'userId', 'UserId') ?? ''),
    signerRole: Number(getValue(source, 'signerRole', 'SignerRole') ?? 0),
    signatureImageUrl: getValue<string | null>(source, 'signatureImageUrl', 'SignatureImageUrl') ?? null,
    signatureWidth: getValue<number | null>(source, 'signatureWidth', 'SignatureWidth') ?? null,
    signatureHeight: getValue<number | null>(source, 'signatureHeight', 'SignatureHeight') ?? null,
    status: Number(getValue(source, 'status', 'Status') ?? 0),
    signedAt: getValue<string | null>(source, 'signedAt', 'SignedAt') ?? null,
    declinedAt: getValue<string | null>(source, 'declinedAt', 'DeclinedAt') ?? null,
    declineReason: getValue<string | null>(source, 'declineReason', 'DeclineReason') ?? null,
    ipAddress: getValue<string | null>(source, 'ipAddress', 'IpAddress') ?? null,
    userAgent: getValue<string | null>(source, 'userAgent', 'UserAgent') ?? null,
    createdAt: String(getValue(source, 'createdAt', 'CreatedAt') ?? new Date().toISOString()),
  };
};

export const normalizeESignDocument = (
  document: BackendESignDocumentResponse
): ESignDocumentDto => {
  const source = document as Record<string, unknown>;
  const signatures = getValue<BackendESignSignatureResponse[]>(source, 'signatures', 'Signatures') ?? [];

  return {
    documentId: String(getValue(source, 'documentId', 'DocumentId') ?? ''),
    jobPostId: String(getValue(source, 'jobPostId', 'JobPostId') ?? ''),
    contractId: getValue<string | null>(source, 'contractId', 'ContractId') ?? null,
    templateId: String(getValue(source, 'templateId', 'TemplateId') ?? ''),
    documentCode: String(getValue(source, 'documentCode', 'DocumentCode') ?? ''),
    renderedHtmlContent: String(getValue(source, 'renderedHtmlContent', 'RenderedHtmlContent') ?? ''),
    status: Number(getValue(source, 'status', 'Status') ?? 0),
    documentHash: getValue<string | null>(source, 'documentHash', 'DocumentHash') ?? null,
    expiresAt: getValue<string | null>(source, 'expiresAt', 'ExpiresAt') ?? null,
    finalizedAt: getValue<string | null>(source, 'finalizedAt', 'FinalizedAt') ?? null,
    exportedPdfUrl: getValue<string | null>(source, 'exportedPdfUrl', 'ExportedPdfUrl') ?? null,
    createdAt: String(getValue(source, 'createdAt', 'CreatedAt') ?? new Date().toISOString()),
    updatedAt: getValue<string | null>(source, 'updatedAt', 'UpdatedAt') ?? null,
    signatures: signatures.map(normalizeESignSignature),
  };
};

const normalizeDocumentResponse = (
  response: ApiResponse<BackendESignDocumentResponse>
): ApiResponse<ESignDocumentDto> => ({
  ...response,
  data: response.data ? normalizeESignDocument(response.data) : undefined,
});

const normalizeSignatureResponse = (
  response: ApiResponse<BackendESignSignatureResponse>
): ApiResponse<ESignSignatureDto> => ({
  ...response,
  data: response.data ? normalizeESignSignature(response.data) : undefined,
});

const normalizeSignaturesResponse = (
  response: ApiResponse<BackendESignSignatureResponse[]>
): ApiResponse<ESignSignatureDto[]> => ({
  ...response,
  data: response.data ? response.data.map(normalizeESignSignature) : [],
});

export const esignGetAPI = {
  /**
   * GET /api/ESign/documents/{documentId}
   * Get document details
   */
  getDocumentById: async (
    documentId: string
  ): Promise<ApiResponse<ESignDocumentDto>> => {
    const response = await apiService.get<BackendESignDocumentResponse>(`${esignUrl}/documents/${documentId}`);
    return normalizeDocumentResponse(response);
  },

  /**
   * GET /api/ESign/documents/by-job/{jobPostId}
   * Get document for a job post
   */
  getDocumentByJob: async (
    jobPostId: string
  ): Promise<ApiResponse<ESignDocumentDto>> => {
    const response = await apiService.get<BackendESignDocumentResponse>(
      `${esignUrl}/documents/by-job/${jobPostId}`
    );
    return normalizeDocumentResponse(response);
  },

  /**
   * GET /api/ESign/documents/by-contract/{contractId}
   * Get document for a contract
   */
  getDocumentByContract: async (
    contractId: string
  ): Promise<ApiResponse<ESignDocumentDto>> => {
    const response = await apiService.get<BackendESignDocumentResponse>(
      `${esignUrl}/documents/by-contract/${contractId}`
    );
    return normalizeDocumentResponse(response);
  },

  /**
   * GET /api/ESign/signatures/{signatureId}
   * Get signature details
   */
  getSignatureById: async (
    signatureId: string
  ): Promise<ApiResponse<ESignSignatureDto>> => {
    const response = await apiService.get<BackendESignSignatureResponse>(`${esignUrl}/signatures/${signatureId}`);
    return normalizeSignatureResponse(response);
  },

  /**
   * GET /api/ESign/documents/{documentId}/signatures
   * Get all signatures for a document
   */
  getDocumentSignatures: async (
    documentId: string
  ): Promise<ApiResponse<ESignSignatureDto[]>> => {
    const response = await apiService.get<BackendESignSignatureResponse[]>(
      `${esignUrl}/documents/${documentId}/signatures`
    );
    return normalizeSignaturesResponse(response);
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
