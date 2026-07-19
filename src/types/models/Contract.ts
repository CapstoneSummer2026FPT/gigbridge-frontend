/**
 * Contract Models - CONTRACTS, MILESTONES, MILESTONE_ATTACHMENTS tables
 */

export enum ContractStatus {
  Draft = 0,
  PendingFreelancerSelection = 1,
  InNegotiation = 2,
  PendingContractDetails = 3,
  PendingContractConfirmation = 4,
  PendingEscrow = 5,
  PendingSignature = 6,
  Active = 7,
  Completed = 8,
  Cancelled = 9,
  Disputed = 10,
}

export enum MilestoneStatus {
  Pending = 0,
  InProgress = 1,
  Submitted = 2,
  Approved = 3,
  /** @deprecated Payment state is derived from releasedAmount and escrow status. */
  PaymentProofUploaded = 4,
  /** @deprecated Payment state is derived from releasedAmount and escrow status. */
  PaymentConfirmed = 5,
  Disputed = 6,
  Cancelled = 7,
}

export enum ContractProductHandoffSourceType {
  File = 0,
  Link = 1,
}

export interface Contract {
  id: string;
  job_post_id: string;
  client_profile_id: string;
  freelancer_profile_id: string;
  proposal_id: string;
  title: string;
  description?: string;
  total_budget: number;
  status: ContractStatus;
  start_date: string;
  end_date: string | null;
  completed_at?: string | null;
  esign_contract_pdf_url?: string;
  created_at: string;
  updated_at?: string;
}

export interface ContractDto {
  contractsId: string;
  jobPostsId: string;
  clientProfilesId: string;
  freelancerProfilesId?: string | null;
  proposalsId?: string | null;
  title: string;
  description?: string;
  totalBudget: number;
  status: ContractStatus;
  startDate?: string;
  endDate?: string;
  completedAt?: string;
  esignContractPdfUrl?: string;
  createdAt: string;
  updatedAt?: string;
  clientName?: string;
  freelancerName?: string | null;
  jobTitle?: string;
  jobDescription?: string;
  clientEmail?: string;
  freelancerEmail?: string;
  conversationId?: string | null;
  canReview?: boolean;
  hasReviewedByCurrentUser?: boolean;
}

export interface CreateContractDto {
  jobPostId: string;
  proposalId: string;
  clientProfileId: string;
  freelancerProfileId: string;
  title: string;
  description?: string;
  totalBudget: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateContractDto {
  title?: string;
  description?: string;
  totalBudget?: number;
  startDate?: string;
  endDate?: string;
  status?: ContractStatus;
}

export interface GenerateContractPdfDto {
  includeTerms?: boolean;
  includeNda?: boolean;
  includeClauses?: string[];
}

export interface Milestone {
  id: string;
  contract_id: string;
  title: string;
  amount: number;
  due_date: string;
  status: MilestoneStatus;
  paid_at: string | null;
  releasedAmount?: number;
  lastReleasedAt?: string | null;
}

export interface WithdrawMilestoneResponse {
  contractId: string;
  milestoneId: string;
  escrowId: string;
  releasedAmountVnd: number;
  releasedTokens: number;
  milestoneReleasedAmountVnd: number;
  escrowReleasedAmountVnd: number;
  escrowStatus: number;
}

export interface EndProjectResponse {
  contractId: string;
  contractStatus: ContractStatus;
  releasedAmountVnd: number;
  releasedTokens: number;
  escrowReleasedAmountVnd: number;
  completedAt?: string | null;
}

export interface ClaimFinalPayoutResponse {
  contractId: string;
  releasedAmountVnd: number;
  releasedTokens: number;
  escrowReleasedAmountVnd: number;
  escrowStatus: number;
  alreadyClaimed: boolean;
  claimedAt?: string | null;
}

export interface ContractProductHandoffResponse {
  contractProductHandoffId: string;
  contractId: string;
  submittedByUserId: string;
  sourceType: ContractProductHandoffSourceType;
  fileName?: string | null;
  fileUrl?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  externalUrl?: string | null;
  note?: string | null;
  version: number;
  isCurrent: boolean;
  receivedByUserId?: string | null;
  receivedAt?: string | null;
  createdAt: string;
}

export interface MilestoneAttachment {
  id: string;
  milestone_id: string;
  file_name: string;
  file_url: string;
  file_size?: number | null;
  source_type?: number;
  mime_type?: string | null;
  uploaded_by_user_id?: string | null;
  created_at?: string;
}

export interface ContractQueryParams {
  pageIndex?: number;
  pageSize?: number;
  PageIndex?: number;
  PageSize?: number;
  status?: ContractStatus;
  searchTerm?: string;
}
