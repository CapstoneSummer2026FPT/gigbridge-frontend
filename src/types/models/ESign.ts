/**
 * E-Sign Models - backend ESignDocuments/ESignSignatures contract.
 */

export enum ESignDocumentStatus {
  Draft = 0,
  PendingSignatures = 1,
  Sent = 1,
  PartiallySigned = 2,
  Signed = 2,
  FullySigned = 3,
  Completed = 3,
  Expired = 4,
  Voided = 5,
  Rejected = 5,
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

export interface ESignSignatureDto {
  signatureId: string;
  documentId: string;
  userId: string;
  signerRole: number;
  signatureImageUrl?: string | null;
  signatureWidth?: number | null;
  signatureHeight?: number | null;
  status: SignatureStatus;
  signedAt?: string | null;
  declinedAt?: string | null;
  declineReason?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;

  id?: string;
  signerId?: string;
  signerEmail?: string;
  signatureType?: SignatureType;
  signatureData?: string;
  declinedReason?: string | null;
  deviceInfo?: string;
  locationData?: string;
  timestamp?: string;
  updatedAt?: string;
}

export interface ESignDocumentDto {
  documentId: string;
  jobPostId: string;
  contractId?: string | null;
  templateId: string;
  documentCode: string;
  renderedHtmlContent: string;
  status: ESignDocumentStatus;
  documentHash?: string | null;
  expiresAt?: string | null;
  finalizedAt?: string | null;
  exportedPdfUrl?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  signatures: ESignSignatureDto[];

  id?: string;
  title?: string;
  description?: string;
  documentUrl?: string;
  createdBy?: string;
  completedAt?: string | null;
}

export interface ESignDocument {
  id: string;
  contract_id?: string | null;
  job_post_id?: string;
  title: string;
  description?: string;
  document_url?: string | null;
  rendered_html_content?: string;
  status: ESignDocumentStatus;
  created_by?: string;
  created_at: string;
  expires_at?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
}

export interface ESignSignature {
  id: string;
  document_id: string;
  signer_id: string;
  signer_email?: string;
  signature_type?: SignatureType;
  signature_data?: string;
  signature_image_url?: string | null;
  status: SignatureStatus;
  signed_at?: string | null;
  declined_at?: string | null;
  declined_reason?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  device_info?: string;
  location_data?: string;
  timestamp: string;
  updated_at?: string;
}

export interface ESignTemplate {
  id: string;
  name: string;
  description?: string;
  template_content: string;
  created_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface ESignTemplateDto {
  id: string;
  name: string;
  description?: string;
  templateContent: string;
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateESignDocumentDto {
  contractId?: string;
  jobPostId?: string;
  title?: string;
  description?: string;
  documentUrl?: string;
  expiresAt?: string;
  signers?: string[];
}

export interface SubmitESignSignatureDto {
  documentId: string;
  signatureImageUrl: string;
  signatureWidth?: number | null;
  signatureHeight?: number | null;
}

export interface CreateSignatureDto extends Partial<SubmitESignSignatureDto> {
  documentId: string;
  signerId?: string;
  signerEmail?: string;
  signatureType?: SignatureType;
  signatureData?: string;
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
  signatureId: string;
  action: 'Created' | 'Signed' | 'Declined' | 'Expired' | 'Updated' | string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  locationData?: string;
  details?: Record<string, unknown>;
}

export interface SignatureWorkflowState {
  documentId: string;
  currentStep: 'review' | 'capture' | 'confirm' | 'complete';
  signatureType: SignatureType;
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
