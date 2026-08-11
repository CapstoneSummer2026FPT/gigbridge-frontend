import type { DisputeEvidence, DisputeResolution, DisputeStatus } from './Dispute';

export enum AccountStatus { Active = 0, Suspended = 1, Banned = 2 }
export enum UserViolationType {
  ContractBreach = 0,
  FraudOrMisrepresentation = 1,
  HarassmentOrAbuse = 2,
  PaymentMisconduct = 3,
  PlatformPolicyViolation = 4,
  Other = 5,
}

export interface AdminDisputeParty {
  userId: string;
  profileId: string;
  fullName: string;
  email: string;
  violationCount: number;
  isFlagged: boolean;
  accountStatus: AccountStatus;
  suspendedUntil: string | null;
  bannedAt: string | null;
}

export interface AdminDisputeListItem {
  id: string;
  contractId: string;
  contractTitle: string;
  initiatorName: string;
  initiatorRole: 'Client' | 'Freelancer' | null;
  clientName: string;
  freelancerName: string | null;
  milestoneId: string | null;
  milestoneTitle: string | null;
  reason: string;
  status: DisputeStatus;
  resolution: DisputeResolution | null;
  resolutionLabel: string | null;
  evidenceCount: number;
  createdAt: string;
  updatedAt: string | null;
  resolvedAt: string | null;
}

export interface AdminDisputeListResult {
  items: AdminDisputeListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface AdminRelatedReport { reportId: string; issueType: number; description: string; desiredResolution: string; status: number; createdAt: string; }
export interface AdminContractSummary { totalBudget: number; createdAt: string; startDate: string | null; endDate: string | null; completedAt: string | null; progressPercentage: number; }
export interface AdminJobQuestion { question: string; acceptedAnswer: string | null; }
export interface AdminProposalMilestone { title: string; description: string | null; amount: number; estimatedDuration: string | null; deliverables: string | null; acceptanceCriteria: string | null; orderIndex: number; }
export interface AdminOriginalJob { jobPostId: string; title: string; description: string; budgetMin: number | null; budgetMax: number | null; currency: string | null; duration: string | null; category: string | null; skills: string[]; proposalAmount: number | null; proposalDuration: string | null; questions: AdminJobQuestion[]; proposedMilestones: AdminProposalMilestone[]; }
export interface AdminMilestoneAttachment { attachmentId: string; fileName: string; fileUrl: string; fileSize: number | null; mimeType: string | null; uploadedByUserId: string | null; createdAt: string; }
export interface AdminMilestone { milestoneId: string; title: string; description: string | null; amount: number; releasedAmount: number; allocatableAmount: number; refundedAmount: number; penaltyAmount: number; lockedAmount: number; isInDisputeScope: boolean; status: number; deliverables: string | null; submissionDescription: string | null; dueDate: string | null; startedAt: string | null; submittedAt: string | null; approvedAt: string | null; paidAt: string | null; attachments: AdminMilestoneAttachment[]; }
export interface AdminEscrowSummary { escrowId: string | null; originalEscrow: number; fundedAmount: number; releasedAmount: number; refundedAmount: number; penaltyAmount: number; serviceFeeAmount: number; remainingAmount: number; status: number | null; }
export interface AdminConversationReferences { workspaceConversationId: string | null; disputeConversationId: string | null; }
export interface AdminAuditEvent { auditId: string; adminId: string; action: string; oldValues: string | null; newValues: string | null; createdAt: string; }
export interface AdminUserAuditEvent { auditLogUserId: string; userId: string; userName: string | null; role: number; actionType: number; contractId: string; milestoneId: string | null; milestoneTitle: string | null; reportId: string | null; disputeId: string | null; description: string; createdAt: string; }
export interface AdminMilestoneDecision { decisionId: string; milestoneId: string; outcome: number; milestoneAmount: number; releasedBeforeDecision: number; additionalRelease: number; refund: number; penalty: number; reason: string | null; decidedByAdminId: string; createdAt: string; }
export interface AdminDisputePenalty { penaltyId: string; milestoneId: string; violatingUserId: string | null; amount: number; reason: string; clientDebitWalletTransactionId: string | null; escrowTransactionId: string | null; status: number; createdAt: string; }

export interface AdminDisputeDetail {
  id: string;
  contractId: string;
  contractTitle: string;
  contractStatus: number;
  initiatorId: string;
  initiatorName: string;
  initiatorRole: 'Client' | 'Freelancer' | null;
  client: AdminDisputeParty;
  freelancer: AdminDisputeParty | null;
  milestoneId: string | null;
  milestoneTitle: string | null;
  reason: string;
  status: DisputeStatus;
  resolution: DisputeResolution | null;
  resolutionLabel: string | null;
  resolutionNote: string | null;
  resolvedByAdminId: string | null;
  assignedAdminId: string | null;
  assignedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  evidence: DisputeEvidence[];
  title: string | null;
  description: string | null;
  claimedAmount: number | null;
  requestedResolution: string | null;
  urgency: number;
  respondentId: string | null;
  respondentName: string | null;
  assignedAdminName: string | null;
  relatedReport: AdminRelatedReport | null;
  contract: AdminContractSummary;
  originalJob: AdminOriginalJob;
  milestones: AdminMilestone[];
  escrow: AdminEscrowSummary;
  conversations: AdminConversationReferences;
  auditTrail: AdminAuditEvent[];
  milestoneDecisions: AdminMilestoneDecision[];
  penalties: AdminDisputePenalty[];
  resolutionAuditId: string | null;
  userActionTimeline: AdminUserAuditEvent[];
}

export interface AdminDisputeListParams {
  page?: number;
  pageSize?: number;
  status?: DisputeStatus;
  search?: string;
}
