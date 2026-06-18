import type { ApiResponse } from '../../types/common';
import type { ESignDocumentDto, ESignSignatureDto } from '../../types/models/ESign';
import { ESignDocumentStatus, SignatureStatus, SignatureType } from '../../types/models/ESign';

type ApiObject = Record<string, unknown>;

const asObject = (value: unknown): ApiObject => {
  return value && typeof value === 'object' ? (value as ApiObject) : {};
};

const pick = (source: ApiObject, ...keys: string[]): unknown => {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return undefined;
};

const stringValue = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

const numberValue = (value: unknown): number | undefined => {
  return typeof value === 'number' ? value : undefined;
};

const nullableString = (value: unknown): string | null | undefined => {
  return value === null ? null : stringValue(value);
};

export const mapESignSignature = (value: unknown): ESignSignatureDto => {
  const raw = asObject(value);
  const signatureId = stringValue(pick(raw, 'signatureId', 'SignatureId', 'id', 'Id')) ?? '';
  const documentId = stringValue(pick(raw, 'documentId', 'DocumentId', 'document_id')) ?? '';
  const userId = stringValue(pick(raw, 'userId', 'UserId', 'signerId', 'signer_id')) ?? '';
  const signatureImageUrl = nullableString(pick(raw, 'signatureImageUrl', 'SignatureImageUrl', 'signature_image_url'));
  const createdAt = stringValue(pick(raw, 'createdAt', 'CreatedAt', 'timestamp')) ?? '';
  const signedAt = nullableString(pick(raw, 'signedAt', 'SignedAt', 'signed_at'));
  const declinedAt = nullableString(pick(raw, 'declinedAt', 'DeclinedAt', 'declined_at'));
  const declineReason = nullableString(pick(raw, 'declineReason', 'DeclineReason', 'declinedReason', 'declined_reason'));
  const status = numberValue(pick(raw, 'status', 'Status')) ?? SignatureStatus.Pending;
  const signerRole = numberValue(pick(raw, 'signerRole', 'SignerRole')) ?? 0;
  const signatureWidth = numberValue(pick(raw, 'signatureWidth', 'SignatureWidth')) ?? null;
  const signatureHeight = numberValue(pick(raw, 'signatureHeight', 'SignatureHeight')) ?? null;

  return {
    signatureId,
    id: signatureId,
    documentId,
    userId,
    signerId: userId,
    signerEmail: stringValue(pick(raw, 'signerEmail', 'signer_email')) ?? '',
    signerRole,
    signatureType: numberValue(pick(raw, 'signatureType', 'signature_type')) ?? SignatureType.Draw,
    signatureData: stringValue(pick(raw, 'signatureData', 'signature_data')) ?? signatureImageUrl ?? '',
    signatureImageUrl,
    signatureWidth,
    signatureHeight,
    status,
    signedAt,
    declinedAt,
    declineReason,
    declinedReason: declineReason,
    ipAddress: nullableString(pick(raw, 'ipAddress', 'IpAddress', 'ip_address')),
    userAgent: nullableString(pick(raw, 'userAgent', 'UserAgent', 'user_agent')),
    deviceInfo: stringValue(pick(raw, 'deviceInfo', 'device_info')),
    locationData: stringValue(pick(raw, 'locationData', 'location_data')),
    timestamp: signedAt ?? createdAt,
    createdAt,
    updatedAt: stringValue(pick(raw, 'updatedAt', 'UpdatedAt')),
  };
};

export const mapESignDocument = (value: unknown): ESignDocumentDto => {
  const raw = asObject(value);
  const documentId = stringValue(pick(raw, 'documentId', 'DocumentId', 'id', 'Id')) ?? '';
  const documentCode = stringValue(pick(raw, 'documentCode', 'DocumentCode')) ?? documentId;
  const renderedHtmlContent = stringValue(pick(raw, 'renderedHtmlContent', 'RenderedHtmlContent')) ?? '';
  const exportedPdfUrl = nullableString(pick(raw, 'exportedPdfUrl', 'ExportedPdfUrl', 'documentUrl', 'document_url'));
  const finalizedAt = nullableString(pick(raw, 'finalizedAt', 'FinalizedAt', 'completedAt', 'completed_at'));
  const createdAt = stringValue(pick(raw, 'createdAt', 'CreatedAt', 'created_at')) ?? '';
  const signaturesValue = pick(raw, 'signatures', 'Signatures');
  const signatures = Array.isArray(signaturesValue)
    ? signaturesValue.map(mapESignSignature)
    : [];

  return {
    documentId,
    id: documentId,
    jobPostId: stringValue(pick(raw, 'jobPostId', 'JobPostId', 'job_post_id')) ?? '',
    contractId: nullableString(pick(raw, 'contractId', 'ContractId', 'contract_id')),
    templateId: stringValue(pick(raw, 'templateId', 'TemplateId')) ?? '',
    documentCode,
    title: stringValue(pick(raw, 'title', 'Title')) ?? documentCode,
    description: stringValue(pick(raw, 'description', 'Description')),
    renderedHtmlContent,
    documentUrl: exportedPdfUrl ?? '',
    status: numberValue(pick(raw, 'status', 'Status')) ?? ESignDocumentStatus.Draft,
    documentHash: nullableString(pick(raw, 'documentHash', 'DocumentHash')),
    expiresAt: nullableString(pick(raw, 'expiresAt', 'ExpiresAt', 'expires_at')),
    finalizedAt,
    completedAt: finalizedAt,
    exportedPdfUrl,
    createdBy: stringValue(pick(raw, 'createdBy', 'created_by')),
    createdAt,
    updatedAt: nullableString(pick(raw, 'updatedAt', 'UpdatedAt', 'updated_at')),
    signatures,
  };
};

export const mapApiResponse = <T>(
  response: ApiResponse<unknown>,
  mapper: (value: unknown) => T
): ApiResponse<T> => ({
  ...response,
  data: response.data === undefined ? undefined : mapper(response.data),
});
