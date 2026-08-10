export enum DisputeStatus {
  WaitingAdmin = 0,
  InProgress   = 1,
  Resolved     = 2,
  Closed       = 3,
}

export enum DisputeResolution {
  ClientFavored = 0,
  FreelancerFavored = 1,
  Split = 2,
  Dismissed = 3,
}

export enum DisputeUrgency {
  Normal = 0,
  High = 1,
  Critical = 2,
}

export enum EvidenceRequestTarget {
  Reporter = 0,
  Respondent = 1,
  Both = 2,
}

export enum DisputeMilestoneOutcome {
  Accepted = 0,
  Rejected = 1,
  PartiallyAccepted = 2,
  Cancelled = 3,
}

export interface DisputeInitiator {
  id: string;
  name: string | null;
  role: 'Client' | 'Freelancer' | null;
}

export interface DisputeMilestone {
  id: string;
  title: string | null;
}

export interface DisputeEvidence {
  id: string;
  uploadedById: string | null;
  fileName: string | null;
  fileSize: number | null;
  description: string | null;
  createdAt: string;
  isRequestedByAdmin: boolean;
  requestGroupId: string | null;
  requestedByAdminId: string | null;
  requestedAt: string | null;
  deadline: string | null;
  requestTarget: EvidenceRequestTarget | null;
  isRequestFulfilled: boolean;
  reviewedByAdminId: string | null;
  reviewedAt: string | null;
  reviewNote: string | null;
  uploadedByName: string | null;
  requestedByAdminName: string | null;
  reviewedByAdminName: string | null;
}

export interface Dispute {
  id: string;
  contractId: string;
  initiator: DisputeInitiator;
  respondent: DisputeInitiator | null;
  milestone: DisputeMilestone | null;
  relatedReportId: string | null;
  title: string | null;
  description: string | null;
  reason: string;
  claimedAmount: number | null;
  requestedResolution: string | null;
  issueType: number | null;
  urgency: DisputeUrgency;
  status: DisputeStatus;
  resolution: DisputeResolution | null;
  resolutionLabel: string | null;
  resolutionNote: string | null;
  evidence: DisputeEvidence[];
  createdAt: string;
  updatedAt: string | null;
  resolvedAt: string | null;
  openedAt: string | null;
}

export interface EscalateReportToDisputeInput {
  title: string;
  description: string;
  claimedAmount: number;
  requestedResolution: string;
  urgency: DisputeUrgency;
  declarationAccepted: boolean;
  evidenceFiles?: File[];
}

export interface DisputeEvidenceDownload {
  evidenceId: string;
  fileName: string;
  downloadUrl: string;
}
