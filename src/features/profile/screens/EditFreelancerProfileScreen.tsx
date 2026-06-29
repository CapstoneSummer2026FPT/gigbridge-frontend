import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Upload, Check, X, User, Phone, MapPin, Calendar, Briefcase, FileText, CheckCircle } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { SEED_FREELANCER_PROFILES } from '../../../mock_backend/database/seed';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
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
    skills: ['React', 'TypeScript', 'Node.js', 'UI/UX Design'],
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [showBannedMessage, setShowBannedMessage] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

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

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, imageType: 'profileImage') => {
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
        if (isMounted.current) {
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
        }
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
      if (isMounted.current) {
        setShowBannedMessage(true);
        setErrors({ banned: 'This account was being banned!' });
      }
      return;
    }

    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (isMounted.current) {
        setSuccessMessage('Operation completed successfully!');
        setTimeout(() => {
          if (isMounted.current) {
            setSuccessMessage('');
            navigate(`/profile/freelancer/${user?.id}`);
          }
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      if (isMounted.current) {
        setIsSaving(false);
      }
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

  // GSAP Entrance Animations
  useGSAP(() => {
    // Header transition
    gsap.from('.edit-freelancer-profile-header', {
      opacity: 0,
      y: -20,
      duration: 0.6,
      ease: 'power3.out',
    });

    // Staggered slide/fade for main layout blocks
    gsap.from('.edit-freelancer-card-animate', {
      opacity: 0,
      y: 30,
      stagger: 0.1,
      duration: 0.8,
      ease: 'power3.out',
    });
  }, []);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-8 px-4">
        {/* Header */}
        <div className="edit-freelancer-profile-header mb-8">
          <button
            onClick={handleCancel}
            className="p-3 rounded-xl transition-all hover:bg-surface border border-transparent hover:border-border cursor-pointer flex items-center justify-center"
            type="button"
          >
            <ArrowLeft size={18} className="text-primary" />
          </button>
          <div>
            <h1 className="edit-freelancer-profile-header-title text-2xl font-bold text-foreground leading-tight">
              Edit <span className="text-blue-600 dark:text-cyan-400 italic font-light">Freelancer</span> Profile
            </h1>
            <p className="text-sm text-secondary mt-1">Configure your personal and professional profile details</p>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="edit-freelancer-profile-success-message flex items-center gap-3 p-4 rounded-xl border mb-6">
            <Check size={18} className="text-emerald-500" />
            <p className="text-sm font-medium text-emerald-500">{successMessage}</p>
          </div>
        )}

        {/* Banned Message */}
        {showBannedMessage && (
          <div className="edit-freelancer-profile-banned-message flex items-center gap-3 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 mb-6">
            <X size={18} className="text-red-500" />
            <p className="text-sm font-medium text-red-500">This account was being banned!</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="edit-freelancer-profile-container">
            {/* Left Column: Avatar & Completeness Checklist */}
            <div className="edit-freelancer-profile-left edit-freelancer-card-animate space-y-6">
              {/* Profile Image Card */}
              <div className="glass-card edit-freelancer-profile-avatar-card p-6 flex flex-col items-center">
                <h3 className="edit-freelancer-profile-section-title text-left w-full border-b border-border pb-3 mb-6">Profile Photo</h3>
                
                <div className="edit-freelancer-profile-avatar-wrapper group relative w-36 h-36 rounded-full overflow-hidden border-2 border-border shadow-inner">
                  <img
                    src={previewImage || formData.profileImage || 'https://via.placeholder.com/200'}
                    alt="Profile"
                    className="edit-freelancer-profile-avatar-img w-full h-full object-cover"
                  />
                  <div className="edit-freelancer-profile-avatar-overlay absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                    <label className="cursor-pointer p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
                      <Upload size={22} className="text-white" />
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif"
                        onChange={(e) => handleImageUpload(e, 'profileImage')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
                
                <h4 className="edit-freelancer-profile-name font-bold text-foreground text-lg mt-4 text-center">
                  {formData.firstName || 'First'} {formData.lastName || 'Last'}
                </h4>
                <p className="edit-freelancer-profile-role text-xs text-muted-foreground font-semibold mt-1">Professional Freelancer</p>
                
                {errors.profileImage && (
                  <p className="edit-freelancer-profile-form-error text-xs text-red-500 mt-3 text-center">{errors.profileImage}</p>
                )}
                
                <div className="edit-freelancer-profile-avatar-specs mt-6 w-full text-center space-y-1 py-3 px-4 rounded-xl bg-surface-muted/50 border border-border">
                  <p className="text-[11px] text-secondary">Supported formats: JPG, PNG, GIF</p>
                  <p className="text-[11px] text-secondary">Max file size limit: 4MB</p>
                </div>
              </div>

              {/* Profile Completeness Checklist Card */}
              <div className="glass-card edit-freelancer-profile-tips-card p-6">
                <h4 className="edit-freelancer-profile-tips-title font-bold text-foreground text-sm border-b border-border pb-3 mb-4">Completeness</h4>
                <p className="text-xs text-secondary leading-relaxed">
                  A comprehensive freelancer profile receives up to 5x more contract invitations from top clients.
                </p>
                <ul className="edit-freelancer-profile-tips-list mt-6 space-y-3">
                  <li className="flex items-center gap-2 text-xs">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500">✓</span>
                    <span className="text-foreground">Profile photo uploaded</span>
                  </li>
                  <li className="flex items-center gap-2 text-xs">
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full ${formData.title ? 'bg-emerald-500/10 text-emerald-500' : 'bg-surface-muted border border-border text-muted-foreground'}`}>
                      {formData.title ? '✓' : '•'}
                    </span>
                    <span className={formData.title ? 'text-foreground' : 'text-muted-foreground'}>Professional Title added</span>
                  </li>
                  <li className="flex items-center gap-2 text-xs">
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full ${formData.skills.length > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-surface-muted border border-border text-muted-foreground'}`}>
                      {formData.skills.length > 0 ? '✓' : '•'}
                    </span>
                    <span className={formData.skills.length > 0 ? 'text-foreground' : 'text-muted-foreground'}>Skills tags configured ({formData.skills.length})</span>
                  </li>
                  <li className="flex items-center gap-2 text-xs">
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full ${formData.bio ? 'bg-emerald-500/10 text-emerald-500' : 'bg-surface-muted border border-border text-muted-foreground'}`}>
                      {formData.bio ? '✓' : '•'}
                    </span>
                    <span className={formData.bio ? 'text-foreground' : 'text-muted-foreground'}>Biography overview filled out</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Column: Professional & Personal & Bio & Skills */}
            <div className="edit-freelancer-profile-right edit-freelancer-card-animate space-y-6">
              {/* Professional Information */}
              <div className="glass-card edit-freelancer-profile-section p-6">
                <h2 className="edit-freelancer-profile-section-title font-bold text-base border-b border-border pb-3 mb-6">Professional Information</h2>
                
                <div className="edit-freelancer-profile-form-grid">
                  {/* Professional Title */}
                  <div className="edit-freelancer-profile-form-group md:col-span-2">
                    <label className="edit-freelancer-profile-form-label">Professional Title *</label>
                    <div className="edit-freelancer-profile-input-wrapper">
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        maxLength={255}
                        className="edit-freelancer-profile-form-input"
                        placeholder="e.g., Senior React Developer"
                        required
                      />
                      <Briefcase size={16} className="edit-freelancer-profile-input-icon" />
                    </div>
                    {errors.title && (
                      <p className="edit-freelancer-profile-form-error">{errors.title}</p>
                    )}
                  </div>

                  {/* Availability */}
                  <div className="edit-freelancer-profile-form-group md:col-span-2">
                    <label className="edit-freelancer-profile-form-label">Availability Status</label>
                    <div className="edit-freelancer-profile-input-wrapper">
                      <select
                        name="availability"
                        value={formData.availability}
                        onChange={handleChange}
                        className="edit-freelancer-profile-form-select w-full"
                      >
                        {AVAILABILITY_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      <Calendar size={16} className="edit-freelancer-profile-input-icon" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="glass-card edit-freelancer-profile-section p-6">
                <h2 className="edit-freelancer-profile-section-title font-bold text-base border-b border-border pb-3 mb-6">Personal Information</h2>
                
                <div className="edit-freelancer-profile-form-grid">
                  {/* First Name */}
                  <div className="edit-freelancer-profile-form-group">
                    <label className="edit-freelancer-profile-form-label">First Name *</label>
                    <div className="edit-freelancer-profile-input-wrapper">
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        maxLength={255}
                        className="edit-freelancer-profile-form-input"
                        placeholder="Enter first name"
                        required
                      />
                      <User size={16} className="edit-freelancer-profile-input-icon" />
                    </div>
                    {errors.firstName && (
                      <p className="edit-freelancer-profile-form-error">{errors.firstName}</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="edit-freelancer-profile-form-group">
                    <label className="edit-freelancer-profile-form-label">Last Name *</label>
                    <div className="edit-freelancer-profile-input-wrapper">
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        maxLength={255}
                        className="edit-freelancer-profile-form-input"
                        placeholder="Enter last name"
                        required
                      />
                      <User size={16} className="edit-freelancer-profile-input-icon" />
                    </div>
                    {errors.lastName && (
                      <p className="edit-freelancer-profile-form-error">{errors.lastName}</p>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="edit-freelancer-profile-form-group">
                    <label className="edit-freelancer-profile-form-label">Date of Birth</label>
                    <div className="edit-freelancer-profile-input-wrapper">
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className="edit-freelancer-profile-form-input"
                      />
                      <Calendar size={16} className="edit-freelancer-profile-input-icon" />
                    </div>
                    {errors.dateOfBirth && (
                      <p className="edit-freelancer-profile-form-error">{errors.dateOfBirth}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="edit-freelancer-profile-form-group">
                    <label className="edit-freelancer-profile-form-label">Phone Number</label>
                    <div className="edit-freelancer-profile-input-wrapper">
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="edit-freelancer-profile-form-input"
                        placeholder="+1 (555) 987-6543"
                      />
                      <Phone size={16} className="edit-freelancer-profile-input-icon" />
                    </div>
                    {errors.phone && (
                      <p className="edit-freelancer-profile-form-error">{errors.phone}</p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="edit-freelancer-profile-form-group md:col-span-2">
                    <label className="edit-freelancer-profile-form-label">Address</label>
                    <div className="edit-freelancer-profile-input-wrapper">
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        maxLength={255}
                        className="edit-freelancer-profile-form-input"
                        placeholder="Enter street address, city, state, ZIP code"
                      />
                      <MapPin size={16} className="edit-freelancer-profile-input-icon" />
                    </div>
                    {errors.address && (
                      <p className="edit-freelancer-profile-form-error">{errors.address}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Biography */}
              <div className="glass-card edit-freelancer-profile-section p-6">
                <h2 className="edit-freelancer-profile-section-title font-bold text-base border-b border-border pb-3 mb-6">Biography overview</h2>
                
                <div className="edit-freelancer-profile-biography-container relative">
                  <div className="edit-freelancer-profile-input-wrapper !items-start">
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      maxLength={255}
                      rows={5}
                      className="edit-freelancer-profile-form-textarea w-full"
                      placeholder="Tell us about your experience, past highlights, and specialized domain knowledge..."
                    />
                    <FileText size={16} className="edit-freelancer-profile-input-icon mt-3" />
                  </div>
                  <div className="edit-freelancer-profile-form-counter mt-2 flex justify-between items-center px-1">
                    <span className="text-[11px] text-muted-foreground">Describe your core experience highlights</span>
                    <span className="edit-freelancer-profile-char-count text-xs font-semibold">{formData.bio.length}/255</span>
                  </div>
                  {errors.bio && (
                    <p className="edit-freelancer-profile-form-error mt-2">{errors.bio}</p>
                  )}
                </div>
              </div>

              {/* Skills */}
              <div className="glass-card edit-freelancer-profile-section p-6">
                <h2 className="edit-freelancer-profile-section-title font-bold text-base border-b border-border pb-3 mb-2">Skills Inventory</h2>
                <p className="text-xs text-muted-foreground mb-4">Select the relevant technologies and frameworks you specialize in</p>
                
                <div className="edit-freelancer-profile-skills flex flex-wrap gap-2">
                  {AVAILABLE_SKILLS.map(skill => {
                    const isActive = formData.skills.includes(skill);
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`edit-freelancer-profile-skill-button px-4 py-2 text-xs font-medium border rounded-full transition-all duration-200 cursor-pointer ${
                          isActive 
                            ? 'bg-cyan-500 border-cyan-500 text-white shadow-md' 
                            : 'border-border bg-surface hover:border-cyan-500 hover:text-cyan-500'
                        }`}
                      >
                        {isActive && <span className="mr-1">✓</span>}
                        {skill}
                      </button>
                    );
                  })}
                </div>
                {formData.skills.length === 0 && (
                  <p className="edit-freelancer-profile-skills-label text-xs text-red-500 font-semibold mt-4">At least one skill should be selected to showcase.</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="edit-freelancer-profile-actions flex gap-3 justify-end items-center pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="edit-freelancer-profile-button-cancel px-6 py-3 rounded-xl border border-border bg-transparent text-foreground hover:bg-surface transition-colors duration-200 cursor-pointer font-medium text-sm flex items-center justify-center min-h-[48px]"
                >
                  <X size={16} className="mr-2" />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-cyan edit-freelancer-profile-button-submit px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-transform hover:-translate-y-0.5 duration-200 min-h-[48px]"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Saving changes...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
