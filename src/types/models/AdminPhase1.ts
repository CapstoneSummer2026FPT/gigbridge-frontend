export enum AccountStatus { Active = 0, Suspended = 1, Banned = 2 }
export enum UserViolationType { ContractBreach = 0, FraudOrMisrepresentation = 1, HarassmentOrAbuse = 2, PaymentMisconduct = 3, PlatformPolicyViolation = 4, Other = 5 }
export enum AccountReportResolutionAction { None = 0, Warning = 1, Suspension = 2, PermanentBan = 3 }

export interface PageResult<T> { items: T[]; pageNumber: number; pageSize?: number; totalPages: number; totalCount: number; hasPreviousPage?: boolean; hasNextPage?: boolean }
export interface AdminViolation { id: string; sourceType: number; disputeId?: string; reportId?: string; manualActionId?: string; number: number; type: number; reason: string; description?: string; actionTaken: number; suspendedUntil?: string; isActive: boolean; createdAt: string }
export interface AdminUserReport { id: string; type: number; status: number; reason: string; description?: string; evidenceCount: number; createdAt: string }
export interface AdminAuditLog { auditLogId?: string; id?: string; adminUserId?: string; adminName?: string; adminAvatar?: string | null; action: string; entityType?: string; entityId?: string; oldValues?: unknown; newValues?: unknown; correlationId: string; userAgent?: string; createdAt: string }
export interface AdminUserDetail {
  userId: string; fullName: string; email: string; avatar?: string | null; eloPoints?: number | null; role: number; createdAt: string; isEmailVerified: boolean; isActive: boolean;
  accountStatus: AccountStatus; isFlagged: boolean; violationCount: number; suspendedUntil?: string; bannedAt?: string; banReason?: string;
  subscription?: { planName: string; status: number; startDate: string; endDate: string };
  profile?: { kind: string; title?: string; bio?: string; companyName?: string; industry?: string; location?: string; skills: string[]; categories: string[]; portfolioUrls: string[]; workExperience: string[] };
  wallet?: { availableTokens: number; withdrawableTokens: number; heldTokens: number; pendingWithdrawalTokens: number };
  recentReports: AdminUserReport[]; recentViolations: AdminViolation[]; recentAuditLogs: AdminAuditLog[];
}
export interface AccountReportItem { id: string; reporterId: string; reporterName: string; reporterRole: number; reportedUserId: string; reportedUserName: string; reportedUserRole: number; type: number; status: number; reason: string; createdAt: string; evidenceCount: number; accountStatus: AccountStatus; violationCount: number; isFlagged: boolean; suspendedUntil?: string; assignedAdminId?: string; assignedAdminName?: string }
export interface AccountReportDetail { report: AccountReportItem; description?: string; adminNote?: string; resolutionAction?: number; resolvedAt?: string; evidence: { id: string; fileName: string; contentType: string; fileSize: number; description?: string; createdAt: string }[]; previousReports: AdminUserReport[]; violations: AdminViolation[]; auditLogs: AdminAuditLog[] }
export interface EnforcementPayload { requestId: string; violationType: UserViolationType; reason: string; description?: string; suspendedUntil?: string }
