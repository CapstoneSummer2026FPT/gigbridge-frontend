/**
 * Report Models - REPORTS table
 */

export enum ReportType {
  Spam = 0,
  Fraud = 1,
  InappropriateContent = 2,
}

export enum ReportStatus {
  Pending = 'pending',
  UnderReview = 'under_review',
  Resolved = 'resolved',
  Dismissed = 'dismissed',
}

export interface Report {
  rpt_ReportsId: string;
  usr_ReporterId: string;
  ReportedUserId: string;
  ReportedUserRole: number; // 0=Client, 1=Freelancer
  Type: ReportType;
  Reason: string;
  Status: ReportStatus;
  AdminNote?: string;
  ResolvedAt?: string;
  CreatedAt: string;
  UpdatedAt: string;
}
