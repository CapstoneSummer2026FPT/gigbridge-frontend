export interface AdminCheatingEventDto {
  proposalCheatingEventId: string;
  proposalId: string;
  freelancerUserId: string;
  freelancerName: string;
  freelancerEmail: string;
  jobPostId: string;
  jobTitle: string;
  jobPostQuestionId?: string | null;
  eventType: number;
  clientEventId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface AdminCheatingEventsResponse {
  items: AdminCheatingEventDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface AdminCheatingViolationDto {
  freelancerCheatingViolationId: string;
  proposalId: string;
  freelancerUserId: string;
  freelancerName: string;
  freelancerEmail: string;
  jobPostId: string;
  jobTitle: string;
  violationNumber: number;
  totalEventCount: number;
  copyCount: number;
  pasteCount: number;
  tabSwitchCount: number;
  screenshotAttemptCount: number;
  focusLossCount: number;
  fullscreenExitCount: number;
  action: number;
  eloDelta: number;
  suspendedUntil?: string | null;
  isReviewed: boolean;
  reviewedByAdminId?: string | null;
  reviewedByAdminName?: string | null;
  reviewedAt?: string | null;
  adminNote?: string | null;
  createdAt: string;
}

export interface AdminCheatingViolationsResponse {
  items: AdminCheatingViolationDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface AdminCheatingViolationDetailDto extends AdminCheatingViolationDto {
  events: AdminCheatingEventDto[];
}

export interface GetAdminCheatingViolationsParams {
  Page?: number;
  PageSize?: number;
  Action?: number;
  IsReviewed?: boolean;
  FreelancerUserId?: string;
  ProposalId?: string;
  From?: string;
  To?: string;
  Search?: string;
}

export interface GetAdminCheatingEventsParams {
  Page?: number;
  PageSize?: number;
  EventType?: number;
  FreelancerUserId?: string;
  ProposalId?: string;
  From?: string;
  To?: string;
  Search?: string;
}

export interface ReviewCheatingViolationRequest {
  isReviewed: boolean;
  adminNote?: string | null;
}
