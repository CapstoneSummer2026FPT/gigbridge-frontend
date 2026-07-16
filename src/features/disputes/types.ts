export interface Dispute {
  disputeId: string;
  contractId: string;
  initiatorId: string;
  milestoneId?: string | null;
  reason: string;
  status: number;
  resolution?: number | null;
  resolutionNote?: string | null;
  isVipPriority: boolean;
  resolutionTargetAt?: string | null;
  aiAnalysisStatus: string;
  createdAt: string;
}

export interface AdminDispute extends Dispute {
  aiSuggestedResolution?: string | null;
  resolvedAt?: string | null;
  resolvedByAdminId?: string | null;
}
