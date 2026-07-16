import type {
  AdminDisputeDetail,
  AdminDisputeListItem,
  AdminDisputeListResult,
  AdminDisputeParty,
} from '../../types/models/AdminDispute';
import type { DisputeEvidence } from '../../types/models/Dispute';
import { DisputeResolution, DisputeStatus } from '../../types/models/Dispute';

type UnknownRecord = Record<string, unknown>;

const valueOf = <T>(source: UnknownRecord, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
};

const nullableString = (source: UnknownRecord, ...keys: string[]): string | null => {
  const value = valueOf<string | null>(source, ...keys);
  return value === undefined || value === null ? null : String(value);
};

const normalizeResolution = (source: UnknownRecord): DisputeResolution | null => {
  const value = valueOf<number | null>(source, 'resolution', 'Resolution');
  return value === undefined || value === null ? null : Number(value) as DisputeResolution;
};

const normalizeEvidence = (raw: unknown): DisputeEvidence => {
  const source = (raw ?? {}) as UnknownRecord;
  return {
    id: String(valueOf(source, 'disputeEvidenceId', 'DisputeEvidenceId') ?? ''),
    uploadedById: String(valueOf(source, 'uploadedById', 'UploadedById') ?? ''),
    fileName: String(valueOf(source, 'fileName', 'FileName') ?? ''),
    fileSize: valueOf<number | null>(source, 'fileSize', 'FileSize') ?? null,
    description: nullableString(source, 'description', 'Description'),
    createdAt: String(valueOf(source, 'createdAt', 'CreatedAt') ?? ''),
  };
};

const normalizeParty = (raw: unknown): AdminDisputeParty => {
  const source = (raw ?? {}) as UnknownRecord;
  return {
    userId: String(valueOf(source, 'userId', 'UserId') ?? ''),
    profileId: String(valueOf(source, 'profileId', 'ProfileId') ?? ''),
    fullName: String(valueOf(source, 'fullName', 'FullName') ?? ''),
    email: String(valueOf(source, 'email', 'Email') ?? ''),
  };
};

export const normalizeAdminDisputeListItem = (raw: unknown): AdminDisputeListItem => {
  const source = (raw ?? {}) as UnknownRecord;
  return {
    id: String(valueOf(source, 'disputeId', 'DisputeId') ?? ''),
    contractId: String(valueOf(source, 'contractId', 'ContractId') ?? ''),
    contractTitle: String(valueOf(source, 'contractTitle', 'ContractTitle') ?? ''),
    initiatorName: String(valueOf(source, 'initiatorName', 'InitiatorName') ?? ''),
    initiatorRole: valueOf<'Client' | 'Freelancer' | null>(source, 'initiatorRole', 'InitiatorRole') ?? null,
    clientName: String(valueOf(source, 'clientName', 'ClientName') ?? ''),
    freelancerName: nullableString(source, 'freelancerName', 'FreelancerName'),
    milestoneId: nullableString(source, 'milestoneId', 'MilestoneId'),
    milestoneTitle: nullableString(source, 'milestoneTitle', 'MilestoneTitle'),
    reason: String(valueOf(source, 'reason', 'Reason') ?? ''),
    status: Number(valueOf(source, 'status', 'Status') ?? 0) as DisputeStatus,
    resolution: normalizeResolution(source),
    resolutionLabel: nullableString(source, 'resolutionLabel', 'ResolutionLabel'),
    evidenceCount: Number(valueOf(source, 'evidenceCount', 'EvidenceCount') ?? 0),
    createdAt: String(valueOf(source, 'createdAt', 'CreatedAt') ?? ''),
    updatedAt: nullableString(source, 'updatedAt', 'UpdatedAt'),
    resolvedAt: nullableString(source, 'resolvedAt', 'ResolvedAt'),
  };
};

export const normalizeAdminDisputeListResult = (raw: unknown): AdminDisputeListResult => {
  const source = (raw ?? {}) as UnknownRecord;
  const items = valueOf<unknown[]>(source, 'items', 'Items') ?? [];
  return {
    items: items.map(normalizeAdminDisputeListItem),
    page: Number(valueOf(source, 'page', 'Page') ?? 1),
    pageSize: Number(valueOf(source, 'pageSize', 'PageSize') ?? 20),
    totalItems: Number(valueOf(source, 'totalItems', 'TotalItems') ?? 0),
    totalPages: Number(valueOf(source, 'totalPages', 'TotalPages') ?? 0),
  };
};

export const normalizeAdminDisputeDetail = (raw: unknown): AdminDisputeDetail => {
  const source = (raw ?? {}) as UnknownRecord;
  const evidence = valueOf<unknown[]>(source, 'evidence', 'Evidence') ?? [];
  const freelancer = valueOf<unknown | null>(source, 'freelancer', 'Freelancer');
  return {
    id: String(valueOf(source, 'disputeId', 'DisputeId') ?? ''),
    contractId: String(valueOf(source, 'contractId', 'ContractId') ?? ''),
    contractTitle: String(valueOf(source, 'contractTitle', 'ContractTitle') ?? ''),
    contractStatus: Number(valueOf(source, 'contractStatus', 'ContractStatus') ?? 0),
    initiatorId: String(valueOf(source, 'initiatorId', 'InitiatorId') ?? ''),
    initiatorName: String(valueOf(source, 'initiatorName', 'InitiatorName') ?? ''),
    initiatorRole: valueOf<'Client' | 'Freelancer' | null>(source, 'initiatorRole', 'InitiatorRole') ?? null,
    client: normalizeParty(valueOf(source, 'client', 'Client')),
    freelancer: freelancer ? normalizeParty(freelancer) : null,
    milestoneId: nullableString(source, 'milestoneId', 'MilestoneId'),
    milestoneTitle: nullableString(source, 'milestoneTitle', 'MilestoneTitle'),
    reason: String(valueOf(source, 'reason', 'Reason') ?? ''),
    status: Number(valueOf(source, 'status', 'Status') ?? 0) as DisputeStatus,
    resolution: normalizeResolution(source),
    resolutionLabel: nullableString(source, 'resolutionLabel', 'ResolutionLabel'),
    resolutionNote: nullableString(source, 'resolutionNote', 'ResolutionNote'),
    resolvedByAdminId: nullableString(source, 'resolvedByAdminId', 'ResolvedByAdminId'),
    resolvedAt: nullableString(source, 'resolvedAt', 'ResolvedAt'),
    createdAt: String(valueOf(source, 'createdAt', 'CreatedAt') ?? ''),
    updatedAt: nullableString(source, 'updatedAt', 'UpdatedAt'),
    evidence: evidence.map(normalizeEvidence),
  };
};
