/**
 * Proposal Models - PROPOSALS & PROPOSAL_ATTACHMENTS tables
 */

export enum ProposalStatus {
  Pending = 0,
  Accepted = 1,
  Rejected = 2,
}

export interface Proposal {
  id: string;
  job_post_id: string;
  freelancer_profile_id: string;
  cover_letter: string;
  proposed_rate: number;
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
  proposedRate: number;
  proposedDuration: string;
  status: ProposalStatus | number;
  submittedAt: string;
  reviewedAt?: string | null;
}
