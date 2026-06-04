import { useState } from 'react';
import { Upload, Trash2, Download, AlertCircle } from 'lucide-react';

interface CVFile {
  id: string;
  name: string;
  url: string;
  uploadedAt: string;
  size: number;
}

export default function ManageCVContent() {
  const [cvFiles, setCvFiles] = useState<CVFile[]>([
    {
      id: '1',
      name: 'john_doe_resume.pdf',
      url: '#',
      uploadedAt: '2024-01-15',
      size: 245,
    },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format
    const allowedFormats = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedFormats.includes(file.type)) {
      setErrors({ file: 'Only PDF and DOC/DOCX formats are allowed' });
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ file: 'File size must be less than 5MB' });
      return;
    }

    setIsUploading(true);
    // Simulate upload
    setTimeout(() => {
      const reader = new FileReader();
      reader.onload = () => {
        setCvFiles(prev => [
          ...prev,
          {
            id: Date.now().toString(),
            name: file.name,
            url: '#',
            uploadedAt: new Date().toISOString().split('T')[0],
            size: Math.round(file.size / 1024),
          },
        ]);
        setErrors({});
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }, 1000);
  };

  const handleDelete = (id: string) => {
    setCvFiles(prev => prev.filter(cv => cv.id !== id));
    setShowDeleteConfirm(null);
  };

  return (
    <div className="manage-content-section">
      <div className="manage-content-cv-container">
        {/* Upload Section */}
        <div className="manage-content-cv-upload-card glass-card">
          <div className="manage-content-cv-upload-content">
            <Upload size={40} className="text-cyan mb-2" />
            <h2 className="manage-content-cv-upload-title">Upload Your CV/Resume</h2>
            <p className="manage-content-cv-upload-subtitle">
              Add or update your CV to help clients learn more about your background
            </p>

            <label className="manage-content-cv-upload-label">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="hidden"
              />
              <span className={`manage-content-cv-upload-btn ${isUploading ? 'uploading' : ''}`}>
                {isUploading ? 'Uploading...' : 'Choose File'}
              </span>
            </label>

            <p className="manage-content-cv-upload-help">
              Supported formats: PDF, DOC, DOCX (Max 5MB)
            </p>

            {errors.file && (
              <div className="manage-content-cv-error">
                <AlertCircle size={16} />
                <span>{errors.file}</span>
              </div>
            )}
          </div>
        </div>

        {/* Current CV Files */}
        <div className="manage-content-cv-files-container glass-card">
          <h2 className="manage-content-cv-files-title">Your CVs ({cvFiles.length})</h2>

          {cvFiles.length === 0 ? (
            <div className="manage-content-cv-empty-state">
              <p>No CV uploaded yet</p>
              <p className="manage-content-cv-empty-state-hint">
                Upload your first CV above to get started
              </p>
            </div>
          ) : (
            <div className="manage-content-cv-list">
              {cvFiles.map((cv) => (
                <div key={cv.id} className="manage-content-cv-item">
                  <div className="manage-content-cv-item-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>

                  <div className="manage-content-cv-item-info">
                    <div>
                      <p className="manage-content-cv-item-name">{cv.name}</p>
                      <p className="manage-content-cv-item-meta">
                        {cv.size} KB • Uploaded {new Date(cv.uploadedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="manage-content-cv-item-actions">
                    <a
                      href={cv.url}
                      download={cv.name}
                      className="manage-content-cv-action-btn manage-content-cv-action-btn-download"
                      title="Download CV"
                    >
                      <Download size={16} />
                    </a>
                    <button
                      onClick={() => setShowDeleteConfirm(cv.id)}
                      className="manage-content-cv-action-btn manage-content-cv-action-btn-delete"
                      title="Delete CV"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Delete Confirmation */}
                  {showDeleteConfirm === cv.id && (
                    <div className="manage-content-cv-delete-confirm">
                      <AlertCircle size={16} className="text-amber" />
                      <span>Delete this CV?</span>
                      <button
                        onClick={() => handleDelete(cv.id)}
                        className="manage-content-cv-delete-confirm-btn-yes"
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="manage-content-cv-delete-confirm-btn-no"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="manage-content-cv-info glass-card">
          <h3 className="manage-content-cv-info-title">💡 Pro Tips</h3>
          <ul className="manage-content-cv-info-list">
            <li>Keep your CV up to date with recent projects and skills</li>
            <li>Use a clear, professional format for best results</li>
            <li>Include relevant keywords that match your expertise</li>
            <li>Clients often check your CV before sending proposals</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
