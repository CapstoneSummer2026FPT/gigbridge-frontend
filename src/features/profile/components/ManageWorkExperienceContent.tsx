import { useState } from 'react';
import { Trash2, Edit2, Plus, AlertCircle } from 'lucide-react';

interface WorkExperience {
  id: string;
  company_name: string;
  title: string;
  start_date: string;
  end_date: string;
  description: string;
}

interface FormData {
  company_name: string;
  title: string;
  start_date: string;
  end_date: string;
  description: string;
}

export default function ManageWorkExperienceContent() {
  const [experiences, setExperiences] = useState<WorkExperience[]>([
    {
      id: '1',
      company_name: 'Tech Startup Inc',
      title: 'Senior Developer',
      start_date: '2021-01-15',
      end_date: '2024-06-30',
      description: 'Led development of scalable web applications using React and Node.js',
    },
    {
      id: '2',
      company_name: 'Design Agency LLC',
      title: 'Full Stack Developer',
      start_date: '2019-03-10',
      end_date: '2021-01-10',
      description: 'Built client websites and maintained legacy systems',
    },
  ]);

  const [formData, setFormData] = useState<FormData>({
    company_name: '',
    title: '',
    start_date: '',
    end_date: '',
    description: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.company_name.trim() || formData.company_name.length > 255) {
      newErrors.company_name = 'Company name must be 1-255 characters';
    }

    if (!formData.title.trim() || formData.title.length > 255) {
      newErrors.title = 'Title must be 1-255 characters';
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required';
    }

    if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
      newErrors.end_date = 'End date must be after start date';
    }

    if (formData.description.length > 1000) {
      newErrors.description = 'Description must be 1000 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingId) {
      setExperiences(prev =>
        prev.map(exp =>
          exp.id === editingId ? { ...exp, ...formData } : exp
        )
      );
      setEditingId(null);
    } else {
      setExperiences(prev => [
        ...prev,
        { id: Date.now().toString(), ...formData }
      ]);
    }

    setFormData({
      company_name: '',
      title: '',
      start_date: '',
      end_date: '',
      description: '',
    });
  };

  const handleEdit = (experience: WorkExperience) => {
    setFormData({
      company_name: experience.company_name,
      title: experience.title,
      start_date: experience.start_date,
      end_date: experience.end_date,
      description: experience.description,
    });
    setEditingId(experience.id);
  };

  const handleDelete = (id: string) => {
    setExperiences(prev => prev.filter(exp => exp.id !== id));
    setShowDeleteConfirm(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      company_name: '',
      title: '',
      start_date: '',
      end_date: '',
      description: '',
    });
    setErrors({});
  };

  const sortedExperiences = [...experiences].sort(
    (a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime()
  );

  return (
    <div className="manage-content-section">
      <div className="manage-content-grid">
        {/* Form */}
        <div className="manage-content-form-container">
          <h2 className="manage-content-form-title">
            {editingId ? 'Edit Work Experience' : 'Add Work Experience'}
          </h2>

          <form onSubmit={handleSubmit} className="manage-content-form">
            {/* Company Name */}
            <div className="manage-content-form-group">
              <label className="manage-content-form-label">Company Name *</label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                maxLength={255}
                placeholder="Enter company name"
                className="manage-content-form-input"
              />
              {errors.company_name && (
                <p className="manage-content-form-error">{errors.company_name}</p>
              )}
            </div>

            {/* Title */}
            <div className="manage-content-form-group">
              <label className="manage-content-form-label">Job Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                maxLength={255}
                placeholder="Enter job title"
                className="manage-content-form-input"
              />
              {errors.title && (
                <p className="manage-content-form-error">{errors.title}</p>
              )}
            </div>

            {/* Start Date */}
            <div className="manage-content-form-group">
              <label className="manage-content-form-label">Start Date *</label>
              <input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="manage-content-form-input"
              />
              {errors.start_date && (
                <p className="manage-content-form-error">{errors.start_date}</p>
              )}
            </div>

            {/* End Date */}
            <div className="manage-content-form-group">
              <label className="manage-content-form-label">End Date *</label>
              <input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="manage-content-form-input"
              />
              {errors.end_date && (
                <p className="manage-content-form-error">{errors.end_date}</p>
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
                placeholder="Describe your responsibilities and achievements"
                className="manage-content-form-textarea"
              />
              <div className="manage-content-form-counter">
                <span>{formData.description.length}/1000</span>
              </div>
              {errors.description && (
                <p className="manage-content-form-error">{errors.description}</p>
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
                {editingId ? 'Update' : 'Add'} Experience
              </button>
            </div>
          </form>
        </div>

        {/* List */}
        <div className="manage-content-list-container">
          <h2 className="manage-content-list-title">
            Experience ({experiences.length})
          </h2>

          {experiences.length === 0 ? (
            <div className="manage-content-empty-state">
              <Plus size={40} />
              <p>No work experience yet</p>
              <p className="manage-content-empty-state-hint">Add your first experience above</p>
            </div>
          ) : (
            <div className="manage-content-list">
              {sortedExperiences.map((exp) => (
                <div key={exp.id} className="manage-content-item">
                  <div className="manage-content-item-header">
                    <div>
                      <p className="manage-content-item-title">{exp.title}</p>
                      <p className="manage-content-item-subtitle">{exp.company_name}</p>
                      <p className="manage-content-item-date">
                        {new Date(exp.start_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                        })} - {new Date(exp.end_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                        })}
                      </p>
                    </div>
                    <div className="manage-content-item-actions">
                      <button
                        onClick={() => handleEdit(exp)}
                        className="manage-content-item-btn manage-content-item-btn-edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(exp.id)}
                        className="manage-content-item-btn manage-content-item-btn-delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {exp.description && (
                    <p className="manage-content-item-description">{exp.description}</p>
                  )}

                  {/* Delete Confirmation */}
                  {showDeleteConfirm === exp.id && (
                    <div className="manage-content-delete-confirm">
                      <AlertCircle size={16} className="text-amber" />
                      <span>Are you sure?</span>
                      <button
                        onClick={() => handleDelete(exp.id)}
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
