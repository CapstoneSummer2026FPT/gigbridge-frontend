export enum ReportType {
  Spam = 0,
  Fraud = 1,
  InappropriateContent = 2,
  HarassmentOrAbuse = 3,
  Other = 4,
  PaymentDispute = 5,
}

export enum ReportStatus {
  Pending = 0,
  Reviewing = 1,
  Resolved = 2,
  Dismissed = 3,
}

export interface ReportUserSummaryDto {
  id: string;
  fullName: string;
  email: string;
}

export interface ReportTargetSummaryDto {
  id: string;
  entityType: string;
  title?: string | null;
  description?: string | null;
  email?: string | null;
  rating?: number | null;
}

export interface ReportDto {
  id: string;
  reporter: ReportUserSummaryDto;
  reportedEntityId: string;
  reportedEntityType: string;
  type: ReportType;
  status: ReportStatus;
  reason: string;
  adminNote?: string | null;
  resolvedByAdmin?: ReportUserSummaryDto | null;
  targetSummary?: ReportTargetSummaryDto | null;
  createdAt: string;
  updatedAt?: string | null;
  resolvedAt?: string | null;
}

export interface ReportsResponse {
  items: ReportDto[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface GetReportsParams {
  page?: number;
  pageSize?: number;
  status?: ReportStatus;
  type?: ReportType;
  reportedEntityType?: string;
  search?: string;
}

export interface UpdateReportStatusPayload {
  status: ReportStatus.Reviewing | ReportStatus.Dismissed;
  adminNote?: string | null;
}

export interface ResolveReportPayload {
  adminNote?: string | null;
  takeAction: boolean;
}
