/**
 * E-Sign Models - ESIGN_DOCUMENTS, ESIGN_SIGNATURES, ESIGN_TEMPLATES tables
 */

export enum ESignDocumentStatus {
  Draft = 0,
  Sent = 1,
  Signed = 2,
  Completed = 3,
  Rejected = 4,
  Expired = 5,
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

export interface ESignDocumentDto {
  id: string;
  contractId: string;
  title: string;
  description?: string;
  documentUrl: string;
  status: ESignDocumentStatus;
  createdBy: string;
  createdAt: string;
  expiresAt?: string;
  completedAt?: string;
  updatedAt?: string;
}

export interface ESignSignature {
  id: string;
  document_id: string;
  signer_id: string;
  signer_email: string;
  signature_type: SignatureType;
  signature_data: string; // Base64 encoded signature image or typed name
  signature_image_url?: string;
  status: SignatureStatus;
  signed_at?: string;
  declined_at?: string;
  declined_reason?: string;
  ip_address?: string;
  user_agent?: string;
  device_info?: string;
  location_data?: string;
  timestamp: string;
  updated_at?: string;
}

export interface ESignSignatureDto {
  id: string;
  documentId: string;
  signerId: string;
  signerEmail: string;
  signatureType: SignatureType;
  signatureData: string;
  signatureImageUrl?: string;
  status: SignatureStatus;
  signedAt?: string;
  declinedAt?: string;
  declinedReason?: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  locationData?: string;
  timestamp: string;
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

export interface ESignTemplateDto {
  id: string;
  name: string;
  description?: string;
  templateContent: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateESignDocumentDto {
  contractId: string;
  title: string;
  description?: string;
  documentUrl: string;
  expiresAt?: string;
  signers?: string[]; // Email addresses or user IDs
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
  signatureId: string;
  action: 'Created' | 'Signed' | 'Declined' | 'Expired' | 'Updated';
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  locationData?: string;
  details?: Record<string, any>;
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
