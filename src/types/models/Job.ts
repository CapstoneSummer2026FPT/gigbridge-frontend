/**
 * Job Models - JOB_POSTS, JOB_POST_SKILLS, JOB_POST_ATTACHMENTS tables
 */

export enum BudgetType {
  Fixed = 0,
  Hourly = 1,
}

export enum JobStatus {
  Draft = 0,
  Open = 1,
  InProgress = 2,
  Closed = 3,
}

export interface JobPost {
  id: string;
  client_profile_id: string;
  title: string;
  description: string;
  category_id: string;
  budget_type: BudgetType;
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
  jobType: 'fixed' | 'hourly';
  experienceLevel: 'entry' | 'intermediate' | 'expert';
  deadline?: string;
  status: 'draft' | 'open' | 'in_progress' | 'closed';
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
  budgetType: BudgetType;
  budgetMin?: number | null;
  budgetMax?: number | null;
  experienceLevelRequired?: number | null;
  locationType?: number | null;
  createdAt: string;
  skillNames: string[];
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
  budgetType: BudgetType;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  estimatedDuration?: string | null;
  maxHires?: number | null;
  experienceLevelRequired?: number | null;
  locationType?: number | null;
  location?: string | null;
  applicationDeadline?: string | null;
  createdAt: string;
  skills: JobPostSkillDto[];
  attachments: JobPostAttachmentDto[];
}

export interface CreateJobPostRequest {
  title: string;
  description: string;
  categoryId?: string | null;
  budgetType: BudgetType | number;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  estimatedDuration?: string | null;
  maxHires?: number | null;
  experienceLevelRequired?: number | null;
  locationType?: number | null;
  location?: string | null;
  visibility?: number | null;
  applicationDeadline?: string | null;
  skillIds: string[];
}
