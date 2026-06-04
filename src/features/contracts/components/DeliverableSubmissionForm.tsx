import { useState, useRef } from 'react';
import { Upload, X, File, AlertCircle, CheckCircle2 } from 'lucide-react';
import { contractPostAPI } from '../../../api/contractAPI/POST';
import '../styles/deliverable-submission-form.css';

interface DeliverableSubmissionFormProps {
  milestoneId: string;
  contractId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DeliverableSubmissionForm({
  milestoneId,
  contractId,
  onSuccess,
  onCancel,
}: DeliverableSubmissionFormProps) {
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (BR-55)
  const ALLOWED_EXTENSIONS = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
    'zip', 'rar', '7z', 'jpg', 'jpeg', 'png', 'gif', 'mp4', 'mov', 'avi'
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setError(null);

    // Validate files
    const validationErrors: string[] = [];

    selectedFiles.forEach((file) => {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        validationErrors.push(
          `${file.name} exceeds 100MB size limit (BR-55)`
        );
      }

      // Check file extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
        validationErrors.push(
          `${file.name} has unsupported file type`
        );
      }
    });

    if (validationErrors.length > 0) {
      setError(validationErrors.join('; '));
      return;
    }

    setFiles((prevFiles) => [...prevFiles, ...selectedFiles]);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!description.trim()) {
      setError('Please provide a description of your deliverables');
      return;
    }

    if (description.trim().length > 5000) {
      setError('Description must be 5000 characters or less (BR-56)');
      return;
    }

    if (files.length === 0) {
      setError('Please upload at least one file');
      return;
    }

    try {
      setLoading(true);

      // Prepare form data
      const formData = new FormData();
      formData.append('description', description);

      // Add files
      files.forEach((file) => {
        formData.append('files', file);
      });

      // Call API endpoint using the API service
      const response = await contractPostAPI.submitMilestoneDeliverables(milestoneId, formData);

      if (response.success) {
        // Success
        setDescription('');
        setFiles([]);
        onSuccess();
      } else {
        setError(response.message || 'Failed to submit deliverables');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while submitting deliverables');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="deliverable-submission-form-container">
      <div className="deliverable-form-header">
        <h4 className="deliverable-form-title">Submit Deliverables</h4>
        <button
          type="button"
          onClick={onCancel}
          className="deliverable-form-close"
          title="Close"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="deliverable-form">
        {error && (
          <div className="deliverable-error">
            <AlertCircle size={18} />
            <p>{error}</p>
          </div>
        )}

        {/* Description Input */}
        <div className="form-group">
          <label htmlFor="description" className="form-label">
            Deliverable Description
            <span className="required">*</span>
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you're submitting and any important details..."
            className="form-textarea"
            maxLength={5000}
            rows={4}
          />
          <div className="form-hint">
            {description.length}/5000 characters (BR-56: Max 5000 chars)
          </div>
        </div>

        {/* File Upload */}
        <div className="form-group">
          <label htmlFor="files" className="form-label">
            Upload Files
            <span className="required">*</span>
          </label>
          <div className="file-upload-area">
            <input
              ref={fileInputRef}
              type="file"
              id="files"
              multiple
              onChange={handleFileSelect}
              className="file-input-hidden"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="file-upload-button"
              disabled={loading}
            >
              <Upload size={24} />
              <span className="upload-text">Click to upload files or drag & drop</span>
              <span className="upload-hint">Max 100MB per file (BR-55)</span>
            </button>
          </div>

          {/* Files List */}
          {files.length > 0 && (
            <div className="files-list">
              <h5 className="files-list-title">Attached Files ({files.length})</h5>
              <div className="files-items">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="file-item">
                    <div className="file-info">
                      <File size={16} className="file-icon" />
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">
                        ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="file-remove-btn"
                      title="Remove file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-hint">
            Supported formats: PDF, DOC, XLS, PPT, ZIP, Images, Videos, etc.
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button
            type="button"
            onClick={onCancel}
            className="action-btn action-cancel"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="action-btn action-submit"
            disabled={loading || !description.trim() || files.length === 0}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                Submit Deliverables
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default DeliverableSubmissionForm;
