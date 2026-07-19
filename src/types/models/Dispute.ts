export enum DisputeStatus {
  Open = 0,
  WaitingAdmin = 1,
  UnderReview = 2,
  WaitingEvidence = 3,
  DecisionPending = 4,
  Resolved = 5,
  Closed = 6,
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
  uploadedById: string;
  fileName: string;
  fileSize: number | null;
  description: string | null;
  createdAt: string;
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
