import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Upload, Check } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { SEED_CLIENT_PROFILES } from '../../../mock_backend/database/seed';
import '../styles/edit-client-profile-screen.css';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  companyName: string;
  companyWebsite: string;
  bio: string;
  industry: string;
  phone: string;
  address: string;
  dateOfBirth: string;
  profileImage: string;
  backgroundImage: string;
}

interface ValidationErrors {
  [key: string]: string;
}

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Retail',
  'Manufacturing',
  'Education',
  'Marketing',
  'Consulting',
  'Other',
];

export default function EditClientProfileScreen() {
  const navigate = useNavigate();
  const { user } = useApp();

  // Load mock data
  const mockProfile = SEED_CLIENT_PROFILES[0];

  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: 'John',
    lastName: 'Doe',
    companyName: mockProfile?.company_name || '',
    companyWebsite: mockProfile?.company_website || '',
    bio: mockProfile?.company_description || '',
    industry: mockProfile?.industry || 'Technology',
    phone: '+1 (555) 123-4567',
    address: mockProfile?.location || '',
    dateOfBirth: '1985-05-15',
    profileImage: 'https://via.placeholder.com/200',
    backgroundImage: '',
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState('');

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
        // Simple mock: just use the original
        // In real app, this would resize via Canvas API
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage('Operation completed successfully!');
      setTimeout(() => {
        setSuccessMessage('');
        navigate(`/profile/client/${user?.id}`);
      }, 2000);
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    navigate(`/profile/client/${user?.id}`);
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
        <div className="edit-client-profile-header">
          <button
            onClick={handleCancel}
            className="p-2 rounded-lg transition-all hover:bg-surface"
          >
            <ArrowLeft size={20} className="text-primary" />
          </button>
          <h1 className="edit-client-profile-header-title font-bold text-foreground">
            Edit <span className="text-blue-600 black:text-blue-400 italic font-light">Client</span> Profile
          </h1>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="edit-client-profile-success-message">
            <Check size={18} className="text-green" />
            <p className="text-sm text-green font-medium">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="edit-client-profile-form">
          {/* Profile & Background Images */}
          <div className="glass-card edit-client-profile-section">
            <h2 className="edit-client-profile-section-title">Profile Images</h2>
            
            <div className="edit-client-profile-images-grid">
              {/* Profile Image */}
              <div className="edit-client-profile-image-container">
                <label className="edit-client-profile-image-label">Profile Picture</label>
                <div className="edit-client-profile-image-preview group">
                  <img
                    src={previewImage || formData.profileImage || 'https://via.placeholder.com/200'}
                    alt="Profile"
                    className="edit-client-profile-image"
                  />
                  <div className="edit-client-profile-image-overlay">
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
                  <p className="edit-client-profile-form-error">{errors.profileImage}</p>
                )}
                <p className="edit-client-profile-image-help">JPG, PNG, or GIF (max 4MB)</p>
              </div>

              {/* Background Image */}
              <div className="edit-client-profile-image-container">
                <label className="edit-client-profile-image-label">Background Image</label>
                <div className="edit-client-profile-image-preview group">
                  <div
                    className="edit-client-profile-image"
                    style={{
                      background: formData.backgroundImage
                        ? `url(${formData.backgroundImage}) center/cover`
                        : 'linear-gradient(135deg, rgba(159,75,255,0.15), rgba(0,240,255,0.1))'
                    }}
                  />
                  <div className="edit-client-profile-image-overlay">
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
                  <p className="edit-client-profile-form-error">{errors.backgroundImage}</p>
                )}
                <p className="edit-client-profile-image-help">JPG, PNG, or GIF (max 4MB)</p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="glass-card edit-client-profile-section">
            <h2 className="edit-client-profile-section-title">Personal Information</h2>
            
            <div className="edit-client-profile-form-grid">
              {/* First Name */}
              <div className="edit-client-profile-form-group">
                <label className="edit-client-profile-form-label">First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  maxLength={255}
                  className="edit-client-profile-form-input"
                  placeholder="Enter first name"
                />
                {errors.firstName && (
                  <p className="edit-client-profile-form-error">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name */}
              <div className="edit-client-profile-form-group">
                <label className="edit-client-profile-form-label">Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  maxLength={255}
                  className="edit-client-profile-form-input"
                  placeholder="Enter last name"
                />
                {errors.lastName && (
                  <p className="edit-client-profile-form-error">{errors.lastName}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div className="edit-client-profile-form-group">
                <label className="edit-client-profile-form-label">Date of Birth</label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  className="edit-client-profile-form-input"
                />
                {errors.dateOfBirth && (
                  <p className="edit-client-profile-form-error">{errors.dateOfBirth}</p>
                )}
              </div>

              {/* Phone */}
              <div className="edit-client-profile-form-group">
                <label className="edit-client-profile-form-label">Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="edit-client-profile-form-input"
                  placeholder="+1 (555) 123-4567"
                />
                {errors.phone && (
                  <p className="edit-client-profile-form-error">{errors.phone}</p>
                )}
              </div>

              {/* Address */}
              <div className="edit-client-profile-form-group" style={{ gridColumn: 'span 2' }}>
                <label className="edit-client-profile-form-label">Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  maxLength={255}
                  className="edit-client-profile-form-input"
                  placeholder="Enter your address"
                />
                {errors.address && (
                  <p className="edit-client-profile-form-error">{errors.address}</p>
                )}
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="glass-card edit-client-profile-section">
            <h2 className="edit-client-profile-section-title">Company Information</h2>
            
            <div className="edit-client-profile-form-grid">
              {/* Company Name */}
              <div className="edit-client-profile-form-group">
                <label className="edit-client-profile-form-label">Company Name</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleChange}
                  className="edit-client-profile-form-input"
                  placeholder="Your company name"
                />
                <p className="edit-client-profile-form-help">Optional</p>
              </div>

              {/* Company Website */}
              <div className="edit-client-profile-form-group">
                <label className="edit-client-profile-form-label">Website URL</label>
                <input
                  type="url"
                  name="companyWebsite"
                  value={formData.companyWebsite}
                  onChange={handleChange}
                  className="edit-client-profile-form-input"
                  placeholder="https://example.com"
                />
                <p className="edit-client-profile-form-help">Optional</p>
              </div>

              {/* Industry */}
              <div className="edit-client-profile-form-group" style={{ gridColumn: 'span 2' }}>
                <label className="edit-client-profile-form-label">Industry</label>
                <select
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="edit-client-profile-form-select"
                >
                  {INDUSTRIES.map(ind => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="glass-card edit-client-profile-section">
            <h2 className="edit-client-profile-section-title">Biography</h2>
            
            <div className="edit-client-profile-biography-container">
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                maxLength={255}
                rows={4}
                className="edit-client-profile-form-textarea"
                placeholder="Tell us about your company"
              />
              <div className="edit-client-profile-form-counter">
                <span>Max 255 characters</span>
                <span className="edit-client-profile-char-count">{formData.bio.length}/255</span>
              </div>
              {errors.bio && (
                <p className="edit-client-profile-form-error">{errors.bio}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="edit-client-profile-actions">
            <button
              type="button"
              onClick={handleCancel}
              className="edit-client-profile-button-cancel"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-cyan edit-client-profile-button-submit"
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
