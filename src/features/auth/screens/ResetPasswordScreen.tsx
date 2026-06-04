import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Lock, Eye, EyeOff, ArrowRight, Zap, Bot, Star, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { authAPI } from '../../../api/authAPI';
import { toast } from 'sonner';
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
          setError(response.message || 'Failed to reset password.');
        }
      }
    } catch (err: any) {
      if (isMounted.current) {
        setError(err.message || 'An error occurred. Please try again.');
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
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

          <h2 className="text-3xl font-black text-primary mb-4">Choose New Password</h2>
          <p className="text-base max-w-sm auth-description">
            Almost done! Enter a strong password to finish securing your account.
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

          <h1 className="text-3xl font-black text-primary mb-2">Reset password</h1>
          <p className="mb-8 auth-subtitle">Choose your new secure password</p>

          {isOtpValid === null ? (
            <div className="flex flex-col items-center justify-center py-10 space-y-4">
              <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
              <p className="text-sm text-secondary">Verifying request state...</p>
            </div>
          ) : isOtpValid === false ? (
            <div className="space-y-6">
              <div className="p-4 rounded-xl text-sm flex items-start gap-3" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444' }}>
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Verification Required</p>
                  <p className="mt-1 text-xs opacity-90">{error}</p>
                </div>
              </div>
              <button onClick={() => navigate('/auth/forgot-password')} className="btn-cyan w-full py-3">
                Go to Forgot Password
              </button>
            </div>
          ) : success ? (
            <div className="space-y-6">
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
                <div className="px-4 py-3 rounded-xl text-sm flex items-start gap-2" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444' }}>
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email Address - Read-only from state */}
              <div className="relative">
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
              <div className="relative">
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

              <div className="relative">
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

              <div className="relative">
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

              <button type="submit" disabled={isLoading} className="btn-cyan w-full py-3 flex items-center justify-center gap-2">
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
