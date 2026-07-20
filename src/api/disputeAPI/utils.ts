import type {
  Dispute,
  DisputeEvidence,
  DisputeEvidenceDownload,
  DisputeResolution,
  DisputeStatus,
  DisputeUrgency,
} from '../../types/models/Dispute';

type UnknownRecord = Record<string, unknown>;

const valueOf = <T>(source: UnknownRecord, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
};

export const normalizeEvidence = (raw: unknown): DisputeEvidence => {
  const source = (raw ?? {}) as UnknownRecord;
  return {
    id: String(valueOf(source, 'disputeEvidenceId', 'DisputeEvidenceId') ?? ''),
    uploadedById: valueOf<string | null>(source, 'uploadedById', 'UploadedById') ?? null,
    fileName: valueOf<string | null>(source, 'fileName', 'FileName') ?? null,
    fileSize: valueOf<number | null>(source, 'fileSize', 'FileSize') ?? null,
    description: valueOf<string | null>(source, 'description', 'Description') ?? null,
    createdAt: String(valueOf(source, 'createdAt', 'CreatedAt') ?? ''),
    isRequestedByAdmin: Boolean(valueOf(source, 'isRequestedByAdmin', 'IsRequestedByAdmin') ?? false),
    requestGroupId: valueOf<string | null>(source, 'requestGroupId', 'RequestGroupId') ?? null,
    requestedByAdminId: valueOf<string | null>(source, 'requestedByAdminId', 'RequestedByAdminId') ?? null,
    requestedAt: valueOf<string | null>(source, 'requestedAt', 'RequestedAt') ?? null,
    deadline: valueOf<string | null>(source, 'deadline', 'Deadline') ?? null,
    requestTarget: valueOf<number | null>(source, 'requestTarget', 'RequestTarget') ?? null,
    isRequestFulfilled: Boolean(valueOf(source, 'isRequestFulfilled', 'IsRequestFulfilled') ?? false),
    reviewedByAdminId: valueOf<string | null>(source, 'reviewedByAdminId', 'ReviewedByAdminId') ?? null,
    reviewedAt: valueOf<string | null>(source, 'reviewedAt', 'ReviewedAt') ?? null,
    reviewNote: valueOf<string | null>(source, 'reviewNote', 'ReviewNote') ?? null,
    uploadedByName: valueOf<string | null>(source, 'uploadedByName', 'UploadedByName') ?? null,
    requestedByAdminName: valueOf<string | null>(source, 'requestedByAdminName', 'RequestedByAdminName') ?? null,
    reviewedByAdminName: valueOf<string | null>(source, 'reviewedByAdminName', 'ReviewedByAdminName') ?? null,
  };
};

export const normalizeDispute = (raw: unknown): Dispute => {
  const source = (raw ?? {}) as UnknownRecord;
  const milestoneId = valueOf<string | null>(source, 'milestonesId', 'MilestonesId') ?? null;
  const evidence = valueOf<unknown[]>(source, 'evidences', 'Evidences') ?? [];
  const resolution = valueOf<number | null>(source, 'resolution', 'Resolution');

  return {
    id: String(valueOf(source, 'disputesId', 'DisputesId') ?? ''),
    contractId: String(valueOf(source, 'contractsId', 'ContractsId') ?? ''),
    initiator: {
      id: String(valueOf(source, 'initiatorId', 'InitiatorId') ?? ''),
      name: valueOf<string | null>(source, 'initiatorName', 'InitiatorName') ?? null,
      role: valueOf<'Client' | 'Freelancer' | null>(source, 'initiatorRole', 'InitiatorRole') ?? null,
    },
    respondent: valueOf<string | null>(source, 'respondentId', 'RespondentId')
      ? {
          id: String(valueOf(source, 'respondentId', 'RespondentId') ?? ''),
          name: valueOf<string | null>(source, 'respondentName', 'RespondentName') ?? null,
          role: valueOf<'Client' | 'Freelancer' | null>(source, 'respondentRole', 'RespondentRole') ?? null,
        }
      : null,
    milestone: milestoneId
      ? {
          id: milestoneId,
          title: valueOf<string | null>(source, 'milestoneTitle', 'MilestoneTitle') ?? null,
        }
      : null,
    relatedReportId: valueOf<string | null>(source, 'relatedReportId', 'RelatedReportId') ?? null,
    title: valueOf<string | null>(source, 'title', 'Title') ?? null,
    description: valueOf<string | null>(source, 'description', 'Description') ?? null,
    reason: String(valueOf(source, 'reason', 'Reason') ?? ''),
    claimedAmount: valueOf<number | null>(source, 'claimedAmount', 'ClaimedAmount') ?? null,
    requestedResolution: valueOf<string | null>(source, 'requestedResolution', 'RequestedResolution') ?? null,
    issueType: valueOf<number | null>(source, 'issueType', 'IssueType') ?? null,
    urgency: Number(valueOf(source, 'urgency', 'Urgency') ?? 0) as DisputeUrgency,
    status: Number(valueOf(source, 'status', 'Status') ?? 0) as DisputeStatus,
    resolution: resolution === undefined || resolution === null
      ? null
      : (Number(resolution) as DisputeResolution),
    resolutionLabel: valueOf<string | null>(source, 'resolutionLabel', 'ResolutionLabel') ?? null,
    resolutionNote: valueOf<string | null>(source, 'resolutionNote', 'ResolutionNote') ?? null,
    evidence: evidence.map(normalizeEvidence),
    createdAt: String(valueOf(source, 'createdAt', 'CreatedAt') ?? ''),
    updatedAt: valueOf<string | null>(source, 'updatedAt', 'UpdatedAt') ?? null,
    resolvedAt: valueOf<string | null>(source, 'resolvedAt', 'ResolvedAt') ?? null,
    openedAt: valueOf<string | null>(source, 'openedAt', 'OpenedAt') ?? null,
  };
};

export const normalizeEvidenceDownload = (raw: unknown): DisputeEvidenceDownload => {
  const source = (raw ?? {}) as UnknownRecord;
  return {
    evidenceId: String(valueOf(source, 'disputeEvidenceId', 'DisputeEvidenceId') ?? ''),
    fileName: String(valueOf(source, 'fileName', 'FileName') ?? ''),
    downloadUrl: String(valueOf(source, 'downloadUrl', 'DownloadUrl') ?? ''),
  };
};
