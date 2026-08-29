import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User } from '../../types/models/User';
import { UserRole } from '../../types/models/User';
import type { ClientProfile, FreelancerProfile } from '../../types/models/Profile';
import type { ApiResponse } from '../../types/common';
import type { LoginResponse, RegisterRequest, UserDTO } from '../../types/models/Auth';
import { authAPI } from '../../api/authAPI';
import { secureStorage } from '../../shared/utils/secureStorage';
import { ensureFreshAccessToken } from '../../service/apiService';
import {
  authSessionManager,
  getAccessTokenUserId,
} from '../../features/auth/services/authSessionManager';

export type AppTheme = 'black' | 'white';

interface AppContextValue {
  user: User | null;
  role: UserRole | null;
  theme: AppTheme;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboardingComplete: boolean;
  clientProfile: ClientProfile | null;
  freelancerProfile: FreelancerProfile | null;
  setRole: (role: UserRole) => void;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  login: (email: string, password: string) => Promise<UserRole>;
  signup: (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    verificationTicket: string,
  ) => Promise<void>;
  googleLogin: (authCode: string, role?: UserRole, isFromSignIn?: boolean) => Promise<UserRole>;
  logout: (redirectPath?: string) => void;
  completeOnboarding: (profileData: any) => Promise<void>;
  markSetupComplete: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

const getField = <T,>(source: any, camelCaseKey: string, pascalCaseKey: string): T | undefined =>
  source?.[camelCaseKey] ?? source?.[pascalCaseKey];

const normalizeRole = (value: unknown): UserRole => {
  if (typeof value === 'number' && Number.isInteger(value) && value in UserRole) {
    return value as UserRole;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    const numericRole = Number(normalized);

    if (Number.isInteger(numericRole) && numericRole in UserRole) {
      return numericRole as UserRole;
    }

    if (normalized === 'client') return UserRole.Client;
    if (normalized === 'freelancer') return UserRole.Freelancer;
    if (normalized === 'admin') return UserRole.Admin;
  }

  throw new Error('Your account does not have a valid role set up yet. Please register with a role or contact support.');
};

const mapUserDTOToUser = (userDTO: UserDTO | any): User => {
  const fullName = getField<string>(userDTO, 'fullName', 'FullName') ?? '';
  const createdAt = getField<string>(userDTO, 'createdAt', 'CreatedAt') ?? new Date().toISOString();
  const updatedAt = getField<string | null>(userDTO, 'updatedAt', 'UpdatedAt') ?? createdAt;

  return {
    id: String(getField<string>(userDTO, 'userId', 'UserId') ?? ''),
    email: getField<string>(userDTO, 'email', 'Email') ?? '',
    first_name: fullName.split(' ')[0] || '',
    last_name: fullName.split(' ')[1] || '',
    full_name: fullName,
    phone_number: getField<string | null>(userDTO, 'phoneNumber', 'PhoneNumber') ?? null,
    role: normalizeRole(getField(userDTO, 'role', 'Role')),
    is_email_verified: Boolean(getField<boolean>(userDTO, 'isEmailVerified', 'IsEmailVerified')),
    is_active: getField<boolean>(userDTO, 'isActive', 'IsActive') ?? true,
    is_setup: Boolean(getField<boolean>(userDTO, 'isSetup', 'IsSetup')),
    is_premium: Boolean(getField<boolean>(userDTO, 'isPremium', 'IsPremium')),
    preferred_language: getField<string | null>(userDTO, 'preferredLanguage', 'PreferredLanguage') || 'en',
    last_login_at: null,
    login_failed_time: null,
    access_failed_count: 0,
    elo_points: getField<number>(userDTO, 'eloPoints', 'EloPoints') ?? 100,
    gigcoin_balance: 0,
    created_at: createdAt,
    updated_at: updatedAt,
  };
};

const getLoginData = (response: ApiResponse<LoginResponse>) => {
  const loginData = response.data as any;

  return {
    userDTO: loginData?.user ?? loginData?.User,
    token: loginData?.token ?? loginData?.Token,
  };
};

const clearStoredAuthentication = (): void => {
  secureStorage.removeItem('gigbridge_session');
  secureStorage.removeItem('gigbridge_user');
  localStorage.removeItem('access_token');
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [theme, setThemeState] = useState<AppTheme>('white');
  const [isLoading, setIsLoading] = useState(true);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [freelancerProfile, setFreelancerProfile] = useState<FreelancerProfile | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('gigbridge_theme') as AppTheme;
    const initialTheme = savedTheme && (savedTheme === 'black' || savedTheme === 'white') ? savedTheme : 'white';
    setThemeState(initialTheme);
    document.documentElement.classList.add(initialTheme);

    const initApp = async () => {
      try {
        let savedUser = null;
        let savedRole = null;

        const sessionData = secureStorage.getItem<{ user: User; role: UserRole }>('gigbridge_session');
        const gigbridgeUserData = secureStorage.getItem<User>('gigbridge_user');

        if (sessionData) {
          savedUser = sessionData.user;
          savedRole = sessionData.role;
        } else if (gigbridgeUserData) {
          savedUser = gigbridgeUserData;
          savedRole = savedUser?.role;
        }

        if (savedUser) {
          const normalizedRole = normalizeRole(savedRole ?? savedUser.role);
          const accessToken = localStorage.getItem('access_token');
          const tokenUserId = accessToken ? getAccessTokenUserId(accessToken) : null;
          const savedUserId = String(savedUser.id ?? '');

          if (
            !accessToken ||
            !tokenUserId ||
            !savedUserId ||
            tokenUserId.toLowerCase() !== savedUserId.toLowerCase()
          ) {
            clearStoredAuthentication();
            authSessionManager.clearSession('invalid-cached-session', false);
            return;
          }

          authSessionManager.restoreSession(normalizedRole);
          if (authSessionManager.isIdleExpired()) {
            clearStoredAuthentication();
            authSessionManager.clearSession('idle-expired', false);
            return;
          }

          try {
            await ensureFreshAccessToken();
          } catch {
            // A temporary refresh failure must not erase an otherwise recoverable
            // cached session. Permanent rejection clears storage in apiService.
          }

          if (localStorage.getItem('access_token')) {
            setUser({ ...savedUser, role: normalizedRole });
            setRoleState(normalizedRole);
          }
        } else if (localStorage.getItem('access_token')) {
          clearStoredAuthentication();
          authSessionManager.clearSession('missing-cached-user', false);
        }
      } catch (_e) {
        clearStoredAuthentication();
        authSessionManager.clearSession('invalid-cached-session', false);
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  useEffect(() => authSessionManager.subscribe(event => {
    if (event.type !== 'logout') return;

    clearStoredAuthentication();
    setUser(null);
    setRoleState(null);
    setClientProfile(null);
    setFreelancerProfile(null);

    if (window.location.pathname !== '/auth/login') {
      window.location.assign('/auth/login');
    }
  }), []);

  useEffect(() => {
    if (!user || role === null) {
      authSessionManager.stopActivityTracking();
      return;
    }

    authSessionManager.startActivityTracking(role);
    return () => authSessionManager.stopActivityTracking();
  }, [role, user]);

  useEffect(() => {
    const root = document.documentElement;
    const allThemes: AppTheme[] = ['black', 'white'];
    allThemes.forEach(t => root.classList.remove(t));
    root.classList.add(theme);
    localStorage.setItem('gigbridge_theme', theme);

    const bgColor = theme === 'white' ? '#ffffff' : '#09090e';
    root.style.backgroundColor = bgColor;
    document.body.style.backgroundColor = bgColor;

    const metaTags = document.querySelectorAll('meta[name="theme-color"]');
    if (metaTags.length > 0) {
      metaTags.forEach(meta => meta.setAttribute('content', bgColor));
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = bgColor;
      document.head.appendChild(meta);
    }
  }, [theme]);

  const isAuthenticated = !!user;
  const isOnboardingComplete = isAuthenticated && (
    role === 0 ? !!clientProfile : !!freelancerProfile
  );

  const setRole = useCallback((newRole: UserRole) => {
    setRoleState(newRole);
    // Update stored role
    const user = secureStorage.getItem<User>('gigbridge_user');
    if (user) {
      user.role = newRole;
      secureStorage.setItem('gigbridge_user', user);
    }
  }, []);

  const setTheme = useCallback((newTheme: AppTheme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'black' ? 'white' : 'black');
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<UserRole> => {
    try {
      const response = await authAPI.login({ email, password });
      const apiResponse = response as unknown as ApiResponse<LoginResponse>;

      if (!apiResponse.success || !apiResponse.data) {
        const err = new Error(apiResponse.message || 'Login failed') as any;
        err.errors = apiResponse.errors;
        throw err;
      }

      const { userDTO, token } = getLoginData(apiResponse);
      const user = mapUserDTOToUser(userDTO);

      setUser(user);
      setRoleState(user.role);
      secureStorage.setItem('gigbridge_session', { user, role: user.role });
      localStorage.setItem('access_token', token);
      secureStorage.setItem('gigbridge_user', user);
      authSessionManager.beginSession(user.role);

      return user.role;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }, []);

  const signup = useCallback(async (
    email: string,
    password: string,
    fullName: string,
    role: UserRole,
    verificationTicket: string,
  ) => {
    try {
      const registerData: RegisterRequest = {
        email,
        password,
        confirmPassword: password,
        fullName,
        role,
        verificationTicket,
      };
      const apiResponse = await authAPI.register(registerData);

      if (!apiResponse.success || !apiResponse.data) {
        const err = new Error(apiResponse.message || 'Registration failed') as any;
        err.errors = apiResponse.errors;
        throw err;
      }

      const user = mapUserDTOToUser(apiResponse.data);

      setUser(user);
      setRoleState(user.role);
      secureStorage.setItem('gigbridge_session', { user, role: user.role });
      secureStorage.setItem('gigbridge_user', user);
      
      // Automatically log the user in after registration to acquire tokens
      await login(email, password);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }, [login]);

  const googleLogin = useCallback(async (authCode: string, role?: UserRole, isFromSignIn?: boolean): Promise<UserRole> => {
    try {
      const response = await authAPI.googleLogin(authCode, role, isFromSignIn);
      const apiResponse = response as unknown as ApiResponse<LoginResponse>;
      
      if (!apiResponse.success || !apiResponse.data) {
        const err = new Error(apiResponse.message || 'Google Login failed') as any;
        err.errors = apiResponse.errors;
        throw err;
      }

      const { userDTO, token } = getLoginData(apiResponse);
      const user = mapUserDTOToUser(userDTO);

      setUser(user);
      setRoleState(user.role);
      secureStorage.setItem('gigbridge_session', { user, role: user.role });
      localStorage.setItem('access_token', token);
      secureStorage.setItem('gigbridge_user', user);
      authSessionManager.beginSession(user.role);

      return user.role;
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }, []);

  const logout = useCallback((redirectPath?: string) => {
    setUser(null);
    setRoleState(null);
    setClientProfile(null);
    setFreelancerProfile(null);
    secureStorage.removeItem('gigbridge_session');
    secureStorage.removeItem('gigbridge_user');
    localStorage.removeItem('access_token');
    authSessionManager.clearSession('user-logout');

    // Clear saved scroll positions so returning to landing page starts at the top (0, 0)
    try {
      Object.keys(sessionStorage).forEach((key) => {
        if (key.startsWith('scroll-')) {
          sessionStorage.removeItem(key);
        }
      });
      sessionStorage.removeItem('scroll-/');
    } catch {
      /* ignore */
    }

    if (redirectPath) {
      window.location.href = redirectPath;
    }
  }, []);

  const completeOnboarding = useCallback(async (profileData: any) => {
    if (!user) return;
    try {
      if (user.role === 0) {
        setClientProfile(profileData);
      } else {
        setFreelancerProfile(profileData);
      }
    } catch (error) {
      console.error('Onboarding error:', error);
      throw error;
    }
  }, [user]);

  const markSetupComplete = useCallback(() => {
    if (user) {
      const updatedUser = { ...user, is_setup: true };
      setUser(updatedUser);
    }
  }, [user]);

  const value: AppContextValue = {
    user,
    role,
    theme,
    isLoading,
    isAuthenticated,
    isOnboardingComplete,
    clientProfile,
    freelancerProfile,
    setRole,
    setTheme,
    toggleTheme,
    login,
    signup,
    googleLogin,
    logout,
    completeOnboarding,
    markSetupComplete
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (ctx === undefined) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
}
