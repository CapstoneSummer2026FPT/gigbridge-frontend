import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Upload, Check, X } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { SEED_FREELANCER_PROFILES } from '../../../mock_backend/database/seed';
import '../styles/edit-freelancer-profile-screen.css';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  title: string;
  bio: string;
  availability: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  profileImage: string;
  backgroundImage: string;
  skills: string[];
}

interface ValidationErrors {
  [key: string]: string;
}

const AVAILABLE_SKILLS = [
  'React',
  'Vue.js',
  'Angular',
  'Node.js',
  'Python',
  'JavaScript',
  'TypeScript',
  'HTML/CSS',
  'UI/UX Design',
  'Graphic Design',
  'Project Management',
  'DevOps',
  'AWS',
  'Docker',
  'MongoDB',
  'PostgreSQL',
];

const AVAILABILITY_OPTIONS = [
  { value: 'full-time', label: 'Full Time' },
  { value: 'part-time', label: 'Part Time' },
  { value: 'contract', label: 'Contract' },
  { value: 'available-soon', label: 'Available Soon' },
];

export default function EditFreelancerProfileScreen() {
  const navigate = useNavigate();
  const { user } = useApp();

  // Load mock data
  const mockProfile = SEED_FREELANCER_PROFILES[0];

  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: 'Jane',
    lastName: 'Smith',
    title: mockProfile?.title || 'Senior React Developer',
    bio: mockProfile?.bio || '',
    availability: 'available-soon',
    phone: '+1 (555) 987-6543',
    address: '456 Developer Ave, San Francisco, CA 94102',
    dateOfBirth: '1990-03-20',
    profileImage: 'https://via.placeholder.com/200',
    backgroundImage: '',
    skills: ['React', 'TypeScript', 'Node.js', 'UI/UX Design'],
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [showBannedMessage, setShowBannedMessage] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};

    // First Name validation (BR-24)
    if (formData.firstName.length > 255) {
      newErrors.firstName = '255 characters only, please!';
    }
    if (formData.firstName.trim().length === 0) {
      newErrors.firstName = 'First name can not be all space';
    }

    // Last Name validation (BR-25)
    if (formData.lastName.length > 255) {
      newErrors.lastName = '255 characters only, please!';
    }
    if (formData.lastName.trim().length === 0) {
      newErrors.lastName = 'Last name can not be all space';
    }

    // Professional Title validation
    if (formData.title.length > 255) {
      newErrors.title = '255 characters only, please!';
    }
    if (formData.title.trim().length === 0) {
      newErrors.title = 'Professional title can not be all space';
    }

    // Address validation (BR-26)
    if (formData.address.length > 255) {
      newErrors.address = '255 characters only, please!';
    }
    if (formData.address.trim().length === 0 && formData.address.length > 0) {
      newErrors.address = 'Address can not be all space';
    }

    // Phone validation (BR-27)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (formData.phone && !/^\d+$|^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'That doesn\'t look like a phone number';
    }
    if (formData.phone && (phoneDigits.length < 8 || phoneDigits.length > 20)) {
      newErrors.phone = 'Must be at least 8 and no more than 20 numbers';
    }

    // Bio validation (BR-28)
    if (formData.bio.length > 255) {
      newErrors.bio = 'Too much! How famous are you? We only support 255 characters.';
    }
    if (formData.bio.trim().length === 0 && formData.bio.length > 0) {
      newErrors.bio = 'Biography can not be all space';
    }

    // Date of Birth validation (BR-23)
    if (formData.dateOfBirth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.dateOfBirth)) {
        newErrors.dateOfBirth = 'Please enter a valid date';
      } else {
        const date = new Date(formData.dateOfBirth);
        const today = new Date();
        if (date > today) {
          newErrors.dateOfBirth = 'You can not be born in the future!!';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, imageType: 'profileImage' | 'backgroundImage') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format (BR-29, BR-31)
    const allowedFormats = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedFormats.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        [imageType]: 'Only JPG, PNG, GIF, or PDF formats are allowed'
      }));
      return;
    }

    // Validate and resize (BR-30, BR-32)
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const dataUrl = event.target?.result as string;
        setFormData(prev => ({
          ...prev,
          [imageType]: dataUrl
        }));
        setPreviewImage(dataUrl);
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[imageType];
          return newErrors;
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const toggleSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check if account is banned (MSG30)
    if (Math.random() < 0.05) { // 5% chance for demo
      setShowBannedMessage(true);
      setErrors({ banned: 'This account was being banned!' });
      return;
    }

    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage('Operation completed successfully!');
      setTimeout(() => {
        setSuccessMessage('');
        navigate(`/profile/freelancer/${user?.id}`);
      }, 2000);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/profile/freelancer/${user?.id}`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto py-6">
        {/* Header */}
        <div className="edit-freelancer-profile-header">
          <button
            onClick={handleCancel}
            className="p-2 rounded-lg transition-all hover:bg-surface"
          >
            <ArrowLeft size={20} className="text-primary" />
          </button>
          <h1 className="edit-freelancer-profile-header-title font-bold text-foreground">
            Edit <span className="text-blue-600 black:text-blue-400 italic font-light">Freelancer</span> Profile
          </h1>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="edit-freelancer-profile-success-message">
            <Check size={18} className="text-green" />
            <p className="text-sm text-green font-medium">{successMessage}</p>
          </div>
        )}

        {/* Banned Message */}
        {showBannedMessage && (
          <div className="edit-freelancer-profile-banned-message">
            <X size={18} className="text-red" />
            <p className="text-sm text-red font-medium">This account was being banned!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="edit-freelancer-profile-form">
          {/* Profile & Background Images */}
          <div className="glass-card edit-freelancer-profile-section">
            <h2 className="edit-freelancer-profile-section-title">Profile Images</h2>
            
            <div className="edit-freelancer-profile-images-grid">
              {/* Profile Image */}
              <div className="edit-freelancer-profile-image-container">
                <label className="edit-freelancer-profile-image-label">Profile Picture</label>
                <div className="edit-freelancer-profile-image-preview group">
                  <img
                    src={previewImage || formData.profileImage || 'https://via.placeholder.com/200'}
                    alt="Profile"
                    className="edit-freelancer-profile-image"
                  />
                  <div className="edit-freelancer-profile-image-overlay">
                    <label className="cursor-pointer">
                      <Upload size={20} className="text-white" />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif"
                        onChange={(e) => handleImageUpload(e, 'profileImage')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                {errors.profileImage && (
                  <p className="edit-freelancer-profile-form-error">{errors.profileImage}</p>
                )}
                <p className="edit-freelancer-profile-image-help">JPG, PNG, or GIF (max 4MB)</p>
              </div>

              {/* Background Image */}
              <div className="edit-freelancer-profile-image-container">
                <label className="edit-freelancer-profile-image-label">Background Image</label>
                <div className="edit-freelancer-profile-image-preview group">
                  <div
                    className="edit-freelancer-profile-image"
                    style={{
                      background: formData.backgroundImage
                        ? `url(${formData.backgroundImage}) center/cover`
                        : 'linear-gradient(135deg, rgba(159,75,255,0.15), rgba(0,240,255,0.1))'
                    }}
                  />
                  <div className="edit-freelancer-profile-image-overlay">
                    <label className="cursor-pointer">
                      <Upload size={20} className="text-white" />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif"
                        onChange={(e) => handleImageUpload(e, 'backgroundImage')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                {errors.backgroundImage && (
                  <p className="edit-freelancer-profile-form-error">{errors.backgroundImage}</p>
                )}
                <p className="edit-freelancer-profile-image-help">JPG, PNG, or GIF (max 4MB)</p>
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="glass-card edit-freelancer-profile-section">
            <h2 className="edit-freelancer-profile-section-title">Professional Information</h2>
            
            <div className="edit-freelancer-profile-form-grid">
              {/* Professional Title */}
              <div className="edit-freelancer-profile-form-group" style={{ gridColumn: 'span 2' }}>
                <label className="edit-freelancer-profile-form-label">Professional Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  maxLength={255}
                  className="edit-freelancer-profile-form-input"
                  placeholder="e.g., Senior React Developer"
                />
                {errors.title && (
                  <p className="edit-freelancer-profile-form-error">{errors.title}</p>
                )}
              </div>

              {/* Availability */}
              <div className="edit-freelancer-profile-form-group">
                <label className="edit-freelancer-profile-form-label">Availability</label>
                <select
                  name="availability"
                  value={formData.availability}
                  onChange={handleChange}
                  className="edit-freelancer-profile-form-select"
                >
                  {AVAILABILITY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="glass-card edit-freelancer-profile-section">
            <h2 className="edit-freelancer-profile-section-title">Personal Information</h2>
            
            <div className="edit-freelancer-profile-form-grid">
              {/* First Name */}
              <div className="edit-freelancer-profile-form-group">
                <label className="edit-freelancer-profile-form-label">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  maxLength={255}
                  className="edit-freelancer-profile-form-input"
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="edit-freelancer-profile-form-error">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="edit-freelancer-profile-form-group">
                <label className="edit-freelancer-profile-form-label">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  maxLength={255}
                  className="edit-freelancer-profile-form-input"
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="edit-freelancer-profile-form-error">{errors.lastName}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="edit-freelancer-profile-form-group">
                <label className="edit-freelancer-profile-form-label">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="edit-freelancer-profile-form-input"
                />
                {errors.dateOfBirth && (
                  <p className="edit-freelancer-profile-form-error">{errors.dateOfBirth}</p>
                )}
              </div>

              {/* Phone */}
              <div className="edit-freelancer-profile-form-group">
                <label className="edit-freelancer-profile-form-label">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="edit-freelancer-profile-form-input"
                  placeholder="+1 (555) 987-6543"
                />
                {errors.phone && (
                  <p className="edit-freelancer-profile-form-error">{errors.phone}</p>
                )}
              </div>

              {/* Address */}
              <div className="edit-freelancer-profile-form-group" style={{ gridColumn: 'span 2' }}>
                <label className="edit-freelancer-profile-form-label">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  maxLength={255}
                  className="edit-freelancer-profile-form-input"
                  placeholder="Enter your address"
                />
                {errors.address && (
                  <p className="edit-freelancer-profile-form-error">{errors.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Biography */}
          <div className="glass-card edit-freelancer-profile-section">
            <h2 className="edit-freelancer-profile-section-title">Biography</h2>
            
            <div className="edit-freelancer-profile-biography-container">
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                maxLength={255}
                rows={4}
                className="edit-freelancer-profile-form-textarea"
                placeholder="Tell us about yourself and your experience"
              />
              <div className="edit-freelancer-profile-form-counter">
                <span>Max 255 characters</span>
                <span className="edit-freelancer-profile-char-count">{formData.bio.length}/255</span>
              </div>
              {errors.bio && (
                <p className="edit-freelancer-profile-form-error">{errors.bio}</p>
              )}
            </div>
          </div>

          {/* Skills */}
          <div className="glass-card edit-freelancer-profile-section">
            <h2 className="edit-freelancer-profile-section-title">Skills</h2>
            <p className="edit-freelancer-profile-form-help">Select your skills (recommended: at least one)</p>
            
            <div className="edit-freelancer-profile-skills">
              {AVAILABLE_SKILLS.map(skill => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`edit-freelancer-profile-skill-button ${
                    formData.skills.includes(skill) ? 'active' : ''
                  }`}
                >
                  {formData.skills.includes(skill) ? '✓ ' : ''}{skill}
                </button>
              ))}
            </div>
            {formData.skills.length === 0 && (
              <p className="edit-freelancer-profile-skills-label">No skills selected yet</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="edit-freelancer-profile-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="edit-freelancer-profile-button-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-cyan edit-freelancer-profile-button-submit"
            >
              {isSaving ? (
                <>
                  <div className="w-3 h-3 rounded-full border border-[#0077FF] border-t-transparent animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
