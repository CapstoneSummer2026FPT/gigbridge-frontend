import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle, Briefcase, Code, ChevronRight, AlertCircle } from 'lucide-react';
import { useApp } from '../../../app/providers/AppProvider';
import { UserRole } from '../../../types/models/User';
import { authAPI } from '../../../api/authAPI';
import { toast } from 'sonner';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { getErrorMessage } from '../../../shared/utils/errorUtils';
import '../styles/auth-screen.css';
import { useTranslation } from '../../../hooks/useTranslation';
import { getGoogleOAuth2, type GoogleCodeClient } from '../googleIdentity';


type SignupStep = 'role' | 'form';

export default function SignupScreen() {
  const { t } = useTranslation();
  const isMounted = useRef(true);
  const policyAcceptanceRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const navigate = useNavigate();
  const [step, setStep] = useState<SignupStep>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const isLoading = isEmailLoading || isGoogleLoading;
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [googleClient, setGoogleClient] = useState<GoogleCodeClient | null>(null);
  const [googleError, setGoogleError] = useState('');
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const policyAcceptanceRequiredMessage = t('auth.policyAcceptanceRequired');

  const selectedRoleRef = useRef<UserRole | null>(null);
  useEffect(() => {
    selectedRoleRef.current = selectedRole;
  }, [selectedRole]);
  
  // OTP related states
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [verificationTicket, setVerificationTicket] = useState('');
  const [countdown, setCountdown] = useState(0);

  const [formData, setFormData] = useState({ 
    fullName: '', 
    email: '', 
    password: '',
    otpCode: '',
  });

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Google GIS Client Initialization
  useEffect(() => {
    const interval = setInterval(() => {
      const googleOAuth2 = getGoogleOAuth2();
      if (googleOAuth2) {
        clearInterval(interval);

        const client = googleOAuth2.initCodeClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: "openid email profile",
          ux_mode: "popup",
          callback: response => {
            if (response.code) {
              void handleGoogleSignup(response.code);
            }
          },
        });

        setGoogleClient(client);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const handleGoogleSignup = async (authCode: string) => {
    setIsGoogleLoading(true);
    setError('');
    setGoogleError('');
    try {
      const currentRole = selectedRoleRef.current;
      if (currentRole === null) {
        throw new Error('Please select a role first');
      }

      const googleLogin = appContext?.googleLogin || (async () => undefined);
      await googleLogin(authCode, currentRole, false);

      toast.success('Welcome! Google registration successful.', {
        style: {
          background: '#4ADE80',
          color: '#FFFFFF',
          border: '2px solid #22C55E',
          fontSize: '14px',
          fontWeight: '600',
        },
        duration: 3000,
      });

      // Google Sign Up redirects new user directly to onboarding profile setup
      navigate('/onboarding/profile-setup');
    } catch (err: unknown) {
      if (isMounted.current) {
        setGoogleError(getErrorMessage(err));
      }
    } finally {
      if (isMounted.current) {
        setIsGoogleLoading(false);
      }
    }
  };

  const focusPolicyAcceptance = (): void => {
    const policyAcceptance = policyAcceptanceRef.current;
    if (policyAcceptance === null) {
      return;
    }

    policyAcceptance.scrollIntoView({ behavior: 'smooth', block: 'center' });
    policyAcceptance.focus({ preventScroll: true });
  };

  const handleGoogleSignupClick = () => {
    setGoogleError('');
    if (!acceptedPolicy) {
      setPolicyError(policyAcceptanceRequiredMessage);
      focusPolicyAcceptance();
      return;
    }

    const currentRole = selectedRoleRef.current;
    if (currentRole === null) {
      if (isMounted.current) {
        setGoogleError('Your Google account cannot be accessed at this time. Try troubleshooting this issue or contact us for help.');
      }
      return;
    }
    googleClient?.requestCode();
  };

  const handlePolicyAcceptanceChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const isAccepted = event.target.checked;
    setAcceptedPolicy(isAccepted);

    if (!isAccepted) {
      return;
    }

    setPolicyError('');
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSendOtp = async () => {
    if (!formData.email || !isValidEmail(formData.email)) {
      setError('Please enter a valid email address.');
      return;
    }
    
    setError('');
    setSuccessMessage('');
    setVerificationTicket('');
    setIsOtpVerified(false);
    setIsSendingOtp(true);
    try {
      const response = await authAPI.sendOtp({
        email: formData.email,
        purpose: 'signup'
      });
      if (response.success) {
        if (isMounted.current) {
          setSuccessMessage(response.message || 'Verification code sent successfully!');
          setCountdown(60);
        }
      } else {
        if (isMounted.current) {
          setError(getErrorMessage(response));
        }
      }
    } catch (err: unknown) {
      if (isMounted.current) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (isMounted.current) {
        setIsSendingOtp(false);
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (!formData.otpCode) {
      setError('Please enter the OTP verification code.');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsVerifyingOtp(true);
    try {
      const response = await authAPI.verifyOtp({
        email: formData.email,
        otp: formData.otpCode,
        purpose: 'signup'
      });
      
      const ticket = response.data?.verificationTicket;
      if (response.success && ticket) {
        if (isMounted.current) {
          setSuccessMessage(response.message || 'Email verified successfully!');
          setIsOtpVerified(true);
          setVerificationTicket(ticket);
        }
      } else {
        if (isMounted.current) {
          setError(getErrorMessage(response));
        }
      }
    } catch (err: unknown) {
      if (isMounted.current) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (isMounted.current) {
        setIsVerifyingOtp(false);
      }
    }
  };

  let appContext: ReturnType<typeof useApp> | null;
  try {
    appContext = useApp();
  } catch {
    appContext = null;
  }

  const signup = appContext?.signup || (async () => {});

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    localStorage.setItem('selected_role', role.toString());
    setGoogleError('');
    
    // Animate transition to form step
    gsap.to('.auth-role-animate', {
      opacity: 0,
      y: -20,
      stagger: 0.05,
      duration: 0.3,
      onComplete: () => {
        setStep('form');
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptedPolicy) {
      setPolicyError(policyAcceptanceRequiredMessage);
      focusPolicyAcceptance();
      return;
    }

    setPolicyError('');
    setIsEmailLoading(true);

    try {
      if (selectedRole === null) {
        if (isMounted.current) {
          setError('Please select a role');
          setIsEmailLoading(false);
        }
        return;
      }

      if (!isOtpVerified || !verificationTicket) {
        if (isMounted.current) {
          setError('Please verify your email address first.');
          setIsEmailLoading(false);
        }
        return;
      }

      await signup(
        formData.email,
        formData.password,
        formData.fullName,
        selectedRole,
        verificationTicket,
      );
      
      toast.success('Registration successful! Welcome to GigBridge.', {
        style: {
          background: '#4ADE80',
          color: '#FFFFFF',
          border: '2px solid #22C55E',
          fontSize: '14px',
          fontWeight: '600',
        },
        duration: 3000,
      });

      navigate('/onboarding/profile-setup');
    } catch (err: unknown) {
      if (isMounted.current) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (isMounted.current) {
        setIsEmailLoading(false);
      }
    }
  };

  // GSAP Entrance & Step Animations
  useGSAP(() => {
    // Left panel slide-in
    gsap.from('.auth-left-panel', {
      xPercent: -100,
      duration: 1,
      ease: 'power4.out',
    });

    // Left panel content stagger
    gsap.from('.auth-left-content-animate', {
      opacity: 0,
      y: 30,
      stagger: 0.1,
      duration: 0.8,
      ease: 'power3.out',
      delay: 0.2,
    });

    // Right card frame fade
    gsap.from('.auth-form-card', {
      opacity: 0,
      scale: 0.96,
      y: 20,
      duration: 0.9,
      ease: 'power3.out',
    });
  }, []);

  // Animates elements as step updates
  useGSAP(() => {
    if (step === 'role') {
      gsap.fromTo('.auth-role-animate', 
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, stagger: 0.08, duration: 0.6, ease: 'power3.out' }
      );
    } else {
      gsap.fromTo('.auth-form-animate', 
        { opacity: 0, y: 15 },
        { opacity: 1, y: 0, stagger: 0.06, duration: 0.6, ease: 'power3.out' }
      );
    }
  }, [step]);

  return (
    <div className="min-h-screen flex auth-container">
      {/* Background ambient orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 rounded-full auth-orb-cyan pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full auth-orb-purple pointer-events-none" />

      {/* Left Panel - Premium Visual Brand with Full Image & Gradient */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden p-12 auth-left-panel select-none"
        style={{
          backgroundImage: "url('/img/entrance.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}>
        {/* Gradient Overlay: dark on the left to transparent on the right */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent pointer-events-none z-1" />

        <div className="relative z-10 flex flex-col h-full justify-between">
          {/* Logo / Header */}
          <div className="flex items-center gap-3 auth-left-content-animate cursor-pointer" onClick={() => navigate('/')}>
            <img src="/img/logo.png" className="w-10 h-10 object-contain" alt={`${t('app.name')} Logo`} />
            <span className="logo-text logo-text-white text-xl font-black tracking-wider select-none">{t('app.name')}</span>
          </div>

          {/* Big Title & Description (White Text) */}
          <div className="max-w-md my-auto text-left auth-left-content-animate">
            <h2 className="text-4xl xl:text-5xl font-zentry font-black tracking-wider text-white mb-6 uppercase leading-tight">
              {t('auth.careerPartner')}
            </h2>
            <p className="text-lg text-white/80 leading-relaxed font-medium">
              {t('auth.careerPartnerDesc')}
            </p>
          </div>

          {/* Footer */}
          <p className="text-xs text-white/50 auth-left-content-animate">
            © 2026 {t('app.name')} · {t('footer.privacyPolicy')} · {t('footer.termsOfService')}
          </p>
        </div>
      </div>

      {/* Right Panel - Responsive Glassmorphic Signup Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 auth-right-panel">
        <div className="w-full max-w-md auth-form-card p-8 lg:p-10">
          <div className="flex items-center gap-2 mb-8 lg:hidden cursor-pointer" onClick={() => navigate('/')}>
            <img src="/img/logo.png" className="w-8 h-8 object-contain" alt={`${t('app.name')} Logo`} />
            <span className="logo-text font-bold tracking-wider select-none">{t('app.name')}</span>
          </div>

          {step === 'role' ? (
            <>
              <h1 className="text-2xl lg:text-3xl font-zentry font-black tracking-wider text-primary mb-2 uppercase auth-role-animate animate-fade">
                {t('auth.getStartedToday')}
              </h1>
              <p className="mb-6 auth-subtitle auth-role-animate">{t('auth.chooseRole')}</p>

              <div className="space-y-4 mb-6">
                {/* Client Card */}
                <button
                  onClick={() => handleRoleSelect(UserRole.Client)}
                  className={`w-full p-5 rounded-2xl border-2 text-left auth-role-card transition-all auth-role-animate ${
                    selectedRole === UserRole.Client
                      ? 'auth-role-selected-client'
                      : 'auth-role-unselected'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 shrink-0">
                      <Briefcase size={26} className="text-cyan-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-primary text-base">{t('auth.imClient')}</h3>
                      <p className="text-sm text-secondary mt-0.5">{t('auth.imClientDesc')}</p>
                    </div>
                    <ChevronRight size={20} className={`mt-2 transition-transform duration-300 ${selectedRole === UserRole.Client ? 'translate-x-1 text-cyan-500' : 'text-secondary opacity-30'}`} />
                  </div>
                </button>

                {/* Freelancer Card */}
                <button
                  onClick={() => handleRoleSelect(UserRole.Freelancer)}
                  className={`w-full p-5 rounded-2xl border-2 text-left auth-role-card transition-all auth-role-animate ${
                    selectedRole === UserRole.Freelancer
                      ? 'auth-role-selected-freelancer'
                      : 'auth-role-unselected'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 shrink-0">
                      <Code size={26} className="text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-primary text-base">{t('auth.imFreelancer')}</h3>
                      <p className="text-sm text-secondary mt-0.5">{t('auth.imFreelancerDesc')}</p>
                    </div>
                    <ChevronRight size={20} className={`mt-2 transition-transform duration-300 ${selectedRole === UserRole.Freelancer ? 'translate-x-1 text-purple-500' : 'text-secondary opacity-30'}`} />
                  </div>
                </button>
              </div>

              <button
                onClick={() => setStep('form')}
                disabled={selectedRole === null}
                className="btn-cyan w-full py-3 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed auth-role-animate hover:scale-[1.01] transition-transform"
              >
                {t('common.continue')}
                <ArrowRight size={18} />
              </button>

              <p className="text-center mt-6 text-sm auth-switch-text auth-role-animate">
                {t('auth.alreadyHaveAccount')}{' '}
                <button className="font-semibold auth-link-cyan"
                  onClick={() => navigate('/auth/login')}>
                  {t('auth.login')}
                </button>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl lg:text-3xl font-zentry font-black tracking-wider text-primary mb-2 uppercase auth-form-animate">
                {t('auth.createAccount')}
              </h1>
              <p className="mb-6 auth-subtitle auth-form-animate">
                {t('auth.registeringAs', { role: selectedRole === UserRole.Client ? t('projects.client') : t('projects.freelancer') })}
              </p>

              <button className="w-full flex items-center justify-center gap-3 py-3 rounded-xl mb-4 transition-all auth-google-btn auth-form-animate"
                onClick={handleGoogleSignupClick}
                disabled={isLoading || !googleClient}
                type="button">
                {isGoogleLoading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                {isGoogleLoading ? t('auth.verifying') : t('auth.googleSignup')}
              </button>

              {googleError && (
                <div role="alert" className="flex items-start gap-2 mt-2 mb-6 text-sm text-red-500 font-medium text-left auth-form-animate">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                  <span>
                    {googleError}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-6 auth-form-animate">
                <div className="flex-1 auth-divider" />
                <span className="auth-divider-text">{t('auth.orContinueEmail')}</span>
                <div className="flex-1 auth-divider" />
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div role="alert" className="px-4 py-3 rounded-xl text-sm auth-form-animate" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444' }}>
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div className="px-4 py-3 rounded-xl text-sm auth-form-animate" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22C55E' }}>
                    {successMessage}
                  </div>
                )}
                
                <div className="relative auth-form-animate">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon pointer-events-none" />
                  <input type="text" placeholder={t('auth.fullName')} value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    className="input-gb w-full py-3 auth-input-with-icon"
                    disabled={isLoading} required />
                </div>

                <div className="relative auth-form-animate">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon pointer-events-none" />
                  <input type="email" placeholder={t('auth.email')} value={formData.email}
                    onChange={e => {
                      setFormData({ ...formData, email: e.target.value });
                      if (isOtpVerified) {
                        setIsOtpVerified(false);
                        setVerificationTicket('');
                        setSuccessMessage('');
                      }
                    }}
                    className="input-gb w-full py-3 auth-input-with-icon"
                    disabled={isLoading} required />
                </div>

                <div className="flex gap-2 auth-form-animate">
                  <div className="relative flex-1">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon pointer-events-none" />
                    <input type="text" placeholder={t('auth.otpCode')} value={formData.otpCode}
                      onChange={e => {
                        setFormData({ ...formData, otpCode: e.target.value });
                        if (isOtpVerified) {
                          setIsOtpVerified(false);
                          setVerificationTicket('');
                          setSuccessMessage('');
                        }
                      }}
                      className="input-gb w-full py-3 auth-input-with-icon"
                      disabled={isLoading || !formData.email} />
                  </div>
                  <button
                    type="button"
                    onClick={countdown === 0 && !isOtpVerified ? handleSendOtp : handleVerifyOtp}
                    disabled={(countdown === 0 && !isValidEmail(formData.email)) || isOtpVerified || isSendingOtp || isVerifyingOtp || (countdown > 0 && !formData.otpCode)}
                    className="btn-cyan px-4 py-3 shrink-0 flex items-center justify-center gap-2 text-xs font-semibold whitespace-nowrap"
                    style={{ minWidth: '110px' }}
                  >
                    {isSendingOtp ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-[#0A0F1C] border-t-transparent animate-spin" />
                        {t('auth.sending')}
                      </>
                    ) : isVerifyingOtp ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-[#0A0F1C] border-t-transparent animate-spin" />
                        {t('auth.verifying')}
                      </>
                    ) : isOtpVerified ? (
                      <>
                        <CheckCircle size={16} />
                        {t('auth.verified')}
                      </>
                    ) : countdown > 0 ? (
                      `${t('auth.verifyOtp')} (${countdown}s)`
                    ) : (
                      t('auth.sendOtp')
                    )}
                  </button>
                </div>

                {countdown > 0 && !isOtpVerified && (
                  <div className="text-center text-sm auth-form-animate">
                    <span className="text-secondary">{t('auth.didntReceiveOtp')} </span>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                      className="text-cyan-500 hover:text-cyan-400 font-semibold transition-colors"
                    >
                      {t('auth.resendOtp')}
                    </button>
                  </div>
                )}
                 
                <div className="relative auth-form-animate">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon pointer-events-none" />
                  <input type={showPassword ? 'text' : 'password'} placeholder={t('auth.password')} value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="input-gb w-full py-3 auth-input-with-icon auth-input-with-icon-both"
                    disabled={isLoading} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 auth-input-icon"
                    disabled={isLoading}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <div className={`auth-policy-consent flex items-start gap-3 auth-form-animate${policyError ? ' auth-policy-consent--error' : ''}`}>
                  <input
                    ref={policyAcceptanceRef}
                    id="policy-acceptance"
                    type="checkbox"
                    checked={acceptedPolicy}
                    onChange={handlePolicyAcceptanceChange}
                    disabled={isLoading}
                    aria-invalid={policyError ? 'true' : undefined}
                    aria-describedby={policyError ? 'policy-acceptance-error' : undefined}
                    className="auth-policy-checkbox mt-1 h-4 w-4 shrink-0 accent-cyan-500"
                  />
                  <div className="text-sm leading-5 text-secondary">
                    <label htmlFor="policy-acceptance" className="cursor-pointer">
                      {t('auth.policyAgreement')}
                    </label>
                    <div className="mt-1 flex flex-wrap gap-x-2">
                      <a href="/terms" target="_blank" rel="noopener noreferrer" className="auth-link-cyan">
                        {t('footer.termsOfService')}
                      </a>
                      <span aria-hidden="true">·</span>
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="auth-link-cyan">
                        {t('footer.privacyPolicy')}
                      </a>
                    </div>
                    {policyError ? (
                      <div id="policy-acceptance-error" role="alert" className="auth-policy-error">
                        <AlertCircle size={15} aria-hidden="true" />
                        <span>{policyError}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                <button type="submit" disabled={isLoading || !isOtpVerified || !formData.fullName || !formData.password}
                  className="btn-cyan w-full py-3 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed auth-form-animate hover:scale-[1.01] transition-transform">
                  {isLoading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-[#0A0F1C] border-t-transparent animate-spin" />
                  ) : (
                    <>
                      {t('auth.createAccount')}
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </form>

              <button
                onClick={() => {
                  setSelectedRole(null);
                  localStorage.removeItem('selected_role');
                  setStep('role');
                }}
                className="w-full mt-4 py-2 text-sm font-medium text-cyan-500 hover:text-cyan-400 transition-colors auth-form-animate"
              >
                {t('auth.backToRoleSelectionBtn')}
              </button>

              <p className="text-center mt-6 text-sm auth-switch-text auth-form-animate">
                {t('auth.alreadyHaveAccount')}{' '}
                <button className="font-semibold auth-link-cyan"
                  onClick={() => navigate('/auth/login')}>
                  {t('auth.login')}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
