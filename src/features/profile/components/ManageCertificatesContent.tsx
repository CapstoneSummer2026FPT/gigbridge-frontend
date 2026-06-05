import { useState } from 'react';
import { Trash2, Edit2, Plus, AlertCircle } from 'lucide-react';

interface Certificate {
  id: string;
  title: string;
  issuer: string;
  issue_date: string;
  expiry_date: string | null;
  credential_url: string;
  image_url: string | null;
}

interface FormData {
  title: string;
  issuer: string;
  issue_date: string;
  expiry_date: string;
  credential_url: string;
  image_url: string;
}

export default function ManageCertificatesContent() {
  const [certificates, setCertificates] = useState<Certificate[]>([
    {
      id: '1',
      title: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      issue_date: '2023-05-15',
      expiry_date: '2025-05-15',
      credential_url: 'https://aws.amazon.com/certification',
      image_url: null,
    },
    {
      id: '2',
      title: 'Google Cloud Professional Data Engineer',
      issuer: 'Google Cloud',
      issue_date: '2023-01-10',
      expiry_date: null,
      credential_url: 'https://cloud.google.com/certification',
      image_url: null,
    },
  ]);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    issuer: '',
    issue_date: '',
    expiry_date: '',
    credential_url: '',
    image_url: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim() || formData.title.length > 255) {
      newErrors.title = 'Title must be 1-255 characters';
    }

    if (!formData.issuer.trim() || formData.issuer.length > 255) {
      newErrors.issuer = 'Issuer must be 1-255 characters';
    }

    if (!formData.issue_date) {
      newErrors.issue_date = 'Issue date is required';
    }

    if (formData.expiry_date && formData.issue_date && formData.expiry_date < formData.issue_date) {
      newErrors.expiry_date = 'Expiry date must be after issue date';
    }

    if (formData.credential_url && !/^https?:\/\/.+/.test(formData.credential_url)) {
      newErrors.credential_url = 'Please enter a valid URL (http/https)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingId) {
      setCertificates(prev =>
        prev.map(cert =>
          cert.id === editingId
            ? {
                ...cert,
                title: formData.title,
                issuer: formData.issuer,
                issue_date: formData.issue_date,
                expiry_date: formData.expiry_date || null,
                credential_url: formData.credential_url,
                image_url: formData.image_url || null,
              }
            : cert
        )
      );
      setEditingId(null);
    } else {
      setCertificates(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          title: formData.title,
          issuer: formData.issuer,
          issue_date: formData.issue_date,
          expiry_date: formData.expiry_date || null,
          credential_url: formData.credential_url,
          image_url: formData.image_url || null,
        },
      ]);
    }

    setFormData({
      title: '',
      issuer: '',
      issue_date: '',
      expiry_date: '',
      credential_url: '',
      image_url: '',
    });
  };

  const handleEdit = (cert: Certificate) => {
    setFormData({
      title: cert.title,
      issuer: cert.issuer,
      issue_date: cert.issue_date,
      expiry_date: cert.expiry_date || '',
      credential_url: cert.credential_url,
      image_url: cert.image_url || '',
    });
    setEditingId(cert.id);
  };

  const handleDelete = (id: string) => {
    setCertificates(prev => prev.filter(cert => cert.id !== id));
    setShowDeleteConfirm(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      title: '',
      issuer: '',
      issue_date: '',
      expiry_date: '',
      credential_url: '',
      image_url: '',
    });
    setErrors({});
  };

  const sortedCertificates = [...certificates].sort(
    (a, b) => new Date(b.issue_date).getTime() - new Date(a.issue_date).getTime()
  );

  return (
    <div className="manage-content-section">
      <div className="manage-content-grid">
        {/* Form */}
        <div className="manage-content-form-container">
          <h2 className="manage-content-form-title">
            {editingId ? 'Edit Certificate' : 'Add Certificate'}
          </h2>

          <form onSubmit={handleSubmit} className="manage-content-form">
            {/* Title */}
            <div className="manage-content-form-group" style={{ gridColumn: 'span 2' }}>
              <label className="manage-content-form-label">Certificate Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={255}
                placeholder="e.g., AWS Solutions Architect"
                className="manage-content-form-input"
              />
              {errors.title && (
                <p className="manage-content-form-error">{errors.title}</p>
              )}
            </div>

            {/* Issuer */}
            <div className="manage-content-form-group" style={{ gridColumn: 'span 2' }}>
              <label className="manage-content-form-label">Issuer *</label>
              <input
                type="text"
                value={formData.issuer}
                onChange={(e) => setFormData({ ...formData, issuer: e.target.value })}
                maxLength={255}
                placeholder="e.g., Amazon Web Services"
                className="manage-content-form-input"
              />
              {errors.issuer && (
                <p className="manage-content-form-error">{errors.issuer}</p>
              )}
            </div>

            {/* Issue Date */}
            <div className="manage-content-form-group">
              <label className="manage-content-form-label">Issue Date *</label>
              <input
                type="date"
                value={formData.issue_date}
                onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
                className="manage-content-form-input"
              />
              {errors.issue_date && (
                <p className="manage-content-form-error">{errors.issue_date}</p>
              )}
            </div>

            {/* Expiry Date */}
            <div className="manage-content-form-group">
              <label className="manage-content-form-label">Expiry Date (Optional)</label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="manage-content-form-input"
              />
              {errors.expiry_date && (
                <p className="manage-content-form-error">{errors.expiry_date}</p>
              )}
            </div>

            {/* Credential URL */}
            <div className="manage-content-form-group" style={{ gridColumn: 'span 2' }}>
              <label className="manage-content-form-label">Credential URL</label>
              <input
                type="url"
                value={formData.credential_url}
                onChange={(e) => setFormData({ ...formData, credential_url: e.target.value })}
                placeholder="https://credentials.example.com"
                className="manage-content-form-input"
              />
              {errors.credential_url && (
                <p className="manage-content-form-error">{errors.credential_url}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="manage-content-form-actions" style={{ gridColumn: 'span 2' }}>
              <button
                type="button"
                onClick={handleCancel}
                className="manage-content-form-btn-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="manage-content-form-btn-submit"
              >
                {editingId ? 'Update' : 'Add'} Certificate
              </button>
            </div>
          </form>
        </div>

        {/* List */}
        <div className="manage-content-list-container">
          <h2 className="manage-content-list-title">
            Certificates ({certificates.length})
          </h2>

          {certificates.length === 0 ? (
            <div className="manage-content-empty-state">
              <Plus size={40} />
              <p>No certificates yet</p>
              <p className="manage-content-empty-state-hint">Add your first certification above</p>
            </div>
          ) : (
            <div className="manage-content-list">
              {sortedCertificates.map((cert) => (
                <div key={cert.id} className="manage-content-item">
                  <div className="manage-content-item-header">
                    <div>
                      <p className="manage-content-item-title">{cert.title}</p>
                      <p className="manage-content-item-subtitle">{cert.issuer}</p>
                      <p className="manage-content-item-date">
                        Issued: {new Date(cert.issue_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {cert.expiry_date && ` • Expires: ${new Date(cert.expiry_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}`}
                      </p>
                    </div>
                    <div className="manage-content-item-actions">
                      <button
                        onClick={() => handleEdit(cert)}
                        className="manage-content-item-btn manage-content-item-btn-edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(cert.id)}
                        className="manage-content-item-btn manage-content-item-btn-delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {cert.credential_url && (
                    <a
                      href={cert.credential_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="manage-content-item-link"
                    >
                      View Credential →
                    </a>
                  )}

                  {/* Delete Confirmation */}
                  {showDeleteConfirm === cert.id && (
                    <div className="manage-content-delete-confirm">
                      <AlertCircle size={16} className="text-amber" />
                      <span>Delete this certificate?</span>
                      <button
                        onClick={() => handleDelete(cert.id)}
                        className="manage-content-delete-confirm-btn-yes"
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="manage-content-delete-confirm-btn-no"
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
      </div>
    </div>
  );
}
