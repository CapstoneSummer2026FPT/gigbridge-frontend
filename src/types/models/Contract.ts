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

export enum ContractWorkItemStatus {
  Todo = 0,
  InProgress = 1,
  Completed = 2,
  RevisionRequired = 3,
}

export interface ContractWorkItem {
  workItemId: string;
  milestoneId: string;
  title: string;
  description?: string | null;
  deliverables?: string | null;
  estimatedDuration?: string | null;
  orderIndex: number;
  status: ContractWorkItemStatus | number;
  progressNote?: string | null;
  completedAt?: string | null;
  updatedAt?: string | null;
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
  revisionNumber?: number;
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
  sortOrder?: number | null;
  startedAt?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  paid_at: string | null;
  releasedAmount?: number;
  lastReleasedAt?: string | null;
  description?: string | null;
  estimatedDuration?: string | null;
  deliverables?: string | null;
  acceptanceCriteria?: string | null;
  submissionDescription?: string | null;
  workItems: ContractWorkItem[];
}

export interface MilestoneEarlyStartRequest {
  requestId: string;
  contractId: string;
  milestoneId: string;
  reason: string;
  responseNote?: string | null;
  status: number;
  createdAt: string;
  respondedAt?: string | null;
}

export enum ContractChangeRequestStatus {
  Pending = 0,
  Accepted = 1,
  Rejected = 2,
  NeedsClarification = 3,
}

export enum ContractAmendmentStatus {
  PendingFreelancerReview = 0,
  ChangeRequested = 1,
  PendingSignatures = 2,
  PendingFunding = 3,
  Applied = 4,
  Rejected = 5,
  Cancelled = 6,
}

export interface ContractChangeRequestDto {
  changeRequestId: string;
  contractId: string;
  requestedByUserId: string;
    reason: string;
    requestedChanges: string;
    responseNote?: string | null;
    clarificationRequestNote?: string | null;
    clarificationResponseNote?: string | null;
  affectedMilestoneIds: string[];
  affectedWorkItemIds: string[];
  status: ContractChangeRequestStatus | number;
    createdAt: string;
    respondedAt?: string | null;
    clarifiedAt?: string | null;
    canRespond: boolean;
    canClarify: boolean;
}

export interface ContractAmendmentWorkItemDto {
  sourceWorkItemId?: string | null;
  title: string;
  description?: string | null;
  deliverables?: string | null;
  estimatedDuration?: string | null;
  orderIndex: number;
}

export interface ContractAmendmentMilestoneDto {
  sourceMilestoneId?: string | null;
  title: string;
  description?: string | null;
  amount: number;
  estimatedDuration?: string | null;
  dueDate?: string | null;
  deliverables?: string | null;
  acceptanceCriteria?: string | null;
  orderIndex: number;
  workItems: ContractAmendmentWorkItemDto[];
}

export interface ContractAmendmentDetailDto {
  amendmentId: string;
  contractId: string;
  changeRequestId: string;
  revisionNumber: number;
  reason: string;
  originalTotalBudget: number;
    proposedTotalBudget: number;
    budgetDelta: number;
    reviewNote?: string | null;
  status: ContractAmendmentStatus | number;
  signatureCount: number;
  createdAt: string;
  appliedAt?: string | null;
  milestones: ContractAmendmentMilestoneDto[];
}

export interface EndProjectResponse {
  contractId: string;
  contractStatus: ContractStatus;
  releasedAmountVnd: number;
  releasedTokens: number;
  escrowReleasedAmountVnd: number;
  completedAt?: string | null;
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
