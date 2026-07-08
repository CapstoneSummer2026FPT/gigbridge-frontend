import { FC } from 'react';
import { motion } from 'motion/react';
import { Clock, Sparkles, Eye, CheckCircle, XCircle, FileSignature, Briefcase } from 'lucide-react';
import type { ProposalViewModel } from '../../../types/models/Proposal';
import { GigCoinAmount, GigCoinLogo } from '../../../shared/components/GigCoinAmount';
import { useTranslation } from '../../../hooks/useTranslation';

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
  const { t } = useTranslation();
  const statusLabel =
    proposal.status === 0
      ? t('proposals.pending')
      : proposal.status === 1
        ? (t('common.search') === 'Search' ? 'Shortlisted' : 'Được chọn')
        : proposal.status === 2
          ? t('proposals.accepted')
          : proposal.status === 3
            ? t('proposals.rejected')
            : (t('common.search') === 'Search' ? 'Withdrawn' : 'Đã rút');

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
            <strong>{proposal.freelancerName || t('proposals.unknownFreelancer')}</strong>
            <span>{proposal.submittedAt ? new Date(proposal.submittedAt).toLocaleDateString(t('common.search') === 'Search' ? 'en-US' : 'vi-VN') : t('proposals.recently')}</span>
          </div>
        </div>
        <div className="proposal-card-side">
          <span className={`proposal-status ${getStatusColor(proposal.status)}`}>{statusLabel}</span>
          {proposal.interviewScore && (
            <span className="proposal-score-pill">
              <span style={{ fontSize: '0.65rem' }}>{t('proposals.score')}</span>
              {proposal.interviewScore}
            </span>
          )}
        </div>
      </div>

      {/* Cover Letter */}
      <p className="proposal-cover-letter">{proposal.coverLetter || t('proposals.noCoverLetter')}</p>

      {/* Metadata: Budget, Duration, AI Flag */}
      <div className="proposal-review-meta">
        <div>
          <GigCoinLogo size={14} />
          <span><GigCoinAmount amount={proposal.proposedBudget || 0} suffix={"/" + t('proposals.project')} /></span>
        </div>
        <div>
          <Clock size={14} />
          <span>{proposal.proposedDuration || t('proposals.flexible')} {t('proposals.days')}</span>
        </div>
        {proposal.isAIGenerated && (
          <div>
            <Sparkles size={14} />
            <span>{t('proposals.aiGenerated')}</span>
          </div>
        )}
        {(proposal.boostedTokenAmount || 0) > 0 && (
          <div style={{ background: 'rgba(159, 75, 255, 0.12)', color: '#7c3aed' }}>
            <span>{t('proposals.boosted', { count: proposal.boostedTokenAmount })}</span>
          </div>
        )}
      </div>

      {/* Interface Grid: IDs and dates */}
      <div className="proposal-interface-grid">
        <div>
          <span>{t('proposals.freelancerId')}</span>
          <strong>{proposal.freelancerProfilesId?.substring(0, 8)}...</strong>
        </div>
        <div>
          <span>{t('proposals.proposalId')}</span>
          <strong>{proposal.proposalsId?.substring(0, 8)}...</strong>
        </div>
        <div>
          <span>{t('proposals.submitted')}</span>
          <strong>{proposal.submittedAt ? new Date(proposal.submittedAt).toLocaleDateString(t('common.search') === 'Search' ? 'en-US' : 'vi-VN') : '-'}</strong>
        </div>
      </div>

      {/* Actions */}
      {isClient ? (
        /* CLIENT VIEW: Shortlist/Reject/Negotiate */
        <div className="proposal-review-actions">
          {proposal.status !== 3 && (
            <motion.button
              className="proposal-create-contract-btn"
              onClick={() => onGoToWorkspace?.(proposal)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', color: 'white' }}
            >
              <Briefcase size={15} />
              {t('proposals.goToWorkspace')}
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
              {t('proposals.shortlist')}
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
              {t('proposals.reject')}
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
              {t('proposals.reconsiderShortlist')}
            </motion.button>
          )}

          <motion.button
            className="proposal-view-btn"
            onClick={() => onViewDetail(proposal, 'detail')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Eye size={15} />
            {t('proposals.details')}
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
            {t('proposals.details')}
          </motion.button>
          {proposal.status === 0 && onBoost && (
            <motion.button
              className="proposal-boost-btn"
              onClick={() => onBoost(proposal)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles size={15} />
              {t('proposals.boost')}
            </motion.button>
          )}
        </div>
      )}
    </motion.div>
  );
};
