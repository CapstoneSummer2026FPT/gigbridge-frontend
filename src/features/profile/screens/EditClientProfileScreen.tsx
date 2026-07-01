import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Upload, Check, User, Phone, MapPin, Calendar, Building2, Globe, FileText, X } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { SEED_CLIENT_PROFILES } from '../../../mock_backend/database/seed';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { useTranslation } from '../../../hooks/useTranslation';
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
  const { t } = useTranslation();

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
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
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
      newErrors.firstName = t('profile.errors.charLimit');
    }
    if (formData.firstName.trim().length === 0) {
      newErrors.firstName = t('profile.errors.emptySpaceFirst');
    }

    // Last Name validation (BR-25)
    if (formData.lastName.length > 255) {
      newErrors.lastName = t('profile.errors.charLimit');
    }
    if (formData.lastName.trim().length === 0) {
      newErrors.lastName = t('profile.errors.emptySpaceLast');
    }

    // Address validation (BR-26)
    if (formData.address.length > 255) {
      newErrors.address = t('profile.errors.charLimit');
    }
    if (formData.address.trim().length === 0 && formData.address.length > 0) {
      newErrors.address = t('profile.errors.emptySpaceAddress');
    }

    // Phone validation (BR-27)
    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (formData.phone && !/^\d+$|^[\d\s\-\+\(\)]+$/.test(formData.phone)) {
      newErrors.phone = t('profile.errors.invalidPhone');
    }
    if (formData.phone && (phoneDigits.length < 8 || phoneDigits.length > 20)) {
      newErrors.phone = t('profile.errors.phoneLimit');
    }

    // Bio validation (BR-28)
    if (formData.bio.length > 255) {
      newErrors.bio = t('profile.errors.charLimit');
    }
    if (formData.bio.trim().length === 0 && formData.bio.length > 0) {
      newErrors.bio = t('profile.errors.emptySpaceBio');
    }

    // Date of Birth validation (BR-23)
    if (formData.dateOfBirth) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(formData.dateOfBirth)) {
        newErrors.dateOfBirth = t('profile.errors.invalidDate');
      } else {
        const date = new Date(formData.dateOfBirth);
        const today = new Date();
        if (date > today) {
          newErrors.dateOfBirth = t('profile.errors.futureBirth');
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
        [imageType]: t('profile.errors.invalidPhotoType')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (isMounted.current) {
        setSuccessMessage(t('profile.operationSuccess'));
        setTimeout(() => {
          if (isMounted.current) {
            setSuccessMessage('');
            navigate(`/profile/client/${user?.id}`);
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

  // GSAP Entrance Animations
  useGSAP(() => {
    // Header transition
    gsap.from('.edit-client-profile-header', {
      opacity: 0,
      y: -20,
      duration: 0.6,
      ease: 'power3.out',
    });

    // Staggered slide/fade for main layout blocks
    gsap.from('.edit-client-card-animate', {
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
        <div className="edit-client-profile-header mb-8">
          <button
            onClick={handleCancel}
            className="p-3 rounded-xl transition-all hover:bg-surface border border-transparent hover:border-border cursor-pointer flex items-center justify-center"
            type="button"
          >
            <ArrowLeft size={18} className="text-primary" />
          </button>
          <div>
            <h1 className="edit-client-profile-header-title text-2xl font-bold text-foreground leading-tight">
              {t('profile.editClientProfile')}
            </h1>
            <p className="text-sm text-secondary mt-1">{t('profile.configurePersonalCorporate')}</p>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="edit-client-profile-success-message flex items-center gap-3 p-4 rounded-xl border mb-6">
            <Check size={18} className="text-emerald-500" />
            <p className="text-sm font-medium text-emerald-500">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="edit-client-profile-container">
            {/* Left Column: Avatar & Completeness Checklist */}
            <div className="edit-client-profile-left edit-client-card-animate space-y-6">
              {/* Profile Image Card */}
              <div className="glass-card edit-client-profile-avatar-card p-6 flex flex-col items-center">
                <h3 className="edit-client-profile-section-title text-left w-full border-b border-border pb-3 mb-6">{t('profile.photo')}</h3>
                
                <div className="edit-client-profile-avatar-wrapper group relative w-36 h-36 rounded-full overflow-hidden border-2 border-border shadow-inner">
                  <img
                    src={previewImage || formData.profileImage || 'https://via.placeholder.com/200'}
                    alt="Profile"
                    className="edit-client-profile-avatar-img w-full h-full object-cover"
                  />
                  <div className="edit-client-profile-avatar-overlay absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
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
                
                <h4 className="edit-client-profile-name font-bold text-foreground text-lg mt-4 text-center">
                  {formData.firstName || t('profile.firstNamePlaceholder')} {formData.lastName || t('profile.lastNamePlaceholder')}
                </h4>
                <p className="edit-client-profile-role text-xs text-muted-foreground font-semibold mt-1">{t('profile.representativeClient')}</p>
                
                {errors.profileImage && (
                  <p className="edit-client-profile-form-error text-xs text-red-500 mt-3 text-center">{errors.profileImage}</p>
                )}
                
                <div className="edit-client-profile-avatar-specs mt-6 w-full text-center space-y-1 py-3 px-4 rounded-xl bg-surface-muted/50 border border-border">
                  <p className="text-[11px] text-secondary">{t('profile.photoSpecs')}</p>
                  <p className="text-[11px] text-secondary">{t('profile.photoSpecsSize')}</p>
                </div>
              </div>

              {/* Profile Completeness Checklist Card */}
              <div className="glass-card edit-client-profile-tips-card p-6">
                <h4 className="edit-client-profile-tips-title font-bold text-foreground text-sm border-b border-border pb-3 mb-4">{t('profile.completeness')}</h4>
                <p className="text-xs text-secondary leading-relaxed">
                  {t('profile.completenessDescClient')}
                </p>
                <ul className="edit-client-profile-tips-list mt-6 space-y-3">
                  <li className="flex items-center gap-2 text-xs">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-500">✓</span>
                    <span className="text-foreground">{t('profile.photoUploaded')}</span>
                  </li>
                  <li className="flex items-center gap-2 text-xs">
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full ${formData.companyName ? 'bg-emerald-500/10 text-emerald-500' : 'bg-surface-muted border border-border text-muted-foreground'}`}>
                      {formData.companyName ? '✓' : '•'}
                    </span>
                    <span className={formData.companyName ? 'text-foreground' : 'text-muted-foreground'}>{t('profile.companyNameConfigured')}</span>
                  </li>
                  <li className="flex items-center gap-2 text-xs">
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full ${formData.companyWebsite ? 'bg-emerald-500/10 text-emerald-500' : 'bg-surface-muted border border-border text-muted-foreground'}`}>
                      {formData.companyWebsite ? '✓' : '•'}
                    </span>
                    <span className={formData.companyWebsite ? 'text-foreground' : 'text-muted-foreground'}>{t('profile.websiteConfigured')}</span>
                  </li>
                  <li className="flex items-center gap-2 text-xs">
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full ${formData.bio ? 'bg-emerald-500/10 text-emerald-500' : 'bg-surface-muted border border-border text-muted-foreground'}`}>
                      {formData.bio ? '✓' : '•'}
                    </span>
                    <span className={formData.bio ? 'text-foreground' : 'text-muted-foreground'}>{t('profile.bioConfigured')}</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Right Column: Personal & Company & Bio Details */}
            <div className="edit-client-profile-right edit-client-card-animate space-y-6">
              {/* Personal Information */}
              <div className="glass-card edit-client-profile-section p-6">
                <h2 className="edit-client-profile-section-title font-bold text-base border-b border-border pb-3 mb-6">{t('profile.personalInformation')}</h2>
                
                <div className="edit-client-profile-form-grid">
                  {/* First Name */}
                  <div className="edit-client-profile-form-group">
                    <label className="edit-client-profile-form-label">{t('profile.firstName')} *</label>
                    <div className="edit-client-profile-input-wrapper">
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        maxLength={255}
                        className="edit-client-profile-form-input"
                        placeholder={t('profile.firstNamePlaceholder')}
                        required
                      />
                      <User size={16} className="edit-client-profile-input-icon" />
                    </div>
                    {errors.firstName && (
                      <p className="edit-client-profile-form-error">{errors.firstName}</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="edit-client-profile-form-group">
                    <label className="edit-client-profile-form-label">{t('profile.lastName')} *</label>
                    <div className="edit-client-profile-input-wrapper">
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        maxLength={255}
                        className="edit-client-profile-form-input"
                        placeholder={t('profile.lastNamePlaceholder')}
                        required
                      />
                      <User size={16} className="edit-client-profile-input-icon" />
                    </div>
                    {errors.lastName && (
                      <p className="edit-client-profile-form-error">{errors.lastName}</p>
                    )}
                  </div>

                  {/* Date of Birth */}
                  <div className="edit-client-profile-form-group">
                    <label className="edit-client-profile-form-label">{t('profile.dateOfBirth')}</label>
                    <div className="edit-client-profile-input-wrapper">
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleChange}
                        className="edit-client-profile-form-input"
                      />
                      <Calendar size={16} className="edit-client-profile-input-icon" />
                    </div>
                    {errors.dateOfBirth && (
                      <p className="edit-client-profile-form-error">{errors.dateOfBirth}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="edit-client-profile-form-group">
                    <label className="edit-client-profile-form-label">{t('profile.phone')}</label>
                    <div className="edit-client-profile-input-wrapper">
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="edit-client-profile-form-input"
                        placeholder={t('profile.phonePlaceholder')}
                      />
                      <Phone size={16} className="edit-client-profile-input-icon" />
                    </div>
                    {errors.phone && (
                      <p className="edit-client-profile-form-error">{errors.phone}</p>
                    )}
                  </div>

                  {/* Address */}
                  <div className="edit-client-profile-form-group md:col-span-2">
                    <label className="edit-client-profile-form-label">{t('profile.address')}</label>
                    <div className="edit-client-profile-input-wrapper">
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleChange}
                        maxLength={255}
                        className="edit-client-profile-form-input"
                        placeholder={t('profile.addressPlaceholder')}
                      />
                      <MapPin size={16} className="edit-client-profile-input-icon" />
                    </div>
                    {errors.address && (
                      <p className="edit-client-profile-form-error">{errors.address}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Company Information */}
              <div className="glass-card edit-client-profile-section p-6">
                <h2 className="edit-client-profile-section-title font-bold text-base border-b border-border pb-3 mb-6">{t('profile.companyDetails')}</h2>
                
                <div className="edit-client-profile-form-grid">
                  {/* Company Name */}
                  <div className="edit-client-profile-form-group">
                    <div className="flex justify-between items-center mb-1">
                      <label className="edit-client-profile-form-label !mb-0">{t('profile.companyName')}</label>
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">{t('common.optional', { defaultValue: 'Optional' })}</span>
                    </div>
                    <div className="edit-client-profile-input-wrapper">
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        className="edit-client-profile-form-input"
                        placeholder={t('profile.companyNamePlaceholder')}
                      />
                      <Building2 size={16} className="edit-client-profile-input-icon" />
                    </div>
                  </div>

                  {/* Company Website */}
                  <div className="edit-client-profile-form-group">
                    <div className="flex justify-between items-center mb-1">
                      <label className="edit-client-profile-form-label !mb-0">{t('profile.websiteUrl')}</label>
                      <span className="text-[10px] text-muted-foreground uppercase font-medium">{t('common.optional', { defaultValue: 'Optional' })}</span>
                    </div>
                    <div className="edit-client-profile-input-wrapper">
                      <input
                        type="url"
                        name="companyWebsite"
                        value={formData.companyWebsite}
                        onChange={handleChange}
                        className="edit-client-profile-form-input"
                        placeholder={t('profile.websitePlaceholder')}
                      />
                      <Globe size={16} className="edit-client-profile-input-icon" />
                    </div>
                  </div>

                  {/* Industry */}
                  <div className="edit-client-profile-form-group md:col-span-2">
                    <label className="edit-client-profile-form-label">{t('profile.industry')}</label>
                    <div className="edit-client-profile-input-wrapper">
                      <select
                        name="industry"
                        value={formData.industry}
                        onChange={handleChange}
                        className="edit-client-profile-form-select w-full"
                      >
                        {INDUSTRIES.map(ind => (
                          <option key={ind} value={ind}>{ind}</option>
                        ))}
                      </select>
                      <Building2 size={16} className="edit-client-profile-input-icon" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio / Description */}
              <div className="glass-card edit-client-profile-section p-6">
                <h2 className="edit-client-profile-section-title font-bold text-base border-b border-border pb-3 mb-6">{t('profile.biographySummary')}</h2>
                
                <div className="edit-client-profile-biography-container relative">
                  <div className="edit-client-profile-input-wrapper !items-start">
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      maxLength={255}
                      rows={5}
                      className="edit-client-profile-form-textarea w-full"
                      placeholder={t('profile.bioPlaceholderClient')}
                    />
                    <FileText size={16} className="edit-client-profile-input-icon mt-3" />
                  </div>
                  <div className="edit-client-profile-form-counter mt-2 flex justify-between items-center px-1">
                    <span className="text-[11px] text-muted-foreground">{t('profile.bioCounterDescClient')}</span>
                    <span className="edit-client-profile-char-count text-xs font-semibold">{formData.bio.length}/255</span>
                  </div>
                  {errors.bio && (
                    <p className="edit-client-profile-form-error mt-2">{errors.bio}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="edit-client-profile-actions flex gap-3 justify-end items-center pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="edit-client-profile-button-cancel px-6 py-3 rounded-xl border border-border bg-transparent text-foreground hover:bg-surface transition-colors duration-200 cursor-pointer font-medium text-sm flex items-center justify-center min-h-[48px]"
                >
                  <X size={16} className="mr-2" />
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-cyan edit-client-profile-button-submit px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-sm flex items-center justify-center gap-2 cursor-pointer transition-transform hover:-translate-y-0.5 duration-200 min-h-[48px]"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      {t('profile.savingChanges')}
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      {t('profile.saveChanges')}
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

