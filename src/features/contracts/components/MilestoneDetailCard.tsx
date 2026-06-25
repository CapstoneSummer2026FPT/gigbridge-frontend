import { CheckCircle2, Clock, AlertCircle, Upload, Calendar } from 'lucide-react';
import type { Milestone } from '../../../types/models/Contract';
import { MilestoneStatus } from '../../../types/models/Contract';
import {
  formatContractAmount,
  formatContractDate,
  getMilestoneStatusLabel,
  canSubmitMilestoneDeliverable,
} from '../../../shared/utils/contractUtils';
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
              Approved
            </span>
          ) : milestone.status === MilestoneStatus.Submitted ? (
            <span className="status-badge status-submitted">
              <Clock size={16} />
              Submitted
            </span>
          ) : isOverdue ? (
            <span className="status-badge status-overdue">
              <AlertCircle size={16} />
              Overdue
            </span>
          ) : (
            <span className="status-badge status-pending">
              <Clock size={16} />
              {getMilestoneStatusLabel(milestone.status)}
            </span>
          )}
        </div>
      </div>

      <div className="milestone-detail-dates">
        <span className="due-date">
          <Calendar size={14} />
          Due: {formatContractDate(milestone.due_date)}
        </span>
        {milestone.paid_at && (
          <span className="paid-date">
            <CheckCircle2 size={14} />
            Paid: {formatContractDate(milestone.paid_at)}
          </span>
        )}
      </div>

      {/* Deliverable Submission Section */}
      {canSubmit && (
        <div className="milestone-deliverable-section">
          <p className="deliverable-label">Ready to submit your deliverables?</p>
          <button
            onClick={onSubmitDeliverable}
            className={`deliverable-submit-btn ${isSubmittingFor ? 'active' : ''}`}
          >
            <Upload size={16} />
            {isSubmittingFor ? 'Submitting...' : 'Submit Deliverables'}
          </button>
        </div>
      )}

      {isCompleted && milestone.paid_at && (
        <div className="milestone-completed-badge">
          <CheckCircle2 size={16} />
          <span>Milestone completed and paid</span>
        </div>
      )}
    </div>
  );
}

export default MilestoneDetailCard;
