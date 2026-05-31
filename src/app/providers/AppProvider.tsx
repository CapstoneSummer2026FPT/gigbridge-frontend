import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { User, UserRole } from '../../types/models/User';
import type { ClientProfile, FreelancerProfile } from '../../types/models/Profile';
import type { ApiResponse } from '../../types/common';
import type { LoginResponse, UserDTO } from '../../types/models/Auth';
import { authAPI } from '../../api/authAPI';

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
  signup: (email: string, password: string, firstName: string, lastName: string, role: UserRole) => Promise<void>;
  logout: () => void;
  completeOnboarding: (profileData: any) => Promise<void>;
  markSetupComplete: () => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRoleState] = useState<UserRole | null>(null);
  const [theme, setThemeState] = useState<AppTheme>('black');
  const [isLoading, setIsLoading] = useState(true);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [freelancerProfile, setFreelancerProfile] = useState<FreelancerProfile | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('gigbridge_theme') as AppTheme;
    const initialTheme = savedTheme && (savedTheme === 'black' || savedTheme === 'white') ? savedTheme : 'black';
    setThemeState(initialTheme);
    document.documentElement.classList.add(initialTheme);

    const initApp = async () => {
      try {
        let savedUser = null;
        let savedRole = null;

        const sessionData = localStorage.getItem('gigbridge_session');
        const gigbridgeUserData = localStorage.getItem('gigbridge_user');

        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          savedUser = parsed.user;
          savedRole = parsed.role;
        } else if (gigbridgeUserData) {
          savedUser = JSON.parse(gigbridgeUserData);
          savedRole = savedUser?.role;
        }

        if (savedUser) {
          setUser(savedUser);
          setRoleState(savedRole);
        }
      } catch (_e) {
        localStorage.removeItem('gigbridge_session');
        localStorage.removeItem('gigbridge_user');
        localStorage.removeItem('access_token');
      } finally {
        setIsLoading(false);
      }
    };
    initApp();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const allThemes: AppTheme[] = ['black', 'white'];
    allThemes.forEach(t => root.classList.remove(t));
    root.classList.add(theme);
    localStorage.setItem('gigbridge_theme', theme);
  }, [theme]);

  const isAuthenticated = !!user;
  const isOnboardingComplete = isAuthenticated && (
    role === 0 ? !!clientProfile : !!freelancerProfile
  );

  const setRole = useCallback((newRole: UserRole) => {
    setRoleState(newRole);
    // Update stored role
    const savedUser = localStorage.getItem('gigbridge_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      user.role = newRole;
      localStorage.setItem('gigbridge_user', JSON.stringify(user));
    }
  }, []);

  const setTheme = useCallback((newTheme: AppTheme) => {
    setThemeState(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'black' ? 'white' : 'black');
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<UserRole> => {
    setIsLoading(true);
    try {
      const response = await authAPI.login({ email, password });
      const apiResponse = response as unknown as ApiResponse<LoginResponse>;

      if (!apiResponse.success || !apiResponse.data) {
        throw new Error(apiResponse.message || 'Login failed');
      }

      const { user: userDTO, token } = apiResponse.data;
      const user: User = {
        id: userDTO.userId,
        email: userDTO.email,
        first_name: userDTO.fullName.split(' ')[0],
        last_name: userDTO.fullName.split(' ')[1] || '',
        full_name: userDTO.fullName,
        phone_number: userDTO.phoneNumber || null,
        role: userDTO.role as UserRole,
        is_email_verified: userDTO.isEmailVerified,
        is_active: userDTO.isActive,
        is_setup: userDTO.isSetup,
        preferred_language: userDTO.preferredLanguage || 'en',
        last_login_at: null,
        login_failed_time: null,
        access_failed_count: 0,
        gigcoin_balance: 0,
        created_at: userDTO.createdAt,
        updated_at: userDTO.updatedAt || userDTO.createdAt,
      };

      setUser(user);
      setRoleState(user.role);
      localStorage.setItem('gigbridge_session', JSON.stringify({ user, role: user.role }));
      localStorage.setItem('access_token', token);
      localStorage.setItem('gigbridge_user', JSON.stringify(user));

      return user.role;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, firstName: string, lastName: string, role: UserRole) => {
    setIsLoading(true);
    try {
      const registerData = {
        email,
        password,
        confirmPassword: password,
        fullName: `${firstName} ${lastName}`,
        role
      };
      const response = await (authAPI.register as (data: any) => Promise<ApiResponse<UserDTO>>)(registerData);
      const apiResponse = response as unknown as ApiResponse<UserDTO>;

      if (!apiResponse.success || !apiResponse.data) {
        throw new Error(apiResponse.message || 'Registration failed');
      }

      const userDTO = apiResponse.data;
      const user: User = {
        id: userDTO.userId,
        email: userDTO.email,
        first_name: userDTO.fullName.split(' ')[0],
        last_name: userDTO.fullName.split(' ')[1] || '',
        full_name: userDTO.fullName,
        phone_number: userDTO.phoneNumber || null,
        role: userDTO.role as UserRole,
        is_email_verified: userDTO.isEmailVerified,
        is_active: userDTO.isActive,
        is_setup: userDTO.isSetup,
        preferred_language: userDTO.preferredLanguage || 'en',
        last_login_at: null,
        login_failed_time: null,
        access_failed_count: 0,
        gigcoin_balance: 0,
        created_at: userDTO.createdAt,
        updated_at: userDTO.updatedAt || userDTO.createdAt,
      };

      setUser(user);
      setRoleState(user.role);
      localStorage.setItem('gigbridge_session', JSON.stringify({ user, role: user.role }));
      localStorage.setItem('gigbridge_user', JSON.stringify(user));
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setRoleState(null);
    setClientProfile(null);
    setFreelancerProfile(null);
    localStorage.removeItem('gigbridge_session');
    localStorage.removeItem('gigbridge_user');
    localStorage.removeItem('access_token');
  }, []);

  const completeOnboarding = useCallback(async (profileData: any) => {
    if (!user) return;
    setIsLoading(true);
    try {
      if (user.role === 0) {
        setClientProfile(profileData);
      } else {
        setFreelancerProfile(profileData);
      }
    } finally {
      setIsLoading(false);
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