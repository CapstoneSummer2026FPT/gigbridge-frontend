import { apiService } from '../../service/apiService';
import type { ApiResponse } from '../../types/common';
import type {
  ESignDocumentDto,
  ESignDocumentListItemDto,
  ESignDocumentListPageDto,
  ESignDocumentListQueryParams,
  ESignSignatureDto,
  SignatureAuditTrail,
} from '../../types/models/ESign';

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
  currentUserSignerRole?: number | null;
  CurrentUserSignerRole?: number | null;
  canCurrentUserSign?: boolean;
  CanCurrentUserSign?: boolean;
  hasFinalArtifact?: boolean;
  HasFinalArtifact?: boolean;
  finalizedDocumentFileName?: string | null;
  FinalizedDocumentFileName?: string | null;
  createdAt?: string;
  CreatedAt?: string;
  updatedAt?: string | null;
  UpdatedAt?: string | null;
  signatures?: BackendESignSignatureResponse[];
  Signatures?: BackendESignSignatureResponse[];
}

interface BackendESignDocumentListItemResponse {
  documentId?: string;
  DocumentId?: string;
  jobPostId?: string;
  JobPostId?: string;
  contractId?: string | null;
  ContractId?: string | null;
  documentCode?: string;
  DocumentCode?: string;
  documentType?: string;
  DocumentType?: string;
  title?: string;
  Title?: string;
  documentStatus?: number;
  DocumentStatus?: number;
  currentUserSignerRole?: number | null;
  CurrentUserSignerRole?: number | null;
  currentUserSignedAt?: string | null;
  CurrentUserSignedAt?: string | null;
  hasClientSigned?: boolean;
  HasClientSigned?: boolean;
  hasFreelancerSigned?: boolean;
  HasFreelancerSigned?: boolean;
  canCurrentUserSign?: boolean;
  CanCurrentUserSign?: boolean;
  hasFinalArtifact?: boolean;
  HasFinalArtifact?: boolean;
  finalizedDocumentFileName?: string | null;
  FinalizedDocumentFileName?: string | null;
  signatureCount?: number;
  SignatureCount?: number;
  finalizedAt?: string | null;
  FinalizedAt?: string | null;
  exportedPdfUrl?: string | null;
  ExportedPdfUrl?: string | null;
  createdAt?: string;
  CreatedAt?: string;
  updatedAt?: string | null;
  UpdatedAt?: string | null;
}

interface BackendPaginatedESignDocumentsResponse {
  items?: BackendESignDocumentListItemResponse[];
  Items?: BackendESignDocumentListItemResponse[];
  pageNumber?: number;
  PageNumber?: number;
  totalPages?: number;
  TotalPages?: number;
  totalCount?: number;
  TotalCount?: number;
  hasPreviousPage?: boolean;
  HasPreviousPage?: boolean;
  hasNextPage?: boolean;
  HasNextPage?: boolean;
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
  const signerRole = getValue<number>(source, 'currentUserSignerRole', 'CurrentUserSignerRole');

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
    currentUserSignerRole: signerRole === undefined ? null : Number(signerRole),
    canCurrentUserSign: Boolean(getValue<boolean>(source, 'canCurrentUserSign', 'CanCurrentUserSign') ?? false),
    hasFinalArtifact: Boolean(getValue<boolean>(source, 'hasFinalArtifact', 'HasFinalArtifact') ?? false),
    finalizedDocumentFileName: getValue<string | null>(
      source,
      'finalizedDocumentFileName',
      'FinalizedDocumentFileName'
    ) ?? null,
    createdAt: String(getValue(source, 'createdAt', 'CreatedAt') ?? new Date().toISOString()),
    updatedAt: getValue<string | null>(source, 'updatedAt', 'UpdatedAt') ?? null,
    signatures: signatures.map(normalizeESignSignature),
  };
};

const normalizeESignDocumentListItem = (
  document: BackendESignDocumentListItemResponse
): ESignDocumentListItemDto => {
  const source = document as Record<string, unknown>;
  const signerRole = getValue<number>(source, 'currentUserSignerRole', 'CurrentUserSignerRole');

  return {
    documentId: String(getValue(source, 'documentId', 'DocumentId') ?? ''),
    jobPostId: String(getValue(source, 'jobPostId', 'JobPostId') ?? ''),
    contractId: getValue<string | null>(source, 'contractId', 'ContractId') ?? null,
    documentCode: String(getValue(source, 'documentCode', 'DocumentCode') ?? ''),
    documentType: String(getValue(source, 'documentType', 'DocumentType') ?? ''),
    title: String(getValue(source, 'title', 'Title') ?? 'Untitled E-sign contract'),
    documentStatus: Number(getValue(source, 'documentStatus', 'DocumentStatus') ?? 0),
    currentUserSignerRole: signerRole === undefined ? null : Number(signerRole),
    currentUserSignedAt: getValue<string | null>(source, 'currentUserSignedAt', 'CurrentUserSignedAt') ?? null,
    hasClientSigned: Boolean(getValue<boolean>(source, 'hasClientSigned', 'HasClientSigned') ?? false),
    hasFreelancerSigned: Boolean(getValue<boolean>(source, 'hasFreelancerSigned', 'HasFreelancerSigned') ?? false),
    canCurrentUserSign: Boolean(getValue<boolean>(source, 'canCurrentUserSign', 'CanCurrentUserSign') ?? false),
    hasFinalArtifact: Boolean(getValue<boolean>(source, 'hasFinalArtifact', 'HasFinalArtifact') ?? false),
    finalizedDocumentFileName: getValue<string | null>(
      source,
      'finalizedDocumentFileName',
      'FinalizedDocumentFileName'
    ) ?? null,
    signatureCount: Number(getValue(source, 'signatureCount', 'SignatureCount') ?? 0),
    finalizedAt: getValue<string | null>(source, 'finalizedAt', 'FinalizedAt') ?? null,
    exportedPdfUrl: getValue<string | null>(source, 'exportedPdfUrl', 'ExportedPdfUrl') ?? null,
    createdAt: String(getValue(source, 'createdAt', 'CreatedAt') ?? new Date().toISOString()),
    updatedAt: getValue<string | null>(source, 'updatedAt', 'UpdatedAt') ?? null,
  };
};

export const normalizeESignDocumentListPage = (
  page: BackendPaginatedESignDocumentsResponse
): ESignDocumentListPageDto => {
  const source = page as Record<string, unknown>;
  const items = getValue<BackendESignDocumentListItemResponse[]>(source, 'items', 'Items') ?? [];

  return {
    items: items.map(normalizeESignDocumentListItem),
    pageNumber: Number(getValue(source, 'pageNumber', 'PageNumber') ?? 1),
    totalPages: Number(getValue(source, 'totalPages', 'TotalPages') ?? 1),
    totalCount: Number(getValue(source, 'totalCount', 'TotalCount') ?? items.length),
    hasPreviousPage: Boolean(getValue<boolean>(source, 'hasPreviousPage', 'HasPreviousPage') ?? false),
    hasNextPage: Boolean(getValue<boolean>(source, 'hasNextPage', 'HasNextPage') ?? false),
  };
};

const normalizeDocumentResponse = (
  response: ApiResponse<BackendESignDocumentResponse>
): ApiResponse<ESignDocumentDto> => ({
  ...response,
  data: response.data ? normalizeESignDocument(response.data) : undefined,
});

const normalizeSignaturesResponse = (
  response: ApiResponse<BackendESignSignatureResponse[]>
): ApiResponse<ESignSignatureDto[]> => ({
  ...response,
  data: response.data ? response.data.map(normalizeESignSignature) : [],
});

const normalizeDocumentListResponse = (
  response: ApiResponse<BackendPaginatedESignDocumentsResponse>
): ApiResponse<ESignDocumentListPageDto> => ({
  ...response,
  data: response.data
    ? normalizeESignDocumentListPage(response.data)
    : {
        items: [],
        pageNumber: 1,
        totalPages: 1,
        totalCount: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
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

  /** GET /api/ESign/documents/my */
  getMyDocuments: async (
    params: ESignDocumentListQueryParams = {}
  ): Promise<ApiResponse<ESignDocumentListPageDto>> => {
    const response = await apiService.get<BackendPaginatedESignDocumentsResponse>(
      `${esignUrl}/documents/my`,
      params
    );
    return normalizeDocumentListResponse(response);
  },

  /** GET /api/admin/esign-documents */
  getAdminDocuments: async (
    params: ESignDocumentListQueryParams = {}
  ): Promise<ApiResponse<ESignDocumentListPageDto>> => {
    const response = await apiService.get<BackendPaginatedESignDocumentsResponse>(
      'admin/esign-documents',
      params
    );
    return normalizeDocumentListResponse(response);
  },

  /** GET /api/ESign/documents/{documentId}/download */
  downloadDocument: (documentId: string): Promise<ApiResponse<Blob>> =>
    apiService.download(`${esignUrl}/documents/${documentId}/download`),

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

};
