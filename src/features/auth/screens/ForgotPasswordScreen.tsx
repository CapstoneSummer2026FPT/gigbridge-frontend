import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Mail, ArrowRight, Zap, Bot, Star, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { authAPI } from '../../../api/authAPI';
import { toast } from 'sonner';
import '../styles/auth-screen.css';

export default function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Countdown timer effect
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!email || !isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setIsSendingOtp(true);
    try {
      // Calls forgot-password API which now sends OTP after checking email existence
      const response = await authAPI.forgotPassword({ email });
      if (response.success) {
        setSuccess('Verification code sent to your email.');
        setCountdown(60);
        toast.success('Verification code sent successfully!');
      } else {
        setError(response.message || 'Failed to send verification code.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');

    if (!otpCode) {
      setError('Please enter the OTP verification code.');
      return;
    }

    setIsVerifyingOtp(true);
    try {
      const response = await authAPI.verifyOtp({
        email,
        otp: otpCode
      });
      if (response.success) {
        setIsOtpVerified(true);
        setSuccess('OTP verified successfully! You can now proceed to reset your password.');
        toast.success('OTP verified successfully!');
      } else {
        setError(response.message || 'Invalid or expired OTP code.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleGoToResetPassword = () => {
    navigate('/auth/reset-password', {
      state: { email, otp: otpCode }
    });
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

          <h2 className="text-3xl font-black text-primary mb-4">Reset Your Password</h2>
          <p className="text-base max-w-sm auth-description">
            No worries! Just verify your email and we'll help you secure your account in no time.
          </p>
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

          <h1 className="text-3xl font-black text-primary mb-2">Forgot password?</h1>
          <p className="mb-8 auth-subtitle">Verify your email to reset your password</p>

          <div className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm flex items-start gap-2" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444' }}>
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="px-4 py-3 rounded-xl text-sm flex items-start gap-2" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22C55E' }}>
                <CheckCircle size={16} className="shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Email input and Send OTP button */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    if (isOtpVerified) {
                      setIsOtpVerified(false);
                      setSuccess('');
                    }
                  }}
                  className="input-gb w-full py-3 auth-input-with-icon"
                  disabled={isOtpVerified || isSendingOtp || isVerifyingOtp}
                  required
                />
              </div>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSendingOtp || isOtpVerified || !isValidEmail(email) || countdown > 0}
                className="btn-cyan px-4 py-3 shrink-0 flex items-center justify-center gap-2 text-xs font-semibold"
                style={{ minWidth: '105px' }}
              >
                {isSendingOtp ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#0A0F1C] border-t-transparent animate-spin" />
                ) : countdown > 0 ? (
                  `${countdown}s`
                ) : (
                  'Send OTP'
                )}
              </button>
            </div>

            {/* OTP Code input and Verify OTP button */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon" />
                <input
                  type="text"
                  placeholder="OTP code"
                  value={otpCode}
                  onChange={e => {
                    setOtpCode(e.target.value);
                    if (isOtpVerified) {
                      setIsOtpVerified(false);
                      setSuccess('');
                    }
                  }}
                  className="input-gb w-full py-3 auth-input-with-icon"
                  disabled={isOtpVerified || isSendingOtp || isVerifyingOtp || !email}
                  required
                />
              </div>
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={isVerifyingOtp || isOtpVerified || !otpCode || !email}
                className="btn-cyan px-4 py-3 shrink-0 flex items-center justify-center gap-2 text-xs font-semibold"
                style={{ minWidth: '105px' }}
              >
                {isVerifyingOtp ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#0A0F1C] border-t-transparent animate-spin" />
                ) : isOtpVerified ? (
                  'Verified ✓'
                ) : (
                  'Verify OTP'
                )}
              </button>
            </div>

            {/* Go to Reset Password (Enabled after OTP is verified) */}
            <button
              type="button"
              onClick={handleGoToResetPassword}
              disabled={!isOtpVerified}
              className="btn-cyan w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Go to Reset Password
              <ArrowRight size={18} />
            </button>

            <p className="text-center mt-6 text-sm auth-switch-text">
              Remember your password?{' '}
              <button type="button" className="font-semibold auth-link-cyan" onClick={() => navigate('/auth/login')}>
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
