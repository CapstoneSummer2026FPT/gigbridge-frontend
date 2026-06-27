import { FC } from 'react';
import { X, Download, FileText, Award } from 'lucide-react';
import { motion } from 'motion/react';
import type { ProposalViewModel } from '../mock/data-for-ProposalsInboxScreen';
import { GigCoinAmount } from '../../../shared/components/GigCoinAmount';

interface ProposalDetailModalProps {
  proposal: ProposalViewModel;
  mode: 'score' | 'cv' | 'detail';
  onClose: () => void;
}

export const ProposalDetailModal: FC<ProposalDetailModalProps> = ({
  proposal,
  mode,
  onClose,
}: ProposalDetailModalProps) => {
  return (
    <motion.div
      className="proposal-modal-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="proposal-modal proposal-detail-modal"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      >
        <button className="proposal-modal-close" onClick={onClose}>
          <X size={18} />
        </button>

        {mode === 'score' && (
          <div>
            <div className="proposal-modal-title">
              <Award size={20} />
              <div>
                <h2>Interview Score</h2>
                <p>Assessment Results</p>
              </div>
            </div>

            <div className="proposal-score-detail">
              <strong>{proposal.interviewScore || 0}</strong>
              <span>Out of 100</span>
              <div className="proposal-score-bar">
                <div style={{ width: `${(proposal.interviewScore || 0) / 100 * 100}%` }} />
              </div>
              <p>
                This freelancer's interview score reflects their qualifications, experience, and alignment
                with project requirements. Higher scores indicate stronger matches.
              </p>
            </div>
          </div>
        )}

        {mode === 'cv' && (
          <div>
            <div className="proposal-modal-title">
              <Download size={20} />
              <div>
                <h2>Freelancer CV</h2>
                <p>Professional Profile</p>
              </div>
            </div>

            {proposal.attachments && proposal.attachments.length > 0 ? (
              <div className="proposal-attachments">
                {proposal.attachments.map((attachment) => (
                  <motion.div
                    key={attachment.propoAttach_ProposalAttachmentsId}
                    className="proposal-attachment-row"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                  >
                    <FileText size={18} />
                    <div>
                      <strong>{attachment.fileName}</strong>
                      <span>{(attachment.fileSize / 1024).toFixed(0)} KB</span>
                    </div>
                    <a href={attachment.fileUrl} download>
                      Download
                    </a>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="proposals-empty compact">
                <FileText size={28} />
                <p>No attachments</p>
              </div>
            )}
          </div>
        )}

        {mode === 'detail' && (
          <div>
            <div className="proposal-modal-title">
              <FileText size={20} />
              <div>
                <h2>Proposal Details</h2>
                <p>Full Information</p>
              </div>
            </div>

            <div className="proposal-full-detail">
              <div>
                <span>Freelancer Name</span>
                <strong>{proposal.freelancerName || 'Unknown'}</strong>
              </div>
              <div>
                <span>Proposed Budget</span>
                <strong><GigCoinAmount amount={proposal.proposedBudget || 0} /></strong>
              </div>
              <div>
                <span>Duration</span>
                <strong>{proposal.proposedDuration || 'Flexible'} days</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>
                  {proposal.status === 0 && 'Pending'}
                  {proposal.status === 1 && 'Shortlisted'}
                  {proposal.status === 2 && 'Accepted'}
                  {proposal.status === 3 && 'Rejected'}
                  {proposal.status === 4 && 'Withdrawn'}
                </strong>
              </div>
              <div>
                <span>Submitted</span>
                <strong>{proposal.submittedAt ? new Date(proposal.submittedAt).toLocaleDateString() : '-'}</strong>
              </div>
              <div>
                <span>Interview Score</span>
                <strong>{proposal.interviewScore || 0}</strong>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem 0', color: 'var(--gb-text-primary)', fontSize: '0.95rem', fontWeight: 700 }}>
                Cover Letter
              </h3>
              <p style={{ margin: 0, color: 'var(--gb-text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                {proposal.coverLetter || 'No cover letter provided.'}
              </p>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
