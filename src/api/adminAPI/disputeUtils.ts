import type {
  AdminDisputeDetail,
  AdminDisputeListItem,
  AdminDisputeListResult,
  AdminDisputeParty,
} from '../../types/models/AdminDispute';
import { DisputeResolution, DisputeStatus } from '../../types/models/Dispute';
import { normalizeEvidence } from '../disputeAPI/utils';

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

const normalizeParty = (raw: unknown): AdminDisputeParty => {
  const source = (raw ?? {}) as UnknownRecord;
  return {
    userId: String(valueOf(source, 'userId', 'UserId') ?? ''),
    profileId: String(valueOf(source, 'profileId', 'ProfileId') ?? ''),
    fullName: String(valueOf(source, 'fullName', 'FullName') ?? ''),
    email: String(valueOf(source, 'email', 'Email') ?? ''),
    violationCount: Number(valueOf(source, 'violationCount', 'ViolationCount') ?? 0),
    isFlagged: Boolean(valueOf(source, 'isFlagged', 'IsFlagged') ?? false),
    accountStatus: Number(valueOf(source, 'accountStatus', 'AccountStatus') ?? 0),
    suspendedUntil: nullableString(source, 'suspendedUntil', 'SuspendedUntil'),
    bannedAt: nullableString(source, 'bannedAt', 'BannedAt'),
  };
};

const normalizeAdminDisputeListItem = (raw: unknown): AdminDisputeListItem => {
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
  const contract = valueOf<AdminDisputeDetail['contract']>(source, 'contract', 'Contract');
  const originalJob = valueOf<AdminDisputeDetail['originalJob']>(source, 'originalJob', 'OriginalJob');
  const escrow = valueOf<AdminDisputeDetail['escrow']>(source, 'escrow', 'Escrow');
  const conversations = valueOf<AdminDisputeDetail['conversations']>(source, 'conversations', 'Conversations');
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
    assignedAdminId: nullableString(source, 'assignedAdminId', 'AssignedAdminId'),
    assignedAt: nullableString(source, 'assignedAt', 'AssignedAt'),
    resolvedAt: nullableString(source, 'resolvedAt', 'ResolvedAt'),
    createdAt: String(valueOf(source, 'createdAt', 'CreatedAt') ?? ''),
    updatedAt: nullableString(source, 'updatedAt', 'UpdatedAt'),
    evidence: evidence.map(normalizeEvidence),
    title: nullableString(source, 'title', 'Title'),
    description: nullableString(source, 'description', 'Description'),
    claimedAmount: valueOf<number | null>(source, 'claimedAmount', 'ClaimedAmount') ?? null,
    requestedResolution: nullableString(source, 'requestedResolution', 'RequestedResolution'),
    urgency: Number(valueOf(source, 'urgency', 'Urgency') ?? 0),
    respondentId: nullableString(source, 'respondentId', 'RespondentId'),
    respondentName: nullableString(source, 'respondentName', 'RespondentName'),
    assignedAdminName: nullableString(source, 'assignedAdminName', 'AssignedAdminName'),
    relatedReport: valueOf(source, 'relatedReport', 'RelatedReport') ?? null,
    contract: contract ?? { totalBudget: 0, createdAt: '', startDate: null, endDate: null, completedAt: null, progressPercentage: 0 },
    originalJob: originalJob ?? { jobPostId: '', title: '', description: '', budgetMin: null, budgetMax: null, currency: null, duration: null, category: null, skills: [], proposalAmount: null, proposalDuration: null, questions: [], proposedMilestones: [] },
    milestones: valueOf(source, 'milestones', 'Milestones') ?? [],
    escrow: escrow ?? { escrowId: null, originalEscrow: 0, fundedAmount: 0, releasedAmount: 0, refundedAmount: 0, penaltyAmount: 0, serviceFeeAmount: 0, remainingAmount: 0, status: null },
    conversations: conversations ?? { workspaceConversationId: null, disputeConversationId: null },
    auditTrail: valueOf(source, 'auditTrail', 'AuditTrail') ?? [],
    milestoneDecisions: valueOf(source, 'milestoneDecisions', 'MilestoneDecisions') ?? [],
    penalties: valueOf(source, 'penalties', 'Penalties') ?? [],
    resolutionAuditId: nullableString(source, 'resolutionAuditId', 'ResolutionAuditId'),
    userActionTimeline: valueOf(source, 'userActionTimeline', 'UserActionTimeline') ?? [],
  };
};
