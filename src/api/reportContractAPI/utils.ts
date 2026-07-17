import type {
  ContractReportIssueType,
  ContractReportResolutionAction,
  ContractReportStatus,
  ReportContract,
  ReportContractAttachment,
  ReportContractListItem,
} from '../../types/models/ReportContract';

type UnknownRecord = Record<string, unknown>;

const valueOf = <T>(source: UnknownRecord, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
};

const normalizeAttachment = (raw: unknown): ReportContractAttachment => {
  const source = (raw ?? {}) as UnknownRecord;
  return {
    reportContractAttachmentId: String(
      valueOf(source, 'reportContractAttachmentId', 'ReportContractAttachmentId') ?? '',
    ),
    fileUrl: String(valueOf(source, 'fileUrl', 'FileUrl') ?? ''),
    fileName: String(valueOf(source, 'fileName', 'FileName') ?? ''),
    contentType: String(valueOf(source, 'contentType', 'ContentType') ?? ''),
    fileSize: Number(valueOf(source, 'fileSize', 'FileSize') ?? 0),
    uploadedAt: String(valueOf(source, 'uploadedAt', 'UploadedAt') ?? ''),
  };
};

export const normalizeReportContract = (raw: unknown): ReportContract => {
  const source = (raw ?? {}) as UnknownRecord;
  const milestoneId = valueOf<string | null>(source, 'milestoneId', 'MilestoneId') ?? null;
  const milestoneTitle = valueOf<string | null>(source, 'milestoneTitle', 'MilestoneTitle') ?? null;
  const attachments = valueOf<unknown[]>(source, 'attachments', 'Attachments') ?? [];
  const respondentId = valueOf<string | null>(source, 'respondentId', 'RespondentId') ?? null;

  return {
    id: String(valueOf(source, 'reportContractId', 'ReportContractId') ?? ''),
    contractId: String(valueOf(source, 'contractId', 'ContractId') ?? ''),
    reporter: {
      id: String(valueOf(source, 'reporterId', 'ReporterId') ?? ''),
      name: valueOf<string | null>(source, 'reporterName', 'ReporterName') ?? null,
      role: valueOf<'Client' | 'Freelancer' | null>(source, 'reporterRole', 'ReporterRole') ?? null,
    },
    respondent: respondentId
      ? {
          id: respondentId,
          name: valueOf<string | null>(source, 'respondentName', 'RespondentName') ?? null,
          role: valueOf<string | null>(source, 'respondentRole', 'RespondentRole') ?? null,
        }
      : null,
    milestone: milestoneId
      ? { id: milestoneId, title: milestoneTitle }
      : null,
    issueType: Number(
      valueOf(source, 'issueType', 'IssueType') ?? 0,
    ) as ContractReportIssueType,
    description: String(valueOf(source, 'description', 'Description') ?? ''),
    desiredResolution: String(
      valueOf(source, 'desiredResolution', 'DesiredResolution') ?? '',
    ),
    status: Number(valueOf(source, 'status', 'Status') ?? 0) as ContractReportStatus,
    resolutionAction:
      (valueOf<number | null>(source, 'resolutionAction', 'ResolutionAction') ?? null) as
        | ContractReportResolutionAction
        | null,
    explanation: valueOf<string | null>(source, 'explanation', 'Explanation') ?? null,
    proposedResolution:
      valueOf<string | null>(source, 'proposedResolution', 'ProposedResolution') ?? null,
    rejectReason: valueOf<string | null>(source, 'rejectReason', 'RejectReason') ?? null,
    resolvedBy: valueOf<string | null>(source, 'resolvedBy', 'ResolvedBy') ?? null,
    createdAt: String(valueOf(source, 'createdAt', 'CreatedAt') ?? ''),
    respondedAt: valueOf<string | null>(source, 'respondedAt', 'RespondedAt') ?? null,
    resolvedAt: valueOf<string | null>(source, 'resolvedAt', 'ResolvedAt') ?? null,
    isEscalatedToDispute: Boolean(
      valueOf(source, 'isEscalatedToDispute', 'IsEscalatedToDispute') ?? false,
    ),
    attachments: attachments.map(normalizeAttachment),
  };
};

export const normalizeReportContractListItem = (raw: unknown): ReportContractListItem => {
  const source = (raw ?? {}) as UnknownRecord;
  return {
    id: String(valueOf(source, 'reportContractId', 'ReportContractId') ?? ''),
    reporterId: String(valueOf(source, 'reporterId', 'ReporterId') ?? ''),
    reporterName: valueOf<string | null>(source, 'reporterName', 'ReporterName') ?? null,
    reporterRole: valueOf<string | null>(source, 'reporterRole', 'ReporterRole') ?? null,
    issueType: Number(valueOf(source, 'issueType', 'IssueType') ?? 0) as ContractReportIssueType,
    status: Number(valueOf(source, 'status', 'Status') ?? 0) as ContractReportStatus,
    resolutionAction:
      (valueOf<number | null>(source, 'resolutionAction', 'ResolutionAction') ?? null) as
        | ContractReportResolutionAction
        | null,
    createdAt: String(valueOf(source, 'createdAt', 'CreatedAt') ?? ''),
    respondedAt: valueOf<string | null>(source, 'respondedAt', 'RespondedAt') ?? null,
    resolvedAt: valueOf<string | null>(source, 'resolvedAt', 'ResolvedAt') ?? null,
  };
};
