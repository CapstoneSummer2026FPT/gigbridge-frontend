import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Upload,
  X,
  File as FileIcon,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  FileUp,
  ArrowLeft,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import { useApp } from '../../../app/providers/AppProvider';
import type { ContractDto, Milestone } from '../../../types/models/Contract';
import { ContractStatus, MilestoneStatus } from '../../../types/models/Contract';
import {
  formatContractAmount,
  formatContractDate,
  canSubmitMilestoneDeliverable,
} from '../../../shared/utils/contractUtils';
import { useTranslation } from '../../../hooks/useTranslation';
import '../styles/submit-milestone-deliverable-screen.css';
import { GigCoinLogo } from '../../../shared/components/GigCoinAmount';

interface SubmissionState {
  milestone: Milestone | null;
  contract: ContractDto | null;
  description: string;
  files: File[];
  loading: boolean;
  error: string | null;
  success: boolean;
  submitting: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'csv',
  'json',
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'mp3',
  'wav',
  'mp4',
  'webm',
]);
const FILE_ACCEPT = Array.from(ALLOWED_EXTENSIONS, extension => `.${extension}`).join(',');

export default function SubmitMilestoneDeliverableScreen() {
  const navigate = useNavigate();
  const { contractId, milestoneId } = useParams<{
    contractId: string;
    milestoneId: string;
  }>();
  const { user } = useApp();
  const {t} = useTranslation();

  const [state, setState] = useState<SubmissionState>({
    milestone: null,
    contract: null,
    description: '',
    files: [],
    loading: true,
    error: null,
    success: false,
    submitting: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load milestone and contract details
  useEffect(() => {
    const loadData = async () => {
      if (!contractId || !milestoneId) {
        setState((prev) => ({
          ...prev,
          error: t('contracts.contractNotFound'),
          loading: false,
        }));
        return;
      }

      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const contractResponse = await contractGetAPI.getContractById(contractId);
        if (!contractResponse.success || !contractResponse.data) {
          throw new Error(contractResponse.message || t('contracts.loadingContract'));
        }
        const contract = contractResponse.data;

        // Verify freelancer ownership
        const userProfileId = (user as { profileId?: string } | null)?.profileId;
        if (userProfileId && contract.freelancerProfilesId !== userProfileId) {
          throw new Error(t('contracts.unauthorizedSubmitContract', { defaultValue: 'Unauthorized: You can only submit deliverables for your own contracts' }));
        }

        // Verify contract status
        if (contract.status !== ContractStatus.Active) {
          throw new Error(t('contracts.activeContractRequired', { defaultValue: 'Contract must be active to submit deliverables' }));
        }

        // Load milestone
        const milestoneResponse = await contractGetAPI.getMilestoneById(contractId, milestoneId);
        if (!milestoneResponse.success || !milestoneResponse.data) {
          throw new Error(milestoneResponse.message || t('contracts.loadingMilestone', { defaultValue: 'Failed to load milestone details' }));
        }
        const milestone = milestoneResponse.data;

        // Verify milestone belongs to this contract
        if (milestone.contract_id !== contractId) {
          throw new Error(t('contracts.milestoneWrongContract', { defaultValue: 'Milestone does not belong to this contract' }));
        }

        // Check milestone status - should be awaiting deliverable (Pending status)
        if (!canSubmitMilestoneDeliverable(milestone.status)) {
          throw new Error(
            t('contracts.milestoneStatusNotAllowed', { status: MilestoneStatus[milestone.status], defaultValue: `Cannot submit deliverables for milestone in ${MilestoneStatus[milestone.status]} status` })
          );
        }

        setState((prev) => ({
          ...prev,
          milestone,
          contract,
          loading: false,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err.message : t('contracts.loadingMilestone', { defaultValue: 'Failed to load data' }),
          loading: false,
        }));
      }
    };

    if (user?.id) {
      loadData();
    }
  }, [contractId, milestoneId, user?.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setState((prev) => ({ ...prev, error: null }));

    if (!selectedFile) return;

    const validationErrors: string[] = [];

    if (selectedFile.size > MAX_FILE_SIZE) {
      validationErrors.push(t('contracts.fileSizeError', { name: selectedFile.name, defaultValue: `MSG49: ${selectedFile.name} must be under 10MB` }));
    }

    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
      validationErrors.push(t('contracts.fileTypeError', { name: selectedFile.name, defaultValue: `${selectedFile.name} has unsupported file type` }));
    }

    if (validationErrors.length > 0) {
      setState((prev) => ({
        ...prev,
        error: validationErrors.join('; '),
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      files: [selectedFile],
    }));

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setState((prev) => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index),
    }));
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState((prev) => ({
      ...prev,
      description: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState((prev) => ({ ...prev, error: null }));

    // Validation
    if (!state.description.trim()) {
      setState((prev) => ({
        ...prev,
        error: t('contracts.summaryRequired', { defaultValue: 'Summary must not be empty' }),
      }));
      return;
    }

    if (state.description.trim().length > 5000) {
      setState((prev) => ({
        ...prev,
        error: t('contracts.descriptionMaxLength', { defaultValue: 'Description must be 5000 characters or less' }),
      }));
      return;
    }

    if (state.files.length === 0) {
      setState((prev) => ({
        ...prev,
        error: t('contracts.uploadAtLeastOne', { defaultValue: 'Please upload at least one file' }),
      }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, submitting: true }));

      if (!state.milestone || !contractId) {
        throw new Error(t('contracts.milestoneNotFound'));
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('description', state.description);
      formData.append('deliveryDate', new Date().toISOString());

      formData.append('files', state.files[0]);

      // Submit deliverables
      const response = await contractPostAPI.submitMilestone(
        contractId,
        state.milestone.id,
        formData
      );

      if (response.success) {
        setState((prev) => ({
          ...prev,
          success: true,
          description: '',
          files: [],
          submitting: false,
        }));

        // Redirect to contract view after success
        setTimeout(() => {
          navigate(`/contracts/${contractId}`, {
            state: { tab: 'milestones', role: 'freelancer' },
          });
        }, 2000);
      } else {
        setState((prev) => ({
          ...prev,
          error: response.message || t('contracts.signingFailed'),
          submitting: false,
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : t('contracts.signingFailed'),
        submitting: false,
      }));
    }
  };

  if (state.loading) {
    return (
      <AppLayout>
        <div className="submit-milestone-wrapper">
          <div className="loading-container">
            <div className="spinner"></div>
            <p>{t('contracts.loadingMilestone', { defaultValue: 'Loading milestone details...' })}</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (state.error && !state.milestone) {
    return (
      <AppLayout>
        <div className="submit-milestone-wrapper">
          <div className="error-full-page">
            <AlertCircle size={48} />
            <h2>{t('contracts.unableToLoadMilestone')}</h2>
            <p>{state.error}</p>
            <button onClick={() => navigate(-1)} className="btn-back">
              <ArrowLeft size={18} />
              {t('contracts.back')}
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!state.milestone || !state.contract) {
    return (
      <AppLayout>
        <div className="submit-milestone-wrapper">
          <div className="error-full-page">
            <AlertCircle size={48} />
            <h2>{t('contracts.milestoneNotFound')}</h2>
            <p>{t('contracts.milestoneNotFound')}</p>
            <button onClick={() => navigate(-1)} className="btn-back">
              <ArrowLeft size={18} />
              {t('contracts.back')}
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="submit-milestone-wrapper">
        {/* Header */}
        <div className="submit-milestone-header">
          <button
            onClick={() => navigate(-1)}
            className="back-button"
            title={t('contracts.back')}
          >
            <ArrowLeft size={20} />
          </button>
          <div className="header-content">
            <h1 className="page-title">{t('contracts.submitMilestoneDeliverables')}</h1>
            <p className="page-subtitle">
              {t('contracts.uploadWorkFor')} <strong>{state.contract.title}</strong>
            </p>
          </div>
        </div>

        <div className="submit-milestone-container">
          {/* Success Message */}
          {state.success && (
            <div className="success-banner">
              <CheckCircle2 size={24} />
              <div className="success-content">
                <h3>{t('contracts.deliverablesSubmitted')}</h3>
                <p>{t('contracts.deliverablesSubmittedDesc')}</p>
              </div>
            </div>
          )}

          {/* Main Content */}
          {!state.success && (
            <div className="submit-milestone-content">
              {/* Milestone Info Card */}
              <div className="milestone-info-card glass-card">
                <div className="milestone-header">
                  <h2 className="milestone-title">{state.milestone.title}</h2>
                  <span className="milestone-status">
                    {MilestoneStatus[state.milestone.status]}
                  </span>
                </div>

                <div className="milestone-details">
                  <div className="detail-item">
                    <GigCoinLogo size={18} />
                    <div className="detail-text">
                      <span className="detail-label">{t('contracts.milestoneAmount')}</span>
                      <span className="detail-value">
                        {formatContractAmount(state.milestone.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="detail-item">
                    <Calendar size={18} className="detail-icon" />
                    <div className="detail-text">
                      <span className="detail-label">{t('contracts.dueDate')}</span>
                      <span className="detail-value">
                        {formatContractDate(state.milestone.due_date)}
                      </span>
                    </div>
                  </div>

                  {state.milestone.paid_at && (
                    <div className="detail-item">
                      <CheckCircle2 size={18} className="detail-icon success" />
                      <div className="detail-text">
                        <span className="detail-label">{t('contracts.paidOn')}</span>
                        <span className="detail-value">
                          {formatContractDate(state.milestone.paid_at)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submission Form */}
              <div className="submission-form-card glass-card">
                {/* Error Message */}
                {state.error && (
                  <div className="error-message-banner">
                    <AlertCircle size={20} />
                    <p>{state.error}</p>
                    <button
                      onClick={() => setState((prev) => ({ ...prev, error: null }))}
                      className="error-close"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="deliverable-form">
                  {/* Description Section */}
                  <div className="form-section">
                    <h3 className="form-section-title">{t('contracts.deliverableDetails')}</h3>

                    <div className="form-group">
                      <label htmlFor="description" className="form-label">
                        {t('contracts.deliverableDesc')}
                        <span className="required">*</span>
                      </label>
                      <textarea
                        id="description"
                        value={state.description}
                        onChange={handleDescriptionChange}
                        placeholder={t('contracts.deliverablePlaceholder')}
                        className="form-textarea"
                        maxLength={5000}
                        rows={6}
                        disabled={state.submitting}
                      />
                      <div className="form-hint">
                        <span className="char-count">
                          {state.description.length}/5000
                        </span>
                        <span className="hint-text">{t('contracts.max5000Chars')}</span>
                      </div>
                    </div>
                  </div>

                  {/* File Upload Section */}
                  <div className="form-section">
                    <h3 className="form-section-title">{t('contracts.uploadFiles')}</h3>

                    <div className="file-upload-area">
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="files"
                        accept={FILE_ACCEPT}
                        onChange={handleFileSelect}
                        className="file-input-hidden"
                        disabled={state.submitting}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="file-upload-button"
                        disabled={state.submitting}
                      >
                        <Upload size={32} />
                        <span className="upload-text">
                          {state.files.length === 0
                            ? 'Click to upload or drag & drop'
                            : state.files[0].name}
                        </span>
                        <span className="upload-hint">
                          {t('contracts.max10Mb')}
                        </span>
                      </button>
                    </div>

                    {/* Files List */}
                    {state.files.length > 0 && (
                      <div className="files-list">
                        <div className="files-header">
                          <h4 className="files-title">
                            {t('contracts.attachedFiles', { count: state.files.length })}
                          </h4>
                          <span className="files-info">
                            {t('contracts.totalMb', { count: (state.files.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024)).toFixed(2) })}
                          </span>
                        </div>

                        <div className="files-items">
                          {state.files.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="file-item">
                              <div className="file-info">
                                <FileIcon size={18} className="file-icon" />
                                <div className="file-details">
                                  <span className="file-name">{file.name}</span>
                                  <span className="file-size">
                                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                                  </span>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveFile(index)}
                                className="file-remove-btn"
                                title="Remove file"
                                disabled={state.submitting}
                              >
                                <X size={18} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="supported-formats">
                      <p className="formats-label">{t('contracts.supportedFormats')}</p>
                      <div className="formats-list">
                        <span className="format-badge">{t('contracts.documents')}</span>
                        <span className="format-badge">{t('contracts.spreadsheets')}</span>
                        <span className="format-badge">{t('contracts.presentations')}</span>
                        <span className="format-badge">{t('contracts.images')}</span>
                        <span className="format-badge">{t('contracts.videos')}</span>
                        <span className="format-badge">{t('contracts.archives')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Submission Confirmation */}
                  <div className="form-section submission-info">
                    <div className="info-box">
                      <Clock size={20} />
                      <div className="info-text">
                        <p className="info-title">{t('contracts.deliveryDateTime')}</p>
                        <p className="info-detail">
                          {t('contracts.deliveryDateTimeDesc')}
                        </p>
                      </div>
                    </div>

                    <div className="info-box">
                      <FileUp size={20} />
                      <div className="info-text">
                        <p className="info-title">{t('contracts.clientNotification')}</p>
                        <p className="info-detail">
                          {t('contracts.clientNotificationDesc')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="form-actions">
                    <button
                      type="button"
                      onClick={() => navigate(-1)}
                      className="action-btn action-cancel"
                      disabled={state.submitting}
                    >
                      {t('contracts.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="action-btn action-submit"
                      disabled={
                        state.submitting ||
                        !state.description.trim() ||
                        state.files.length === 0
                      }
                    >
                      {state.submitting ? (
                        <>
                          <span className="spinner-small"></span>
                          {t('contracts.submitting')}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={20} />
                          {t('contracts.submitDeliverables')}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
