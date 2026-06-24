export enum JobInvitationStatus {
  Pending = 0,
  Viewed = 1,
  Applied = 2,
  Declined = 3,
  Expired = 4,
  Cancelled = 5,
}

export interface JobInvitationSkillDto {
  skillId?: string;
  name?: string;
}

export interface JobInvitationDto {
  jobInvitationId?: string;
  jobInvitationsId?: string;

  jobPostId?: string;
  jobPostsId?: string;

  clientProfileId?: string;
  clientProfilesId?: string;

  freelancerProfileId?: string;
  freelancerProfilesId?: string;

  clientUserId?: string;
  freelancerUserId?: string;

  proposalId?: string | null;
  proposalsId?: string | null;

  status?: JobInvitationStatus | number;
  message?: string | null;
  createdAt?: string;
  viewedAt?: string | null;
  respondedAt?: string | null;
  expiresAt?: string | null;
  declineReason?: string | null;

  jobTitle?: string;
  jobDescription?: string | null;
  majorCategoryId?: string | null;
  majorId?: string | null;
  majorName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  skills?: JobInvitationSkillDto[];
  customSkillNames?: string[];
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  estimatedDuration?: string | null;
  maxHires?: number | null;
  location?: string | null;
  jobStatus?: number;
  jobVisibility?: number | null;
  jobEndDate?: string | null;
  jobCreatedAt?: string;

  clientName?: string | null;
  clientCompanyName?: string | null;
  clientLocation?: string | null;

  freelancerName?: string | null;
  freelancerTitle?: string | null;
  freelancerAvatarUrl?: string | null;
  freelancerLocation?: string | null;
}

export interface CreateJobInvitationRequest {
  jobPostId: string;
  freelancerProfileId: string;
  message?: string | null;
  expiresAt?: string | null;
}

export interface BulkCreateJobInvitationsRequest {
  jobPostIds: string[];
  freelancerProfileIds: string[];
  message?: string | null;
  expiresAt?: string | null;
}

export interface BulkJobInvitationSkipDto {
  jobPostId?: string;
  freelancerProfileId?: string;
  reason?: string;
}

export interface BulkJobInvitationResultDto {
  created: JobInvitationDto[];
  skipped: BulkJobInvitationSkipDto[];
}

export interface DeclineJobInvitationRequest {
  reason?: string | null;
}

export interface JobInvitationQueryParams {
  status?: JobInvitationStatus | number | null;
  jobPostId?: string | null;
  page?: number;
  pageSize?: number;
}
