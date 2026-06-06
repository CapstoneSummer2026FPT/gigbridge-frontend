import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap, Bot, Star, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../../../app/providers/AppProvider';
import { UserRole } from '../../../types/models/User';
import { toast } from 'sonner';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import '../styles/auth-screen.css';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const isLoading = isEmailLoading || isGoogleLoading;
  const [error, setError] = useState('');
  const [googleClient, setGoogleClient] = useState<any>(null);
  const [googleError, setGoogleError] = useState('');
  const [formData, setFormData] = useState({ 
    email: '', 
    password: '',
  });

  let appContext;
  try {
    appContext = useApp();
  } catch (e) {
    appContext = null;
  }

  const login = appContext?.login || (async () => undefined);

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
              handleGoogleLogin(response.code);
            }
          },
        });

        setGoogleClient(client);
      }
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const handleGoogleLogin = async (authCode: string) => {
    setIsGoogleLoading(true);
    setError('');
    setGoogleError('');
    try {
      const selectedRoleStr = localStorage.getItem('selected_role');
      const selectedRole = selectedRoleStr ? parseInt(selectedRoleStr, 10) : undefined;

      const googleLogin = appContext?.googleLogin || (async () => undefined);
      const role = await googleLogin(authCode, selectedRole, true);

      console.log('Google login role:', role);

      const userStr = localStorage.getItem('gigbridge_user');
      const user = userStr ? JSON.parse(userStr) : null;

      if (selectedRole === undefined && (role === null || role === undefined || (role !== UserRole.Client && role !== UserRole.Freelancer && role !== UserRole.Admin))) {
        setGoogleError('Your account does not have a role set up yet. Please select a role on the sign-up page before signing in.');
        if (appContext?.logout) {
          appContext.logout();
        }
        setIsGoogleLoading(false);
        return;
      }

      if (role === null || role === undefined || (role !== UserRole.Client && role !== UserRole.Freelancer && role !== UserRole.Admin)) {
        setGoogleError('Your account does not have a role set up yet. Please register with a role or contact support.');
        if (appContext?.logout) {
          appContext.logout();
        }
        setIsGoogleLoading(false);
        return;
      }

      localStorage.removeItem('selected_role');

      toast.success('Welcome back! Login successful.', {
        style: {
          background: '#4ADE80',
          color: '#FFFFFF',
          border: '2px solid #22C55E',
          fontSize: '14px',
          fontWeight: '600',
        },
        duration: 3000,
      });

      if (role === UserRole.Admin) {
        navigate('/admin');
      } else if (user?.is_setup) {
        if (role === UserRole.Client) {
          navigate('/client/dashboard');
        } else if (role === UserRole.Freelancer) {
          navigate('/freelancer/dashboard');
        }
      } else {
        navigate('/onboarding/profile-setup');
      }
    } catch (err: any) {
      setGoogleError('Your Google account cannot be accessed at this time. Try troubleshooting this issue or contact us for help.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGoogleError('');
    setIsEmailLoading(true);

    try {
      const role_signIn = await login(formData.email, formData.password);
      
      console.log('Email login role:', role_signIn);

      const userStr = localStorage.getItem('gigbridge_user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      if (role_signIn === null || role_signIn === undefined || (role_signIn !== UserRole.Client && role_signIn !== UserRole.Freelancer && role_signIn !== UserRole.Admin)) {
        setError('Your account does not have a role set up yet. Please select a role or contact support.');
        if (appContext?.logout) {
          appContext.logout();
        }
        setIsEmailLoading(false);
        return;
      }

      localStorage.removeItem('selected_role');

      toast.success('Welcome back! Login successful.', {
        style: {
          background: '#4ADE80',
          color: '#FFFFFF',
          border: '2px solid #22C55E',
          fontSize: '14px',
          fontWeight: '600',
        },
        duration: 3000,
      });

      if (role_signIn === UserRole.Admin) {
        navigate('/admin');
      } else if (user?.is_setup) {
        if (role_signIn === UserRole.Client) {
          navigate('/client/dashboard');
        } else if (role_signIn === UserRole.Freelancer) {
          navigate('/freelancer/dashboard');
        }
      } else {
        navigate('/onboarding/profile-setup');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsEmailLoading(false);
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
            Welcome back
          </h1>
          <p className="mb-6 auth-subtitle auth-form-animate">Sign in to your GigBridge account</p>

          <button className="w-full flex items-center justify-center gap-3 py-3 rounded-xl mb-4 transition-all auth-google-btn auth-form-animate"
            onClick={() => {
              setGoogleError('');
              googleClient?.requestCode();
            }}
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
            {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
          </button>

          {googleError && (
            <div className="flex items-start gap-2 mt-2 mb-6 text-sm text-red-500 font-medium text-left auth-form-animate">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
              <span>
                {googleError}
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 mb-6 auth-form-animate">
            <div className="flex-1 auth-divider" />
            <span className="auth-divider-text">or continue with email</span>
            <div className="flex-1 auth-divider" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl text-sm auth-form-animate" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#EF4444' }}>
                {error}
              </div>
            )}
            
            <div className="relative auth-form-animate">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon pointer-events-none" />
              <input type="email" placeholder="Email address" value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="input-gb w-full py-3 auth-input-with-icon" required />
            </div>
            <div className="relative auth-form-animate">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon pointer-events-none" />
              <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="input-gb w-full py-3 auth-input-with-icon auth-input-with-icon-both" required />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 auth-input-icon">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex justify-end auth-form-animate">
              <button type="button" className="text-sm auth-link-cyan" onClick={() => navigate('/auth/forgot-password')}>Forgot password?</button>
            </div>

            <button type="submit" disabled={isLoading}
              className="btn-cyan w-full py-3 flex items-center justify-center gap-2 auth-form-animate hover:scale-[1.01] transition-transform">
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-[#0A0F1C] border-t-transparent animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-sm auth-switch-text auth-form-animate">
            Don't have an account?{' '}
            <button className="font-semibold auth-link-cyan"
              onClick={() => navigate('/auth/signup')}>
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
