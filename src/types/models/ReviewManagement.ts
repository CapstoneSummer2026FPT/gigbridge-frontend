export enum ReviewModerationStatus {
  Active = 0,
  Hidden = 1,
}

export interface ManagedReview {
  reviewId: string;
  contractId: string;
  jobPostId: string;
  projectTitle: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: number;
  revieweeId: string;
  revieweeName: string;
  revieweeRole: number;
  rating: number;
  comment?: string | null;
  communicationRating?: number | null;
  qualityRating?: number | null;
  timelinessRating?: number | null;
  isAnonymous: boolean;
  moderationStatus: ReviewModerationStatus;
  hasOpenReport: boolean;
  openReportCount: number;
  totalReportCount: number;
  createdAt: string;
}

export interface MyReviewsResponse {
  items: ManagedReview[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface AdminReviewSummary {
  total: number;
  active: number;
  hidden: number;
  withOpenReports: number;
}

export interface AdminReviewsResponse extends MyReviewsResponse {
  summary: AdminReviewSummary;
}

export interface AdminReviewFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  rating?: number;
  reviewerRole?: number;
  revieweeRole?: number;
  moderationStatus?: ReviewModerationStatus;
  hasOpenReport?: boolean;
}
