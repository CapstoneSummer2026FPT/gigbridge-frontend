import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Plus, Trash2, Edit2, ArrowLeft, Calendar } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import '../styles/manage-work-experience-screen.css';

interface WorkExperience {
  id: string;
  company_name: string;
  title: string;
  start_date: string;
  end_date: string | null;
  description: string;
}

interface FormData {
  company_name: string;
  title: string;
  start_date: string;
  end_date: string;
  description: string;
}

const INITIAL_FORM: FormData = {
  company_name: '',
  title: '',
  start_date: '',
  end_date: '',
  description: '',
};

export default function ManageWorkExperienceScreen() {
  const navigate = useNavigate();
  const [experiences, setExperiences] = useState<WorkExperience[]>([
    {
      id: '1',
      company_name: 'Tech Startup',
      title: 'Senior Developer',
      start_date: '2021-01-15',
      end_date: null,
      description: 'Led development of core features and mentored junior developers.',
    },
    {
      id: '2',
      company_name: 'Design Agency',
      title: 'Full Stack Developer',
      start_date: '2019-03-01',
      end_date: '2020-12-31',
      description: 'Built responsive web applications and maintained codebase.',
    },
  ]);

  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate company name
    if (!formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    } else if (formData.company_name.trim().length < 1 || formData.company_name.trim().length > 255) {
      newErrors.company_name = 'Company name must be between 1 and 255 characters';
    } else if (/^\s+$/.test(formData.company_name)) {
      newErrors.company_name = 'Company name cannot be all spaces';
    }

    // Validate title
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 1 || formData.title.trim().length > 255) {
      newErrors.title = 'Title must be between 1 and 255 characters';
    }

    // Validate start date
    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required';
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.start_date)) {
      newErrors.start_date = 'Please enter a valid date (YYYY-MM-DD)';
    }

    // Validate end date
    if (formData.end_date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(formData.end_date)) {
        newErrors.end_date = 'Please enter a valid date (YYYY-MM-DD)';
      } else if (formData.end_date < formData.start_date) {
        newErrors.end_date = 'End date must be after start date';
      }
    }

    // Validate description
    if (formData.description.length > 1000) {
      newErrors.description = 'Description cannot exceed 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const handleAddClick = () => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setErrors({});
  };

  const handleEditClick = (experience: WorkExperience) => {
    setFormData({
      company_name: experience.company_name,
      title: experience.title,
      start_date: experience.start_date,
      end_date: experience.end_date || '',
      description: experience.description,
    });
    setEditingId(experience.id);
    setErrors({});
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingId) {
      // Update existing
      setExperiences(experiences.map(exp =>
        exp.id === editingId
          ? {
              ...exp,
              company_name: formData.company_name,
              title: formData.title,
              start_date: formData.start_date,
              end_date: formData.end_date || null,
              description: formData.description,
            }
          : exp
      ));
      setSuccessMessage('Work experience updated successfully!');
    } else {
      // Add new
      const newExperience: WorkExperience = {
        id: Date.now().toString(),
        company_name: formData.company_name,
        title: formData.title,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        description: formData.description,
      };
      setExperiences([newExperience, ...experiences]);
      setSuccessMessage('Work experience added successfully!');
    }

    setFormData(INITIAL_FORM);
    setEditingId(null);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleDelete = (id: string) => {
    setExperiences(experiences.filter(exp => exp.id !== id));
    setDeleteConfirm(null);
    setSuccessMessage('Work experience deleted successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const getErrorMessage = (errorCode: string): string => {
    const messages: Record<string, string> = {
      'MSG28': 'Please enter a valid date (yyyy-MM-dd)',
      'MSG32': 'The field cannot be all spaces',
      'MSG34': 'End date must be after start date',
      'MSG35': 'This field is required',
      'BR-35': 'Must be between 1-255 characters',
      'BR-36': 'End date must be after or equal to start date',
    };
    return messages[errorCode] || 'Invalid input';
  };

  const sortedExperiences = [...experiences].sort((a, b) => 
    new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  );

  return (
    <AppLayout>
      <div className="manage-work-experience-wrapper">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Header */}
          <div className="manage-work-experience-header">
            <button onClick={() => navigate(-1)} className="manage-work-experience-back-btn">
              <ArrowLeft size={20} />
            </button>
            <h1>Manage Work Experience & Education</h1>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="manage-work-experience-success-message">
              ✓ {successMessage}
            </div>
          )}

          <div className="manage-work-experience-container">
            {/* Form Section */}
            <div className="manage-work-experience-form-section glass-card">
              <h2>{editingId ? 'Edit Work Experience' : 'Add New Work Experience'}</h2>

              <form onSubmit={handleSubmit} className="manage-work-experience-form">
                <div className="manage-work-experience-form-row">
                  <div className="manage-work-experience-form-group">
                    <label>Company/School Name *</label>
                    <input
                      type="text"
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      placeholder="e.g., Tech Startup Inc."
                      className={errors.company_name ? 'error' : ''}
                    />
                    {errors.company_name && (
                      <span className="manage-work-experience-error">
                        {getErrorMessage(errors.company_name)}
                      </span>
                    )}
                  </div>

                  <div className="manage-work-experience-form-group">
                    <label>Title/Degree *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="e.g., Senior Developer"
                      className={errors.title ? 'error' : ''}
                    />
                    {errors.title && (
                      <span className="manage-work-experience-error">
                        {getErrorMessage(errors.title)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="manage-work-experience-form-row">
                  <div className="manage-work-experience-form-group">
                    <label>Start Date (yyyy-MM-dd) *</label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className={errors.start_date ? 'error' : ''}
                    />
                    {errors.start_date && (
                      <span className="manage-work-experience-error">
                        {getErrorMessage(errors.start_date)}
                      </span>
                    )}
                  </div>

                  <div className="manage-work-experience-form-group">
                    <label>End Date (yyyy-MM-dd) - Leave empty for current</label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      className={errors.end_date ? 'error' : ''}
                    />
                    {errors.end_date && (
                      <span className="manage-work-experience-error">
                        {getErrorMessage(errors.end_date)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="manage-work-experience-form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your responsibilities and achievements..."
                    maxLength={1000}
                    className={errors.description ? 'error' : ''}
                  />
                  <span className="manage-work-experience-char-count">
                    {formData.description.length}/1000 characters
                  </span>
                  {errors.description && (
                    <span className="manage-work-experience-error">
                      {errors.description}
                    </span>
                  )}
                </div>

                <div className="manage-work-experience-form-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(INITIAL_FORM);
                      setEditingId(null);
                      setErrors({});
                    }}
                    className="manage-work-experience-button-cancel"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="manage-work-experience-button-submit">
                    {editingId ? 'Update' : 'Add'} Experience
                  </button>
                </div>
              </form>
            </div>

            {/* Experiences List */}
            <div className="manage-work-experience-list-section">
              <h2>Your Work Experience ({experiences.length})</h2>

              {sortedExperiences.length === 0 ? (
                <div className="manage-work-experience-empty">
                  <p>No work experience added yet.</p>
                  <button
                    onClick={handleAddClick}
                    className="manage-work-experience-add-button"
                  >
                    <Plus size={16} /> Add Your First Experience
                  </button>
                </div>
              ) : (
                <div className="manage-work-experience-list">
                  {sortedExperiences.map(exp => (
                    <div key={exp.id} className="manage-work-experience-card glass-card">
                      <div className="manage-work-experience-card-header">
                        <div>
                          <h3>{exp.title}</h3>
                          <p className="manage-work-experience-company">{exp.company_name}</p>
                        </div>
                        <div className="manage-work-experience-card-actions">
                          <button
                            onClick={() => handleEditClick(exp)}
                            className="manage-work-experience-edit-btn"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(exp.id)}
                            className="manage-work-experience-delete-btn"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      <div className="manage-work-experience-card-date">
                        <Calendar size={14} />
                        <span>
                          {formatDate(exp.start_date)} - {exp.end_date ? formatDate(exp.end_date) : 'Present'}
                        </span>
                      </div>

                      {exp.description && (
                        <p className="manage-work-experience-card-description">
                          {exp.description}
                        </p>
                      )}

                      {/* Delete Confirmation */}
                      {deleteConfirm === exp.id && (
                        <div className="manage-work-experience-delete-confirm">
                          <p>Are you sure you want to delete this experience?</p>
                          <div className="manage-work-experience-confirm-actions">
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="manage-work-experience-button-no"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleDelete(exp.id)}
                              className="manage-work-experience-button-yes"
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
    </AppLayout>
  );
}
