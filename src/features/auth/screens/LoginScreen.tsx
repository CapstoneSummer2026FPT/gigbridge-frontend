import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap, Bot, Star, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../../../app/providers/AppProvider';
import { UserRole } from '../../../types/models/User';
import { toast } from 'sonner';
import '../styles/auth-screen.css';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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
          client_id: "730304762860-sepqdvj434i8qagl8b2od5d9hqbo42tv.apps.googleusercontent.com",
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
    setIsLoading(true);
    setError('');
    setGoogleError('');
    try {
      const selectedRoleStr = localStorage.getItem('selected_role');
      const selectedRole = selectedRoleStr ? parseInt(selectedRoleStr, 10) : undefined;

      const googleLogin = appContext?.googleLogin || (async () => undefined);
      const role = await googleLogin(authCode, selectedRole);

      console.log('Google login role:', role);

      const userStr = localStorage.getItem('gigbridge_user');
      const user = userStr ? JSON.parse(userStr) : null;

      // Check if user did not set up a role AND is a newly created account (created within the last 10 seconds)
      const isNewlyCreated = user?.created_at && (new Date().getTime() - new Date(user.created_at).getTime() < 10000);

      if (selectedRole === undefined && isNewlyCreated) {
        setGoogleError('Your account does not have a role set up yet. Please select a role on the sign-up page before signing in.');
        if (appContext?.logout) {
          appContext.logout();
        }
        setIsLoading(false);
        return;
      }

      if (role === null || role === undefined || (role !== UserRole.Client && role !== UserRole.Freelancer && role !== UserRole.Admin)) {
        setGoogleError('Your account does not have a role set up yet. Please register with a role or contact support.');
        if (appContext?.logout) {
          appContext.logout();
        }
        setIsLoading(false);
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
      setGoogleError(err.message || 'Your Google account cannot be accessed at this time. Try troubleshooting this issue or contact us for help.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setGoogleError('');
    setIsLoading(true);

    try {
      const role = await login(formData.email, formData.password);
      
      console.log('Email login role:', role);

      const userStr = localStorage.getItem('gigbridge_user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      if (role === null || role === undefined || (role !== UserRole.Client && role !== UserRole.Freelancer && role !== UserRole.Admin)) {
        setError('Your account does not have a role set up yet. Please select a role or contact support.');
        if (appContext?.logout) {
          appContext.logout();
        }
        setIsLoading(false);
        return;
      }

      localStorage.removeItem('selected_role');

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
      setError(err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
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

          <h1 className="text-3xl font-black text-primary mb-2">Welcome back</h1>
          <p className="mb-8 auth-subtitle">Sign in to your GigBridge account</p>

          <button className="w-full flex items-center justify-center gap-3 py-3 rounded-xl mb-4 transition-all auth-google-btn"
            onClick={() => {
              setGoogleError('');
              googleClient?.requestCode();
            }}
            disabled={isLoading || !googleClient}
            type="button">
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {googleError && (
            <div className="flex items-start gap-2 mt-2 mb-6 text-sm text-red-500 font-medium text-left">
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
              <span>
                Your Google account cannot be accessed at this time. Try troubleshooting this issue or{' '}
                <span className="text-[#4ADE80] underline cursor-pointer hover:text-[#22C55E]">contact us</span> for help.
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
            
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon" />
              <input type="email" placeholder="Email address" value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="input-gb w-full py-3 auth-input-with-icon" />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 auth-input-icon" />
              <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="input-gb w-full py-3 auth-input-with-icon auth-input-with-icon-both" />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 auth-input-icon">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="flex justify-end">
              <button type="button" className="text-sm auth-link-cyan" onClick={() => navigate('/auth/forgot-password')}>Forgot password?</button>
            </div>

            <button type="submit" disabled={isLoading}
              className="btn-cyan w-full py-3 flex items-center justify-center gap-2">
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

          <p className="text-center mt-6 text-sm auth-switch-text">
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
