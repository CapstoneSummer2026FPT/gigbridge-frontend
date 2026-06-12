/**
 * Contract models aligned with the current Contracts and contract workflow APIs.
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
  PaymentProofUploaded = 4,
  PaymentConfirmed = 5,
  Disputed = 6,

  // Legacy UI aliases retained so older milestone screens compile against the
  // backend enum values while those screens are incrementally migrated.
  NotStarted = Pending,
  SubmittedForReview = Submitted,
  Paid = PaymentConfirmed,
  RevisionRequired = Disputed,
}

export interface ContractEscrowResponse {
  contractEscrowId: string;
  requiredAmount: number;
  fundedAmount: number;
  releasedAmount: number;
  requiredPercentage: number;
  currency: string;
  status: number;
  createdAt: string;
  fundedAt?: string | null;
}

export interface ContractDetailResponse {
  contractId?: string;
  jobPostId?: string;
  clientProfileId?: string;
  freelancerProfileId?: string | null;
  proposalId?: string | null;
  title: string;
  description?: string | null;
  totalBudget: number;
  scopeOfWork?: string | null;
  paymentTerms?: string | null;
  intellectualPropertyTerms?: string | null;
  confidentialityTerms?: string | null;
  cancellationTerms?: string | null;
  disputeTerms?: string | null;
  status: ContractStatus | number;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  escrow?: ContractEscrowResponse | null;
}

export interface ContractDto extends ContractDetailResponse {
  contractsId: string;
  jobPostsId: string;
  clientProfilesId: string;
  freelancerProfilesId?: string | null;
  proposalsId?: string | null;
  completedAt?: string | null;
  esignContractPdfUrl?: string | null;
  milestones?: Milestone[];
}

export interface Contract {
  id: string;
  job_post_id: string;
  client_profile_id: string;
  freelancer_profile_id?: string | null;
  proposal_id?: string | null;
  title: string;
  description?: string | null;
  total_budget: number;
  status: ContractStatus;
  start_date?: string | null;
  end_date?: string | null;
  completed_at?: string | null;
  esign_contract_pdf_url?: string | null;
  created_at: string;
  updated_at?: string | null;
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

export interface ContractMilestoneRequest {
  milestoneId?: string | null;
  title: string;
  amount: number;
  dueDate?: string | null;
  sortOrder?: number | null;
}

export interface UpdateContractDetailsRequest {
  scopeOfWork: string;
  paymentTerms: string;
  intellectualPropertyTerms: string;
  confidentialityTerms: string;
  cancellationTerms: string;
  disputeTerms: string;
  milestones: ContractMilestoneRequest[];
}

export interface RequestContractDetailsChangeRequest {
  reason: string;
}

export interface GenerateContractPdfDto {
  includeTerms?: boolean;
  includeNda?: boolean;
  includeClauses?: string[];
}

export interface Milestone {
  milestoneId?: string;
  contractId?: string;
  title: string;
  amount: number;
  dueDate?: string | null;
  status: MilestoneStatus | number;
  sortOrder?: number | null;
  startedAt?: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  releasedAmount?: number | null;
  lastReleasedAt?: string | null;

  id?: string;
  contract_id?: string;
  due_date?: string | null;
  paid_at?: string | null;
  percentageComplete?: number;
  isOverdue?: boolean;
}

export interface MilestoneAttachment {
  id: string;
  milestone_id: string;
  file_name: string;
  file_url: string;
}

export interface ContractQueryParams {
  pageIndex?: number;
  pageSize?: number;
  PageIndex?: number;
  PageSize?: number;
  status?: ContractStatus;
  searchTerm?: string;
}
