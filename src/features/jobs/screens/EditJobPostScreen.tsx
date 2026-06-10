import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, AlertCircle, Check } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import '../styles/edit-job-post-screen.css';

interface FormErrors {
  title?: string;
  description?: string;
  budget?: string;
  duration?: string;
}

export default function EditJobPostScreen() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    title: 'Build E-Commerce Platform',
    description: 'Need a scalable e-commerce platform with React frontend and Node.js backend. Must include user authentication, product catalog, shopping cart, payment integration.',
    budget: 5000,
    duration: '2-4 weeks',
    category: 'Web Development',
    skills: ['React', 'Node.js', 'PostgreSQL'],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  const validateForm = () => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'MSG17: Title is required';
    } else if (formData.title.length < 10) {
      newErrors.title = 'MSG17: Title must be at least 10 characters';
    } else if (formData.title.length > 100) {
      newErrors.title = 'MSG17: Title must not exceed 100 characters';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'MSG21: Description is required';
    } else if (formData.description.length < 50) {
      newErrors.description = 'MSG21: Description must be at least 50 characters';
    } else if (formData.description.length > 5000) {
      newErrors.description = 'MSG21: Description must not exceed 5000 characters';
    }

    if (!formData.budget || formData.budget <= 0) {
      newErrors.budget = 'MSG28: Budget must be greater than 0';
    } else if (formData.budget > 1000000) {
      newErrors.budget = 'MSG28: Budget must not exceed 1,000,000';
    }

    if (!formData.duration.trim()) {
      newErrors.duration = 'MSG29: Duration is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage(true);
      setTimeout(() => {
        navigate('/jobs/my-jobs');
      }, 1500);
    }, 1000);
  };

  return (
    <AppLayout>
      <div className="edit-job-wrapper">
        {/* Header */}
        <div className="edit-job-header">
          <button onClick={() => navigate(-1)} className="edit-job-back-btn">
            <ArrowLeft size={18} />
            Back to Jobs
          </button>
          <h1 className="edit-job-title">Edit Job Post</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="edit-job-form glass-card">
          {/* Title */}
          <div className="form-group">
            <label className="form-label">Job Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="e.g., Build E-Commerce Platform"
              className={`form-input ${errors.title ? 'error' : ''}`}
            />
            {errors.title && <div className="form-error"><AlertCircle size={14} />{errors.title}</div>}
            <div className="form-hint">
              {formData.title.length}/100 characters
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Job Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe the job in detail..."
              rows={8}
              className={`form-textarea ${errors.description ? 'error' : ''}`}
            />
            {errors.description && (
              <div className="form-error"><AlertCircle size={14} />{errors.description}</div>
            )}
            <div className="form-hint">
              {formData.description.length}/5000 characters
            </div>
          </div>

          {/* Budget Row */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Budget Amount *</label>
              <div className="budget-input-wrapper">
                <span className="budget-currency">$</span>
                <input
                  type="number"
                  value={formData.budget}
                  onChange={(e) =>
                    handleInputChange('budget', parseFloat(e.target.value))
                  }
                  placeholder="0"
                  className={`form-input budget-input ${errors.budget ? 'error' : ''}`}
                />
              </div>
              {errors.budget && <div className="form-error"><AlertCircle size={14} />{errors.budget}</div>}
            </div>
          </div>

          {/* Duration */}
          <div className="form-group">
            <label className="form-label">Project Duration *</label>
            <select
              value={formData.duration}
              onChange={(e) => handleInputChange('duration', e.target.value)}
              className={`form-select ${errors.duration ? 'error' : ''}`}
            >
              <option value="">Select duration</option>
              <option value="Less than 1 week">Less than 1 week</option>
              <option value="1-2 weeks">1-2 weeks</option>
              <option value="2-4 weeks">2-4 weeks</option>
              <option value="1-3 months">1-3 months</option>
              <option value="3-6 months">3-6 months</option>
              <option value="6+ months">6+ months</option>
              <option value="Ongoing">Ongoing</option>
            </select>
            {errors.duration && <div className="form-error"><AlertCircle size={14} />{errors.duration}</div>}
          </div>

          {/* Category */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="form-select"
              >
                <option value="Web Development">Web Development</option>
                <option value="Mobile App">Mobile App</option>
                <option value="UI/UX Design">UI/UX Design</option>
                <option value="Graphic Design">Graphic Design</option>
              </select>
            </div>
          </div>

          {/* Skills */}
          <div className="form-group">
            <label className="form-label">Required Skills</label>
            <div className="skills-display">
              {formData.skills.map((skill, index) => (
                <div key={index} className="skill-tag">
                  {skill}
                  <button
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({
                        ...prev,
                        skills: prev.skills.filter((_, i) => i !== index),
                      }));
                    }}
                    className="skill-remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Info Box */}
          <div className="edit-job-info-box">
            <div className="info-box-content">
              <AlertCircle size={20} className="info-icon" />
              <div>
                <p className="info-title">Before you save:</p>
                <ul className="info-list">
                  <li>Verify all fields are accurate and complete</li>
                  <li>Check the description for clarity and professionalism</li>
                  <li>Ensure budget matches your project scope</li>
                  <li>Editing won't affect already submitted proposals</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || successMessage}
              className="btn-save"
            >
              {successMessage ? (
                <>
                  <Check size={18} />
                  Saved!
                </>
              ) : isSubmitting ? (
                'Updating...'
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
