import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Zap, Bot, Star, CheckCircle, Briefcase, Code, ChevronRight, AlertCircle } from 'lucide-react';
import { useApp } from '../../../app/providers/AppProvider';
import { UserRole } from '../../../types/models/User';
import { authAPI } from '../../../api/authAPI';
import { toast } from 'sonner';
import '../styles/auth-screen.css';


type SignupStep = 'role' | 'form';

export default function SignupScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<SignupStep>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const isLoading = isEmailLoading || isGoogleLoading;
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [googleClient, setGoogleClient] = useState<any>(null);
  const [googleError, setGoogleError] = useState('');

  const selectedRoleRef = useRef<UserRole | null>(null);
  useEffect(() => {
    selectedRoleRef.current = selectedRole;
  }, [selectedRole]);
  
  // OTP related states
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
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
    let client: any = null;
    const interval = setInterval(() => {
      if (window.google) {
        clearInterval(interval);

        client = window.google.accounts.oauth2.initCodeClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: "openid email profile",
          ux_mode: "popup",
          callback: async (response: any) => {
            if (response.code) {
              handleGoogleSignup(response.code);
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
    } catch (err: any) {
      setGoogleError('Your Google account cannot be accessed at this time. Try troubleshooting this issue or contact us for help.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleSignupClick = () => {
    setGoogleError('');
    const currentRole = selectedRoleRef.current;
    if (currentRole === null) {
      setGoogleError('Your Google account cannot be accessed at this time. Try troubleshooting this issue or contact us for help.');
      return;
    }
    googleClient?.requestCode();
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
    setIsSendingOtp(true);
    try {
      const response = await authAPI.sendOtp({ email: formData.email });
      if (response.success) {
        setSuccessMessage(response.message || 'Verification code sent successfully!');
        setCountdown(60);
      } else {
        setError(response.message || 'Failed to send OTP.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while sending OTP.');
    } finally {
      setIsSendingOtp(false);
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
        otp: formData.otpCode
      });
      
      if (response.success) {
        setSuccessMessage(response.message || 'Email verified successfully!');
        setIsOtpVerified(true);
      } else {
        setError(response.message || 'Invalid or expired verification code.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while verifying OTP.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  let appContext;
  try {
    appContext = useApp();
  } catch (e) {
    appContext = null;
  }

  const signup = appContext?.signup || (async () => {});

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    localStorage.setItem('selected_role', role.toString());
    setGoogleError('');
    setStep('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsEmailLoading(true);

    try {
      if (selectedRole === null) {
        setError('Please select a role');
        setIsEmailLoading(false);
        return;
      }

      if (!isOtpVerified) {
        setError('Please verify your email address first.');
        setIsEmailLoading(false);
        return;
      }

      await signup(formData.email, formData.password, formData.fullName, selectedRole);
      navigate('/onboarding/profile-setup');
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsEmailLoading(false);
    }
  };


  return (
    <div className="min-h-screen flex auth-container">
      {/* Left Panel - Illustration */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden p-10 auth-left-panel">
        <div className="absolute top-20 left-20 w-80 h-80 rounded-full opacity-10 animate-float auth-orb-cyan" />
        <div className="absolute bottom-40 right-10 w-60 h-60 rounded-full opacity-10 animate-float auth-orb-purple" />

        <div className="flex items-center gap-3 mb-auto">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center auth-logo-bg">
            <Zap size={22} className="auth-logo-icon" />
          </div>
          <span className="text-primary text-xl font-black">GigBridge</span>
          <span className="badge-cyan">AI</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="relative mb-8">
            <div className="w-32 h-32 rounded-full mx-auto flex items-center justify-center animate-orb auth-ai-avatar">
              <Bot size={56} className="auth-ai-avatar-icon" />
            </div>
            <div className="absolute -top-4 -right-4 w-8 h-8 rounded-full flex items-center justify-center auth-orb-green">
              <CheckCircle size={14} className="auth-orb-green-icon" />
            </div>
            <div className="absolute -bottom-2 -left-4 w-8 h-8 rounded-full flex items-center justify-center auth-orb-amber">
              <Star size={14} fill="#F59E0B" className="auth-orb-amber-icon" />
            </div>
          </div>

          <h2 className="text-3xl font-black text-primary mb-4">Your AI Career Partner</h2>
          <p className="text-base max-w-sm auth-description">
            Join the intelligent marketplace that connects world-class talent with ambitious companies.
          </p>

          <div className="flex flex-wrap gap-2 justify-center mt-6">
            {['AI Job Matching', 'Smart Proposals', 'AI Interviews', 'Instant Pay'].map(f => (
              <span key={f} className="badge-cyan">{f}</span>
            ))}
          </div>

          <div className="flex items-center gap-3 mt-8">
            <div className="flex -space-x-2">
              {['jordan', 'alex', 'sarah', 'marcus'].map(seed => (
                <img key={seed} src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}`}
                  className="w-8 h-8 rounded-full border-2 auth-avatar-border" alt="" />
              ))}
            </div>
            <div>
              <div className="flex gap-0.5 mb-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={10} fill="#F59E0B" className="auth-star-icon" />
                ))}
              </div>
              <p className="text-xs auth-description">52K+ members trust us</p>
            </div>
          </div>
        </div>

        <p className="text-xs text-center mt-auto auth-footer-text">
          © 2026 GigBridge AI · Privacy · Terms
        </p>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center auth-logo-bg">
              <Zap size={16} className="auth-logo-icon" />
            </div>
            <span className="text-primary font-bold">GigBridge</span>
          </div>

          {step === 'role' ? (
            <>
              <h1 className="text-3xl font-black text-primary mb-2">Get started today</h1>
              <p className="mb-8 auth-subtitle">Choose how you want to get started</p>

              <div className="space-y-3 mb-8">
                {/* Client Card */}
                <button
                  onClick={() => handleRoleSelect(UserRole.Client)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedRole === UserRole.Client
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 hover:border-cyan-500/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Briefcase size={24} className="text-cyan-500 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-primary">I'm a Client</h3>
                      <p className="text-sm text-secondary">Hire talented freelancers for your projects</p>
                    </div>
                    {selectedRole === UserRole.Client && <ChevronRight size={20} className="text-cyan-500" />}
                  </div>
                </button>

                {/* Freelancer Card */}
                <button
                  onClick={() => handleRoleSelect(UserRole.Freelancer)}
                  className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                    selectedRole === UserRole.Freelancer
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 hover:border-purple-500/50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Code size={24} className="text-purple-500 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-primary">I'm a Freelancer</h3>
                      <p className="text-sm text-secondary">Find projects that match your expertise</p>
                    </div>
                    {selectedRole === UserRole.Freelancer && <ChevronRight size={20} className="text-purple-500" />}
                  </div>
                </button>
              </div>

              <button
                onClick={() => setStep('form')}
                disabled={selectedRole === null}
                className="btn-cyan w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
                <ArrowRight size={18} />
              </button>

              <p className="text-center mt-6 text-sm auth-switch-text">
                Already have an account?{' '}
                <button className="font-semibold auth-link-cyan"
                  onClick={() => navigate('/auth/login')}>
                  Log In
                </button>
              </p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-black text-primary mb-2">Create your account</h1>
              <p className="mb-8 auth-subtitle">Fill in your details to get started</p>
              
              <button className="w-full flex items-center justify-center gap-3 py-3 rounded-xl mb-4 transition-all auth-google-btn"
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
                {isGoogleLoading ? 'Connecting...' : 'Sign Up with Google'}
              </button>

              {googleError && (
                <div className="flex items-start gap-2 mt-2 mb-6 text-sm text-red-500 font-medium text-left">
                  <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                  <span>
                    {googleError}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px auth-divider" />
                <span className="text-xs auth-divider-text">or continue with email</span>
                <div className="flex-1 h-px auth-divider" />
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444' }}>
                    {error}
                  </div>
                )}
                {successMessage && (
                  <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22C55E' }}>
                    {successMessage}
                  </div>
                )}
                
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon" />
                  <input type="text" placeholder="Full Name" value={formData.fullName}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    className="input-gb w-full py-3 auth-input-with-icon"
                    disabled={isLoading} />
                </div>

                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon" />
                  <input type="email" placeholder="Email address" value={formData.email}
                    onChange={e => {
                      setFormData({ ...formData, email: e.target.value });
                      if (isOtpVerified) {
                        setIsOtpVerified(false);
                        setSuccessMessage('');
                      }
                    }}
                    className="input-gb w-full py-3 auth-input-with-icon"
                    disabled={isLoading} />
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon" />
                    <input type="text" placeholder="OTP code" value={formData.otpCode}
                      onChange={e => {
                        setFormData({ ...formData, otpCode: e.target.value });
                        if (isOtpVerified) {
                          setIsOtpVerified(false);
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
                        Sending...
                      </>
                    ) : isVerifyingOtp ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-[#0A0F1C] border-t-transparent animate-spin" />
                        Verifying...
                      </>
                    ) : isOtpVerified ? (
                      <>
                        <CheckCircle size={16} />
                        Verified
                      </>
                    ) : countdown > 0 ? (
                      `Verify (${countdown}s)`
                    ) : (
                      'Send OTP'
                    )}
                  </button>
                </div>

                {countdown > 0 && !isOtpVerified && (
                  <div className="text-center text-sm">
                    <span className="text-secondary">Didn't receive the code? </span>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp}
                      className="text-cyan-500 hover:text-cyan-400 font-semibold transition-colors"
                    >
                      Resend OTP
                    </button>
                  </div>
                )}
                 
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon" />
                  <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="input-gb w-full py-3 auth-input-with-icon auth-input-with-icon-both"
                    disabled={isLoading} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 auth-input-icon"
                    disabled={isLoading}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                <button type="submit" disabled={isLoading || !isOtpVerified || !formData.fullName || !formData.password}
                  className="btn-cyan w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isLoading ? (
                    <div className="w-5 h-5 rounded-full border-2 border-[#0A0F1C] border-t-transparent animate-spin" />
                  ) : (
                    <>
                      Create Account
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
                className="w-full mt-4 py-2 text-sm font-medium text-cyan-500 hover:text-cyan-400 transition-colors"
              >
                ← Back to role selection
              </button>

              <p className="text-center mt-6 text-sm auth-switch-text">
                Already have an account?{' '}
                <button className="font-semibold auth-link-cyan"
                  onClick={() => navigate('/auth/login')}>
                  Log In
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
