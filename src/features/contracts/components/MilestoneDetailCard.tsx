import { CheckCircle2, Clock, AlertCircle, Upload, Calendar } from 'lucide-react';
import type { Milestone } from '../../../types/models/Contract';
import { MilestoneStatus } from '../../../types/models/Contract';
import {
  formatContractAmount,
  formatContractDate,
  getMilestoneStatusLabel,
  canSubmitMilestoneDeliverable,
} from '../../../shared/utils/contractUtils';
import { useTranslation } from '../../../hooks/useTranslation';
import '../styles/milestone-detail-card.css';

interface MilestoneDetailCardProps {
  milestone: Milestone;
  index: number;
  onSubmitDeliverable: () => void;
  isSubmittingFor?: boolean;
}

export function MilestoneDetailCard({
  milestone,
  index,
  onSubmitDeliverable,
  isSubmittingFor = false,
}: MilestoneDetailCardProps) {
  const { t } = useTranslation();
  const isCompleted = milestone.status === MilestoneStatus.Approved || milestone.status === MilestoneStatus.PaymentConfirmed;
  const canSubmit = canSubmitMilestoneDeliverable(milestone.status);
  const isOverdue = !isCompleted && new Date(milestone.due_date) < new Date();

  return (
    <div className={`milestone-detail-card ${isCompleted ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`}>
      <div className="milestone-detail-header">
        <div className="milestone-number-badge">
          {isCompleted ? (
            <CheckCircle2 size={24} className="icon-completed" />
          ) : (
            <div className="milestone-number-circle">#{index + 1}</div>
          )}
        </div>

        <div className="milestone-detail-info">
          <h5 className="milestone-detail-title">{milestone.title}</h5>
          <p className="milestone-detail-amount">{formatContractAmount(milestone.amount)}</p>
        </div>

        <div className="milestone-detail-status">
          {isCompleted ? (
            <span className="status-badge status-approved">
              <CheckCircle2 size={16} />
              {t('contracts.approved')}
            </span>
          ) : milestone.status === MilestoneStatus.Submitted ? (
            <span className="status-badge status-submitted">
              <Clock size={16} />
              {t('contracts.submitted')}
            </span>
          ) : isOverdue ? (
            <span className="status-badge status-overdue">
              <AlertCircle size={16} />
              {t('contracts.overdue')}
            </span>
          ) : (
            <span className="status-badge status-pending">
              <Clock size={16} />
              {t('contracts.milestoneStatus.' + milestone.status, { defaultValue: getMilestoneStatusLabel(milestone.status) })}
            </span>
          )}
        </div>
      </div>

      <div className="milestone-detail-dates">
        <span className="due-date">
          <Calendar size={14} />
          {t('contracts.duePrefix')}: {formatContractDate(milestone.due_date)}
        </span>
        {milestone.paid_at && (
          <span className="paid-date">
            <CheckCircle2 size={14} />
            {t('contracts.paidPrefix')}: {formatContractDate(milestone.paid_at)}
          </span>
        )}
      </div>

      {/* Deliverable Submission Section */}
      {canSubmit && (
        <div className="milestone-deliverable-section">
          <p className="deliverable-label">{t('contracts.readyToSubmitDeliverables')}</p>
          <button
            onClick={onSubmitDeliverable}
            className={`deliverable-submit-btn ${isSubmittingFor ? 'active' : ''}`}
          >
            <Upload size={16} />
            {isSubmittingFor ? t('contracts.submitting') : t('contracts.submitDeliverables')}
          </button>
        </div>
      )}

      {isCompleted && milestone.paid_at && (
        <div className="milestone-completed-badge">
          <CheckCircle2 size={16} />
          <span>{t('contracts.milestoneCompletedPaid')}</span>
        </div>
      )}
    </div>
  );
}

export default MilestoneDetailCard;
