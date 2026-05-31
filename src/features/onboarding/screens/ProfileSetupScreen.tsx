import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronRight, Building, MapPin, Globe, Briefcase, DollarSign, Award, Sparkles } from 'lucide-react';
import { useApp } from '../../../app/providers/AppProvider';
import { GuestLayout } from '../../../shared/components/AppLayout';
import { profilePutAPI } from '../../../api/profileAPI';
import { UserRole } from '../../../types/models/User';
import type { UpdateClientProfileDto, UpdateFreelancerProfileDto } from '../../../types/models/Profile';
import '../styles/profile-setup-screen.css';

const INDUSTRIES = [
  'Technology', 'Finance', 'Healthcare', 'E-commerce', 'Education', 
  'Marketing', 'Real Estate', 'Entertainment', 'Manufacturing', 'Other'
];

const EXPERIENCE_LEVELS = [
  { value: 0, label: 'Entry Level (0-2 years)' },
  { value: 1, label: 'Intermediate (3-5 years)' },
  { value: 2, label: 'Expert (5+ years)' },
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

  useEffect(() => {
    if (role === UserRole.Admin) {
      navigate('/admin', { replace: true });
    }
  }, [navigate, role]);

  // Client form data
  const [clientData, setClientData] = useState({
    CompanyName: '',
    CompanyWebsite: '',
    CompanySize: 0,
    Industry: '',
    Location: '',
    CompanyDescription: '',
  });

  // Freelancer form data
  const [freelancerData, setFreelancerData] = useState<UpdateFreelancerProfileDto>({
    title: '',
    bio: '',
    hourlyRate: 0,
    experienceLevel: 0,
    availability: 0,
    location: '',
  });

  const isClient = role === 0;
  const totalSteps = 2;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const profileData = isClient ? clientData : freelancerData;
      
      // Save profile (backend will automatically set isSetup = true)
      console.log('Saving profile...');
      if (isClient) {
        const response = await profilePutAPI.updateClientProfile(profileData as UpdateClientProfileDto);
        if (!response.success) {
          throw new Error(response.message || 'Failed to save profile');
        }
        console.log('Profile saved successfully');
      } else {
        const response = await profilePutAPI.updateFreelancerProfile(profileData as UpdateFreelancerProfileDto);
        if (!response.success) {
          throw new Error(response.message || 'Failed to save profile');
        }
        console.log('Profile saved successfully');
      }
      
      // Update localStorage
      const userStr = localStorage.getItem('gigbridge_user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.is_setup = true;
        localStorage.setItem('gigbridge_user', JSON.stringify(user));
        
        const sessionStr = localStorage.getItem('gigbridge_session');
        if (sessionStr) {
          const session = JSON.parse(sessionStr);
          session.user.is_setup = true;
          localStorage.setItem('gigbridge_session', JSON.stringify(session));
        }
      }
      
      // Update AppProvider state
      markSetupComplete();
      
      // Navigate to dashboard
      console.log('Navigating to dashboard...');
      navigate(isClient ? '/client/dashboard' : '/freelancer/dashboard');
    } catch (error) {
      console.error('Setup failed:', error);
      setError((error as any).message || 'Failed to complete setup. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    if (isClient) {
      if (step === 1) return clientData.CompanyName && clientData.Industry;
      return clientData.Location;
    } else {
      if (step === 1) return freelancerData.title && freelancerData.hourlyRate && freelancerData.hourlyRate > 0;
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
                    value={clientData.CompanyName}
                    onChange={e => setClientData({ ...clientData, CompanyName: e.target.value })}
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
                    value={clientData.Industry}
                    onChange={e => setClientData({ ...clientData, Industry: e.target.value })}
                    className="input-gb"
                  >
                    <option value="">Select an industry</option>
                    {INDUSTRIES.map(ind => (
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
                    value={clientData.CompanyWebsite}
                    onChange={e => setClientData({ ...clientData, CompanyWebsite: e.target.value })}
                    placeholder="https://yourcompany.com"
                    className="input-gb"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Briefcase size={16} />
                    Company Size (Number of Employees)
                  </label>
                  <input
                    type="number"
                    value={clientData.CompanySize || ''}
                    onChange={e => setClientData({ ...clientData, CompanySize: parseInt(e.target.value) || 0 })}
                    placeholder="e.g., 10"
                    min="0"
                    className="input-gb"
                  />
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
                  <input
                    type="text"
                    value={clientData.Location}
                    onChange={e => setClientData({ ...clientData, Location: e.target.value })}
                    placeholder="City, Country"
                    className="input-gb"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Company Description</label>
                  <textarea
                    value={clientData.CompanyDescription}
                    onChange={e => setClientData({ ...clientData, CompanyDescription: e.target.value })}
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
                    <DollarSign size={16} />
                    Hourly Rate (USD) *
                  </label>
                  <input
                    type="number"
                    value={freelancerData.hourlyRate || ''}
                    onChange={e => setFreelancerData({ ...freelancerData, hourlyRate: parseFloat(e.target.value) || 0 })}
                    placeholder="50"
                    min="0"
                    className="input-gb"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Award size={16} />
                    Experience Level
                  </label>
                  <div className="radio-group">
                    {EXPERIENCE_LEVELS.map(level => (
                      <button
                        key={level.value}
                        onClick={() => setFreelancerData({ ...freelancerData, experienceLevel: level.value })}
                        className={`radio-button ${freelancerData.experienceLevel === level.value ? 'radio-button-active' : ''}`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
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
                  <input
                    type="text"
                    value={freelancerData.location || ''}
                    onChange={e => setFreelancerData({ ...freelancerData, location: e.target.value })}
                    placeholder="City, Country"
                    className="input-gb"
                  />
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
