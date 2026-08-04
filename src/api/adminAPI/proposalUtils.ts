import type {
  AdminProposalAi,
  AdminProposalDetail,
  AdminProposalMilestone,
  AdminProposalOffer,
  AdminProposalParty,
  AdminProposalQuestion,
  AdminProposalRelation,
  AdminProposalWorkItem,
} from '../../types/models/AdminProposal';

type UnknownRecord = Record<string, unknown>;

const valueOf = <T>(source: UnknownRecord, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null) return value as T;
  }
  return undefined;
};

const stringValue = (source: UnknownRecord, ...keys: string[]): string | null => {
  const value = valueOf<string | null>(source, ...keys);
  return value === undefined || value === null ? null : String(value);
};

const numberValue = (source: UnknownRecord, ...keys: string[]): number | null => {
  const value = valueOf<number | string | null>(source, ...keys);
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const boolValue = (source: UnknownRecord, ...keys: string[]): boolean | null => {
  const value = valueOf<boolean | null>(source, ...keys);
  return value === undefined || value === null ? null : Boolean(value);
};

const asArray = <T>(raw: unknown, mapper: (item: unknown) => T): T[] => {
  const list = Array.isArray(raw) ? raw : [];
  return list.map(mapper);
};

const normalizeParty = (raw: unknown): AdminProposalParty => {
  const source = (raw ?? {}) as UnknownRecord;
  return {
    userId: String(valueOf(source, 'userId', 'UserId') ?? ''),
    name: String(valueOf(source, 'name', 'Name') ?? ''),
    avatar: stringValue(source, 'avatar', 'Avatar'),
    summary: stringValue(source, 'summary', 'Summary'),
    accountStatus: Number(valueOf(source, 'accountStatus', 'AccountStatus') ?? 0),
    isActive: Boolean(valueOf(source, 'isActive', 'IsActive') ?? false),
    isFlagged: Boolean(valueOf(source, 'isFlagged', 'IsFlagged') ?? false),
    violationCount: Number(valueOf(source, 'violationCount', 'ViolationCount') ?? 0),
    reportCount: Number(valueOf(source, 'reportCount', 'ReportCount') ?? 0),
    skills: asArray<string>(valueOf(source, 'skills', 'Skills'), (item) => String(item ?? '')),
    eloPoints: numberValue(source, 'eloPoints', 'EloPoints'),
    isPremium: Boolean(valueOf(source, 'isPremium', 'IsPremium') ?? false),
  };
};

const normalizeWorkItem = (raw: unknown): AdminProposalWorkItem => {
  const source = (raw ?? {}) as UnknownRecord;
  return {
    workItemId: String(valueOf(source, 'workItemId', 'WorkItemId') ?? ''),
    title: String(valueOf(source, 'title', 'Title') ?? ''),
    description: stringValue(source, 'description', 'Description'),
    deliverables: stringValue(source, 'deliverables', 'Deliverables'),
    estimatedDuration: stringValue(source, 'estimatedDuration', 'EstimatedDuration'),
    order: Number(valueOf(source, 'order', 'Order') ?? 0),
  };
};

const normalizeMilestone = (raw: unknown): AdminProposalMilestone => {
  const source = (raw ?? {}) as UnknownRecord;
  return {
    milestoneId: String(valueOf(source, 'milestoneId', 'MilestoneId') ?? ''),
    title: String(valueOf(source, 'title', 'Title') ?? ''),
    description: stringValue(source, 'description', 'Description'),
    amount: Number(valueOf(source, 'amount', 'Amount') ?? 0),
    estimatedDuration: stringValue(source, 'estimatedDuration', 'EstimatedDuration'),
    dueDate: stringValue(source, 'dueDate', 'DueDate'),
    deliverables: stringValue(source, 'deliverables', 'Deliverables'),
    acceptanceCriteria: stringValue(source, 'acceptanceCriteria', 'AcceptanceCriteria'),
    order: Number(valueOf(source, 'order', 'Order') ?? 0),
    workItems: asArray(valueOf(source, 'workItems', 'WorkItems'), normalizeWorkItem),
  };
};

const normalizeQuestion = (raw: unknown): AdminProposalQuestion => {
  const source = (raw ?? {}) as UnknownRecord;
  return {
    questionId: String(valueOf(source, 'questionId', 'QuestionId') ?? ''),
    question: String(valueOf(source, 'question', 'Question') ?? ''),
    order: Number(valueOf(source, 'order', 'Order') ?? 0),
    required: Boolean(valueOf(source, 'required', 'Required') ?? false),
    answer: stringValue(source, 'answer', 'Answer'),
    answeredAt: stringValue(source, 'answeredAt', 'AnsweredAt'),
    timerStartedAt: stringValue(source, 'timerStartedAt', 'TimerStartedAt'),
    timerCompletedAt: stringValue(source, 'timerCompletedAt', 'TimerCompletedAt'),
    timerLocked: boolValue(source, 'timerLocked', 'TimerLocked'),
  };
};

const normalizeOffer = (raw: unknown): AdminProposalOffer => {
  const source = (raw ?? {}) as UnknownRecord;
  return {
    offerId: String(valueOf(source, 'offerId', 'OfferId') ?? ''),
    conversationId: String(valueOf(source, 'conversationId', 'ConversationId') ?? ''),
    createdByUserId: String(valueOf(source, 'createdByUserId', 'CreatedByUserId') ?? ''),
    createdByName: String(valueOf(source, 'createdByName', 'CreatedByName') ?? ''),
    createdByAvatar: stringValue(source, 'createdByAvatar', 'CreatedByAvatar'),
    budget: Number(valueOf(source, 'budget', 'Budget') ?? 0),
    startDate: stringValue(source, 'startDate', 'StartDate'),
    endDate: stringValue(source, 'endDate', 'EndDate'),
    scope: stringValue(source, 'scope', 'Scope'),
    status: Number(valueOf(source, 'status', 'Status') ?? 0),
    createdAt: String(valueOf(source, 'createdAt', 'CreatedAt') ?? ''),
    respondedAt: stringValue(source, 'respondedAt', 'RespondedAt'),
    milestones: asArray(valueOf(source, 'milestones', 'Milestones'), (milestone) => {
      const ms = (milestone ?? {}) as UnknownRecord;
      return {
        title: String(valueOf(ms, 'title', 'Title') ?? ''),
        description: stringValue(ms, 'description', 'Description'),
        amount: Number(valueOf(ms, 'amount', 'Amount') ?? 0),
        estimatedDuration: stringValue(ms, 'estimatedDuration', 'EstimatedDuration'),
        dueDate: stringValue(ms, 'dueDate', 'DueDate'),
        workItems: asArray(valueOf(ms, 'workItems', 'WorkItems'), normalizeWorkItem),
      };
    }),
  };
};

const normalizeRelation = (raw: unknown): AdminProposalRelation => {
  const source = (raw ?? {}) as UnknownRecord;
  return {
    id: String(valueOf(source, 'id', 'Id') ?? ''),
    kind: String(valueOf(source, 'kind', 'Kind') ?? ''),
    relation: String(valueOf(source, 'relation', 'Relation') ?? ''),
    status: Number(valueOf(source, 'status', 'Status') ?? 0),
    reason: stringValue(source, 'reason', 'Reason'),
    createdAt: String(valueOf(source, 'createdAt', 'CreatedAt') ?? ''),
    contractId: stringValue(source, 'contractId', 'ContractId'),
    relatedId: stringValue(source, 'relatedId', 'RelatedId'),
  };
};

const normalizeAi = (raw: unknown): AdminProposalAi => {
  const source = (raw ?? {}) as UnknownRecord;
  return {
    definitionId: stringValue(source, 'definitionId', 'DefinitionId'),
    definitionStatus: numberValue(source, 'definitionStatus', 'DefinitionStatus'),
    attemptId: stringValue(source, 'attemptId', 'AttemptId'),
    attemptStatus: numberValue(source, 'attemptStatus', 'AttemptStatus'),
    startedAt: stringValue(source, 'startedAt', 'StartedAt'),
    completedAt: stringValue(source, 'completedAt', 'CompletedAt'),
    score: numberValue(source, 'score', 'Score'),
    compatibilityScore: numberValue(source, 'compatibilityScore', 'CompatibilityScore'),
    result: stringValue(source, 'result', 'Result'),
    recommendedHire: boolValue(source, 'recommendedHire', 'RecommendedHire'),
    answers: asArray(valueOf(source, 'answers', 'Answers'), (answer) => {
      const a = (answer ?? {}) as UnknownRecord;
      return {
        questionIndex: Number(valueOf(a, 'questionIndex', 'QuestionIndex') ?? 0),
        question: stringValue(a, 'question', 'Question'),
        transcript: stringValue(a, 'transcript', 'Transcript'),
        score: numberValue(a, 'score', 'Score'),
      };
    }),
    judgingScore: numberValue(source, 'judgingScore', 'JudgingScore'),
    judgingSummary: stringValue(source, 'judgingSummary', 'JudgingSummary'),
    judgedAt: stringValue(source, 'judgedAt', 'JudgedAt'),
    reviewStartedAt: stringValue(source, 'reviewStartedAt', 'ReviewStartedAt'),
    reviewCompletedAt: stringValue(source, 'reviewCompletedAt', 'ReviewCompletedAt'),
    reviewLocked: boolValue(source, 'reviewLocked', 'ReviewLocked'),
  };
};

/**
 * Normalizes the admin proposal detail response at the API boundary.
 * Guarantees every optional collection is an array (never undefined) so
 * consumers can safely call `.length` / `.map`, and tolerates both the
 * backend's camelCase serialization and PascalCase defensive fallbacks.
 * Returns a well-typed AdminProposalDetail that matches the frontend contract.
 */
export const normalizeAdminProposalDetail = (raw: unknown): AdminProposalDetail => {
  const source = (raw ?? {}) as UnknownRecord;
  const aiRaw = valueOf(source, 'aiInterview', 'AiInterview');
  const contractRaw = valueOf(source, 'contract', 'Contract');

  return {
    proposalId: String(valueOf(source, 'proposalId', 'ProposalId') ?? ''),
    coverLetter: stringValue(source, 'coverLetter', 'CoverLetter'),
    proposedBudget: numberValue(source, 'proposedBudget', 'ProposedBudget'),
    estimatedDuration: stringValue(source, 'estimatedDuration', 'EstimatedDuration'),
    analysisSummary: stringValue(source, 'analysisSummary', 'AnalysisSummary'),
    solutionApproach: stringValue(source, 'solutionApproach', 'SolutionApproach'),
    deliverables: stringValue(source, 'deliverables', 'Deliverables'),
    assumptions: stringValue(source, 'assumptions', 'Assumptions'),
    outOfScope: stringValue(source, 'outOfScope', 'OutOfScope'),
    submittedAt: stringValue(source, 'submittedAt', 'SubmittedAt'),
    updatedAt: stringValue(source, 'updatedAt', 'UpdatedAt'),
    lifecycleStatus: Number(valueOf(source, 'lifecycleStatus', 'LifecycleStatus') ?? 0),
    moderationStatus: Number(valueOf(source, 'moderationStatus', 'ModerationStatus') ?? 0),
    invalidationReason: stringValue(source, 'invalidationReason', 'InvalidationReason'),
    invalidatedAt: stringValue(source, 'invalidatedAt', 'InvalidatedAt'),
    invalidatedByAdminId: stringValue(source, 'invalidatedByAdminId', 'InvalidatedByAdminId'),
    invalidatedByAdminName: stringValue(source, 'invalidatedByAdminName', 'InvalidatedByAdminName'),
    jobPostId: String(valueOf(source, 'jobPostId', 'JobPostId') ?? ''),
    jobPostTitle: String(valueOf(source, 'jobPostTitle', 'JobPostTitle') ?? ''),
    jobPostDescription: stringValue(source, 'jobPostDescription', 'JobPostDescription'),
    jobBudgetMin: numberValue(source, 'jobBudgetMin', 'JobBudgetMin'),
    jobBudgetMax: numberValue(source, 'jobBudgetMax', 'JobBudgetMax'),
    jobDuration: stringValue(source, 'jobDuration', 'JobDuration'),
    jobStatus: Number(valueOf(source, 'jobStatus', 'JobStatus') ?? 0),
    jobVisibility: numberValue(source, 'jobVisibility', 'JobVisibility'),
    requiredSkills: asArray<string>(valueOf(source, 'requiredSkills', 'RequiredSkills'), (item) => String(item ?? '')),
    client: normalizeParty(valueOf(source, 'client', 'Client')),
    freelancer: normalizeParty(valueOf(source, 'freelancer', 'Freelancer')),
    answers: asArray(valueOf(source, 'answers', 'Answers'), normalizeQuestion),
    milestones: asArray(valueOf(source, 'milestones', 'Milestones'), normalizeMilestone),
    unassignedWorkItems: asArray(valueOf(source, 'unassignedWorkItems', 'UnassignedWorkItems'), normalizeWorkItem),
    aiInterview: aiRaw === undefined || aiRaw === null ? null : normalizeAi(aiRaw),
    negotiationHistory: asArray(valueOf(source, 'negotiationHistory', 'NegotiationHistory'), normalizeOffer),
    contract: contractRaw === undefined || contractRaw === null ? null : (() => {
      const cs = (contractRaw ?? {}) as UnknownRecord;
      return {
        contractId: String(valueOf(cs, 'contractId', 'ContractId') ?? ''),
        title: String(valueOf(cs, 'title', 'Title') ?? ''),
        status: Number(valueOf(cs, 'status', 'Status') ?? 0),
        budget: Number(valueOf(cs, 'budget', 'Budget') ?? 0),
        startDate: stringValue(cs, 'startDate', 'StartDate'),
        endDate: stringValue(cs, 'endDate', 'EndDate'),
        createdAt: String(valueOf(cs, 'createdAt', 'CreatedAt') ?? ''),
        milestoneCount: Number(valueOf(cs, 'milestoneCount', 'MilestoneCount') ?? 0),
        escrowFunded: numberValue(cs, 'escrowFunded', 'EscrowFunded'),
        escrowReleased: numberValue(cs, 'escrowReleased', 'EscrowReleased'),
        contractReportCount: Number(valueOf(cs, 'contractReportCount', 'ContractReportCount') ?? 0),
        disputeCount: Number(valueOf(cs, 'disputeCount', 'DisputeCount') ?? 0),
      };
    })(),
    reports: asArray(valueOf(source, 'reports', 'Reports'), normalizeRelation),
    contractReports: asArray(valueOf(source, 'contractReports', 'ContractReports'), normalizeRelation),
    disputes: asArray(valueOf(source, 'disputes', 'Disputes'), normalizeRelation),
    internalNotes: asArray(valueOf(source, 'internalNotes', 'InternalNotes'), (note) => {
      const ns = (note ?? {}) as UnknownRecord;
      return {
        noteId: String(valueOf(ns, 'noteId', 'NoteId') ?? ''),
        adminId: String(valueOf(ns, 'adminId', 'AdminId') ?? ''),
        adminName: String(valueOf(ns, 'adminName', 'AdminName') ?? ''),
        adminAvatar: stringValue(ns, 'adminAvatar', 'AdminAvatar'),
        content: String(valueOf(ns, 'content', 'Content') ?? ''),
        createdAt: String(valueOf(ns, 'createdAt', 'CreatedAt') ?? ''),
      };
    }),
    auditHistory: asArray(valueOf(source, 'auditHistory', 'AuditHistory'), (audit) => {
      const as = (audit ?? {}) as UnknownRecord;
      return {
        auditId: String(valueOf(as, 'auditId', 'AuditId') ?? ''),
        adminId: String(valueOf(as, 'adminId', 'AdminId') ?? ''),
        adminName: String(valueOf(as, 'adminName', 'AdminName') ?? ''),
        adminAvatar: stringValue(as, 'adminAvatar', 'AdminAvatar'),
        action: String(valueOf(as, 'action', 'Action') ?? ''),
        oldValues: stringValue(as, 'oldValues', 'OldValues'),
        newValues: stringValue(as, 'newValues', 'NewValues'),
        correlationId: String(valueOf(as, 'correlationId', 'CorrelationId') ?? ''),
        createdAt: String(valueOf(as, 'createdAt', 'CreatedAt') ?? ''),
      };
    }),
  };
};
