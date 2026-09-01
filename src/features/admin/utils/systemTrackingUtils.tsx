import type { ReactNode } from 'react';
import {
  Scale,
  UserCheck,
  Briefcase,
  Coins,
  FileSignature,
  Activity,
  AlertCircle,
} from 'lucide-react';
import type { ApiResponse } from '../../../types/common';
import type { AdminUserDto } from '../../../types/models/User';
import type { JobPostSummaryDto } from '../../../types/models/Job';
import type { ProposalDto } from '../../../types/models/Proposal';
import type { AdminAuditLog } from '../../../types/systemTracking';

export type TabType = 'overview' | 'audit' | 'errors' | 'alerts';
export type LogLevel = 'info' | 'warning' | 'error' | 'critical';

export type AuditLog = {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  resource: string;
  ipAddress: string;
  userAgent: string;
  details: string;
  oldValues?: unknown;
  newValues?: unknown;
  correlationId?: string;
  entityType?: string;
  entityId?: string;
};

export type ErrorLogEntry = {
  id: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  stackTrace?: string | null;
  userId?: string | null;
  requestId?: string | null;
  count?: number;
  source?: string;
  externalUrl?: string | null;
  firstObservedAt?: string | null;
  status?: string | null;
  environment?: string | null;
  platform?: string | null;
};

export type SystemAlert = {
  id: string;
  timestamp: string;
  title: string;
  description: string;
  severity: LogLevel;
  service: string;
  metric: string;
  value: string;
  threshold: string;
  firstObservedAt?: string;
};

export type ApiLog = {
  id: string;
  timestamp: string;
  method: string;
  status: number;
  url: string;
  ip: string;
  duration: number;
  user: string;
  application: string;
};

export type TrackingStats = {
  totalRequests: number;
  errorRequests: number;
  errorRate: number;
  avgDuration: number;
  p95Duration: number;
  activeAlerts: number;
  auditCount: number;
};

export const FIELD_LABEL_MAP: Record<string, string> = {
  contractId: 'Mã hợp đồng liên quan',
  reporterId: 'Người gửi báo cáo (Reporter)',
  respondentId: 'Người bị báo cáo (Respondent)',
  messageCount: 'Số tin nhắn điều tra',
  disputeId: 'Mã tranh chấp',
  jobId: 'Mã công việc',
  jobPostsId: 'Mã bài đăng tuyển',
  proposalId: 'Mã đề xuất ứng tuyển',
  proposalsId: 'Mã đề xuất ứng tuyển',
  freelancerId: 'Mã Freelancer',
  clientId: 'Mã Khách hàng',
  userId: 'Mã người dùng',
  adminUserId: 'Mã Admin xử lý',
  reason: 'Lý do thực hiện',
  resolutionNote: 'Ghi chú phán quyết',
  description: 'Mô tả chi tiết',
  amount: 'Số tiền giao dịch',
  totalAmount: 'Tổng giá trị',
  budget: 'Ngân sách công việc',
  price: 'Giá chào thầu',
  status: 'Trạng thái',
  resolution: 'Kết quả phán quyết',
  contractAction: 'Xử lý hợp đồng',
  violationCount: 'Số lần vi phạm',
  category: 'Danh mục',
  title: 'Tiêu đề',
  fullName: 'Họ và tên',
  email: 'Địa chỉ Email',
  role: 'Vai trò tài khoản',
  eloRating: 'Điểm Elo uy tín',
  isActive: 'Kích hoạt tài khoản',
  createdAt: 'Thời gian khởi tạo',
  updatedAt: 'Thời gian cập nhật',
  submittedAt: 'Thời gian nộp',
  milestoneTitle: 'Tên cột mốc',
  evidenceCount: 'Số lượng bằng chứng',
};

export const formatFieldLabel = (key: string): string => {
  if (FIELD_LABEL_MAP[key]) return FIELD_LABEL_MAP[key];
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
};

export const isUuidString = (val: unknown): boolean => {
  if (typeof val !== 'string') return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);
};

export const getActionCategory = (action: string): string => {
  const act = action.toLowerCase();
  if (act.includes('dispute')) return 'dispute';
  if (act.includes('report') || act.includes('investigation')) return 'dispute';
  if (act.includes('user') || act.includes('account')) return 'user';
  if (act.includes('job')) return 'job';
  if (act.includes('contract')) return 'contract';
  if (act.includes('wallet') || act.includes('escrow') || act.includes('payment') || act.includes('withdrawal')) return 'financial';
  return 'system';
};

export const getActionTheme = (action: string): { category: string; icon: ReactNode } => {
  const act = action.toLowerCase();
  if (act.includes('dispute') || act.includes('report') || act.includes('investigation')) {
    return { category: 'category-dispute', icon: <Scale size={13} /> };
  }
  if (act.includes('user') || act.includes('account') || act.includes('elo')) {
    return { category: 'category-user', icon: <UserCheck size={13} /> };
  }
  if (act.includes('job') || act.includes('proposal')) {
    return { category: 'category-job', icon: <Briefcase size={13} /> };
  }
  if (act.includes('contract') || act.includes('milestone')) {
    return { category: 'category-contract', icon: <FileSignature size={13} /> };
  }
  if (act.includes('wallet') || act.includes('escrow') || act.includes('payment') || act.includes('withdrawal')) {
    return { category: 'category-financial', icon: <Coins size={13} /> };
  }
  return { category: 'category-system', icon: <Activity size={13} /> };
};

export const formatActionTitle = (action: string, t: (key: string, fallback?: string) => string): string => {
  if (!action) return 'Hoạt động';
  const normalized = action.replace(/[.\s-]/g, '_');
  const translationKey = `adminSystemTracking.actions.${normalized}`;
  const translated = t(translationKey);
  if (translated && translated !== translationKey) return translated;

  const directKey = `adminSystemTracking.actions.${action}`;
  const directTranslated = t(directKey);
  if (directTranslated && directTranslated !== directKey) return directTranslated;

  // Direct lookups for common cases
  const directLookup: Record<string, string> = {
    'Dispute.RequestEvidence': t('adminSystemTracking.actions.Dispute_RequestEvidence', 'Yêu cầu bổ sung bằng chứng tranh chấp'),
    'Dispute.FinalResolution': t('adminSystemTracking.actions.Dispute_FinalResolution', 'Phán quyết tranh chấp cuối cùng'),
    'Dispute.SubmitEvidence': t('adminSystemTracking.actions.Dispute_SubmitEvidence', 'Nộp bằng chứng tranh chấp'),
    'Dispute.AcceptResolution': t('adminSystemTracking.actions.Dispute_AcceptResolution', 'Chấp nhận phán quyết tranh chấp'),
    'Dispute.RejectResolution': t('adminSystemTracking.actions.Dispute_RejectResolution', 'Từ chối phán quyết tranh chấp'),
    'ContractReportInvestigationViewed': t('adminSystemTracking.actions.ContractReportInvestigationViewed', 'Xem điều tra báo cáo hợp đồng'),
    'ReportInvestigationViewed': t('adminSystemTracking.actions.ReportInvestigationViewed', 'Xem điều tra báo cáo vi phạm'),
    'DisputeInvestigationViewed': t('adminSystemTracking.actions.DisputeInvestigationViewed', 'Xem điều tra tranh chấp'),
    'Withdrawal.Retry': t('adminSystemTracking.actions.Withdrawal_Retry', 'Thử lại xử lý lệnh rút tiền'),
    'Withdrawal.Process': t('adminSystemTracking.actions.Withdrawal_Process', 'Xử lý lệnh rút tiền'),
    'Withdrawal.Approve': t('adminSystemTracking.actions.Withdrawal_Approve', 'Phê duyệt lệnh rút tiền'),
    'Withdrawal.Reject': t('adminSystemTracking.actions.Withdrawal_Reject', 'Từ chối lệnh rút tiền'),
    'Withdrawal_Retry': t('adminSystemTracking.actions.Withdrawal_Retry', 'Thử lại xử lý lệnh rút tiền'),
    'Withdrawal_Process': t('adminSystemTracking.actions.Withdrawal_Process', 'Xử lý lệnh rút tiền'),
    'Withdrawal_Approve': t('adminSystemTracking.actions.Withdrawal_Approve', 'Phê duyệt lệnh rút tiền'),
    'Withdrawal_Reject': t('adminSystemTracking.actions.Withdrawal_Reject', 'Từ chối lệnh rút tiền'),
  };
  if (directLookup[action]) return directLookup[action];

  return action
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._-]/g, ' ')
    .trim();
};

export const formatResourceText = (log: AuditLog, t: (key: string, fallback?: string) => string): string => {
  if (log.entityType) {
    const translatedEntity = t(`adminSystemTracking.entityTypes.${log.entityType}`, log.entityType.replace(/([a-z])([A-Z])/g, '$1 $2'));
    const shortId = log.entityId ? (log.entityId.length > 12 ? `#${log.entityId.slice(0, 8)}...` : `#${log.entityId}`) : '';
    return `${translatedEntity} ${shortId}`.trim();
  }
  return log.resource;
};

export const getStatusClass = (status: number): string => {
  if (status >= 200 && status < 300) return 'status-2xx';
  if (status >= 300 && status < 400) return 'status-3xx';
  if (status >= 400 && status < 500) return 'status-4xx';
  if (status >= 500) return 'status-5xx';
  return '';
};

export const getDurationClass = (duration: number): string => {
  if (duration < 150) return 'latency-fast';
  if (duration < 400) return 'latency-medium';
  return 'latency-slow';
};

export const formatTimestamp = (timestamp: string): string => {
  try {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return timestamp;
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return timestamp;
  }
};

export const safeParseJson = (val: unknown): Record<string, any> | null => {
  if (!val) return null;
  if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
    return Object.keys(val as object).length > 0 ? (val as Record<string, any>) : null;
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      } catch {}
    }
  }
  return null;
};

export const formatStructuredAuditValue = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return 'none';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const toAuditLogs = (
  users: AdminUserDto[],
  jobs: JobPostSummaryDto[],
  proposals: ProposalDto[]
): AuditLog[] => {
  const userLogs: AuditLog[] = users.map(user => ({
    id: `user_${user.userId}`,
    timestamp: user.createdAt || user.updatedAt || new Date().toISOString(),
    userName: user.fullName || user.email || 'User',
    action: user.accountStatus === 1 ? 'user.active' : 'user.inactive',
    resource: `User: ${user.fullName || user.email}`,
    ipAddress: '-',
    userAgent: 'GigBridge App',
    details: `User status changed to ${user.accountStatus === 1 ? 'Active' : 'Inactive'}`,
  }));

  const jobLogs: AuditLog[] = jobs.map(job => ({
    id: `job_${job.jobPostId}`,
    timestamp: job.createdAt || new Date().toISOString(),
    userName: job.clientName || 'Client',
    action: 'job.created',
    resource: job.title,
    ipAddress: '-',
    userAgent: 'GigBridge Web',
    details: `Job post "${job.title}" created with budget ${job.budget} GIG`,
  }));

  const proposalLogs: AuditLog[] = proposals.map(proposal => ({
    id: `proposal_${proposal.proposalId}`,
    timestamp: proposal.submittedAt || new Date().toISOString(),
    userName: proposal.freelancerName || 'Freelancer',
    action: 'proposal.submitted',
    resource: proposal.jobTitle || proposal.jobPostsId,
    ipAddress: '-',
    userAgent: 'GigBridge API',
    details: `Submitted proposal for "${proposal.jobTitle || proposal.jobPostsId}"`,
  }));

  return [...userLogs, ...jobLogs, ...proposalLogs]
    .filter(log => Boolean(log.timestamp))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const toBackendAuditLogs = (items: AdminAuditLog[]): AuditLog[] =>
  items.map(item => ({
    id: item.auditLogId || item.id || item.correlationId,
    timestamp: item.createdAt,
    userName: item.adminName || item.adminUserId || 'Admin',
    action: item.action,
    resource: [item.entityType, item.entityId].filter(Boolean).join(' ') || 'Platform',
    ipAddress: '-',
    userAgent: item.userAgent || 'GigBridge Admin',
    details: `Before: ${formatStructuredAuditValue(item.oldValues)} · After: ${formatStructuredAuditValue(item.newValues)} · Correlation: ${item.correlationId || 'none'}`,
    oldValues: item.oldValues,
    newValues: item.newValues,
    correlationId: item.correlationId,
    entityType: item.entityType,
    entityId: item.entityId,
  }));

export const toFailureLog = (service: string, url: string, response: ApiResponse<unknown>): ErrorLogEntry => ({
  id: `${service}_${Date.now()}`,
  timestamp: new Date().toISOString(),
  level: response.statusCode >= 500 ? 'error' : 'warning',
  service,
  message: response.message || `${service} request failed`,
  stackTrace: null,
  userId: null,
  requestId: null,
  count: 1,
  source: url,
  status: 'active',
});

export const toFailureAlert = (service: string, response: ApiResponse<unknown>): SystemAlert => ({
  id: `alert_${service}_${Date.now()}`,
  timestamp: new Date().toISOString(),
  title: `${service} request failed`,
  description: response.message || `${service} endpoint returned an unsuccessful response`,
  severity: response.statusCode >= 500 ? 'error' : 'warning',
  service,
  metric: 'http_status',
  value: response.statusCode.toString(),
  threshold: '< 400',
});

export const exportJson = (data: unknown, filename: string): void => {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
