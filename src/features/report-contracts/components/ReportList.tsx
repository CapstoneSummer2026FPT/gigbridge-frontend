import { useTranslation } from '../../../hooks/useTranslation';
import type { ReportContractListItem } from '../../../types/models/ReportContract';
import {
  ContractReportIssueType,
  ContractReportStatus,
} from '../../../types/models/ReportContract';
import { AlertCircle, Eye, FileText } from 'lucide-react';
import '../styles/report-contract.css';

const ISSUE_TYPE_KEYS: Record<number, string> = {
  [ContractReportIssueType.PaymentIssue]: 'workspace.reportIssueTypePaymentIssue',
  [ContractReportIssueType.MilestoneIssue]: 'workspace.reportIssueTypeMilestoneIssue',
  [ContractReportIssueType.Delay]: 'workspace.reportIssueTypeDelay',
  [ContractReportIssueType.PoorQuality]: 'workspace.reportIssueTypePoorQuality',
  [ContractReportIssueType.CommunicationProblem]: 'workspace.reportIssueTypeCommunicationProblem',
  [ContractReportIssueType.ScopeChange]: 'workspace.reportIssueTypeScopeChange',
  [ContractReportIssueType.Other]: 'workspace.reportIssueTypeOther',
};

const STATUS_KEYS: Record<number, string> = {
  [ContractReportStatus.Pending]: 'workspace.reportStatusPending',
  [ContractReportStatus.WaitingReporterConfirmation]: 'workspace.reportStatusWaitingConfirmation',
  [ContractReportStatus.Resolved]: 'workspace.reportStatusResolved',
  [ContractReportStatus.Escalated]: 'workspace.reportStatusEscalated',
};

interface ReportListProps {
  reports: ReportContractListItem[];
  isLoading: boolean;
  currentUserId: string;
  onViewReport: (reportId: string) => void;
}

export function ReportList({ reports, isLoading, currentUserId, onViewReport }: ReportListProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="rc-list-loading">
        <div className="rc-spinner" />
        <span>{t('common.loading')}</span>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="rc-list-empty">
        <AlertCircle size={24} className="rc-empty-icon" />
        <p>{t('workspace.reportNoReports')}</p>
      </div>
    );
  }

  return (
    <div className="rc-list">
      {reports.map((report) => {
        const isReporter = report.reporterId === currentUserId;
        return (
          <div key={report.id} className="rc-list-item">
            <div className="rc-list-item-icon">
              <FileText size={18} />
            </div>
            <div className="rc-list-item-content">
              <div className="rc-list-item-top">
                <span className="rc-list-item-type">
                  {t(ISSUE_TYPE_KEYS[report.issueType] || 'workspace.reportIssueTypeOther')}
                </span>
                <span className={`rc-status rc-status-${report.status}`}>
                  {t(STATUS_KEYS[report.status] || 'workspace.reportStatusPending')}
                </span>
              </div>
              <div className="rc-list-item-meta">
                <span>
                  {t('workspace.reportReporter')}: {report.reporterName || t('common.unknown')}
                  {isReporter ? ` (${t('common.you')})` : ''}
                </span>
                <span className="rc-separator">•</span>
                <span>{new Date(report.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <button
              type="button"
              className="rc-view-button"
              onClick={() => onViewReport(report.id)}
            >
              <Eye size={14} />
              <span>{t('workspace.reportView')}</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
