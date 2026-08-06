/**
 * E-Sign Models - ESIGN_DOCUMENTS, ESIGN_SIGNATURES, ESIGN_TEMPLATES tables
 */

export enum ESignDocumentStatus {
  Draft = 0,
  PendingSignatures = 1,
  PartiallySigned = 2,
  FullySigned = 3,
  Expired = 4,
  Voided = 5,
}

export interface ESignPdfArtifactDto {
  documentId: string;
  fileName: string;
}

export enum SignatureStatus {
  Pending = 0,
  Signed = 1,
  Declined = 2,
  Expired = 3,
}

export enum SignatureType {
  Draw = 0,
  TypedName = 1,
  Initials = 2,
  Image = 3,
}

export enum ESignerRole {
  Client = 0,
  Freelancer = 1,
  Witness = 2,
}

export interface ESignDocument {
  id: string;
  contract_id: string;
  title: string;
  description?: string;
  document_url: string;
  status: ESignDocumentStatus;
  created_by: string;
  created_at: string;
  expires_at?: string;
  completed_at?: string;
  updated_at?: string;
}

export interface ESignSignatureDto {
  signatureId: string;
  documentId: string;
  userId: string;
  signerRole: number;
  signatureImageUrl?: string | null;
  signatureWidth?: number | null;
  signatureHeight?: number | null;
  status: number;
  signedAt?: string | null;
  declinedAt?: string | null;
  declineReason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

export interface ESignSignature {
  id: string;
  documentId: string;
  signerId: string;
  signerEmail: string;
  signatureType: SignatureType;
  signatureData?: string;
  signatureImageUrl?: string | null;
  status: SignatureStatus;
  signedAt?: string | null;
  declinedAt?: string | null;
  declinedReason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceInfo?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ESignDocumentDto {
  documentId: string;
  jobPostId: string;
  contractId: string | null;
  templateId: string;
  documentCode: string;
  renderedHtmlContent: string;
  status: ESignDocumentStatus;
  documentHash?: string | null;
  expiresAt?: string | null;
  finalizedAt?: string | null;
  exportedPdfUrl?: string | null;
  currentUserSignerRole: number | null;
  canCurrentUserSign: boolean;
  hasFinalArtifact: boolean;
  finalizedDocumentFileName?: string | null;
  hasPdfArtifact?: boolean;
  createdAt: string;
  updatedAt?: string | null;
  signatures: ESignSignatureDto[];
}

export interface ESignDocumentListItemDto {
  documentId: string;
  jobPostId: string;
  contractId: string | null;
  documentCode: string;
  documentType: string;
  title: string;
  documentStatus: ESignDocumentStatus;
  currentUserSignerRole: number | null;
  currentUserSignedAt?: string | null;
  hasClientSigned: boolean;
  hasFreelancerSigned: boolean;
  canCurrentUserSign: boolean;
  hasFinalArtifact: boolean;
  finalizedDocumentFileName?: string | null;
  hasPdfArtifact?: boolean;
  signatureCount: number;
  finalizedAt?: string | null;
  exportedPdfUrl?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ESignDocumentListQueryParams {
  page?: number;
  pageSize?: number;
  status?: number;
  documentType?: 'job' | 'contract' | 'JobPost' | 'Contract';
  q?: string;
}

export interface ESignDocumentListPageDto {
  items: ESignDocumentListItemDto[];
  pageNumber: number;
  totalPages: number;
  totalCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface CreateSignatureDto {
  documentId: string;
  signerId: string;
  signerEmail: string;
  signatureType: SignatureType;
  signatureData: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  locationData?: string;
}

export interface UpdateSignatureStatusDto {
  status: SignatureStatus;
  declinedReason?: string;
}

export interface SignatureAuditTrail {
  id: string;
  signatureId?: string;
  documentId?: string;
  action: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  locationData?: string;
  details?: Record<string, unknown>;
}

export interface SubmitESignSignatureDto {
  documentId: string;
  signatureImageUrl: string;
  signatureWidth?: number;
  signatureHeight?: number;
}

export interface ESignTemplateDto {
  id: string;
  name: string;
  description?: string;
  templateContent: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ESignTemplate {
  id: string;
  name: string;
  description?: string;
  template_content: string;
  created_by: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateESignDocumentDto {
  contractId: string;
  title: string;
  description?: string;
  documentUrl: string;
  expiresAt?: string;
  signers?: string[];
}

export interface SignatureWorkflowState {
  documentId: string;
  currentStep: 'review' | 'capture' | 'confirm' | 'complete';
  signatureType: number;
  signatureData?: string;
  signatureImageUrl?: string;
  signingInProgress: boolean;
  error?: string;
  success?: string;
}

export interface SignaturePadData {
  x: number;
  y: number;
  pressure: number[];
  timestamp: number;
  points: Array<{ x: number; y: number; pressure: number }>;
}
