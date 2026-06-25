import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Trash2, Edit2, ArrowLeft, Upload, X, Award } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import '../styles/manage-certifications-portfolio-screen.css';

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  project_url: string;
  image_url: string;
  file_name?: string;
}

interface Certificate {
  id: string;
  title: string;
  issuer: string;
  issue_date: string;
  expiry_date: string | null;
  credential_url: string;
  image_url?: string;
}

interface PortfolioFormData {
  title: string;
  description: string;
  project_url: string;
  image?: File | null;
}

interface CertificateFormData {
  title: string;
  issuer: string;
  issue_date: string;
  expiry_date: string;
  credential_url: string;
  image?: File | null;
}

const INITIAL_PORTFOLIO_FORM: PortfolioFormData = {
  title: '',
  description: '',
  project_url: '',
  image: null,
};

const INITIAL_CERTIFICATE_FORM: CertificateFormData = {
  title: '',
  issuer: '',
  issue_date: '',
  expiry_date: '',
  credential_url: '',
  image: null,
};

const ALLOWED_FORMATS = ['image/jpeg', 'image/png', 'image/gif'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_ITEMS = 20;

export default function ManageCertificationsPortfolioScreen() {
  const navigate = useNavigate();
  
  // Portfolio State
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([
    {
      id: '1',
      title: 'E-Commerce Platform',
      description: 'Full-stack e-commerce solution with payment integration and real-time inventory management.',
      project_url: 'https://example.com/ecommerce',
      image_url: 'https://images.unsplash.com/photo-1460925895917-aaf4f1f1c5ce?w=500&h=400&fit=crop',
    },
    {
      id: '2',
      title: 'SaaS Dashboard',
      description: 'Analytics dashboard built with React and TypeScript for real-time data visualization.',
      project_url: 'https://example.com/dashboard',
      image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500&h=400&fit=crop',
    },
  ]);

  // Certificate State
  const [certificates, setCertificates] = useState<Certificate[]>([
    {
      id: 'cert1',
      title: 'AWS Certified Solutions Architect',
      issuer: 'Amazon Web Services',
      issue_date: '2023-05-15',
      expiry_date: '2025-05-15',
      credential_url: 'https://aws.amazon.com/certification',
    },
    {
      id: 'cert2',
      title: 'Google Cloud Professional Data Engineer',
      issuer: 'Google Cloud',
      issue_date: '2023-01-10',
      expiry_date: null,
      credential_url: 'https://cloud.google.com/certification',
    },
  ]);

  // Portfolio Form State
  const [portfolioFormData, setPortfolioFormData] = useState<PortfolioFormData>(INITIAL_PORTFOLIO_FORM);
  const [portfolioEditingId, setPortfolioEditingId] = useState<string | null>(null);
  const [portfolioImagePreview, setPortfolioImagePreview] = useState<string | null>(null);
  const [portfolioErrors, setPortfolioErrors] = useState<Record<string, string>>({});
  const [portfolioDeleteConfirm, setPortfolioDeleteConfirm] = useState<string | null>(null);

  // Certificate Form State
  const [certFormData, setCertFormData] = useState<CertificateFormData>(INITIAL_CERTIFICATE_FORM);
  const [certEditingId, setCertEditingId] = useState<string | null>(null);
  const [certImagePreview, setCertImagePreview] = useState<string | null>(null);
  const [certErrors, setCertErrors] = useState<Record<string, string>>({});
  const [certDeleteConfirm, setCertDeleteConfirm] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState('');

  // Portfolio Validation
  const validatePortfolioForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!portfolioFormData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (portfolioFormData.title.trim().length > 255) {
      newErrors.title = 'Title cannot exceed 255 characters';
    } else if (/^\s+$/.test(portfolioFormData.title)) {
      newErrors.title = 'Title cannot be all spaces';
    }

    if (portfolioFormData.description.length > 2000) {
      newErrors.description = 'Description cannot exceed 2000 characters';
    }

    if (portfolioFormData.project_url) {
      try {
        new URL(portfolioFormData.project_url);
      } catch {
        newErrors.project_url = 'Please enter a valid URL';
      }
    }

    if (portfolioFormData.image) {
      if (!ALLOWED_FORMATS.includes(portfolioFormData.image.type)) {
        newErrors.image = 'Only JPG, PNG, GIF, or PDF formats are allowed';
      } else if (portfolioFormData.image.size > MAX_FILE_SIZE) {
        newErrors.image = 'File size cannot exceed 4MB';
      }
    }

    setPortfolioErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Certificate Validation
  const validateCertificateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!certFormData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (certFormData.title.trim().length > 255) {
      newErrors.title = 'Title cannot exceed 255 characters';
    } else if (/^\s+$/.test(certFormData.title)) {
      newErrors.title = 'Title cannot be all spaces';
    }

    if (!certFormData.issuer.trim()) {
      newErrors.issuer = 'Issuer is required';
    } else if (certFormData.issuer.trim().length > 255) {
      newErrors.issuer = 'Issuer cannot exceed 255 characters';
    }

    if (!certFormData.issue_date) {
      newErrors.issue_date = 'Issue date is required';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(certFormData.issue_date)) {
      newErrors.issue_date = 'Please enter a valid date (YYYY-MM-DD)';
    }

    if (certFormData.expiry_date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(certFormData.expiry_date)) {
        newErrors.expiry_date = 'Please enter a valid date (YYYY-MM-DD)';
      } else if (certFormData.expiry_date < certFormData.issue_date) {
        newErrors.expiry_date = 'Expiry date must be after issue date';
      }
    }

    if (!certFormData.credential_url) {
      newErrors.credential_url = 'Credential URL is required';
    } else {
      try {
        new URL(certFormData.credential_url);
      } catch {
        newErrors.credential_url = 'Please enter a valid URL';
      }
    }

    if (certFormData.image) {
      if (!ALLOWED_FORMATS.includes(certFormData.image.type)) {
        newErrors.image = 'Only JPG, PNG, GIF formats are allowed';
      } else if (certFormData.image.size > MAX_FILE_SIZE) {
        newErrors.image = 'File size cannot exceed 4MB';
      }
    }

    setCertErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getErrorMessage = (errorCode: string): string => {
    const messages: Record<string, string> = {
      'MSG28': 'Please enter a valid date (yyyy-MM-dd)',
      'MSG31': '255 characters only, please!',
      'MSG32': 'The field cannot be all spaces',
      'MSG35': 'This field is required',
      'MSG48': 'Only JPG, PNG, GIF formats are allowed',
      'MSG49': 'File must be under 10MB',
    };
    return messages[errorCode] || 'Invalid input';
  };

  // Portfolio Handlers
  const handlePortfolioInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPortfolioFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (portfolioErrors[name]) {
      setPortfolioErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handlePortfolioImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPortfolioFormData(prev => ({
        ...prev,
        image: file,
      }));

      const reader = new FileReader();
      reader.onload = (event) => {
        setPortfolioImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      if (portfolioErrors.image) {
        setPortfolioErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.image;
          return newErrors;
        });
      }
    }
  };

  const handlePortfolioSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validatePortfolioForm()) return;

    if (portfolioEditingId) {
      setPortfolioItems(portfolioItems.map(item =>
        item.id === portfolioEditingId
          ? {
              ...item,
              title: portfolioFormData.title,
              description: portfolioFormData.description,
              project_url: portfolioFormData.project_url,
              image_url: portfolioImagePreview || item.image_url,
            }
          : item
      ));
      setSuccessMessage('Portfolio item updated successfully!');
    } else {
      const newItem: PortfolioItem = {
        id: Date.now().toString(),
        title: portfolioFormData.title,
        description: portfolioFormData.description,
        project_url: portfolioFormData.project_url,
        image_url: portfolioImagePreview || 'https://images.unsplash.com/photo-1555421692-2e6291ff3b3c?w=500&h=400&fit=crop',
      };
      setPortfolioItems([newItem, ...portfolioItems]);
      setSuccessMessage('Portfolio item added successfully!');
    }

    setPortfolioFormData(INITIAL_PORTFOLIO_FORM);
    setPortfolioImagePreview(null);
    setPortfolioEditingId(null);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handlePortfolioDelete = (id: string) => {
    setPortfolioItems(portfolioItems.filter(item => item.id !== id));
    setPortfolioDeleteConfirm(null);
    setSuccessMessage('Portfolio item deleted successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handlePortfolioEditClick = (item: PortfolioItem) => {
    setPortfolioFormData({
      title: item.title,
      description: item.description,
      project_url: item.project_url,
      image: null,
    });
    setPortfolioImagePreview(item.image_url);
    setPortfolioEditingId(item.id);
    setPortfolioErrors({});
  };

  // Certificate Handlers
  const handleCertInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCertFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    if (certErrors[name]) {
      setCertErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCertImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertFormData(prev => ({
        ...prev,
        image: file,
      }));

      const reader = new FileReader();
      reader.onload = (event) => {
        setCertImagePreview(event.target?.result as string);
      };
      reader.readAsDataURL(file);

      if (certErrors.image) {
        setCertErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.image;
          return newErrors;
        });
      }
    }
  };

  const handleCertSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateCertificateForm()) return;

    if (certEditingId) {
      setCertificates(certificates.map(cert =>
        cert.id === certEditingId
          ? {
              ...cert,
              title: certFormData.title,
              issuer: certFormData.issuer,
              issue_date: certFormData.issue_date,
              expiry_date: certFormData.expiry_date || null,
              credential_url: certFormData.credential_url,
              image_url: certImagePreview || cert.image_url,
            }
          : cert
      ));
      setSuccessMessage('Certificate updated successfully!');
    } else {
      const newCert: Certificate = {
        id: 'cert_' + Date.now().toString(),
        title: certFormData.title,
        issuer: certFormData.issuer,
        issue_date: certFormData.issue_date,
        expiry_date: certFormData.expiry_date || null,
        credential_url: certFormData.credential_url,
        image_url: certImagePreview || undefined,
      };
      setCertificates([newCert, ...certificates]);
      setSuccessMessage('Certificate added successfully!');
    }

    setCertFormData(INITIAL_CERTIFICATE_FORM);
    setCertImagePreview(null);
    setCertEditingId(null);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCertDelete = (id: string) => {
    setCertificates(certificates.filter(cert => cert.id !== id));
    setCertDeleteConfirm(null);
    setSuccessMessage('Certificate deleted successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleCertEditClick = (cert: Certificate) => {
    setCertFormData({
      title: cert.title,
      issuer: cert.issuer,
      issue_date: cert.issue_date,
      expiry_date: cert.expiry_date || '',
      credential_url: cert.credential_url,
      image: null,
    });
    setCertImagePreview(cert.image_url || null);
    setCertEditingId(cert.id);
    setCertErrors({});
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <AppLayout>
      <div className="manage-portfolio-wrapper">
        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="manage-portfolio-header">
            <button onClick={() => navigate(-1)} className="manage-portfolio-back-btn">
              <ArrowLeft size={20} />
            </button>
            <h1>Manage Certifications & Portfolio</h1>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="manage-portfolio-success-message">
              ✓ {successMessage}
            </div>
          )}

          {/* ===== PORTFOLIO SECTION ===== */}
          <div className="manage-portfolio-section">
            <h2 className="manage-portfolio-section-title">Portfolio</h2>
            
            <div className="manage-portfolio-container">
              {/* Portfolio Form */}
              <div className="manage-portfolio-form-section glass-card">
                <h3>{portfolioEditingId ? 'Edit Portfolio Item' : 'Add New Portfolio Item'}</h3>

                <form onSubmit={handlePortfolioSubmit} className="manage-portfolio-form">
                  <div className="manage-portfolio-form-group">
                    <label>Project Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={portfolioFormData.title}
                      onChange={handlePortfolioInputChange}
                      placeholder="e.g., E-Commerce Platform"
                      maxLength={255}
                      className={portfolioErrors.title ? 'error' : ''}
                    />
                    <div className="manage-portfolio-char-count">
                      {portfolioFormData.title.length}/255
                    </div>
                    {portfolioErrors.title && (
                      <span className="manage-portfolio-error">
                        {getErrorMessage(portfolioErrors.title)}
                      </span>
                    )}
                  </div>

                  <div className="manage-portfolio-form-group">
                    <label>Description</label>
                    <textarea
                      name="description"
                      value={portfolioFormData.description}
                      onChange={handlePortfolioInputChange}
                      placeholder="Describe your project, technologies used, and key features..."
                      maxLength={2000}
                      className={portfolioErrors.description ? 'error' : ''}
                    />
                    <div className="manage-portfolio-char-count">
                      {portfolioFormData.description.length}/2000
                    </div>
                    {portfolioErrors.description && (
                      <span className="manage-portfolio-error">
                        {portfolioErrors.description}
                      </span>
                    )}
                  </div>

                  <div className="manage-portfolio-form-group">
                    <label>Project URL (Optional)</label>
                    <input
                      type="url"
                      name="project_url"
                      value={portfolioFormData.project_url}
                      onChange={handlePortfolioInputChange}
                      placeholder="https://example.com/project"
                      className={portfolioErrors.project_url ? 'error' : ''}
                    />
                    {portfolioErrors.project_url && (
                      <span className="manage-portfolio-error">
                        {portfolioErrors.project_url}
                      </span>
                    )}
                  </div>

                  <div className="manage-portfolio-form-group">
                    <label>Portfolio Image (JPG/PNG/GIF, Max 10MB)</label>
                    <div className="manage-portfolio-file-input-wrapper">
                      {portfolioImagePreview ? (
                        <div className="manage-portfolio-image-preview">
                          <img src={portfolioImagePreview} alt="Preview" />
                          <button
                            type="button"
                            onClick={() => {
                              setPortfolioImagePreview(null);
                              setPortfolioFormData(prev => ({ ...prev, image: null }));
                            }}
                            className="manage-portfolio-remove-image"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <label className="manage-portfolio-file-label">
                          <Upload size={24} />
                          <span>Click to upload image</span>
                          <input
                            type="file"
                            onChange={handlePortfolioImageChange}
                            accept=".jpg,.jpeg,.png,.gif"
                            hidden
                          />
                        </label>
                      )}
                    </div>
                    {portfolioErrors.image && (
                      <span className="manage-portfolio-error">
                        {getErrorMessage(portfolioErrors.image)}
                      </span>
                    )}
                  </div>

                  <div className="manage-portfolio-form-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setPortfolioFormData(INITIAL_PORTFOLIO_FORM);
                        setPortfolioImagePreview(null);
                        setPortfolioEditingId(null);
                        setPortfolioErrors({});
                      }}
                      className="manage-portfolio-button-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={portfolioItems.length >= MAX_ITEMS && !portfolioEditingId}
                      className="manage-portfolio-button-submit"
                    >
                      {portfolioEditingId ? 'Update' : 'Add'} Item
                    </button>
                  </div>
                </form>
              </div>

              {/* Portfolio Grid */}
              <div className="manage-portfolio-grid-section">
                <h3>Your Portfolio ({portfolioItems.length}/{MAX_ITEMS})</h3>

                {portfolioItems.length === 0 ? (
                  <div className="manage-portfolio-empty">
                    <p>No portfolio items yet.</p>
                    <button
                      onClick={() => {
                        setPortfolioFormData(INITIAL_PORTFOLIO_FORM);
                        setPortfolioEditingId(null);
                        setPortfolioErrors({});
                      }}
                      className="manage-portfolio-add-button"
                    >
                      <Plus size={16} /> Add Your First Item
                    </button>
                  </div>
                ) : (
                  <div className="manage-portfolio-grid">
                    {portfolioItems.map(item => (
                      <div key={item.id} className="manage-portfolio-card glass-card">
                        <div className="manage-portfolio-card-image">
                          <img src={item.image_url} alt={item.title} />
                          <div className="manage-portfolio-card-actions">
                            <button
                              onClick={() => handlePortfolioEditClick(item)}
                              className="manage-portfolio-edit-btn"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setPortfolioDeleteConfirm(item.id)}
                              className="manage-portfolio-delete-btn"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        <div className="manage-portfolio-card-content">
                          <h4>{item.title}</h4>
                          <p className="manage-portfolio-card-description">
                            {item.description.substring(0, 100)}
                            {item.description.length > 100 ? '...' : ''}
                          </p>
                          {item.project_url && (
                            <a
                              href={item.project_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="manage-portfolio-card-link"
                            >
                              View Project →
                            </a>
                          )}
                        </div>

                        {/* Delete Confirmation */}
                        {portfolioDeleteConfirm === item.id && (
                          <div className="manage-portfolio-delete-confirm">
                            <p>Are you sure you want to delete this item?</p>
                            <div className="manage-portfolio-confirm-actions">
                              <button
                                onClick={() => setPortfolioDeleteConfirm(null)}
                                className="manage-portfolio-button-no"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handlePortfolioDelete(item.id)}
                                className="manage-portfolio-button-yes"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===== CERTIFICATES SECTION ===== */}
          <div className="manage-portfolio-section mt-8">
            <h2 className="manage-portfolio-section-title">Certificates & Credentials</h2>
            
            <div className="manage-portfolio-container">
              {/* Certificate Form */}
              <div className="manage-portfolio-form-section glass-card">
                <h3>{certEditingId ? 'Edit Certificate' : 'Add New Certificate'}</h3>

                <form onSubmit={handleCertSubmit} className="manage-portfolio-form">
                  <div className="manage-portfolio-form-row">
                    <div className="manage-portfolio-form-group">
                      <label>Certificate Title *</label>
                      <input
                        type="text"
                        name="title"
                        value={certFormData.title}
                        onChange={handleCertInputChange}
                        placeholder="e.g., AWS Certified Solutions Architect"
                        maxLength={255}
                        className={certErrors.title ? 'error' : ''}
                      />
                      {certErrors.title && (
                        <span className="manage-portfolio-error">
                          {getErrorMessage(certErrors.title)}
                        </span>
                      )}
                    </div>

                    <div className="manage-portfolio-form-group">
                      <label>Issuer *</label>
                      <input
                        type="text"
                        name="issuer"
                        value={certFormData.issuer}
                        onChange={handleCertInputChange}
                        placeholder="e.g., Amazon Web Services"
                        maxLength={255}
                        className={certErrors.issuer ? 'error' : ''}
                      />
                      {certErrors.issuer && (
                        <span className="manage-portfolio-error">
                          {getErrorMessage(certErrors.issuer)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="manage-portfolio-form-row">
                    <div className="manage-portfolio-form-group">
                      <label>Issue Date (yyyy-MM-dd) *</label>
                      <input
                        type="date"
                        name="issue_date"
                        value={certFormData.issue_date}
                        onChange={handleCertInputChange}
                        className={certErrors.issue_date ? 'error' : ''}
                      />
                      {certErrors.issue_date && (
                        <span className="manage-portfolio-error">
                          {getErrorMessage(certErrors.issue_date)}
                        </span>
                      )}
                    </div>

                    <div className="manage-portfolio-form-group">
                      <label>Expiry Date (Optional)</label>
                      <input
                        type="date"
                        name="expiry_date"
                        value={certFormData.expiry_date}
                        onChange={handleCertInputChange}
                        className={certErrors.expiry_date ? 'error' : ''}
                      />
                      {certErrors.expiry_date && (
                        <span className="manage-portfolio-error">
                          {certErrors.expiry_date}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="manage-portfolio-form-group">
                    <label>Credential URL *</label>
                    <input
                      type="url"
                      name="credential_url"
                      value={certFormData.credential_url}
                      onChange={handleCertInputChange}
                      placeholder="https://credentials.example.com/verify/abc123"
                      className={certErrors.credential_url ? 'error' : ''}
                    />
                    {certErrors.credential_url && (
                      <span className="manage-portfolio-error">
                        {certErrors.credential_url}
                      </span>
                    )}
                  </div>

                  <div className="manage-portfolio-form-group">
                    <label>Certificate Image (Optional)</label>
                    <div className="manage-portfolio-file-input-wrapper">
                      {certImagePreview ? (
                        <div className="manage-portfolio-image-preview">
                          <img src={certImagePreview} alt="Preview" />
                          <button
                            type="button"
                            onClick={() => {
                              setCertImagePreview(null);
                              setCertFormData(prev => ({ ...prev, image: null }));
                            }}
                            className="manage-portfolio-remove-image"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <label className="manage-portfolio-file-label">
                          <Upload size={24} />
                          <span>Click to upload certificate image</span>
                          <input
                            type="file"
                            onChange={handleCertImageChange}
                            accept=".jpg,.jpeg,.png,.gif"
                            hidden
                          />
                        </label>
                      )}
                    </div>
                    {certErrors.image && (
                      <span className="manage-portfolio-error">
                        {getErrorMessage(certErrors.image)}
                      </span>
                    )}
                  </div>

                  <div className="manage-portfolio-form-actions">
                    <button
                      type="button"
                      onClick={() => {
                        setCertFormData(INITIAL_CERTIFICATE_FORM);
                        setCertImagePreview(null);
                        setCertEditingId(null);
                        setCertErrors({});
                      }}
                      className="manage-portfolio-button-cancel"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={certificates.length >= MAX_ITEMS && !certEditingId}
                      className="manage-portfolio-button-submit"
                    >
                      {certEditingId ? 'Update' : 'Add'} Certificate
                    </button>
                  </div>
                </form>
              </div>

              {/* Certificates List */}
              <div className="manage-portfolio-list-section">
                <h3>Your Certificates ({certificates.length}/{MAX_ITEMS})</h3>

                {certificates.length === 0 ? (
                  <div className="manage-portfolio-empty">
                    <p>No certificates added yet.</p>
                    <button
                      onClick={() => {
                        setCertFormData(INITIAL_CERTIFICATE_FORM);
                        setCertEditingId(null);
                        setCertErrors({});
                      }}
                      className="manage-portfolio-add-button"
                    >
                      <Plus size={16} /> Add Your First Certificate
                    </button>
                  </div>
                ) : (
                  <div className="manage-portfolio-cert-list">
                    {certificates.map(cert => (
                      <div key={cert.id} className="manage-portfolio-cert-card glass-card">
                        <div className="manage-portfolio-cert-header">
                          <div className="manage-portfolio-cert-icon">
                            <Award size={24} />
                          </div>
                          <div className="manage-portfolio-cert-info">
                            <h4>{cert.title}</h4>
                            <p className="manage-portfolio-cert-issuer">{cert.issuer}</p>
                            <p className="manage-portfolio-cert-date">
                              Issued: {formatDate(cert.issue_date)}
                              {cert.expiry_date && ` • Expires: ${formatDate(cert.expiry_date)}`}
                            </p>
                          </div>
                          <div className="manage-portfolio-card-actions">
                            <button
                              onClick={() => handleCertEditClick(cert)}
                              className="manage-portfolio-edit-btn"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setCertDeleteConfirm(cert.id)}
                              className="manage-portfolio-delete-btn"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {cert.image_url && (
                          <div className="manage-portfolio-cert-image">
                            <img src={cert.image_url} alt={cert.title} />
                          </div>
                        )}

                        <a
                          href={cert.credential_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="manage-portfolio-cert-link"
                        >
                          View Credential →
                        </a>

                        {/* Delete Confirmation */}
                        {certDeleteConfirm === cert.id && (
                          <div className="manage-portfolio-delete-confirm">
                            <p>Are you sure you want to delete this certificate?</p>
                            <div className="manage-portfolio-confirm-actions">
                              <button
                                onClick={() => setCertDeleteConfirm(null)}
                                className="manage-portfolio-button-no"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleCertDelete(cert.id)}
                                className="manage-portfolio-button-yes"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
