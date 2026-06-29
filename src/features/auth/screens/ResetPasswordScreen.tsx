import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Lock, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { authAPI } from '../../../api/authAPI';
import { toast } from 'sonner';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { getErrorMessage } from '../../../shared/utils/errorUtils';
import '../styles/auth-screen.css';

export default function ResetPasswordScreen() {
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { email?: string; otp?: string } | null;

  const [email, setEmail] = useState(state?.email || '');
  const [otp, setOtp] = useState(state?.otp || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isOtpValid, setIsOtpValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (!email || !otp) {
      setIsOtpValid(false);
      setError('Please verify your email and obtain an OTP code first.');
    } else {
      setIsOtpValid(true);
    }
  }, [email, otp]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email address is required.');
      return;
    }

    if (!otp) {
      setError('OTP verification code is required.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await authAPI.resetPassword({
        otp,
        email,
        newPassword
      });

      if (response.success) {
        if (isMounted.current) {
          setSuccess(true);
        }
        toast.success('Password reset successfully!');
      } else {
        if (isMounted.current) {
          setError(getErrorMessage(response));
        }
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  // GSAP Entrance Animations
  useGSAP(() => {
    // Left panel slide-in
    gsap.from('.auth-left-panel', {
      xPercent: -100,
      duration: 1,
      ease: 'power4.out',
    });

    // Left panel text / branding staggered fade-in
    gsap.from('.auth-left-content-animate', {
      opacity: 0,
      y: 30,
      stagger: 0.1,
      duration: 0.8,
      ease: 'power3.out',
      delay: 0.2,
    });

    // Right form card slide/fade
    gsap.from('.auth-form-card', {
      opacity: 0,
      scale: 0.96,
      y: 20,
      duration: 0.9,
      ease: 'power3.out',
    });

    // Form elements staggered slide
    gsap.from('.auth-form-animate', {
      opacity: 0,
      y: 15,
      stagger: 0.07,
      duration: 0.7,
      ease: 'power3.out',
      delay: 0.15,
    });
  }, []);

  return (
    <div className="min-h-screen flex auth-container">
      {/* Background ambient orbs */}
      <div className="absolute top-20 left-10 w-96 h-96 rounded-full auth-orb-cyan pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-96 h-96 rounded-full auth-orb-purple pointer-events-none" />

      {/* Left Panel - Premium Zentry Aesthetic with Full Image & Gradient */}
      <div className="hidden lg:flex flex-col flex-1 relative overflow-hidden p-12 auth-left-panel select-none"
        style={{
          backgroundImage: "url('/img/about.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}>
        {/* Gradient Overlay: dark on the left to transparent on the right */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/45 to-transparent pointer-events-none z-1" />

        <div className="relative z-10 flex flex-col h-full justify-between">
          {/* Logo / Header */}
          <div className="flex items-center gap-3 auth-left-content-animate cursor-pointer" onClick={() => navigate('/')}>
            <img src="/img/logo.png" className="w-10 h-10 object-contain" alt="GigBridge Logo" />
            <span className="logo-text logo-text-white text-xl font-zentry font-black tracking-wider select-none">GigBridge</span>
          </div>

          {/* Big Title & Description (White Text) */}
          <div className="max-w-md my-auto text-left auth-left-content-animate">
            <h2 className="text-4xl xl:text-5xl font-zentry font-black tracking-wider text-white mb-6 uppercase leading-tight">
              Your Career Partner
            </h2>
            <p className="text-lg text-white/80 leading-relaxed font-medium">
              Join the professional marketplace that connects world-class talent with ambitious companies in a secure, e-signed workflow.
            </p>
          </div>

          {/* Footer */}
          <p className="text-xs text-white/50 auth-left-content-animate">
            © 2026 GigBridge · Privacy · Terms
          </p>
        </div>
      </div>

      {/* Right Panel - Glassmorphic Form Card */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 auth-right-panel">
        <div className="w-full max-w-md auth-form-card p-8 lg:p-10">
          <div className="flex items-center gap-2 mb-8 lg:hidden cursor-pointer" onClick={() => navigate('/')}>
            <img src="/img/logo.png" className="w-8 h-8 object-contain" alt="GigBridge Logo" />
            <span className="logo-text font-zentry font-bold tracking-wider select-none">GigBridge</span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-zentry font-black tracking-wider text-primary mb-2 uppercase auth-form-animate">
            Reset password
          </h1>
          <p className="mb-8 auth-subtitle auth-form-animate">Choose your new secure password</p>

          {isOtpValid === null ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4 auth-form-animate">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
              <p className="text-sm text-secondary">Verifying request state...</p>
            </div>
          ) : isOtpValid === false ? (
            <div className="space-y-6 auth-form-animate">
              <div className="p-4 rounded-xl text-sm flex items-start gap-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444' }}>
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Verification Required</p>
                  <p className="mt-1 text-xs opacity-90" style={{ whiteSpace: 'pre-line' }}>{error}</p>
                </div>
              </div>
              <button onClick={() => navigate('/auth/forgot-password')} className="btn-cyan w-full py-3">
                Go to Forgot Password
              </button>
            </div>
          ) : success ? (
            <div className="space-y-6 auth-form-animate">
              <div className="p-4 rounded-xl text-sm flex items-start gap-3" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22C55E' }}>
                <CheckCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Password Reset Successful</p>
                  <p className="mt-1 text-xs opacity-90">Your password has been successfully updated. You can now sign in using your new credentials.</p>
                </div>
              </div>
              <button onClick={() => navigate('/auth/login')} className="btn-cyan w-full py-3">
                Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm flex items-start gap-2 auth-form-animate" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', whiteSpace: 'pre-line' }}>
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email Address - Read-only from state */}
              <div className="relative auth-form-animate">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  className="input-gb w-full py-3 auth-input-with-icon"
                  disabled={true}
                  required
                />
              </div>

              {/* OTP Code - Read-only from state */}
              <div className="relative auth-form-animate">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon" />
                <input
                  type="text"
                  placeholder="Verified OTP code"
                  value={otp}
                  className="input-gb w-full py-3 auth-input-with-icon"
                  disabled={true}
                  required
                />
              </div>

              <div className="relative auth-form-animate">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="New password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input-gb w-full py-3 auth-input-with-icon auth-input-with-icon-both"
                  disabled={isLoading}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 auth-input-icon">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="relative auth-form-animate">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="input-gb w-full py-3 auth-input-with-icon auth-input-with-icon-both"
                  disabled={isLoading}
                  required
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 auth-input-icon">
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <button type="submit" disabled={isLoading} className="btn-cyan w-full py-3 flex items-center justify-center gap-2 auth-form-animate">
                {isLoading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-[#0A0F1C] border-t-transparent animate-spin" />
                ) : (
                  <>
                    Reset Password
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
