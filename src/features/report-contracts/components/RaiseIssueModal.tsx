import { useState, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import type { Milestone } from '../../../types/models/Contract';
import {
  ContractReportIssueType,
} from '../../../types/models/ReportContract';
import { AlertCircle, X, Loader2, Upload, FileText } from 'lucide-react';
import '../styles/report-contract.css';

interface RaiseIssueModalProps {
  contractId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: {
    issueType: number;
    description: string;
    desiredResolution: string;
    milestoneId?: string | null;
    attachments?: File[];
  }) => Promise<{ success: boolean; message?: string }>;
  isSubmitting: boolean;
}

export function RaiseIssueModal({
  contractId,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: RaiseIssueModalProps) {
  const { t } = useTranslation();
  const [issueType, setIssueType] = useState<number>(ContractReportIssueType.PaymentIssue);
  const [milestoneId, setMilestoneId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [desiredResolution, setDesiredResolution] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestonesLoaded, setMilestonesLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMilestones = async () => {
    if (milestonesLoaded) return;
    try {
      const response = await contractGetAPI.getMilestonesByContract(contractId);
      if (response.success && response.data) {
        setMilestones(response.data);
      }
      setMilestonesLoaded(true);
    } catch {
      // Silently fail - milestone field is optional
      setMilestonesLoaded(true);
    }
  };

  if (!isOpen) return null;

  // Load milestones when modal opens
  if (!milestonesLoaded) {
    void loadMilestones();
  }

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setAttachments((prev) => [...prev, ...Array.from(files)]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setIssueType(ContractReportIssueType.PaymentIssue);
    setMilestoneId('');
    setDescription('');
    setDesiredResolution('');
    setAttachments([]);
    setError(null);
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const trimmedDescription = description.trim();
    const trimmedDesiredResolution = desiredResolution.trim();

    if (!trimmedDescription) {
      setError(t('workspace.reportDescriptionRequired') || 'Description is required.');
      return;
    }

    if (!trimmedDesiredResolution) {
      setError(t('workspace.reportDesiredResolutionRequired') || 'Desired resolution is required.');
      return;
    }

    if (trimmedDescription.length > 5000) {
      setError(t('workspace.reportDescriptionMaxLength') || 'Description must not exceed 5000 characters.');
      return;
    }

    if (trimmedDesiredResolution.length > 5000) {
      setError(t('workspace.reportDesiredResolutionMaxLength') || 'Desired resolution must not exceed 5000 characters.');
      return;
    }

    const result = await onSubmit({
      issueType,
      description: trimmedDescription,
      desiredResolution: trimmedDesiredResolution,
      milestoneId: milestoneId || null,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (result.success) {
      resetForm();
      onClose();
    } else {
      setError(result.message || t('workspace.failedSubmitReportError') || 'Failed to submit report.');
    }
  };

  const issueTypes = [
    { value: ContractReportIssueType.PaymentIssue, label: t('workspace.reportIssueTypePaymentIssue') },
    { value: ContractReportIssueType.MilestoneIssue, label: t('workspace.reportIssueTypeMilestoneIssue') },
    { value: ContractReportIssueType.Delay, label: t('workspace.reportIssueTypeDelay') },
    { value: ContractReportIssueType.PoorQuality, label: t('workspace.reportIssueTypePoorQuality') },
    { value: ContractReportIssueType.CommunicationProblem, label: t('workspace.reportIssueTypeCommunicationProblem') },
    { value: ContractReportIssueType.ScopeChange, label: t('workspace.reportIssueTypeScopeChange') },
    { value: ContractReportIssueType.Other, label: t('workspace.reportIssueTypeOther') },
  ];

  return (
    <div className="rc-modal-backdrop" role="presentation" onClick={handleClose}>
      <div
        className="rc-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rc-raise-issue-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rc-modal-header">
          <div>
            <h3 id="rc-raise-issue-title">{t('workspace.reportCreateTitle')}</h3>
            <p className="rc-modal-subtitle">{t('workspace.reportCreatedDesc')}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rc-icon-button"
            title={t('common.close')}
            disabled={isSubmitting}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rc-form">
          {error && (
            <div className="rc-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="rc-field">
            <label htmlFor="rc-issue-type">{t('workspace.reportIssueType')} *</label>
            <select
              id="rc-issue-type"
              value={issueType}
              onChange={(e) => setIssueType(Number(e.target.value))}
              disabled={isSubmitting}
            >
              {issueTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rc-field">
            <label htmlFor="rc-milestone">{t('workspace.reportRelatedMilestone')}</label>
            <select
              id="rc-milestone"
              value={milestoneId}
              onChange={(e) => setMilestoneId(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">{t('workspace.reportMilestoneNone')}</option>
              {milestones.map((ms) => (
                <option key={ms.id} value={ms.id}>
                  {ms.title}
                </option>
              ))}
            </select>
          </div>

          <div className="rc-field">
            <label htmlFor="rc-description">{t('workspace.reportDescriptionLabel')} *</label>
            <textarea
              id="rc-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={5000}
              rows={4}
              placeholder={t('workspace.reportDescriptionPlaceholder') || 'Describe the issue in detail...'}
              disabled={isSubmitting}
            />
            <span className="rc-count">{description.length}/5000</span>
          </div>

          <div className="rc-field">
            <label htmlFor="rc-desired-resolution">{t('workspace.reportDesiredResolution')} *</label>
            <textarea
              id="rc-desired-resolution"
              value={desiredResolution}
              onChange={(e) => setDesiredResolution(e.target.value)}
              maxLength={5000}
              rows={3}
              placeholder={t('workspace.reportDesiredResolutionPlaceholder')}
              disabled={isSubmitting}
            />
            <span className="rc-count">{desiredResolution.length}/5000</span>
          </div>

          <div className="rc-field">
            <label>{t('workspace.reportEvidence')}</label>
            <p className="rc-hint">{t('workspace.reportEvidenceHint')}</p>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              disabled={isSubmitting}
              multiple
              className="rc-file-input"
            />
            {attachments.length > 0 && (
              <div className="rc-file-list">
                {attachments.map((file, index) => (
                  <div key={index} className="rc-file-item">
                    <FileText size={15} />
                    <span>{file.name}</span>
                    <strong>{(file.size / (1024 * 1024)).toFixed(2)} MB</strong>
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      disabled={isSubmitting}
                      className="rc-file-remove"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rc-actions">
            <button
              type="button"
              className="rc-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="rc-primary"
              disabled={isSubmitting || !description.trim() || !desiredResolution.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="rc-spin" />
                  {t('workspace.submitting')}
                </>
              ) : (
                <>
                  <Upload size={15} />
                  {t('workspace.reportSubmit')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
