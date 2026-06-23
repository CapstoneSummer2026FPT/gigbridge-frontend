import { FC, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { X, BriefcaseBusiness, CheckCircle2, AlertCircle, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jobAPI } from '../../../api/jobAPI';
import { jobInvitationAPI } from '../../../api/jobInvitationAPI';
import { JobPostStatus, type GetMyJobPostDto } from '../../../types/models/Job';
import type { JobInvitationDto } from '../../../types/jobInvitation';
import '../styles/invite-freelancer-modal.css';

export interface InviteFreelancerData {
  freelancerId: string;
  freelancerName: string;
  jobId: string;
  jobTitle: string;
  message: string;
  createdAt: string;
}

interface InviteFreelancerToJobModalProps {
  freelancerName: string;
  freelancerId: string;
  onClose: () => void;
  onInvited?: (jobPostIds: string[]) => void;
}

const getInvitationFreelancerProfileId = (invitation: JobInvitationDto): string =>
  invitation.freelancerProfileId ?? invitation.freelancerProfilesId ?? '';

const getInvitationJobPostId = (invitation: JobInvitationDto): string =>
  invitation.jobPostId ?? invitation.jobPostsId ?? '';

export const InviteFreelancerToJobModal: FC<InviteFreelancerToJobModalProps> = ({
  freelancerName,
  freelancerId,
  onClose,
  onInvited,
}) => {
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [availableJobs, setAvailableJobs] = useState<GetMyJobPostDto[]>([]);
  const [alreadyInvitedJobIds, setAlreadyInvitedJobIds] = useState<Set<string>>(new Set());
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const selectedJobs = useMemo(
    () => availableJobs.filter(job => selectedJobIds.includes(job.jobPostsId)),
    [availableJobs, selectedJobIds]
  );
  const hasValidJobs = selectedJobIds.some(jobId => !alreadyInvitedJobIds.has(jobId));

  useEffect(() => {
    const previousActiveElement = document.activeElement as HTMLElement;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    modalRef.current?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    let isMounted = true;

    const loadJobsAndInvitations = async () => {
      try {
        setLoadingJobs(true);
        setError('');

        const [jobsResponse, sentInvitations] = await Promise.all([
          jobAPI.getMyJobPosts({ pageIndex: 1, pageSize: 100 }),
          jobInvitationAPI.getMySentInvitations({ page: 1, pageSize: 100 }),
        ]);

        if (!isMounted) return;

        if (!jobsResponse.success || !jobsResponse.data) {
          throw new Error(jobsResponse.message || 'Unable to load your open job posts.');
        }

        const openJobs = jobsResponse.data.filter(job => Number(job.status) === JobPostStatus.Open);
        setAvailableJobs(openJobs);
        setAlreadyInvitedJobIds(new Set(
          sentInvitations
            .filter(invitation => getInvitationFreelancerProfileId(invitation) === freelancerId)
            .map(getInvitationJobPostId)
            .filter(Boolean)
        ));
      } catch (err) {
        if (!isMounted) return;
        setAvailableJobs([]);
        setAlreadyInvitedJobIds(new Set());
        setError(err instanceof Error ? err.message : 'Unable to load invitation options.');
      } finally {
        if (isMounted) setLoadingJobs(false);
      }
    };

    loadJobsAndInvitations();

    return () => {
      isMounted = false;
    };
  }, [freelancerId]);

  const toggleJob = (jobId: string) => {
    if (alreadyInvitedJobIds.has(jobId) || sending || success) return;
    setSelectedJobIds(prev =>
      prev.includes(jobId)
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
    setError('');
  };

  const goCreateJobPost = () => {
    onClose();
    navigate('/jobs/post');
  };

  const handleSubmit = async () => {
    setError('');

    if (!hasValidJobs) {
      setError('Please select at least one job that has not already been invited.');
      return;
    }

    try {
      setSending(true);
      const result = await jobInvitationAPI.bulkCreateInvitations({
        jobPostIds: selectedJobIds.filter(jobId => !alreadyInvitedJobIds.has(jobId)),
        freelancerProfileIds: [freelancerId],
        message: message.trim() || null,
      });

      const createdJobIds = result.created.map(getInvitationJobPostId).filter(Boolean);
      if (createdJobIds.length === 0) {
        const reason = result.skipped[0]?.reason || 'No invitations were sent.';
        setError(reason);
        return;
      }

      setAlreadyInvitedJobIds(prev => new Set([...prev, ...createdJobIds]));
      setSelectedJobIds([]);
      onInvited?.(createdJobIds);
      setSuccess(true);
      setTimeout(onClose, 1400);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation.');
    } finally {
      setSending(false);
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
        onClick={(event) => event.stopPropagation()}
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
        <motion.button
          className="invite-freelancer-close"
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Close modal"
        >
          <X size={18} />
        </motion.button>

        <div className="invite-freelancer-header">
          <div className="invite-freelancer-title-group">
            <div className="invite-freelancer-icon">
              <BriefcaseBusiness size={24} />
            </div>
            <div>
              <h2 id="invite-modal-title">Invite freelancer to jobs</h2>
              <p id="invite-modal-desc">Send job invitations to {freelancerName}</p>
            </div>
          </div>
        </div>

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

        <div className="invite-freelancer-content-grid" ref={contentRef}>
          <div className="invite-grid-col">
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

            <section className="invite-section">
              <h3 className="invite-section-title">Select Jobs</h3>

              {loadingJobs ? (
                <div className="invite-empty-state">
                  <p>Loading open jobs...</p>
                </div>
              ) : availableJobs.length === 0 ? (
                <motion.div
                  className="invite-empty-state"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <AlertCircle size={32} />
                  <p>No open jobs available</p>
                  <span className="invite-empty-hint">Create a job post first to send invitations</span>
                  <button type="button" className="invite-btn submit-btn" onClick={goCreateJobPost}>
                    Create another JobPost to invite
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  className="invite-job-selector"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <span className="invite-label">Choose one or more jobs</span>
                  <div className="flex flex-col gap-2 mt-2 max-h-56 overflow-y-auto pr-1">
                    {availableJobs.map(job => {
                      const alreadyInvited = alreadyInvitedJobIds.has(job.jobPostsId);
                      const checked = selectedJobIds.includes(job.jobPostsId);

                      return (
                        <label
                          key={job.jobPostsId}
                          className={`invite-info-card cursor-pointer ${alreadyInvited ? 'opacity-60' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={alreadyInvited || sending || success}
                              onChange={() => toggleJob(job.jobPostsId)}
                              className="mt-1"
                            />
                            <div>
                              <strong className="invite-info-value">{job.title}</strong>
                              <span className="invite-info-label block mt-1">
                                {job.categoryName || 'Uncategorized'}
                                {alreadyInvited ? ' - already invited' : ''}
                              </span>
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </section>
          </div>

          <div className="invite-grid-col">
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
                  <span className="invite-char-count">{message.length}/1000</span>
                </span>
                <textarea
                  className="invite-textarea"
                  placeholder="Tell the freelancer why you think they are a great fit..."
                  value={message}
                  onChange={(event) => {
                    if (event.target.value.length <= 1000) {
                      setMessage(event.target.value);
                    }
                  }}
                  disabled={sending || success}
                  rows={5}
                  maxLength={1000}
                />
                <span className="invite-textarea-hint">
                  A short personal note helps the invitation feel intentional.
                </span>
              </motion.label>
            </section>

            <section className="invite-section">
              <h3 className="invite-section-title">Invitation Summary</h3>
              <motion.div
                className="invite-preview-box"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="invite-preview-item-detail">
                  <span className="invite-preview-label">Selected Jobs</span>
                  <p className="invite-preview-value">
                    {selectedJobs.length > 0 ? `${selectedJobs.length} job(s)` : 'None selected'}
                  </p>
                </div>
                <div className="invite-preview-item-detail">
                  <span className="invite-preview-label">Response Options</span>
                  <p className="invite-preview-value">View job, create proposal, or decline</p>
                </div>
                <button
                  type="button"
                  className="invite-btn cancel-btn"
                  onClick={goCreateJobPost}
                  disabled={sending}
                >
                  Create another JobPost to invite
                </button>
              </motion.div>
            </section>
          </div>
        </div>

        <div className="invite-freelancer-actions">
          <motion.button
            className="invite-btn cancel-btn"
            onClick={onClose}
            disabled={sending}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
          <motion.button
            className="invite-btn submit-btn"
            onClick={handleSubmit}
            disabled={!hasValidJobs || loadingJobs || sending || success}
            whileHover={hasValidJobs && !sending ? { scale: 1.02 } : {}}
            whileTap={hasValidJobs && !sending ? { scale: 0.98 } : {}}
          >
            {sending ? (
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
                Invite ({selectedJobIds.filter(jobId => !alreadyInvitedJobIds.has(jobId)).length} JobPost)
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
