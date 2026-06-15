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
  title: string;
  description: string;
  category: string;
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
  postedAt: string;
  isRemote: boolean;
  gigcoin_cost: number;
}

export interface JobPostQueryParams {
  PageIndex?: number;
  PageSize?: number;
  pageIndex?: number;
  pageSize?: number;
}

export interface JobPostSummaryDto {
  jobPostsId: string;
  title: string;
  descriptionPreview: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  locationType?: number | null;
  createdAt: string;
  eloPoints?: number;
  skillNames: string[];
  status?: JobPostStatus | number | null;
  visibility?: JobPostVisibility | number | null;
}

export interface GetMyJobPostDto {
  jobPostsId: string;
  clientProfilesId: string;
  title: string;
  description: string;
  categoryId?: string | null;
  categoryName?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  estimatedDuration?: string | null;
  maxHires?: number | null;
  location?: string | null;
  status: JobPostStatus | number;
  visibility?: JobPostVisibility | number | null;
  endDate?: string | null;
  isAigenerated?: boolean | null;
  createdAt: string;
  updatedAt?: string | null;
  proposalCount: number;
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

export interface JobPostDetailDto {
  jobPostsId: string;
  clientProfilesId: string;
  title: string;
  description: string;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  estimatedDuration?: string | null;
  maxHires?: number | null;
  locationType?: number | null;
  location?: string | null;
  endDate?: string | null;
  createdAt: string;
  skills: JobPostSkillDto[];
  attachments: JobPostAttachmentDto[];
}

export interface CreateJobPostRequest {
  title: string;
  description: string;
  categoryId?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  estimatedDuration?: string | null;
  maxHires?: number | null;
  location?: string | null;
  visibility?: number | null;
  endDate?: string | null;
  skillIds: string[];
}

export interface CreateDraftJobPostResponse {
  jobPostId: string;
  status: JobPostStatus | number;
}

export interface UpdateJobPostRequest {
  title: string;
  description: string;
  categoryId?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  estimatedDuration?: string | null;
  maxHires?: number | null;
  location?: string | null;
  visibility: JobPostVisibility | number;
  endDate?: string | null;
  skillIds: string[];
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
