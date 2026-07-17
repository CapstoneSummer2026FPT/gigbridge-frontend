import { useState, type FormEvent } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ReportContract } from '../../../types/models/ReportContract';
import {
  ContractReportStatus,
  ContractReportResolutionAction,
} from '../../../types/models/ReportContract';
import { AlertCircle, X, Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import '../styles/report-contract.css';

const STATUS_KEYS: Record<number, string> = {
  [ContractReportStatus.Pending]: 'workspace.reportStatusPending',
  [ContractReportStatus.WaitingReporterConfirmation]: 'workspace.reportStatusWaitingConfirmation',
  [ContractReportStatus.Resolved]: 'workspace.reportStatusResolved',
  [ContractReportStatus.Escalated]: 'workspace.reportStatusEscalated',
};

const RESOLUTION_ACTION_KEYS: Record<number, string> = {
  [ContractReportResolutionAction.AcceptIssue]: 'workspace.reportActionAcceptIssue',
  [ContractReportResolutionAction.ProvideExplanation]: 'workspace.reportActionProvideExplanation',
  [ContractReportResolutionAction.ProposeResolution]: 'workspace.reportActionProposeResolution',
  [ContractReportResolutionAction.RejectIssue]: 'workspace.reportActionRejectIssue',
};

interface ReportDetailModalProps {
  report: ReportContract;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onRespond: (input: {
    resolutionAction: number;
    explanation?: string | null;
    proposedResolution?: string | null;
    rejectReason?: string | null;
  }) => Promise<{ success: boolean; message?: string }>;
  onConfirm: (isAccepted: boolean) => Promise<{ success: boolean; message?: string }>;
  isResponding: boolean;
  isConfirming: boolean;
}

export function ReportDetailModal({
  report,
  currentUserId,
  isOpen,
  onClose,
  onRespond,
  onConfirm,
  isResponding,
  isConfirming,
}: ReportDetailModalProps) {
  const { t } = useTranslation();
  const [respondMode, setRespondMode] = useState<number | null>(null);
  const [explanation, setExplanation] = useState('');
  const [proposedResolution, setProposedResolution] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isReporter = report.reporter.id === currentUserId;
  const isRespondent = report.respondent?.id === currentUserId;
  const isPending = report.status === ContractReportStatus.Pending;
  const isWaitingConfirmation = report.status === ContractReportStatus.WaitingReporterConfirmation;
  const isResolved = report.status === ContractReportStatus.Resolved;
  const respondentCanRespond = isRespondent && isPending;
  const reporterCanConfirm = isReporter && isWaitingConfirmation;

  const resetRespondMode = () => {
    setRespondMode(null);
    setExplanation('');
    setProposedResolution('');
    setRejectReason('');
    setError(null);
  };

  const handleRespondSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (respondMode === null) {
      setError('Please select an action.');
      return;
    }

    if (respondMode === ContractReportResolutionAction.RejectIssue && !rejectReason.trim()) {
      setError(t('workspace.reportRejectReasonRequired') || 'Reject reason is required.');
      return;
    }

    if (respondMode === ContractReportResolutionAction.ProvideExplanation && !explanation.trim()) {
      setError(t('workspace.reportExplanationRequired') || 'Explanation is required.');
      return;
    }

    if (respondMode === ContractReportResolutionAction.ProposeResolution && !proposedResolution.trim()) {
      setError(t('workspace.reportProposedResolutionRequired') || 'Proposed resolution is required.');
      return;
    }

    const result = await onRespond({
      resolutionAction: respondMode,
      explanation: explanation.trim() || null,
      proposedResolution: proposedResolution.trim() || null,
      rejectReason: rejectReason.trim() || null,
    });

    if (result.success) {
      resetRespondMode();
    } else {
      setError(result.message || 'Failed to submit response.');
    }
  };

  const handleConfirmAccept = async () => {
    setError(null);
    const result = await onConfirm(true);
    if (!result.success) {
      setError(result.message || 'Failed to confirm resolution.');
    }
  };

  const handleConfirmDecline = async () => {
    setError(null);
    const result = await onConfirm(false);
    if (!result.success) {
      setError(result.message || 'Failed to decline resolution.');
    }
  };

  return (
    <div className="rc-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="rc-modal rc-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rc-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rc-modal-header">
          <div>
            <h3 id="rc-detail-title">{t('workspace.reportDetailTitle')}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rc-icon-button"
            title={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="rc-detail-body">
          {error && (
            <div className="rc-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Status Badge */}
          <div className="rc-detail-status-bar">
            <span className={`rc-status rc-status-${report.status} rc-status-lg`}>
              {t(STATUS_KEYS[report.status] || 'workspace.reportStatusPending')}
            </span>
            {report.isEscalatedToDispute && (
              <span className="rc-escalated-badge">{t('workspace.reportIsEscalated')}</span>
            )}
          </div>

          {/* Basic Info */}
          <div className="rc-detail-section">
            <div className="rc-detail-grid">
              <div className="rc-detail-field">
                <label>{t('workspace.reportReporter')}</label>
                <span>{report.reporter.name || t('common.unknown')}
                  {isReporter ? ` (${t('common.you')})` : ''} ({report.reporter.role})
                </span>
              </div>
              {report.respondent && (
                <div className="rc-detail-field">
                  <label>{t('workspace.reportRespondent')}</label>
                  <span>
                    {report.respondent.name || t('common.unknown')}
                    {isRespondent ? ` (${t('common.you')})` : ''} ({report.respondent.role})
                  </span>
                </div>
              )}
              {report.milestone && (
                <div className="rc-detail-field">
                  <label>{t('workspace.reportMilestone')}</label>
                  <span>{report.milestone.title || report.milestone.id}</span>
                </div>
              )}
              <div className="rc-detail-field">
                <label>{t('workspace.reportCreated')}</label>
                <span>{new Date(report.createdAt).toLocaleString()}</span>
              </div>
              {report.respondedAt && (
                <div className="rc-detail-field">
                  <label>{t('workspace.reportResponded')}</label>
                  <span>{new Date(report.respondedAt).toLocaleString()}</span>
                </div>
              )}
              {report.resolvedAt && (
                <div className="rc-detail-field">
                  <label>{t('workspace.reportResolvedAt')}</label>
                  <span>{new Date(report.resolvedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Issue Description */}
          <div className="rc-detail-section">
            <h4 className="rc-section-title">{t('workspace.reportDescriptionLabel')}</h4>
            <p className="rc-description-text">{report.description}</p>
          </div>

          {/* Desired Resolution */}
          <div className="rc-detail-section">
            <h4 className="rc-section-title">{t('workspace.reportDesiredResolution')}</h4>
            <p className="rc-description-text">{report.desiredResolution}</p>
          </div>

          {/* Respondent Response */}
          {report.resolutionAction !== null && (
            <div className="rc-detail-section rc-response-section">
              <h4 className="rc-section-title">{t('workspace.reportRespondTitle')}</h4>
              <p className="rc-response-action">
                {t(RESOLUTION_ACTION_KEYS[report.resolutionAction] || 'common.unknown')}
              </p>
              {report.explanation && (
                <div className="rc-response-field">
                  <label>{t('workspace.reportExplanation')}</label>
                  <p>{report.explanation}</p>
                </div>
              )}
              {report.proposedResolution && (
                <div className="rc-response-field">
                  <label>{t('workspace.reportProposedResolutionTitle')}</label>
                  <p>{report.proposedResolution}</p>
                </div>
              )}
              {report.rejectReason && (
                <div className="rc-response-field">
                  <label>{t('workspace.reportRejectReasonTitle')}</label>
                  <p>{report.rejectReason}</p>
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          {report.attachments.length > 0 && (
            <div className="rc-detail-section">
              <h4 className="rc-section-title">{t('workspace.reportAttachments')}</h4>
              <div className="rc-attachment-list">
                {report.attachments.map((att) => (
                  <a
                    key={att.reportContractAttachmentId}
                    href={att.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rc-attachment-item"
                  >
                    <ExternalLink size={14} />
                    <span>{att.fileName}</span>
                    <span className="rc-attachment-size">
                      {(att.fileSize / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Respondent Actions */}
          {respondentCanRespond && (
            <div className="rc-detail-section rc-action-section">
              <h4 className="rc-section-title">{t('workspace.reportRespondTitle')}</h4>

              {/* Quick Accept */}
              <button
                type="button"
                onClick={() =>
                  onRespond({ resolutionAction: ContractReportResolutionAction.AcceptIssue })
                }
                disabled={isResponding}
                className="rc-action-button rc-action-accept"
              >
                <CheckCircle size={16} />
                <span>{t('workspace.reportActionAcceptIssue')}</span>
                <p className="rc-action-desc">{t('workspace.reportAcceptConfirm')}</p>
              </button>

              {/* Action Selector for detailed responses */}
              <div className="rc-respond-mode-selector">
                {[
                  {
                    value: ContractReportResolutionAction.ProvideExplanation,
                    label: t('workspace.reportActionProvideExplanation'),
                  },
                  {
                    value: ContractReportResolutionAction.ProposeResolution,
                    label: t('workspace.reportActionProposeResolution'),
                  },
                  {
                    value: ContractReportResolutionAction.RejectIssue,
                    label: t('workspace.reportActionRejectIssue'),
                  },
                ].map((action) => (
                  <button
                    key={action.value}
                    type="button"
                    className={`rc-mode-btn ${respondMode === action.value ? 'active' : ''}`}
                    onClick={() =>
                      setRespondMode(respondMode === action.value ? null : action.value)
                    }
                  >
                    {action.label}
                  </button>
                ))}
              </div>

              {/* Detailed Response Forms */}
              {respondMode !== null && respondMode !== ContractReportResolutionAction.AcceptIssue && (
                <form onSubmit={handleRespondSubmit} className="rc-respond-form">
                  {respondMode === ContractReportResolutionAction.ProvideExplanation && (
                    <div className="rc-field">
                      <label>{t('workspace.reportExplanationLabel')} *</label>
                      <textarea
                        value={explanation}
                        onChange={(e) => setExplanation(e.target.value)}
                        maxLength={5000}
                        rows={4}
                        placeholder={t('workspace.reportExplanationPlaceholder')}
                        disabled={isResponding}
                      />
                    </div>
                  )}

                  {respondMode === ContractReportResolutionAction.ProposeResolution && (
                    <div className="rc-field">
                      <label>{t('workspace.reportProposedResolutionLabel')} *</label>
                      <textarea
                        value={proposedResolution}
                        onChange={(e) => setProposedResolution(e.target.value)}
                        maxLength={5000}
                        rows={4}
                        placeholder={t('workspace.reportProposedResolutionPlaceholder')}
                        disabled={isResponding}
                      />
                    </div>
                  )}

                  {respondMode === ContractReportResolutionAction.RejectIssue && (
                    <div className="rc-field">
                      <label>{t('workspace.reportRejectReasonLabel')} *</label>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        maxLength={5000}
                        rows={4}
                        placeholder={t('workspace.reportRejectReasonPlaceholder')}
                        disabled={isResponding}
                      />
                    </div>
                  )}

                  <div className="rc-actions">
                    <button
                      type="button"
                      className="rc-secondary"
                      onClick={resetRespondMode}
                      disabled={isResponding}
                    >
                      {t('common.cancel')}
                    </button>
                    <button type="submit" className="rc-primary" disabled={isResponding}>
                      {isResponding ? (
                        <>
                          <Loader2 size={15} className="rc-spin" />
                          {t('workspace.submitting')}
                        </>
                      ) : (
                        t('common.submit')
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Reporter Confirmation */}
          {reporterCanConfirm && (
            <div className="rc-detail-section rc-action-section">
              <h4 className="rc-section-title">{t('workspace.reportConfirmResolutionTitle')}</h4>
              <p className="rc-confirm-desc">
                {t('workspace.reportConfirmDesc') ||
                  'Do you accept the proposed resolution? Accepting will close this issue. Declining keeps it open for further discussion.'}
              </p>
              <div className="rc-confirm-actions">
                <button
                  type="button"
                  onClick={handleConfirmAccept}
                  disabled={isConfirming}
                  className="rc-action-button rc-action-accept"
                >
                  {isConfirming ? (
                    <Loader2 size={16} className="rc-spin" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                  <span>{t('workspace.reportAcceptResolution')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecline}
                  disabled={isConfirming}
                  className="rc-action-button rc-action-decline"
                >
                  {isConfirming ? (
                    <Loader2 size={16} className="rc-spin" />
                  ) : (
                    <XCircle size={16} />
                  )}
                  <span>{t('workspace.reportDeclineResolution')}</span>
                </button>
              </div>
            </div>
          )}

          {/* View-only notice for resolved reports */}
          {isResolved && (
            <div className="rc-resolved-notice">
              <CheckCircle size={16} />
              <span>{t('workspace.reportResolvedNotice')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
