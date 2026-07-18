export enum DisputeStatus {
  Open = 0,
  UnderReview = 1,
  Resolved = 2,
  Closed = 3,
}

export enum DisputeResolution {
  ClientFavored = 0,
  FreelancerFavored = 1,
  Split = 2,
  Dismissed = 3,
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
  milestone: DisputeMilestone | null;
  reason: string;
  status: DisputeStatus;
  resolution: DisputeResolution | null;
  resolutionLabel: string | null;
  resolutionNote: string | null;
  evidence: DisputeEvidence[];
  createdAt: string;
  updatedAt: string | null;
  resolvedAt: string | null;
}

export interface CreateDisputeInput {
  contractId: string;
  reason: string;
  milestoneId?: string | null;
  evidence?: File | null;
  evidenceDescription?: string | null;
}

export interface DisputeEvidenceDownload {
  evidenceId: string;
  fileName: string;
  downloadUrl: string;
}
