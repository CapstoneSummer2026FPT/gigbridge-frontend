import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Mail, ArrowRight, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { authAPI } from '../../../api/authAPI';
import { toast } from 'sonner';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { getErrorMessage } from '../../../shared/utils/errorUtils';
import '../styles/auth-screen.css';
import { useTranslation } from '../../../hooks/useTranslation';


export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

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
      const response = await authAPI.forgotPassword({ email });
      if (response.success) {
        if (isMounted.current) {
          setSuccess('Verification code sent to your email.');
          setCountdown(60);
        }
        toast.success('Verification code sent successfully!');
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
        setIsSendingOtp(false);
      }
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
        if (isMounted.current) {
          setIsOtpVerified(true);
          setSuccess('OTP verified successfully! You can now proceed to reset your password.');
        }
        toast.success('OTP verified successfully!');
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
        setIsVerifyingOtp(false);
      }
    }
  };

  const handleGoToResetPassword = () => {
    navigate('/auth/reset-password', {
      state: { email, otp: otpCode }
    });
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

      {/* Right Panel - Glassmorphic Form Card */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 auth-right-panel">
        <div className="w-full max-w-md auth-form-card p-8 lg:p-10">
          <div className="flex items-center gap-2 mb-8 lg:hidden cursor-pointer" onClick={() => navigate('/')}>
            <img src="/img/logo.png" className="w-8 h-8 object-contain" alt={`${t('app.name')} Logo`} />
            <span className="logo-text font-bold tracking-wider select-none">{t('app.name')}</span>
          </div>

          <h1 className="text-2xl lg:text-3xl font-zentry font-black tracking-wider text-primary mb-2 uppercase auth-form-animate">
            {t('auth.forgotPasswordTitle')}
          </h1>
          <p className="mb-8 auth-subtitle auth-form-animate">{t('auth.forgotPasswordSubtitle')}</p>

          <div className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm flex items-start gap-2 auth-form-animate" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444', whiteSpace: 'pre-line' }}>
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="px-4 py-3 rounded-xl text-sm flex items-start gap-2 auth-form-animate" style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#22C55E' }}>
                <CheckCircle size={16} className="shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Email input and Send OTP button */}
            <div className="flex gap-2 auth-form-animate">
              <div className="relative flex-1">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon" />
                <input
                  type="email"
                  placeholder={t('auth.email')}
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
                  t('auth.sendOtp')
                )}
              </button>
            </div>

            {/* OTP Code input and Verify OTP button */}
            <div className="flex gap-2 auth-form-animate">
              <div className="relative flex-1">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon" />
                <input
                  type="text"
                  placeholder={t('auth.otpCode')}
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
                  t('auth.verified') + ' ✓'
                ) : (
                  t('auth.verifyOtp')
                )}
              </button>
            </div>

            {/* Go to Reset Password (Enabled after OTP is verified) */}
            <button
              type="button"
              onClick={handleGoToResetPassword}
              disabled={!isOtpVerified}
              className="btn-cyan w-full py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed auth-form-animate"
            >
              {t('auth.goToResetPassword')}
              <ArrowRight size={18} />
            </button>

            <p className="text-center mt-6 text-sm auth-switch-text auth-form-animate">
              {t('auth.rememberPassword')}{' '}
              <button type="button" className="font-semibold auth-link-cyan" onClick={() => navigate('/auth/login')}>
                {t('auth.login')}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

