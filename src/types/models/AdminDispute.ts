import type { DisputeEvidence, DisputeResolution, DisputeStatus } from './Dispute';

export interface AdminDisputeParty {
  userId: string;
  profileId: string;
  fullName: string;
  email: string;
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
}

export interface AdminDisputeListParams {
  page?: number;
  pageSize?: number;
  status?: DisputeStatus;
  search?: string;
}
