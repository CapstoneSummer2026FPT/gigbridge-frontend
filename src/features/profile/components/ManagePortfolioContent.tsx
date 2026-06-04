import { useState } from 'react';
import { Trash2, Edit2, Plus, AlertCircle } from 'lucide-react';

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  project_url: string;
  image_url: string;
}

interface FormData {
  title: string;
  description: string;
  project_url: string;
  image_url: string;
}

export default function ManagePortfolioContent() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([
    {
      id: '1',
      title: 'E-Commerce Platform',
      description: 'Full-stack e-commerce solution with payment integration',
      project_url: 'https://example.com/ecommerce',
      image_url: 'https://images.unsplash.com/photo-1460925895917-aaf4f1f1c5ce?w=400&h=300&fit=crop',
    },
    {
      id: '2',
      title: 'SaaS Dashboard',
      description: 'Analytics dashboard for data visualization',
      project_url: 'https://example.com/saas',
      image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop',
    },
  ]);

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    project_url: '',
    image_url: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string>('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim() || formData.title.length > 255) {
      newErrors.title = 'Title must be 1-255 characters';
    }

    if (formData.description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
    }

    if (formData.project_url && !/^https?:\/\/.+/.test(formData.project_url)) {
      newErrors.project_url = 'Please enter a valid URL (http/https)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedFormats = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedFormats.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        image_url: 'Only JPG, PNG, GIF formats are allowed'
      }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormData(prev => ({ ...prev, image_url: dataUrl }));
      setPreviewImage(dataUrl);
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.image_url;
        return newErrors;
      });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingId) {
      setPortfolio(prev =>
        prev.map(item =>
          item.id === editingId ? { ...item, ...formData } : item
        )
      );
      setEditingId(null);
    } else {
      setPortfolio(prev => [
        ...prev,
        { id: Date.now().toString(), ...formData }
      ]);
    }

    setFormData({
      title: '',
      description: '',
      project_url: '',
      image_url: '',
    });
    setPreviewImage('');
  };

  const handleEdit = (item: PortfolioItem) => {
    setFormData({
      title: item.title,
      description: item.description,
      project_url: item.project_url,
      image_url: item.image_url,
    });
    setPreviewImage(item.image_url);
    setEditingId(item.id);
  };

  const handleDelete = (id: string) => {
    setPortfolio(prev => prev.filter(item => item.id !== id));
    setShowDeleteConfirm(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      project_url: '',
      image_url: '',
    });
    setPreviewImage('');
    setErrors({});
  };

  return (
    <div className="manage-content-section">
      <div className="manage-content-grid">
        {/* Form */}
        <div className="manage-content-form-container">
          <h2 className="manage-content-form-title">
            {editingId ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
          </h2>

          <form onSubmit={handleSubmit} className="manage-content-form">
            {/* Image Upload */}
            <div className="manage-content-form-group" style={{ gridColumn: 'span 2' }}>
              <label className="manage-content-form-label">Project Image</label>
              <div className="manage-content-image-preview">
                <img
                  src={previewImage || 'https://via.placeholder.com/300x200'}
                  alt="Portfolio preview"
                  className="manage-content-image"
                />
              </div>
              <label className="manage-content-image-upload-label">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <span className="manage-content-image-upload-btn">Upload Image</span>
              </label>
              {errors.image_url && (
                <p className="manage-content-form-error">{errors.image_url}</p>
              )}
              <p className="manage-content-image-help">JPG, PNG, or GIF (max 4MB)</p>
            </div>

            {/* Title */}
            <div className="manage-content-form-group" style={{ gridColumn: 'span 2' }}>
              <label className="manage-content-form-label">Project Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={255}
                placeholder="Enter project title"
                className="manage-content-form-input"
              />
              {errors.title && (
                <p className="manage-content-form-error">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="manage-content-form-group" style={{ gridColumn: 'span 2' }}>
              <label className="manage-content-form-label">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                maxLength={1000}
                rows={3}
                placeholder="Describe your project and what you did"
                className="manage-content-form-textarea"
              />
              <div className="manage-content-form-counter">
                <span>{formData.description.length}/1000</span>
              </div>
              {errors.description && (
                <p className="manage-content-form-error">{errors.description}</p>
              )}
            </div>

            {/* Project URL */}
            <div className="manage-content-form-group" style={{ gridColumn: 'span 2' }}>
              <label className="manage-content-form-label">Project URL</label>
              <input
                type="url"
                value={formData.project_url}
                onChange={(e) => setFormData({ ...formData, project_url: e.target.value })}
                placeholder="https://example.com"
                className="manage-content-form-input"
              />
              {errors.project_url && (
                <p className="manage-content-form-error">{errors.project_url}</p>
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
                {editingId ? 'Update' : 'Add'} Portfolio Item
              </button>
            </div>
          </form>
        </div>

        {/* Grid */}
        <div className="manage-content-list-container">
          <h2 className="manage-content-list-title">
            Portfolio ({portfolio.length})
          </h2>

          {portfolio.length === 0 ? (
            <div className="manage-content-empty-state">
              <Plus size={40} />
              <p>No portfolio items yet</p>
              <p className="manage-content-empty-state-hint">Add your first project above</p>
            </div>
          ) : (
            <div className="manage-content-portfolio-grid">
              {portfolio.map((item) => (
                <div key={item.id} className="manage-content-portfolio-card">
                  <div className="manage-content-portfolio-image-wrapper">
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="manage-content-portfolio-image"
                    />
                    <div className="manage-content-portfolio-overlay">
                      <button
                        onClick={() => handleEdit(item)}
                        className="manage-content-item-btn manage-content-item-btn-edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(item.id)}
                        className="manage-content-item-btn manage-content-item-btn-delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="manage-content-portfolio-card-content">
                    <p className="manage-content-item-title">{item.title}</p>
                    {item.description && (
                      <p className="manage-content-item-description">{item.description}</p>
                    )}
                    {item.project_url && (
                      <a
                        href={item.project_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="manage-content-portfolio-link"
                      >
                        View Project →
                      </a>
                    )}
                  </div>

                  {/* Delete Confirmation */}
                  {showDeleteConfirm === item.id && (
                    <div className="manage-content-delete-confirm">
                      <AlertCircle size={16} className="text-amber" />
                      <span>Delete this project?</span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="manage-content-delete-confirm-btn-yes"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="manage-content-delete-confirm-btn-no"
                      >
                        No
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
