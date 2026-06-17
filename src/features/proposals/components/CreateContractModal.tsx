import { FC, useState, useRef, useEffect } from 'react';
import { X, FileSignature, BadgeCheck, DollarSign, Clock, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ProposalViewModel } from '../types';
import '../styles/create-contract-modal.css';

export interface ContractData {
  proposalId: string;
  freelancerName: string;
  jobTitle: string;
  proposedBudget: number;
  proposedDuration: string;
  startDate: string;
  endDate: string;
  paymentSchedule: 'fixed' | 'milestone';
  clientSignature: string;
  agreedToTerms: boolean;
  createdAt: string;
  isPremium?: boolean;
  includeNDA?: boolean;
  includeIPTransfer?: boolean;
}

interface CreateContractModalProps {
  proposal: ProposalViewModel;
  onClose: () => void;
  onSubmit?: (contract: ContractData) => Promise<void>;
}

export const CreateContractModal: FC<CreateContractModalProps> = ({
  proposal,
  onClose,
  onSubmit,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Contract state
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [clientSignature, setClientSignature] = useState('');
  const [isSigned, setIsSigned] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Premium legal automation state
  const [isPremium] = useState(true); // Mock: In real app, check from user subscription
  const [includeNDA, setIncludeNDA] = useState(true); // Auto-enabled if Premium
  const [includeIPTransfer, setIncludeIPTransfer] = useState(true); // Auto-enabled if Premium

  // Focus trap: restore focus on close, trap focus within modal
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

  // Calculate end date from duration
  const calculateEndDate = (): string => {
    if (!startDate || !proposal.proposedDuration) return '';
    const start = new Date(startDate);
    const duration = parseInt(proposal.proposedDuration, 10) || 0;
    const end = new Date(start.getTime() + duration * 24 * 60 * 60 * 1000);
    return end.toISOString().split('T')[0];
  };

  const endDate = calculateEndDate();

  const paymentSchedule: ContractData['paymentSchedule'] = 'fixed';

  // Handle signature input
  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setClientSignature(value);
    setIsSigned(value.length > 0);
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    if (!startDate) {
      setError('Please select a start date');
      return false;
    }
    if (!clientSignature) {
      setError('Please sign the contract');
      return false;
    }
    if (!agreedToTerms) {
      setError('You must agree to the terms and conditions');
      return false;
    }
    return true;
  };

  // Handle form submission
  const handleSubmit = async () => {
    setError('');

    if (!validateForm()) {
      return;
    }

    const contractData: ContractData = {
      proposalId: proposal.proposalsId,
      freelancerName: proposal.freelancerName || 'Unknown',
      jobTitle: proposal.jobTitle || 'Untitled Job',
      proposedBudget: proposal.proposedBudget || 0,
      proposedDuration: proposal.proposedDuration || '0',
      startDate,
      endDate: endDate || new Date().toISOString().split('T')[0],
      paymentSchedule,
      clientSignature,
      agreedToTerms: true,
      createdAt: new Date().toISOString(),
      isPremium,
      includeNDA,
      includeIPTransfer,
    };

    try {
      setLoading(true);
      if (onSubmit) {
        await onSubmit(contractData);
      }
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contract');
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="create-contract-overlay"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="presentation"
    >
      <motion.div
        ref={modalRef}
        className="create-contract-modal"
        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
        role="dialog"
        aria-labelledby="contract-modal-title"
        aria-describedby="contract-modal-desc"
        aria-modal="true"
        tabIndex={-1}
      >
        {/* Close Button */}
        <motion.button
          className="create-contract-close"
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <X size={18} />
        </motion.button>

        {/* Header */}
        <div className="create-contract-header">
          <div className="create-contract-title-group">
            <div className="create-contract-icon">
              <FileSignature size={24} />
            </div>
            <div>
              <h2 id="contract-modal-title">Create E-sign Contract</h2>
              <p id="contract-modal-desc">Generate a legal contract for this proposal</p>
            </div>
          </div>
        </div>

        {/* Success State */}
        <AnimatePresence>
          {success && (
            <motion.div
              className="create-contract-success"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <CheckCircle2 size={20} />
              <span>Contract created successfully!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        <AnimatePresence>
          {error && !success && (
            <motion.div
              className="create-contract-error"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content - Scrollable */}
        <div className="create-contract-content" ref={contentRef}>
          {/* Contract Information Section */}
          <section className="contract-section">
            <h3 className="contract-section-title">Contract Information</h3>
            <div className="contract-info-grid">
              <motion.div
                className="contract-info-item"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 }}
              >
                <span>Freelancer Name</span>
                <strong>{proposal.freelancerName || 'Unknown'}</strong>
              </motion.div>
              <motion.div
                className="contract-info-item"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <span>Job Title</span>
                <strong>{proposal.jobTitle || 'Untitled Job'}</strong>
              </motion.div>
              <motion.div
                className="contract-info-item"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <span>Proposed Budget</span>
                <strong>${(proposal.proposedBudget || 0).toLocaleString()}</strong>
              </motion.div>
            </div>
          </section>

          {/* Contract Terms Section */}
          <section className="contract-section">
            <h3 className="contract-section-title">Contract Terms</h3>
            <div className="contract-terms-grid">
              <motion.div
                className="contract-term-item"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="contract-term-label">
                  <Clock size={16} />
                  <span>Duration</span>
                </div>
                <p className="contract-term-value">
                  {proposal.proposedDuration === 'Flexible' || proposal.proposedDuration === '0'
                    ? 'Flexible'
                    : `${proposal.proposedDuration} days`}
                </p>
              </motion.div>

              <motion.div
                className="contract-term-item"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <div className="contract-term-label">
                  <DollarSign size={16} />
                  <span>Total Amount</span>
                </div>
                <p className="contract-term-value">${(proposal.proposedBudget || 0).toLocaleString()}</p>
              </motion.div>

              <motion.div
                className="contract-term-item"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="contract-term-label">
                  <BadgeCheck size={16} />
                  <span>Payment Schedule</span>
                </div>
                <p className="contract-term-value">
                  {paymentSchedule === 'milestone' ? 'Milestone Based' : 'Fixed Price'}
                </p>
              </motion.div>
            </div>
          </section>

          {/* Date Section */}
          <section className="contract-section">
            <h3 className="contract-section-title">Contract Timeline</h3>
            <div className="contract-dates-grid">
              <motion.label
                className="contract-date-input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <span>Start Date</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={loading}
                  min={new Date().toISOString().split('T')[0]}
                />
              </motion.label>

              <motion.div
                className="contract-date-display"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <span>End Date</span>
                <p>{endDate ? new Date(endDate).toLocaleDateString() : 'Calculated from duration'}</p>
              </motion.div>
            </div>
          </section>

          {/* Legal Automation Section - Premium Feature */}
          {isPremium && (
            <section className="contract-section contract-legal-automation-section">
              <div className="legal-automation-header">
                <h3 className="contract-section-title">
                  <BadgeCheck size={18} />
                  Premium Legal Protection
                </h3>
                <span className="premium-badge">Premium</span>
              </div>
              <p className="legal-automation-desc">
                Automatically include legal clauses and apply watermarking to protect your intellectual property.
              </p>

              <div className="legal-clauses-grid">
                {/* NDA Clause */}
                <motion.div
                  className="legal-clause-item"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 }}
                >
                  <label className="clause-checkbox-label">
                    <input
                      type="checkbox"
                      checked={includeNDA}
                      onChange={(e) => setIncludeNDA(e.target.checked)}
                      disabled={loading}
                    />
                    <div className="clause-content">
                      <strong>NDA Clause</strong>
                      <p>Protects confidential information and trade secrets</p>
                    </div>
                  </label>
                  <span className="clause-status">{includeNDA ? '✓ Included' : 'Not included'}</span>
                </motion.div>

                {/* IP Transfer Clause */}
                <motion.div
                  className="legal-clause-item"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                >
                  <label className="clause-checkbox-label">
                    <input
                      type="checkbox"
                      checked={includeIPTransfer}
                      onChange={(e) => setIncludeIPTransfer(e.target.checked)}
                      disabled={loading}
                    />
                    <div className="clause-content">
                      <strong>IP Transfer Agreement</strong>
                      <p>Ensures full ownership transfer upon payment release</p>
                    </div>
                  </label>
                  <span className="clause-status">{includeIPTransfer ? '✓ Included' : 'Not included'}</span>
                </motion.div>
              </div>

              {/* Watermarking Info */}
              <motion.div
                className="watermarking-info"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.38 }}
              >
                <div className="watermark-icon">🔒</div>
                <div className="watermark-content">
                  <h4>File Watermarking</h4>
                  <p>Deliverables will be automatically watermarked until escrow payment is released. Watermarks are removed once payment is confirmed.</p>
                </div>
              </motion.div>
            </section>
          )}

          {/* Non-Premium Message */}
          {!isPremium && (
            <section className="contract-section contract-legal-upgrade-section">
              <div className="upgrade-message">
                <BadgeCheck size={18} />
                <div>
                  <h4>Upgrade to Premium</h4>
                  <p>Unlock legal protection with NDA clauses, IP transfer agreements, and automatic file watermarking.</p>
                </div>
              </div>
            </section>
          )}

          {/* Terms & Conditions Section */}
          <section className="contract-section contract-legal-section">
            <h3 className="contract-section-title">Terms & Conditions</h3>
            <div className="contract-legal-content">
              <p>
                This E-sign Contract establishes a legal agreement between the client and freelancer for the
                services described above. Both parties agree to:
              </p>
              <ul>
                <li>Deliver services as described in the job posting and proposal</li>
                <li>Maintain professional conduct throughout the engagement</li>
                <li>Respect intellectual property rights and confidentiality agreements</li>
                <li>Complete work by the agreed end date or notify of delays</li>
                <li>
                  Follow payment terms: {paymentSchedule === 'milestone' ? 'Payment upon milestone completion' : 'Full payment upon project completion or per milestones'}
                </li>
                <li>Resolve disputes through GigBridge&apos;s dispute resolution process</li>
              </ul>
              <p>
                This agreement is legally binding and enforceable once electronically signed by both parties.
              </p>
            </div>

            {/* Agreement Checkbox */}
            <motion.label
              className={`contract-checkbox-label ${agreedToTerms ? 'checked' : ''}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.45 }}
            >
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                disabled={loading}
              />
              <span>I agree to the terms and conditions above</span>
            </motion.label>
          </section>

          {/* E-sign Section */}
          <section className="contract-section contract-esign-section">
            <h3 className="contract-section-title">Electronic Signature</h3>

            {/* Signature Input */}
            <motion.label
              className="contract-signature-input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <span>Sign here (Type your full name)</span>
              <input
                type="text"
                placeholder="Type your full name to sign"
                value={clientSignature}
                onChange={handleSignatureChange}
                disabled={loading || success}
              />
            </motion.label>

            {/* Signature Preview */}
            <AnimatePresence>
              {isSigned && (
                <motion.div
                  className="contract-signature-preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                >
                  <span className="preview-label">Signature Preview</span>
                  <div className="signature-box">
                    <p className="signature-text">{clientSignature}</p>
                    <span className="signature-date">{new Date().toLocaleDateString()}</span>
                  </div>
                  <span className="status-badge signed">
                    <CheckCircle2 size={14} />
                    Signed
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status Display */}
            {!isSigned && (
              <motion.div
                className="contract-status-badge unsigned"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span>Unsigned</span>
              </motion.div>
            )}
          </section>
        </div>

        {/* Actions Footer */}
        <div className="create-contract-actions">
          <motion.button
            className="contract-btn cancel-btn"
            onClick={onClose}
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            Cancel
          </motion.button>
          <motion.button
            className="contract-btn submit-btn"
            onClick={handleSubmit}
            disabled={!isSigned || !agreedToTerms || loading}
            whileHover={!loading ? { scale: 1.02 } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
          >
            {loading ? 'Creating Contract...' : success ? 'Contract Created!' : 'Create & Send Contract'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
