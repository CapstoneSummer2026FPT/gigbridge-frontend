import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Upload,
  X,
  File,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Clock,
  ChevronRight,
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

export default function SubmitMilestoneDeliverableScreen() {
  const navigate = useNavigate();
  const { contractId, milestoneId } = useParams<{
    contractId: string;
    milestoneId: string;
  }>();
  const { user } = useApp();

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

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (BR-55)
  const ALLOWED_EXTENSIONS = [
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'zip',
    'rar',
    '7z',
    'jpg',
    'jpeg',
    'png',
    'gif',
    'bmp',
    'mp4',
    'mov',
    'avi',
    'mkv',
    'cs',
    'ts',
    'js',
    'tsx',
    'jsx',
    'java',
    'py',
    'cpp',
    'c',
    'h',
    'txt',
    'md',
  ];

  // Load milestone and contract details
  useEffect(() => {
    const loadData = async () => {
      if (!contractId || !milestoneId) {
        setState((prev) => ({
          ...prev,
          error: 'Missing contract or milestone ID',
          loading: false,
        }));
        return;
      }

      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        const contractResponse = await contractGetAPI.getContractById(contractId);
        if (!contractResponse.success || !contractResponse.data) {
          throw new Error(contractResponse.message || 'Failed to load contract details');
        }
        const contract = contractResponse.data;

        // Verify freelancer ownership
        const userProfileId = (user as { profileId?: string } | null)?.profileId;
        if (userProfileId && contract.freelancerProfilesId !== userProfileId) {
          throw new Error('Unauthorized: You can only submit deliverables for your own contracts');
        }

        // Verify contract status
        if (contract.status !== ContractStatus.Active) {
          throw new Error('Contract must be active to submit deliverables');
        }

        // Load milestone
        const milestoneResponse = await contractGetAPI.getMilestoneById(milestoneId);
        if (!milestoneResponse.success || !milestoneResponse.data) {
          throw new Error(milestoneResponse.message || 'Failed to load milestone details');
        }
        const milestone = milestoneResponse.data;

        // Verify milestone belongs to this contract
        if (milestone.contract_id !== contractId) {
          throw new Error('Milestone does not belong to this contract');
        }

        // Check milestone status - should be awaiting deliverable (Pending status)
        if (!canSubmitMilestoneDeliverable(milestone.status)) {
          throw new Error(
            `Cannot submit deliverables for milestone in ${MilestoneStatus[milestone.status]} status`
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
          error: err instanceof Error ? err.message : 'Failed to load data',
          loading: false,
        }));
      }
    };

    if (user?.id) {
      loadData();
    }
  }, [contractId, milestoneId, user?.id]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setState((prev) => ({ ...prev, error: null }));

    const validationErrors: string[] = [];

    selectedFiles.forEach((file) => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        validationErrors.push(`MSG49: ${file.name} must be under 100MB`);
      }

      // Check file extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
        validationErrors.push(`${file.name} has unsupported file type`);
      }
    });

    if (validationErrors.length > 0) {
      setState((prev) => ({
        ...prev,
        error: validationErrors.join('; '),
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      files: [...prev.files, ...selectedFiles],
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
        error: 'MSG32: Summary must not be empty or only spaces',
      }));
      return;
    }

    if (state.description.trim().length > 5000) {
      setState((prev) => ({
        ...prev,
        error: 'Description must be 5000 characters or less (BR-56)',
      }));
      return;
    }

    if (state.files.length === 0) {
      setState((prev) => ({
        ...prev,
        error: 'Please upload at least one file',
      }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, submitting: true }));

      if (!state.milestone) {
        throw new Error('Milestone not loaded');
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('description', state.description);
      formData.append('deliveryDate', new Date().toISOString());

      // Add files
      state.files.forEach((file) => {
        formData.append('files', file);
      });

      // Submit deliverables
      const response = await contractPostAPI.submitMilestoneDeliverables(
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
          error: response.message || 'Failed to submit deliverables',
          submitting: false,
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'An error occurred while submitting deliverables',
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
            <p>Loading milestone details...</p>
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
            <h2>Unable to Load Milestone</h2>
            <p>{state.error}</p>
            <button onClick={() => navigate(-1)} className="btn-back">
              <ArrowLeft size={18} />
              Go Back
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
            <h2>Milestone Not Found</h2>
            <p>The milestone you're looking for could not be found.</p>
            <button onClick={() => navigate(-1)} className="btn-back">
              <ArrowLeft size={18} />
              Go Back
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
            title="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="header-content">
            <h1 className="page-title">Submit Milestone Deliverables</h1>
            <p className="page-subtitle">
              Upload your work for <strong>{state.contract.title}</strong>
            </p>
          </div>
        </div>

        <div className="submit-milestone-container">
          {/* Success Message */}
          {state.success && (
            <div className="success-banner">
              <CheckCircle2 size={24} />
              <div className="success-content">
                <h3>Deliverables Submitted Successfully!</h3>
                <p>
                  Your deliverables have been submitted to the client for review. You will be
                  notified when they respond.
                </p>
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
                      <span className="detail-label">Milestone Amount</span>
                      <span className="detail-value">
                        {formatContractAmount(state.milestone.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="detail-item">
                    <Calendar size={18} className="detail-icon" />
                    <div className="detail-text">
                      <span className="detail-label">Due Date</span>
                      <span className="detail-value">
                        {formatContractDate(state.milestone.due_date)}
                      </span>
                    </div>
                  </div>

                  {state.milestone.paid_at && (
                    <div className="detail-item">
                      <CheckCircle2 size={18} className="detail-icon success" />
                      <div className="detail-text">
                        <span className="detail-label">Paid On</span>
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
                    <h3 className="form-section-title">Deliverable Details</h3>

                    <div className="form-group">
                      <label htmlFor="description" className="form-label">
                        Deliverable Description
                        <span className="required">*</span>
                      </label>
                      <textarea
                        id="description"
                        value={state.description}
                        onChange={handleDescriptionChange}
                        placeholder="Describe what you're submitting, including any important details, improvements, or notes for the client..."
                        className="form-textarea"
                        maxLength={5000}
                        rows={6}
                        disabled={state.submitting}
                      />
                      <div className="form-hint">
                        <span className="char-count">
                          {state.description.length}/5000
                        </span>
                        <span className="hint-text">Maximum 5000 characters (BR-56)</span>
                      </div>
                    </div>
                  </div>

                  {/* File Upload Section */}
                  <div className="form-section">
                    <h3 className="form-section-title">Upload Files</h3>

                    <div className="file-upload-area">
                      <input
                        ref={fileInputRef}
                        type="file"
                        id="files"
                        multiple
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
                            : `${state.files.length} file${
                                state.files.length !== 1 ? 's' : ''
                              } selected`}
                        </span>
                        <span className="upload-hint">
                          Max 100MB per file (BR-55) • Supports documents, images, code, archives
                        </span>
                      </button>
                    </div>

                    {/* Files List */}
                    {state.files.length > 0 && (
                      <div className="files-list">
                        <div className="files-header">
                          <h4 className="files-title">
                            Attached Files ({state.files.length})
                          </h4>
                          <span className="files-info">
                            {(
                              state.files.reduce((sum, f) => sum + f.size, 0) /
                              (1024 * 1024)
                            ).toFixed(2)}{' '}
                            MB total
                          </span>
                        </div>

                        <div className="files-items">
                          {state.files.map((file, index) => (
                            <div key={`${file.name}-${index}`} className="file-item">
                              <div className="file-info">
                                <File size={18} className="file-icon" />
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
                      <p className="formats-label">Supported file types:</p>
                      <div className="formats-list">
                        <span className="format-badge">Documents</span>
                        <span className="format-badge">Spreadsheets</span>
                        <span className="format-badge">Presentations</span>
                        <span className="format-badge">Images</span>
                        <span className="format-badge">Videos</span>
                        <span className="format-badge">Archives</span>
                        <span className="format-badge">Source Code</span>
                      </div>
                    </div>
                  </div>

                  {/* Submission Confirmation */}
                  <div className="form-section submission-info">
                    <div className="info-box">
                      <Clock size={20} />
                      <div className="info-text">
                        <p className="info-title">Delivery Date & Time</p>
                        <p className="info-detail">
                          Submission will be timestamped for audit trail
                        </p>
                      </div>
                    </div>

                    <div className="info-box">
                      <FileUp size={20} />
                      <div className="info-text">
                        <p className="info-title">Client Notification</p>
                        <p className="info-detail">
                          The client will be notified when you submit your deliverables
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
                      Cancel
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
                          Submitting...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={20} />
                          Submit Deliverables
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
