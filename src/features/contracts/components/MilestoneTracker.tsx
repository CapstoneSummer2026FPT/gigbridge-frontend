import { CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import type { Milestone } from '../../../types/models/Contract';
import { MilestoneStatus } from '../../../types/models/Contract';
import { formatContractAmount, formatContractDate } from '../../../shared/utils/contractUtils';
import '../styles/milestone-tracker.css';

interface MilestoneTrackerProps {
  milestones: Milestone[];
  totalBudget: number;
  onMilestoneClick?: (milestone: Milestone) => void;
}

export function MilestoneTracker({
  milestones,
  totalBudget,
  onMilestoneClick,
}: MilestoneTrackerProps) {
  if (!milestones || milestones.length === 0) {
    return (
      <div className="milestone-tracker-empty">
        <AlertCircle size={32} />
        <p>No milestones yet</p>
      </div>
    );
  }

  const completed = milestones.filter(m => m.status === MilestoneStatus.Approved).length;
  const completionPercentage = (completed / milestones.length) * 100;
  const totalMilestoneAmount = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);

  return (
    <div className="milestone-tracker">
      {/* Progress Overview */}
      <div className="milestone-progress-overview">
        <div className="progress-info">
          <h3 className="progress-title">Milestone Progress</h3>
          <p className="progress-stats">
            {completed} of {milestones.length} completed
          </p>
        </div>
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <span className="progress-percentage">{Math.round(completionPercentage)}%</span>
        </div>
      </div>

      {/* Budget Breakdown */}
      <div className="milestone-budget-breakdown">
        <div className="budget-item">
          <span className="budget-label">Milestone Budget</span>
          <span className="budget-amount">{formatContractAmount(totalMilestoneAmount)}</span>
        </div>
        <div className="budget-item">
          <span className="budget-label">Remaining Budget</span>
          <span className="budget-amount">
            {formatContractAmount(totalBudget - totalMilestoneAmount)}
          </span>
        </div>
      </div>

      {/* Milestone List */}
      <div className="milestone-list">
        {milestones.map((milestone, index) => (
          <div
            key={milestone.id}
            className="milestone-item-tracker"
            onClick={() => onMilestoneClick?.(milestone)}
          >
            <div className="milestone-item-header">
              <div className="milestone-number-badge">
                {milestone.status === MilestoneStatus.Approved ? (
                  <CheckCircle2 size={24} className="icon-completed" />
                ) : (
                  <div className="milestone-number-circle">#{index + 1}</div>
                )}
              </div>
              <div className="milestone-item-info">
                <h4 className="milestone-item-title">{milestone.title}</h4>
                <p className="milestone-item-meta">
                  {formatContractAmount(milestone.amount)} • Due {formatContractDate(milestone.due_date)}
                </p>
              </div>
              <div className="milestone-item-status">
                {milestone.status === MilestoneStatus.Approved ? (
                  <span className="status-badge status-approved">
                    <CheckCircle2 size={16} />
                    Approved
                  </span>
                ) : (
                  <span className="status-badge status-pending">
                    <Clock size={16} />
                    Pending
                  </span>
                )}
              </div>
            </div>

            {/* Milestone Timeline */}
            {milestone.paid_at && (
              <div className="milestone-timeline">
                <span className="timeline-label">Paid on {formatContractDate(milestone.paid_at)}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MilestoneTracker;
