import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router';
import {
  ArrowLeft, CheckCircle2, XCircle, AlertCircle, Calendar,
  Clock, FileText, User, Download, Eye, EyeOff, ChevronDown
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { useApp } from '../../../app/providers/AppProvider';
import type { ContractDto, Milestone, MilestoneAttachment } from '../../../types/models/Contract';
import { MilestoneStatus } from '../../../types/models/Contract';
import { canApproveMilestone, getMilestoneStatusLabel, formatContractAmount, formatContractDate } from '../../../shared/utils/contractUtils';
import '../styles/approve-milestone-screen.css';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';

import { useTranslation } from '../../../hooks/useTranslation';

interface MilestoneWithAttachments extends Milestone {
  attachments?: MilestoneAttachment[];
  deliverableDescription?: string;
}

interface ApprovalData {
  milestoneId: string;
  approved: boolean;
  notes?: string;
}

export default function ApproveMilestoneScreen() {
  const { t } = useTranslation();
  const { contractId, milestoneId } = useParams<{ contractId: string; milestoneId: string }>();
  const navigate = useNavigate();
  const { user } = useApp();

  // State
  const [contract, setContract] = useState<ContractDto | null>(null);
  const [milestone, setMilestone] = useState<MilestoneWithAttachments | null>(null);
  const [attachments, setAttachments] = useState<MilestoneAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [approvalAction, setApprovalAction] = useState<'pending' | 'approve' | 'reject'>('pending');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const [expandedAttachment, setExpandedAttachment] = useState<string | null>(null);
  const [showEscrowInfo, setShowEscrowInfo] = useState(true);

  // Load contract and milestone
  useEffect(() => {
    const loadData = async () => {
      if (!contractId || !milestoneId) {
        setError(t('contracts.contractNotFound'));
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const contractResponse = await contractGetAPI.getContractById(contractId);
        if (!contractResponse.success || !contractResponse.data) {
          throw new Error(contractResponse.message || t('contracts.loadingContract'));
        }
        setContract(contractResponse.data);

        const milestoneResponse = await contractGetAPI.getMilestoneById(milestoneId);
        if (!milestoneResponse.success || !milestoneResponse.data) {
          throw new Error(milestoneResponse.message || t('contracts.loadingMilestone', { defaultValue: 'Failed to load milestone' }));
        }
        setMilestone(milestoneResponse.data);

        // Fetch milestone attachments
        const attachmentsResponse = await contractGetAPI.getMilestoneAttachments(milestoneId);
        if (attachmentsResponse.success && attachmentsResponse.data) {
          setAttachments(attachmentsResponse.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t('contracts.anErrorOccurred'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [contractId, milestoneId]);

  const handleApprove = async () => {
    if (!milestone) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await contractPostAPI.approveMilestone(contractId!, milestone.id);

      if (response.success) {
        setMilestone({ ...milestone, status: MilestoneStatus.Approved });
        setApprovalAction('pending');
        setApprovalNotes('');
        setSuccessMessage(t('contracts.milestoneApproved'));
        setTimeout(() => {
          navigate(`/contracts/${contractId}`);
        }, 2000);
      } else {
        setError(response.message || t('contracts.signingFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('contracts.anErrorOccurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!milestone) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await contractPostAPI.requestMilestoneRevision(contractId!, milestone.id);
      if (response.success) {
        setMilestone({ ...milestone, status: MilestoneStatus.InProgress });
        setApprovalAction('pending');
        setApprovalNotes('');
        setSuccessMessage(t('contracts.revisionRequested'));
      } else {
        setError(response.message || t('contracts.signingFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('contracts.anErrorOccurred'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="approve-milestone-wrapper">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>{t('contracts.loadingMilestone', { defaultValue: 'Loading milestone details...' })}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!contract || !milestone) {
    return (
      <AppLayout>
        <div className="approve-milestone-wrapper">
          <div className="error-container">
            <AlertCircle size={48} />
            <p>{t('contracts.milestoneNotFound')}</p>
            <button onClick={() => navigate(-1)} className="back-link">
              {t('contracts.back')}
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const canApprove = canApproveMilestone(milestone.status);
  const isApproved = milestone.status === MilestoneStatus.Approved;
  const isPaid = milestone.status === MilestoneStatus.PaymentConfirmed;

  return (
    <AppLayout>
      <div className="approve-milestone-wrapper">
        {/* Header */}
        <div className="approve-milestone-header">
          <button
            onClick={() => navigate(-1)}
            className="back-button"
            title={t('contracts.back')}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="header-content">
            <h1 className="page-title">{t('contracts.reviewMilestoneDeliverable')}</h1>
            <p className="page-subtitle">{contract.title}</p>
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="success-message">
            <CheckCircle2 size={20} />
            <p>{successMessage}</p>
            <button
              onClick={() => setSuccessMessage(null)}
              className="message-close"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="error-message">
            <AlertCircle size={20} />
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="message-close"
            >
              ✕
            </button>
          </div>
        )}

        {/* Main Content */}
        <div className="approve-milestone-content">
          {/* Milestone Overview */}
          <div className="milestone-overview glass-card">
            <div className="overview-header">
              <div className="milestone-info">
                <h2 className="milestone-title">{milestone.title}</h2>
                <div className="milestone-meta">
                  <span className={`status-badge status-${milestone.status}`}>
                    {milestone.status === MilestoneStatus.Pending && (
                      <>
                        <Clock size={14} />
                        {getMilestoneStatusLabel(milestone.status)}
                      </>
                    )}
                    {milestone.status === MilestoneStatus.Approved && (
                      <>
                        <CheckCircle2 size={14} />
                        {t('contracts.milestoneStatus.Approved')}
                      </>
                    )}
                    {milestone.status === MilestoneStatus.PaymentConfirmed && (
                      <>
                        <CheckCircle2 size={14} />
                        {getMilestoneStatusLabel(milestone.status)}
                      </>
                    )}
                  </span>
                </div>
              </div>

              <div className="milestone-amount-badge">
                <GigCoinLogo size={24} />
                <span className="amount">{formatContractAmount(milestone.amount)}</span>
              </div>
            </div>

            {/* Details Grid */}
            <div className="details-grid">
              <div className="detail-item">
                <span className="detail-label">{t('contracts.dueDate')}</span>
                <span className="detail-value">{formatContractDate(milestone.due_date)}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">{t('contracts.status')}</span>
                <span className="detail-value">
                  {getMilestoneStatusLabel(milestone.status)}
                </span>
              </div>
              {milestone.paid_at && (
                <div className="detail-item">
                  <span className="detail-label">{t('contracts.paymentReleased')}</span>
                  <span className="detail-value">{formatContractDate(milestone.paid_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Escrow Information */}
          {canApprove && (
            <div className="escrow-info glass-card">
              <div className="escrow-header">
                <h3 className="escrow-title">{t('contracts.howEscrowWorks')}</h3>
                <button
                  onClick={() => setShowEscrowInfo(!showEscrowInfo)}
                  className="escrow-toggle"
                >
                  <ChevronDown size={20} style={{
                    transform: showEscrowInfo ? 'rotate(0deg)' : 'rotate(-90deg)',
                    transition: 'transform 0.2s ease'
                  }} />
                </button>
              </div>

              {showEscrowInfo && (
                <div className="escrow-content">
                  <div className="escrow-info-item">
                    <span className="info-label">{t('contracts.howEscrowWorks')}</span>
                    <p className="info-text">
                      {t('contracts.howEscrowWorksDesc', { amount: formatContractAmount(milestone.amount) })}
                    </p>
                  </div>
                  <div className="escrow-timeline">
                    <div className="timeline-step">
                      <div className="timeline-marker">1</div>
                      <div className="timeline-info">
                        <span className="timeline-label">{t('contracts.approval')}</span>
                        <p>{t('contracts.approveDeliverable')}</p>
                      </div>
                    </div>
                    <div className="timeline-step">
                      <div className="timeline-marker">2</div>
                      <div className="timeline-info">
                        <span className="timeline-label">{t('contracts.escrowHold')}</span>
                        <p>{t('contracts.escrowHoldDesc')}</p>
                      </div>
                    </div>
                    <div className="timeline-step">
                      <div className="timeline-marker">3</div>
                      <div className="timeline-info">
                        <span className="timeline-label">{t('contracts.release')}</span>
                        <p>{t('contracts.releaseDesc')}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Deliverable Files */}
          {attachments.length > 0 && (
            <div className="deliverables-section glass-card">
              <h3 className="section-title">{t('contracts.submittedDeliverables')}</h3>
              <div className="attachments-list">
                {attachments.map((attachment, index) => (
                  <div
                    key={attachment.id}
                    className="attachment-item"
                  >
                    <div className="attachment-header">
                      <div className="attachment-info">
                        <FileText size={20} className="file-icon" />
                        <div className="file-details">
                          <a
                            href={attachment.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="file-name"
                          >
                            {attachment.file_name}
                          </a>
                          <span className="file-size">
                            {attachment.file_name.split('.').pop()?.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <a
                        href={attachment.file_url}
                        download={attachment.file_name}
                        className="download-btn"
                        title={t('contracts.download')}
                      >
                        <Download size={18} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approval Actions */}
          {canApprove && (
            <div className="approval-actions glass-card">
              <h3 className="section-title">{t('contracts.approveOrReject')}</h3>

              <div className="approval-form">
                <div className="form-group">
                  <label className="form-label">{t('contracts.yourDecision')}</label>
                  <div className="approval-options">
                    <button
                      onClick={() => {
                        setApprovalAction('approve');
                        setApprovalNotes('');
                      }}
                      className={`approval-option ${approvalAction === 'approve' ? 'selected' : ''}`}
                    >
                      <CheckCircle2 size={20} />
                      <div className="option-text">
                        <span className="option-title">{t('contracts.approve')}</span>
                        <span className="option-desc">{t('contracts.acceptDeliverables')}</span>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setApprovalAction('reject');
                        setApprovalNotes('');
                      }}
                      className={`approval-option ${approvalAction === 'reject' ? 'selected' : ''}`}
                    >
                      <XCircle size={20} />
                      <div className="option-text">
                        <span className="option-title">{t('contracts.reject')}</span>
                        <span className="option-desc">{t('contracts.requestRevisions')}</span>
                      </div>
                    </button>
                  </div>
                </div>

                {approvalAction !== 'pending' && (
                  <div className="form-group">
                    <label htmlFor="notes" className="form-label">
                      {approvalAction === 'approve' ? t('contracts.approvalNotes') : t('contracts.rejectionReason')}
                    </label>
                    <textarea
                      id="notes"
                      value={approvalNotes}
                      onChange={(e) => setApprovalNotes(e.target.value)}
                      placeholder={approvalAction === 'approve' ? t('contracts.addNotesPlaceholder') : t('contracts.explainImprovementPlaceholder')}
                      className="form-textarea"
                      rows={4}
                    />
                    <div className="form-hint">
                      {t('contracts.max500Chars')}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {approvalAction === 'approve' && (
                  <div className="action-buttons">
                    <button
                      onClick={() => setApprovalAction('pending')}
                      className="action-btn action-cancel"
                      disabled={isSubmitting}
                    >
                      {t('contracts.back')}
                    </button>
                    <button
                      onClick={handleApprove}
                      className="action-btn action-approve"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-small"></span>
                          {t('contracts.approving')}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          {t('contracts.approveMilestone')}
                        </>
                      )}
                    </button>
                  </div>
                )}

                {approvalAction === 'reject' && (
                  <div className="action-buttons">
                    <button
                      onClick={() => setApprovalAction('pending')}
                      className="action-btn action-cancel"
                      disabled={isSubmitting}
                    >
                      {t('contracts.back')}
                    </button>
                    <button
                      onClick={handleReject}
                      className="action-btn action-reject"
                      disabled={isSubmitting || !approvalNotes.trim()}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="spinner-small"></span>
                          {t('contracts.rejecting')}
                        </>
                      ) : (
                        <>
                          <XCircle size={18} />
                          {t('contracts.rejectMilestone')}
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Status Display when Already Approved */}
          {isApproved && (
            <div className="status-display glass-card success-status">
              <CheckCircle2 size={32} />
              <h3 className="status-title">{t('contracts.milestoneApproved')}</h3>
              <p className="status-description">
                {t('contracts.milestoneApprovedDesc')}
              </p>
            </div>
          )}

          {isPaid && (
            <div className="status-display glass-card paid-status">
              <CheckCircle2 size={32} />
              <h3 className="status-title">{t('contracts.paymentReleased')}</h3>
              <p className="status-description">
                {t('contracts.paymentReleasedDesc', { date: formatContractDate(milestone.paid_at || new Date().toISOString()) })}
              </p>
            </div>
          )}

          {/* Navigation */}
          <div className="page-actions">
            <button
              onClick={() => navigate(`/contracts/${contractId}`)}
              className="action-btn action-back"
            >
              <Eye size={18} />
              {t('contracts.viewContract')}
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
