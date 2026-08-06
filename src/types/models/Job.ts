/**
 * Job Models - JOB_POSTS, JOB_POST_SKILLS, JOB_POST_ATTACHMENTS tables
 */

export enum JobStatus {
  Draft = 0,
  Open = 1,
  Closed = 2,
  Cancelled = 3,
}

export enum JobPostStatus {
  Draft = 0,
  Open = 1,
  Closed = 2,
  Cancelled = 3,
}

export enum JobPostVisibility {
  Public = 0,
  Private = 1,
  InviteOnly = 2,
}

export interface JobPost {
  id: string;
  client_profile_id: string;
  title: string;
  description: string;
  category_id: string;
  budget_min: number;
  budget_max: number;
  currency: string;
  estimated_duration: string;
  status: JobStatus;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface JobPostSkill {
  id: string;
  job_post_id: string;
  skill_id: string;
  is_required: boolean;
}

export interface JobPostAttachment {
  id: string;
  job_post_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
}

export interface Job {
  id: string;
  clientId: string;
  clientFullName?: string | null;
  title: string;
  description: string;
  category: string;
  majorName?: string | null;
  categoryName?: string | null;
  customSkillNames?: string[];
  skills: string[];
  budgetMin: number;
  budgetMax: number;
  jobType: 'fixed';
  deadline?: string;
  status: 'draft' | 'open' | 'in_progress' | 'closed' | 'cancelled';
  proposalCount: number;
  viewCount: number;
  aiMatchScore?: number;
  isAiRecommended?: boolean;
  isFeatured?: boolean;
  hasAiInterview?: boolean;
  clientEloPoints?: number;
  postedAt: string;
  createdAt?: string;
  isRemote: boolean;
  gigcoin_cost: number;
  visibility?: number;
  milestonePlans?: JobPostMilestonePlanDto[];
}


export interface JobPostQueryParams {
  PageIndex?: number;
  PageSize?: number;
  pageIndex?: number;
  pageSize?: number;
  search?: string;
  status?: JobPostStatus | number;
  sortBy?: 'newest' | 'title' | 'budgetMin' | 'budgetMax';
  sortDesc?: boolean;
  includeSummary?: boolean;
  knownTotalItems?: number;
}

export interface JobPostSummaryDto {
  jobPostsId: string;
  title: string;
  descriptionPreview: string;
  majorCategoryId?: string | null;
  majorId?: string | null;
  majorName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  eloPoints?: number;
  createdAt: string;
  status?: JobPostStatus | number | null;
  visibility?: JobPostVisibility | number | null;
  clientProfilesId?: string | null;
  clientFullName?: string | null;
  skills: JobPostSkillDto[];
  customSkillNames: string[];
  skillNames: string[];
  isFeatured?: boolean;
  featuredUntil?: string | null;
  isAiGenerated?: boolean;
  hasAiInterview?: boolean;
}

export interface AdminJobPostStatsDto {
  total: number;
  draft: number;
  open: number;
  closed: number;
  cancelled: number;
  locked: number;
}

export interface AdminJobPostListResponse {
  items: JobPostSummaryDto[];
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  stats?: AdminJobPostStatsDto | null;
}

export interface GetMyJobPostSkillDto {
  skillId: string;
  name: string;
}

export type JobPostSetupStep =
  | 'Details'
  | 'ESign'
  | 'Milestones'
  | 'ReadyToPublish'
  | 'Published';

export interface JobPostSetupProgressDto {
  nextIncompleteStep: JobPostSetupStep;
  isDetailsComplete: boolean;
  contractId?: string | null;
  eSignDocumentId?: string | null;
  esignDocumentId?: string | null;
  eSignStatus?: number | null;
  esignStatus?: number | null;
  hasMilestones: boolean;
  isMilestonePlanComplete?: boolean;
  canPublish: boolean;
}

export interface GetMyJobPostDto {
  jobPostsId: string;
  clientProfilesId: string;
  title: string;
  description: string;
  majorCategoryId?: string | null;
  majorId?: string | null;
  majorName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  skills: GetMyJobPostSkillDto[];
  customSkillNames: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  estimatedDuration?: string | null;
  location?: string | null;
  status: JobPostStatus | number;
  visibility?: JobPostVisibility | number | null;
  endDate?: string | null;
  isAigenerated?: boolean | null;
  createdAt: string;
  updatedAt?: string | null;
  proposalCount: number;
  isFeatured?: boolean;
  featuredUntil?: string | null;
  setupProgress?: JobPostSetupProgressDto | null;
}

export interface JobPostSkillDto {
  skillsId: string;
  skillName: string;
}

export interface JobPostAttachmentDto {
  jobPostAttachmentsId: string;
  fileUrl: string;
  fileName: string;
}

export interface JobPostWorkItemDto {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  deliverables?: string | null;
  estimatedDuration?: string | null;
  orderIndex: number;
}

export interface JobPostMilestonePlanDto {
  id?: string | null;
  title?: string | null;
  description?: string | null;
  amount: number;
  estimatedDuration?: string | null;
  dueDate?: string | null;
  deliverables?: string | null;
  acceptanceCriteria?: string | null;
  orderIndex: number;
  workItems: JobPostWorkItemDto[];
}

export interface JobPostDetailDto {
  jobPostsId: string;
  clientProfilesId: string;
  clientFullName?: string | null;
  title: string;
  description: string;
  majorCategoryId?: string | null;
  majorId?: string | null;
  majorName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  estimatedDuration?: string | null;
  location?: string | null;
  endDate?: string | null;
  createdAt: string;
  eloPoints?: number;
  status?: JobStatus | number | null;
  visibility?: number | null;
  skills: JobPostSkillDto[];
  customSkillNames: string[];
  attachments: JobPostAttachmentDto[];
  milestonePlans?: JobPostMilestonePlanDto[];
  hasAiInterview?: boolean;
}

export interface GetMyJobPostDetailDto {
  jobPostsId: string;
  clientProfilesId: string;
  title: string;
  description: string;
  majorCategoryId?: string | null;
  majorId?: string | null;
  majorName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  estimatedDuration?: string | null;
  location?: string | null;
  visibility?: JobPostVisibility | number | null;
  status: JobPostStatus | number;
  endDate?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  skills: JobPostSkillDto[];
  customSkillNames: string[];
  attachments: JobPostAttachmentDto[];
  proposalCount: number;
  setupProgress?: JobPostSetupProgressDto | null;
  milestonePlans?: JobPostMilestonePlanDto[];
}

export interface CreateJobPostRequest {
  title: string;
  description: string;
  majorCategoryId?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  estimatedDuration?: string | null;
  visibility?: number | null;
  endDate?: string | null;
  skillIds: string[];
  customSkillNames: string[];
}

export interface CreateDraftJobPostResponse {
  jobPostId: string;
  status: JobPostStatus | number;
}

export interface UpdateJobPostRequest {
  title: string;
  description: string;
  majorCategoryId?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  estimatedDuration?: string | null;
  visibility: JobPostVisibility | number;
  endDate?: string | null;
  skillIds: string[];
  customSkillNames: string[];
}

export interface SaveDraftJobPostQuestionRequest {
  questionText: string;
  orderIndex: number;
  isRequired: boolean;
}

export interface SaveDraftJobPostRequest {
  title?: string | null;
  description?: string | null;
  majorCategoryId?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  estimatedDuration?: string | null;
  visibility?: JobPostVisibility | number | null;
  endDate?: string | null;
  isAigenerated?: boolean | null;
  skillIds?: string[] | null;
  customSkillNames?: string[] | null;
  questions?: SaveDraftJobPostQuestionRequest[] | null;
  milestonePlans?: JobPostMilestonePlanDto[] | null;
}

export interface GenerateJobDescriptionRequest {
  clientPrompt: string;
}

export interface GeneratedJobSkillDto {
  skillsId: string;
  name: string;
}

export interface GenerateJobDescriptionDetailsResponse {
  title: string;
  majorId?: string | null;
  majorName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  majorCategoryId?: string | null;
  skills: GeneratedJobSkillDto[];
  customSkills: string[];
  description: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  estimatedDuration?: string | null;
}

export interface GenerateJobHiringPlanRequest {
  clientPrompt: string;
  title: string;
  description: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  estimatedDuration?: string | null;
  proposalClosingDate: string;
}

export interface GenerateJobHiringPlanResponse {
  questionRecruitment: string[];
  milestones: JobPostMilestonePlanDto[];
}

export interface JobPostPromotionDto {
  jobPostId: string;
  isFeatured: boolean;
  featuredFrom: string;
  featuredUntil: string;
  tokenCost: number;
  walletTransactionId: string;
  promotionId: string;
  imageUrl: string;
  promotionTitle: string;
  promotionDescription: string;
}

export interface PromoteJobPostRequest {
  idempotencyKey: string;
  imageUrl: string;
  promotionTitle: string;
  promotionDescription: string;
}

export interface PublicJobPromotionCardDto {
  id: string;
  jobPostId: string;
  imageUrl: string;
  title: string;
  description: string;
  featuredUntil: string;
}

export interface JobPromotionInteractionDto {
  id: string;
  impressionCount: number;
  clickCount: number;
}

export interface JobPromotionPolicyDto {
  tokenCost: number;
  durationDays: number;
}

export interface CreateAiInterviewRequest {
  language: 'auto' | 'en' | 'vi';
  mode: 'text' | 'voice';
  questionCount: number;
}

export interface AiInterviewDefinitionDto extends CreateAiInterviewRequest {
  interviewId: string;
  jobPostId: string;
  status: string;
  createdAt: string;
  externalReference?: string | null;
}

export interface JobPostQuestionDto {
  jobPostQuestionsId: string;
  jobPostsId: string;
  questionText: string;
  orderIndex: number;
  isRequired: boolean;
  createdAt: string;
  updatedAt?: string | null;
}

export interface CreateJobPostQuestionRequest {
  questionText: string;
  orderIndex: number;
  isRequired: boolean;
}

export interface CreateBulkJobPostQuestionsRequest {
  questions: CreateJobPostQuestionRequest[];
}

export interface UpdateJobPostQuestionRequest {
  questionText: string;
  orderIndex: number;
  isRequired: boolean;
}

export interface UpdateJobPostQuestionRequiredRequest {
  isRequired: boolean;
}

export interface UpdateBulkJobPostQuestionItemRequest {
  jobPostQuestionsId: string;
  questionText: string;
  orderIndex: number;
  isRequired: boolean;
}

export interface UpdateBulkJobPostQuestionsRequest {
  questions: UpdateBulkJobPostQuestionItemRequest[];
}

export interface UpdateJobPostStatusRequest {
  status: JobPostStatus | number;
}

export interface UpdateJobPostVisibilityRequest {
  visibility: JobPostVisibility | number;
}

export interface Review {
  reviewId?: string;
  id?: string;
    contractId?: string;
    jobPostId?: string;
    jobId?: string;
    projectTitle?: string;
  reviewerId: string;
  reviewerName?: string | null;
  revieweeId: string;
  rating: number;
  comment?: string | null;
  communicationRating?: number | null;
  qualityRating?: number | null;
  timelinessRating?: number | null;
  isVisible?: boolean;
  isAnonymous?: boolean;
  createdAt: string;
  skills?: string[];
}

export interface CreateReviewRequest {
  contractId: string;
  rating: number;
  comment?: string | null;
  communicationRating?: number | null;
  qualityRating?: number | null;
  timelinessRating?: number | null;
  isAnonymous: boolean;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<number, number>;
}
