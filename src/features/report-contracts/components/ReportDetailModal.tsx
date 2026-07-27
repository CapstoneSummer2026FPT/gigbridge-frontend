import { useState, useRef, type FormEvent, type ChangeEvent } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { ReportContract, ReportContractAttachment } from '../../../types/models/ReportContract';
import type { EscalateReportToDisputeInput } from '../../../types/models/Dispute';
import {
  ContractReportStatus,
  ContractReportResolutionAction,
} from '../../../types/models/ReportContract';
import {
  AlertCircle, X, Loader2, CheckCircle, XCircle,
  FileText, Image, Film, Archive,
  Upload, Download
} from 'lucide-react';
import '../styles/report-contract.css';
import { DisputeEscalationModal } from './DisputeEscalationModal';
import { DisputeCreationModal } from './DisputeCreationModal';

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
  contractTitle: string;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onRespond: (input: {
    resolutionAction: number;
    explanation?: string | null;
    proposedResolution?: string | null;
    rejectReason?: string | null;
    attachments?: File[];
  }) => Promise<{ success: boolean; message?: string }>;
  onConfirm: (isAccepted: boolean) => Promise<{ success: boolean; message?: string }>;
  onEscalate: (input: EscalateReportToDisputeInput) => Promise<{ success: boolean; message?: string; disputeId?: string }>;
  onDisputeCreated: (disputeId: string) => void;
  isResponding: boolean;
  isConfirming: boolean;
  isEscalating: boolean;
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) return <Image size={16} />;
  if (contentType.startsWith('video/')) return <Film size={16} />;
  if (contentType.includes('pdf')) return <FileText size={16} />;
  if (contentType.includes('zip') || contentType.includes('rar') || contentType.includes('7z')) return <Archive size={16} />;
  return <FileText size={16} />;
}

function isImageType(contentType: string): boolean {
  return contentType.startsWith('image/');
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function AttachmentItem({ attachment }: { attachment: ReportContractAttachment }) {
  return (
    <a
      key={attachment.reportContractAttachmentId}
      href={attachment.fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="rc-attachment-item"
    >
      <span className="rc-attachment-icon">
        {isImageType(attachment.contentType) ? (
          <img
            src={attachment.fileUrl}
            alt={attachment.fileName}
            className="rc-attachment-thumb"
          />
        ) : (
          getFileIcon(attachment.contentType)
        )}
      </span>
      <span className="rc-attachment-name" title={attachment.fileName}>
        {attachment.fileName}
      </span>
      <span className="rc-attachment-meta">
        <span className="rc-attachment-size">{formatFileSize(attachment.fileSize)}</span>
        {attachment.uploadedAt && (
          <span className="rc-attachment-time">
            {new Date(attachment.uploadedAt).toLocaleString()}
          </span>
        )}
      </span>
      <Download size={14} className="rc-attachment-download" />
    </a>
  );
}

export function ReportDetailModal({
  report,
  contractTitle,
  currentUserId,
  isOpen,
  onClose,
  onRespond,
  onConfirm,
  onEscalate,
  onDisputeCreated,
  isResponding,
  isConfirming,
  isEscalating,
}: ReportDetailModalProps) {
  const { t } = useTranslation();
  const [respondMode, setRespondMode] = useState<number | null>(null);
  const [explanation, setExplanation] = useState('');
  const [proposedResolution, setProposedResolution] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [respondentFiles, setRespondentFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showEscalation, setShowEscalation] = useState(false);
  const [showDisputeCreation, setShowDisputeCreation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const isReporter = report.reporter.id === currentUserId;
  const isRespondent = report.respondent?.id === currentUserId;
  const isPending = report.status === ContractReportStatus.Pending;
  const isWaitingConfirmation = report.status === ContractReportStatus.WaitingReporterConfirmation;
  const isResolved = report.status === ContractReportStatus.Resolved;
  const respondentCanRespond = isRespondent && isPending;
  const reporterCanConfirm = isReporter && isWaitingConfirmation;

  // Split attachments by uploader
  const reporterAttachments = report.attachments.filter(
    (a) => !a.uploadedByUserId || a.uploadedByUserId === report.reporter.id
  );
  const respondentAttachments = report.attachments.filter(
    (a) => a.uploadedByUserId && a.uploadedByUserId === report.respondent?.id
  );

  const resetRespondMode = () => {
    setRespondMode(null);
    setExplanation('');
    setProposedResolution('');
    setRejectReason('');
    setRespondentFiles([]);
    setError(null);
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.currentTarget.files ?? []);
    if (selectedFiles.length > 0) {
      setRespondentFiles((prev) => [...prev, ...selectedFiles]);
    }
    event.currentTarget.value = '';
  };

  const removeFile = (index: number) => {
    setRespondentFiles((prev) => prev.filter((_, i) => i !== index));
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
      attachments: respondentFiles.length > 0 ? respondentFiles : undefined,
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
      return;
    }
    setShowEscalation(true);
  };

  return (
    <>
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

          {/* Reporter Evidence */}
          {reporterAttachments.length > 0 && (
            <div className="rc-detail-section">
              <h4 className="rc-section-title rc-section-title-attachment">
                {t('workspace.reportReporterEvidence')}
              </h4>
              <div className="rc-attachment-list">
                {reporterAttachments.map((att) => (
                  <AttachmentItem key={att.reportContractAttachmentId} attachment={att} />
                ))}
              </div>
            </div>
          )}

          {/* Respondent Evidence */}
          {respondentAttachments.length > 0 && (
            <div className="rc-detail-section">
              <h4 className="rc-section-title rc-section-title-attachment">
                {t('workspace.reportRespondentEvidence')}
              </h4>
              <div className="rc-attachment-list">
                {respondentAttachments.map((att) => (
                  <AttachmentItem key={att.reportContractAttachmentId} attachment={att} />
                ))}
              </div>
            </div>
          )}

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

          {/* Respondent Actions */}
          {respondentCanRespond && (
            <div className="rc-detail-section rc-action-section">
              <h4 className="rc-section-title">{t('workspace.reportRespondTitle')}</h4>

              {/* Quick Accept */}
              <button
                type="button"
                onClick={() => {
                  setRespondMode(ContractReportResolutionAction.AcceptIssue);
                  // For AcceptIssue, submit immediately without attachments
                  onRespond({
                    resolutionAction: ContractReportResolutionAction.AcceptIssue,
                    attachments: respondentFiles.length > 0 ? respondentFiles : undefined,
                  }).then((result) => {
                    if (result.success) {
                      resetRespondMode();
                    } else {
                      setError(result.message || 'Failed to submit response.');
                    }
                  });
                }}
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

                  {/* Respondent Attachment Upload */}
                  <div className="rc-field rc-respond-attachments">
                    <label>{t('workspace.reportRespondentAttachments')}</label>
                    <p className="rc-hint">{t('workspace.reportRespondentAttachmentsHint')}</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="rc-respondent-files"
                      onChange={handleFileSelect}
                      disabled={isResponding}
                      multiple
                      className="rc-file-input-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isResponding}
                      className="rc-file-upload-button"
                    >
                      <Upload size={18} />
                      <span className="rc-upload-text">{t('workspace.reportChooseFiles') || 'Choose files'}</span>
                    </button>
                    {respondentFiles.length > 0 && (
                      <div className="rc-file-list">
                        {respondentFiles.map((file, index) => (
                          <div key={index} className="rc-file-item">
                            <FileText size={15} />
                            <span>{file.name}</span>
                            <strong>{(file.size / (1024 * 1024)).toFixed(2)} MB</strong>
                            <button
                              type="button"
                              onClick={() => removeFile(index)}
                              disabled={isResponding}
                              className="rc-file-remove"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

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
    <DisputeEscalationModal
      isOpen={showEscalation}
      isEscalating={false}
      onClose={() => {
        setShowEscalation(false);
      }}
      onEscalate={() => {
        setShowEscalation(false);
        setShowDisputeCreation(true);
      }}
    />
    <DisputeCreationModal
      isOpen={showDisputeCreation}
      report={report}
      contractTitle={contractTitle}
      isSubmitting={isEscalating}
      onClose={() => {
        if (!isEscalating) setShowDisputeCreation(false);
      }}
      onSubmit={onEscalate}
      onCreated={(disputeId) => {
        setShowDisputeCreation(false);
        onDisputeCreated(disputeId);
      }}
    />
    </>
  );
}
