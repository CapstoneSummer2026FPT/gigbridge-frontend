/**
 * Proposal Models - PROPOSALS & PROPOSAL_ATTACHMENTS tables
 */

export enum ProposalStatus {
  Draft = 0,
  Pending = 1,
  Shortlisted = 2,
  Accepted = 3,
  Rejected = 4,
  Withdrawn = 5,
}

export interface Proposal {
  id: string;
  job_post_id: string;
  freelancer_profile_id: string;
  cover_letter: string;
  proposed_budget: number;
  proposed_duration: string;
  status: ProposalStatus;
  is_ai_generated: boolean;
  submitted_at: string;
}

export interface ProposalAttachment {
  id: string;
  proposal_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
}

export interface ProposalQueryParams {
  pageIndex?: number;
  pageSize?: number;
  PageIndex?: number;
  PageSize?: number;
}

export interface ProposalDto {
  proposalsId: string;
  jobPostsId: string;
  jobTitle: string;
  freelancerProfilesId: string;
  freelancerName: string;
  coverLetter: string;
  proposedBudget: number;
  proposedDuration: string;
  status: ProposalStatus | number;
  submittedAt: string;
  reviewedAt?: string | null;
  analysisSummaryPreview?: string;
  workItemCount?: number;
  milestoneCount?: number;
  milestoneTotal?: number;
  firstMilestoneAmount?: number | null;
  hasAiInterview?: boolean;
  aiInterviewCompleted?: boolean;
  aiInterviewInProgress?: boolean;
  aiInterviewDefinitionId?: string | null;
}

export interface ProposalAttachmentViewModel {
  propoAttach_ProposalAttachmentsId: string;
  propo_ProposalsId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  createdAt: string;
}

export type ProposalViewModel = ProposalDto & {
  updatedAt?: string;
  isAIGenerated?: boolean;
  interviewScore?: number;
  rankingScore?: number;
  boostedTokenAmount?: number;
  attachments?: ProposalAttachmentViewModel[];
};

export interface ProposalWorkBreakdownItemDto {
  id?: string | null;
  milestonePlanId?: string | null;
  milestoneOrderIndex?: number | null;
  title?: string | null;
  description?: string | null;
  deliverables?: string | null;
  estimatedDuration?: string | null;
  orderIndex: number;
}

export interface ProposalMilestonePlanDto {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  amount: number;
  estimatedDuration?: string | null;
  deliverables?: string | null;
  acceptanceCriteria?: string | null;
  orderIndex: number;
  workItems?: ProposalWorkBreakdownItemDto[];
}

export interface ProposalDetailDto {
  proposalId: string;
  jobPostId: string;
  jobPostTitle?: string | null;
  freelancerProfileId: string;
  freelancerName?: string | null;
  coverLetter?: string | null;
  proposedBudget?: number | null;
  proposedDuration?: string | null;
  status: ProposalStatus | number;
  submittedAt?: string | null;
  updatedAt?: string | null;
  isAigenerated?: boolean | null;
  analysisSummary?: string | null;
  solutionApproach?: string | null;
  deliverables?: string | null;
  assumptions?: string | null;
  outOfScope?: string | null;
  workBreakdownItems?: ProposalWorkBreakdownItemDto[];
  milestonePlans?: ProposalMilestonePlanDto[];
}

export interface CreateProposalRequest {
  jobPostsId: string;
  coverLetter: string;
  proposedBudget: number | null;
  proposedDuration?: string | null;
  analysisSummary?: string | null;
  solutionApproach?: string | null;
  deliverables?: string | null;
  assumptions?: string | null;
  outOfScope?: string | null;
  workBreakdownItems?: ProposalWorkBreakdownItemDto[];
  milestonePlans?: ProposalMilestonePlanDto[];
}

export interface UpdateProposalRequest {
  coverLetter?: string | null;
  proposedBudget: number | null;
  proposedDuration?: string | null;
  analysisSummary?: string | null;
  solutionApproach?: string | null;
  deliverables?: string | null;
  assumptions?: string | null;
  outOfScope?: string | null;
  workBreakdownItems?: ProposalWorkBreakdownItemDto[];
  milestonePlans?: ProposalMilestonePlanDto[];
}

export interface UpdateProposalStatusRequest {
  status: ProposalStatus | number;
}

export interface CheatingPenaltyResultDto {
  applied: boolean;
  violationId: string;
  violationNumber: number;
  eloDelta: number;
  action: number;
  suspendedUntil?: string | null;
  message: string;
}

export interface UpdateProposalStatusResponse {
  success: boolean;
  status: ProposalStatus | number;
  cheatingPenalty?: CheatingPenaltyResultDto | null;
}

export enum QuestionTimerLockedReason {
  Completed = 0,
  Timeout = 1,
}

export interface QuestionTimerStateDto {
  proposalId: string;
  jobPostQuestionId: string;
  startedAt: string;
  expiresAt: string;
  remainingSeconds: number;
  isLocked: boolean;
  lockedReason?: QuestionTimerLockedReason | number | null;
}

export interface CompleteQuestionTimerRequest {
  answerText?: string | null;
  lockedReason: QuestionTimerLockedReason | number;
}

export interface InterviewReviewSessionDto {
  proposalId: string;
  startedAt: string;
  expiresAt: string;
  remainingSeconds: number;
  isLocked: boolean;
  reviewableQuestionCount: number;
  reviewableQuestionIds: string[];
}

export type CheatingEventType = 0 | 1 | 2 | 3 | 4 | 5;

export interface LogProposalCheatingEventRequest {
  eventType: CheatingEventType;
  jobPostQuestionId?: string | null;
  clientEventId: string;
  occurredAt?: string | null;
  metadata?: Record<string, string | null>;
}

export interface CheatingEventLogResponse {
  proposalId: string;
  eventType: CheatingEventType;
  totalSessionEventCount: number;
  copyCount: number;
  pasteCount: number;
  tabSwitchCount: number;
  screenshotAttemptCount: number;
  focusLossCount: number;
  fullscreenExitCount: number;
  warningMessage: string;
}

export interface ProposalAnswerDto {
  proposalAnswersId?: string | null;
  proposalsId: string;
  jobPostQuestionsId: string;
  questionText: string;
  orderIndex: number;
  isRequired: boolean;
  answerText?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CreateProposalAnswerRequest {
  jobPostQuestionId: string;
  answerText?: string | null;
}

export interface UpdateProposalAnswerRequest {
  answerText?: string | null;
}

export interface UpdateBulkProposalAnswerItemRequest {
  jobPostQuestionId: string;
  answerText?: string | null;
}

export interface UpdateBulkProposalAnswersRequest {
  answers: UpdateBulkProposalAnswerItemRequest[];
}

export interface GradedQuestionDto {
  questionIndex: number;
  questionText: string;
  questionType: string;
  difficulty: string;
  candidateAnswer: string;
  score: number;
  feedback: string;
}

export interface VettingEvaluationResponseDto {
  score: number;
  summary: string;
  technicalSkills: string[];
  softSkills: string[];
  recommendedHire: boolean;
  holisticAdjustment: number;
  holisticAdjustmentReason: string;
  gradedQuestions: GradedQuestionDto[];
}

