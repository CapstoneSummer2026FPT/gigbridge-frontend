import { FC } from 'react';
import { motion } from 'motion/react';
import { Clock, DollarSign, Sparkles, Eye, CheckCircle, XCircle, FileSignature, MessageSquare } from 'lucide-react';
import type { ProposalViewModel } from '../mock/data-for-ProposalsInboxScreen';

interface ProposalCardProps {
  proposal: ProposalViewModel;
  isClient?: boolean;
  onViewDetail: (proposal: ProposalViewModel, mode: 'detail' | 'score' | 'cv') => void;
  onShortlist: (proposalId: string) => void;
  onReject: (proposalId: string) => void;
  onStartNegotiation: (proposalId: string) => void;
  onBoost?: (proposal: ProposalViewModel) => void;
  onGoToWorkspace?: (proposal: ProposalViewModel) => void;
}

export const ProposalCard: FC<ProposalCardProps> = ({
  proposal,
  isClient = false,
  onViewDetail,
  onShortlist,
  onReject,
  onStartNegotiation,
  onBoost,
  onGoToWorkspace,
}) => {
  
  const statusLabel =
    proposal.status === 0
      ? 'Pending'
      : proposal.status === 1
        ? 'Shortlisted'
        : proposal.status === 2
          ? 'Accepted'
          : proposal.status === 3
            ? 'Rejected'
            : 'Withdrawn';

  const getStatusColor = (status: number | undefined) => {
    if (status === 0) return 'proposal-status-pending';
    if (status === 1) return 'proposal-status-shortlisted';
    if (status === 2) return 'proposal-status-accepted';
    if (status === 3) return 'proposal-status-rejected';
    return 'proposal-status-withdrawn';
  };

  return (
    <motion.div
      className="proposal-review-card"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      whileHover={{ y: -2 }}
    >
      {/* Header: Freelancer info + Status */}
      <div className="proposal-review-header">
        <div className="proposal-freelancer">
          <img
            src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${proposal.freelancerName || proposal.freelancerProfilesId}`}
            alt={proposal.freelancerName || 'Freelancer'}
          />
          <div>
            <strong>{proposal.freelancerName || 'Unknown freelancer'}</strong>
            <span>{proposal.submittedAt ? new Date(proposal.submittedAt).toLocaleDateString() : 'Recently'}</span>
          </div>
        </div>
        <div className="proposal-card-side">
          <span className={`proposal-status ${getStatusColor(proposal.status)}`}>{statusLabel}</span>
          {proposal.interviewScore && (
            <span className="proposal-score-pill">
              <span style={{ fontSize: '0.65rem' }}>Score</span>
              {proposal.interviewScore}
            </span>
          )}
        </div>
      </div>

      {/* Cover Letter */}
      <p className="proposal-cover-letter">{proposal.coverLetter || 'No cover letter provided.'}</p>

      {/* Metadata: Budget, Duration, AI Flag */}
      <div className="proposal-review-meta">
        <div>
          <DollarSign size={14} />
          <span>${(proposal.proposedBudget || 0).toLocaleString()}/project</span>
        </div>
        <div>
          <Clock size={14} />
          <span>{proposal.proposedDuration || 'Flexible'} days</span>
        </div>
        {proposal.isAIGenerated && (
          <div>
            <Sparkles size={14} />
            <span>AI Generated</span>
          </div>
        )}
        {(proposal.boostedTokenAmount || 0) > 0 && (
          <div style={{ background: 'rgba(159, 75, 255, 0.12)', color: '#7c3aed' }}>
            <span>Boosted {proposal.boostedTokenAmount}x</span>
          </div>
        )}
      </div>

      {/* Interface Grid: IDs and dates */}
      <div className="proposal-interface-grid">
        <div>
          <span>Freelancer ID</span>
          <strong>{proposal.freelancerProfilesId?.substring(0, 8)}...</strong>
        </div>
        <div>
          <span>Proposal ID</span>
          <strong>{proposal.proposalsId?.substring(0, 8)}...</strong>
        </div>
        <div>
          <span>Submitted</span>
          <strong>{proposal.submittedAt ? new Date(proposal.submittedAt).toLocaleDateString() : '-'}</strong>
        </div>
      </div>

      {/* Actions */}
      {isClient ? (
        /* CLIENT VIEW: Shortlist/Reject/Negotiate */
        <div className="proposal-review-actions">
          {proposal.status !== 3 && (
            <motion.button
              className="proposal-create-contract-btn"
              onClick={() => onStartNegotiation(proposal.proposalsId)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', color: 'white' }}
            >
              <MessageSquare size={15} />
              Start Negotiation
            </motion.button>
          )}

          {proposal.status === 0 && (
            <motion.button
              className="proposal-accept-btn"
              onClick={() => onShortlist(proposal.proposalsId)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <CheckCircle size={15} />
              Shortlist
            </motion.button>
          )}

          {proposal.status !== 3 && (
            <motion.button
              className="proposal-reject-btn"
              onClick={() => onReject(proposal.proposalsId)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <XCircle size={15} />
              Reject
            </motion.button>
          )}

          {proposal.status === 3 && (
            <motion.button
              className="proposal-accept-btn"
              onClick={() => onShortlist(proposal.proposalsId)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <CheckCircle size={15} />
              Reconsider (Shortlist)
            </motion.button>
          )}

          <motion.button
            className="proposal-view-btn"
            onClick={() => onViewDetail(proposal, 'detail')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Eye size={15} />
            Details
          </motion.button>
        </div>
      ) : (
        /* FREELANCER VIEW: Boost + Menu */
        <div className="proposal-review-actions">
          <motion.button
            className="proposal-view-btn"
            onClick={() => onViewDetail(proposal, 'detail')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Eye size={15} />
            Details
          </motion.button>
          {proposal.status === 0 && onBoost && (
            <motion.button
              className="proposal-boost-btn"
              onClick={() => onBoost(proposal)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles size={15} />
              Boost
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
};
