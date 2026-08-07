import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, Building, MapPin, Globe, Briefcase, Sparkles, Tags, RefreshCw } from 'lucide-react';
import { useApp } from '../../../app/providers/AppProvider';
import { GuestLayout } from '../../../shared/components/AppLayout';
import { profilePutAPI, profileGetAPI } from '../../../api/profileAPI';
import { UserRole } from '../../../types/models/User';
import type { UpdateClientProfileDto, UpdateFreelancerProfileDto } from '../../../types/models/Profile';
import type { CategoryOptionDto, MajorDto } from '../../../types/models/Category';
import { jobAPI } from '../../../api/jobAPI';
import { secureStorage } from '../../../shared/utils/secureStorage';
import { LocationPickerModal } from '../../../shared/components/LocationPickerModal';
import '../styles/profile-setup-screen.css';

const INDUSTRIES_FALLBACK = [
  'Technology', 'Finance', 'Healthcare', 'E-commerce', 'Education', 
  'Marketing', 'Real Estate', 'Entertainment', 'Manufacturing', 'Other'
];

const COMPANY_SIZES_FALLBACK = [
  { id: 0, name: 'Solo (1-9 employees)' },
  { id: 1, name: 'Small (10-49 employees)' },
  { id: 2, name: 'Medium (50-249 employees)' },
  { id: 3, name: 'Large (250+ employees)' }
];

const AVAILABILITY = [
  { value: 0, label: 'Available - More than 30 hrs/week' },
  { value: 1, label: 'Busy - Less than 30 hrs/week' },
  { value: 2, label: 'Not Available' },
];

export default function ProfileSetupScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Safely get app context
  let appContext;
  try {
    appContext = useApp();
  } catch (e) {
    appContext = null;
  }

  const role = appContext?.role ?? 0;
  const markSetupComplete = appContext?.markSetupComplete || (() => {});

  const [companySizes, setCompanySizes] = useState<{ id: number; name: string }[]>(COMPANY_SIZES_FALLBACK);
  const [industries, setIndustries] = useState<string[]>(INDUSTRIES_FALLBACK);
  const [majors, setMajors] = useState<MajorDto[]>([]);
  const [categories, setCategories] = useState<CategoryOptionDto[]>([]);
  const [isTaxonomyLoading, setIsTaxonomyLoading] = useState(false);
  const [taxonomyError, setTaxonomyError] = useState<string | null>(null);

  useEffect(() => {
    if (role === 0) { // Client
      const fetchLookups = async () => {
        try {
          const [sizesRes, indRes] = await Promise.all([
            profileGetAPI.getCompanySizes(),
            profileGetAPI.getIndustries()
          ]);
          if (sizesRes.success && sizesRes.data) {
            setCompanySizes(sizesRes.data);
          }
          if (indRes.success && indRes.data) {
            setIndustries(indRes.data);
          }
        } catch (err) {
          console.error('Failed to load lookups from BE:', err);
        }
      };
      fetchLookups();
    }
  }, [role]);

  const loadMajors = async () => {
    setIsTaxonomyLoading(true);
    setTaxonomyError(null);
    try {
      const response = await jobAPI.getMajors();
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to load majors.');
      }
      setMajors(response.data);
    } catch (err) {
      setMajors([]);
      setTaxonomyError((err as Error).message || 'Failed to load majors.');
    } finally {
      setIsTaxonomyLoading(false);
    }
  };

  useEffect(() => {
    if (role === UserRole.Freelancer) {
      void loadMajors();
    }
  }, [role]);

  const [clientData, setClientData] = useState({
    companyName: '',
    companyWebsite: '',
    companySize: 0,
    industry: '',
    location: '',
    companyDescription: '',
  });

  // Freelancer form data
  const [freelancerData, setFreelancerData] = useState<UpdateFreelancerProfileDto>({
    title: '',
    bio: '',
    availability: 0,
    location: '',
    majorId: '',
    categoryIds: [],
  });

  const handleMajorChange = async (majorId: string) => {
    setFreelancerData(current => ({ ...current, majorId, categoryIds: [] }));
    setCategories([]);
    setTaxonomyError(null);
    if (!majorId) return;

    setIsTaxonomyLoading(true);
    try {
      const response = await jobAPI.getCategoriesByMajor(majorId);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Failed to load categories.');
      }
      setCategories(response.data);
    } catch (err) {
      setTaxonomyError((err as Error).message || 'Failed to load categories.');
    } finally {
      setIsTaxonomyLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setFreelancerData(current => ({
      ...current,
      categoryIds: current.categoryIds.includes(categoryId)
        ? current.categoryIds.filter(id => id !== categoryId)
        : [...current.categoryIds, categoryId],
    }));
  };

  const isClient = role === 0;
  const totalSteps = 2;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const profileData = isClient ? clientData : freelancerData;
      
      // Save profile (backend will automatically set isSetup = true)
      if (isClient) {
        const response = await profilePutAPI.updateClientProfile(profileData as UpdateClientProfileDto);
        if (!response.success) {
          throw new Error(response.message || 'Failed to save profile');
        }
      } else {
        const response = await profilePutAPI.updateFreelancerProfile(profileData as UpdateFreelancerProfileDto);
        if (!response.success) {
          throw new Error(response.message || 'Failed to save profile');
        }
      }
      
      // Update secureStorage
      const user = secureStorage.getItem<Record<string, unknown>>('gigbridge_user');
      if (user) {
        user.is_setup = true;
        secureStorage.setItem('gigbridge_user', user);
        
        const session = secureStorage.getItem<{ user: Record<string, unknown>; role: unknown }>('gigbridge_session');
        if (session) {
          session.user.is_setup = true;
          secureStorage.setItem('gigbridge_session', session);
        }
      }
      
      // Update AppProvider state
      markSetupComplete();
      
      // Navigate to dashboard
      navigate(isClient ? '/client/dashboard' : '/freelancer/dashboard');
    } catch (error: unknown) {
      console.error('Setup failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to complete setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (isClient) {
      if (step === 1) return clientData.companyName && clientData.industry;
      return clientData.location;
    } else {
      if (step === 1) {
        return Boolean(
          freelancerData.title.trim() &&
          freelancerData.majorId &&
          freelancerData.categoryIds.length > 0 &&
          !isTaxonomyLoading &&
          !taxonomyError
        );
      }
      return freelancerData.location && freelancerData.bio;
    }
  };

  if (role === UserRole.Admin) {
    return null;
  }

  return (
    <GuestLayout>
      <div className="profile-setup-container">
      <div className="profile-setup-content">
        {/* Progress Bar */}
        <div className="profile-setup-progress">
          {[...Array(totalSteps)].map((_, i) => (
            <div
              key={i}
              className={`profile-setup-progress-step ${i < step ? 'profile-setup-progress-step-complete' : ''} ${i === step - 1 ? 'profile-setup-progress-step-active' : ''}`}
            />
          ))}
        </div>

        {/* Header */}
        <div className="profile-setup-header">
          <div className="profile-setup-logo">
            <Sparkles size={20} />
          </div>
          <h1 className="profile-setup-title">
            {isClient ? 'Set Up Your Company Profile' : 'Set Up Your Freelancer Profile'}
          </h1>
          <p className="profile-setup-subtitle">
            Step {step} of {totalSteps}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message" style={{ padding: '12px', marginBottom: '16px', backgroundColor: '#fee', borderRadius: '4px', color: '#c33' }}>
            {error}
          </div>
        )}

        {/* Client Form */}
        {isClient && (
          <div className="profile-setup-form">
            {step === 1 && (
              <div className="profile-setup-step">
                <h2 className="profile-setup-step-title">Company Information</h2>
                
                <div className="form-group">
                  <label className="form-label">
                    <Building size={16} />
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={clientData.companyName}
                    onChange={e => setClientData({ ...clientData, companyName: e.target.value })}
                    placeholder="Enter your company name"
                    className="input-gb"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Briefcase size={16} />
                    Industry *
                  </label>
                  <select
                    value={clientData.industry}
                    onChange={e => setClientData({ ...clientData, industry: e.target.value })}
                    className="input-gb"
                  >
                    <option value="">Select an industry</option>
                    {industries.map(ind => (
                      <option key={ind} value={ind}>{ind}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Globe size={16} />
                    Company Website
                  </label>
                  <input
                    type="url"
                    value={clientData.companyWebsite}
                    onChange={e => setClientData({ ...clientData, companyWebsite: e.target.value })}
                    placeholder="https://yourcompany.com"
                    className="input-gb"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Briefcase size={16} />
                    Company Size *
                  </label>
                  <select
                    value={clientData.companySize}
                    onChange={e => setClientData({ ...clientData, companySize: parseInt(e.target.value) || 0 })}
                    className="input-gb"
                  >
                    {companySizes.map(size => (
                      <option key={size.id} value={size.id}>{size.name}</option>
                    ))}
                  </select>
                </div>

              </div>
            )}

            {step === 2 && (
              <div className="profile-setup-step">
                <h2 className="profile-setup-step-title">Additional Details</h2>
                
                <div className="form-group">
                  <label className="form-label">
                    <MapPin size={16} />
                    Location *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={clientData.location}
                      onChange={e => setClientData({ ...clientData, location: e.target.value })}
                      placeholder="City, Country"
                      className="input-gb pr-12"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                      <LocationPickerModal
                        value={clientData.location}
                        onSelect={loc => setClientData(prev => ({ ...prev, location: loc }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Company Description</label>
                  <textarea
                    value={clientData.companyDescription}
                    onChange={e => setClientData({ ...clientData, companyDescription: e.target.value })}
                    placeholder="Tell us about your company..."
                    rows={4}
                    className="input-gb"
                  />
                </div>

              </div>
            )}
          </div>
        )}

        {/* Freelancer Form */}
        {!isClient && (
          <div className="profile-setup-form">
            {step === 1 && (
              <div className="profile-setup-step">
                <h2 className="profile-setup-step-title">Professional Information</h2>
                
                <div className="form-group">
                  <label className="form-label">
                    <Briefcase size={16} />
                    Professional Title *
                  </label>
                  <input
                    type="text"
                    value={freelancerData.title || ''}
                    onChange={e => setFreelancerData({ ...freelancerData, title: e.target.value })}
                    placeholder="e.g., Full-Stack Developer, UI/UX Designer"
                    className="input-gb"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Briefcase size={16} />
                    Major *
                  </label>
                  <select
                    value={freelancerData.majorId}
                    onChange={event => void handleMajorChange(event.target.value)}
                    className="input-gb"
                    disabled={isTaxonomyLoading && majors.length === 0}
                  >
                    <option value="">{isTaxonomyLoading && majors.length === 0 ? 'Loading majors...' : 'Select your major'}</option>
                    {majors.map(major => (
                      <option key={major.majorId} value={major.majorId}>{major.name}</option>
                    ))}
                  </select>
                </div>

                {freelancerData.majorId && (
                  <div className="form-group">
                    <label className="form-label">
                      <Tags size={16} />
                      Categories *
                    </label>
                    {isTaxonomyLoading ? (
                      <p className="taxonomy-help">Loading categories...</p>
                    ) : categories.length > 0 ? (
                      <div className="taxonomy-category-grid">
                        {categories.map(category => (
                          <label key={category.categoryId} className={`taxonomy-category-option ${freelancerData.categoryIds.includes(category.categoryId) ? 'taxonomy-category-option-selected' : ''}`}>
                            <input
                              type="checkbox"
                              checked={freelancerData.categoryIds.includes(category.categoryId)}
                              onChange={() => toggleCategory(category.categoryId)}
                            />
                            <span>{category.name}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <p className="taxonomy-help">No active categories are available for this major.</p>
                    )}
                    <p className="taxonomy-help">Select one or more categories that best match your work.</p>
                  </div>
                )}

                {taxonomyError && (
                  <div className="taxonomy-error" role="alert">
                    <span>{taxonomyError}</span>
                    <button type="button" onClick={() => freelancerData.majorId ? void handleMajorChange(freelancerData.majorId) : void loadMajors()}>
                      <RefreshCw size={14} /> Retry
                    </button>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="profile-setup-step">
                <h2 className="profile-setup-step-title">Additional Details</h2>
                
                <div className="form-group">
                  <label className="form-label">
                    <MapPin size={16} />
                    Location *
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={freelancerData.location || ''}
                      onChange={e => setFreelancerData({ ...freelancerData, location: e.target.value })}
                      placeholder="City, Country"
                      className="input-gb pr-12"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                      <LocationPickerModal
                        value={freelancerData.location || ''}
                        onSelect={loc => setFreelancerData(prev => ({ ...prev, location: loc }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Bio *</label>
                  <textarea
                    value={freelancerData.bio || ''}
                    onChange={e => setFreelancerData({ ...freelancerData, bio: e.target.value })}
                    placeholder="Tell clients about your skills, experience, and what makes you unique..."
                    rows={4}
                    className="input-gb"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Availability</label>
                  <div className="radio-group">
                    {AVAILABILITY.map(avail => (
                      <button
                        key={avail.value}
                        onClick={() => setFreelancerData({ ...freelancerData, availability: avail.value })}
                        className={`radio-button ${freelancerData.availability === avail.value ? 'radio-button-active' : ''}`}
                      >
                        {avail.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="profile-setup-actions">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="btn-ghost-cyan"
            >
              Back
            </button>
          )}
          
          {step < totalSteps ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className={`btn-cyan ${!canProceed() ? 'btn-disabled' : ''}`}
            >
              Continue
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canProceed() || isSubmitting}
              className={`btn-cyan ${(!canProceed() || isSubmitting) ? 'btn-disabled' : ''}`}
            >
              {isSubmitting ? 'Completing...' : 'Complete Setup'}
              <ChevronRight size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
    </GuestLayout>
  );
}
