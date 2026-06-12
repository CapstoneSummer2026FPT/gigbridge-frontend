import { FC, useState, useRef, useEffect } from 'react';
import { X, BriefcaseBusiness, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import '../styles/invite-freelancer-modal.css';

export interface InviteFreelancerData {
  freelancerId: string;
  freelancerName: string;
  jobId: string;
  jobTitle: string;
  message: string;
  createdAt: string;
}

interface Job {
  id: string;
  title: string;
  status: string;
}

interface InviteFreelancerToJobModalProps {
  freelancerName: string;
  freelancerId: string;
  availableJobs: Job[];
  onClose: () => void;
  onSubmit?: (data: InviteFreelancerData) => Promise<void>;
  isAlreadyInvited?: (jobId: string) => boolean;
}

export const InviteFreelancerToJobModal: FC<InviteFreelancerToJobModalProps> = ({
  freelancerName,
  freelancerId,
  availableJobs,
  onClose,
  onSubmit,
  isAlreadyInvited,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Form state
  const [selectedJobId, setSelectedJobId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const selectedJob = availableJobs.find(job => job.id === selectedJobId);
  const isJobInvited = isAlreadyInvited?.(selectedJobId || '');
  const hasValidJob = selectedJobId && !isJobInvited;

  // Focus trap and keyboard handlers
  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    if (modalRef.current) {
      modalRef.current.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [onClose]);

  // Validate form
  const validateForm = (): boolean => {
    if (!selectedJobId) {
      setError('Please select a job to invite the freelancer to');
      return false;
    }

    if (isJobInvited) {
      setError('This freelancer was already invited to this job');
      return false;
    }

    return true;
  };

  // Handle submission
  const handleSubmit = async () => {
    setError('');

    if (!validateForm()) {
      return;
    }

    const inviteData: InviteFreelancerData = {
      freelancerId,
      freelancerName,
      jobId: selectedJobId,
      jobTitle: selectedJob?.title || '',
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };

    try {
      setLoading(true);
      if (onSubmit) {
        await onSubmit(inviteData);
      }
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="invite-freelancer-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="presentation"
    >
      <motion.div
        ref={modalRef}
        className="invite-freelancer-modal"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        role="dialog"
        aria-labelledby="invite-modal-title"
        aria-describedby="invite-modal-desc"
        aria-modal="true"
        tabIndex={-1}
      >
        {/* Close Button */}
        <motion.button
          className="invite-freelancer-close"
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Close modal"
        >
          <X size={18} />
        </motion.button>

        {/* Header */}
        <div className="invite-freelancer-header">
          <div className="invite-freelancer-title-group">
            <div className="invite-freelancer-icon">
              <BriefcaseBusiness size={24} />
            </div>
            <div>
              <h2 id="invite-modal-title">Invite to Job</h2>
              <p id="invite-modal-desc">Send a job invitation to {freelancerName}</p>
            </div>
          </div>
        </div>

        {/* Success State */}
        <AnimatePresence>
          {success && (
            <motion.div
              className="invite-freelancer-success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <CheckCircle2 size={20} />
              <span>Job invitation sent successfully!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        <AnimatePresence>
          {error && !success && (
            <motion.div
              className="invite-freelancer-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content - Two-column Grid on Desktop */}
        <div className="invite-freelancer-content-grid" ref={contentRef}>
          {/* Left Column */}
          <div className="invite-grid-col">
            {/* Freelancer Info Section */}
            <section className="invite-section">
              <h3 className="invite-section-title">Freelancer Information</h3>
              <motion.div
                className="invite-info-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
              >
                <span className="invite-info-label">Name</span>
                <strong className="invite-info-value">{freelancerName}</strong>
              </motion.div>
            </section>

            {/* Job Selection Section */}
            <section className="invite-section">
              <h3 className="invite-section-title">Select Job</h3>

              {availableJobs.length === 0 ? (
                <motion.div
                  className="invite-empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <AlertCircle size={32} />
                  <p>No open jobs available</p>
                  <span className="invite-empty-hint">Create a job post first to send invitations</span>
                </motion.div>
              ) : (
                <motion.div
                  className="invite-job-selector"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <label htmlFor="job-select" className="invite-label">
                    <span>Choose a job</span>
                  </label>
                  <select
                    id="job-select"
                    className={`invite-select ${selectedJobId ? 'has-value' : ''} ${isJobInvited ? 'is-invited' : ''}`}
                    value={selectedJobId}
                    onChange={(e) => {
                      setSelectedJobId(e.target.value);
                      setError('');
                    }}
                    disabled={loading || success || availableJobs.length === 0}
                  >
                    <option value="">Select an open job...</option>
                    {availableJobs.map(job => (
                      <option key={job.id} value={job.id} disabled={isAlreadyInvited?.(job.id)}>
                        {job.title}
                        {isAlreadyInvited?.(job.id) ? ' (Already invited)' : ''}
                      </option>
                    ))}
                  </select>
                </motion.div>
              )}

              {/* Job Details Preview */}
              <AnimatePresence>
                {selectedJob && (
                  <motion.div
                    className="invite-job-preview"
                    initial={{ opacity: 0, y: 10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -10, height: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  >
                    <div className="invite-job-preview-item">
                      <span className="invite-preview-label">Job Title</span>
                      <p className="invite-preview-value">{selectedJob.title}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Already Invited Warning */}
              <AnimatePresence>
                {selectedJobId && isJobInvited && (
                  <motion.div
                    className="invite-warning-box"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <AlertCircle size={18} />
                    <span>This freelancer was already invited to this job</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </div>

          {/* Right Column */}
          <div className="invite-grid-col">
            {/* Message Section */}
            <section className="invite-section">
              <h3 className="invite-section-title">Optional Message</h3>
              <motion.label
                className="invite-textarea-field"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <span className="invite-label">
                  <span>Add a personal message</span>
                  <span className="invite-char-count">
                    {message.length}/{500}
                  </span>
                </span>
                <textarea
                  className="invite-textarea"
                  placeholder="Tell the freelancer why you think they're a great fit for this job..."
                  value={message}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) {
                      setMessage(e.target.value);
                    }
                  }}
                  disabled={loading || success}
                  rows={4}
                  maxLength={500}
                />
                <span className="invite-textarea-hint">
                  A personal message can increase likelihood of acceptance
                </span>
              </motion.label>
            </section>

            {/* Invitation Details Section */}
            <section className="invite-section">
              <h3 className="invite-section-title">What the Freelancer Will See</h3>
              <motion.div
                className="invite-preview-box"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="invite-preview-item-detail">
                  <span className="invite-preview-label">Notification Type</span>
                  <p className="invite-preview-value">Job Invitation</p>
                </div>
                <div className="invite-preview-item-detail">
                  <span className="invite-preview-label">Available Until</span>
                  <p className="invite-preview-value">7 days from now</p>
                </div>
                <div className="invite-preview-item-detail">
                  <span className="invite-preview-label">Response Options</span>
                  <p className="invite-preview-value">Accept to create a Shortlisted proposal</p>
                </div>
              </motion.div>
            </section>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="invite-freelancer-actions">
          <motion.button
            className="invite-btn cancel-btn"
            onClick={onClose}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
          <motion.button
            className="invite-btn submit-btn"
            onClick={handleSubmit}
            disabled={!hasValidJob || loading || success}
            whileHover={hasValidJob && !loading ? { scale: 1.02 } : {}}
            whileTap={hasValidJob && !loading ? { scale: 0.98 } : {}}
          >
            {loading ? (
              <>
                <motion.div
                  className="invite-spinner"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Send size={18} />
                </motion.div>
                Sending...
              </>
            ) : success ? (
              <>
                <CheckCircle2 size={18} />
                Invitation Sent!
              </>
            ) : (
              <>
                <Send size={18} />
                Send Invitation
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
