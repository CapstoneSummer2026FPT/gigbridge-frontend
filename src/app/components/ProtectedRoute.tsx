import { Navigate } from 'react-router';
import { useApp } from '../providers/AppProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireSetup?: boolean;
}

/**
 * ProtectedRoute - Handles authentication and setup redirects
 * 
 * - If requireAuth=true and user not authenticated: redirect to /auth/login
 * - If user authenticated but not setup: redirect to /onboarding/profile-setup
 * - If user authenticated and setup: render children
 * - If user on landing/auth pages but authenticated: redirect to dashboard
 */
export function ProtectedRoute({ 
  children, 
  requireAuth = false,
  requireSetup = false 
}: ProtectedRouteProps) {
  let appContext;
  try {
    appContext = useApp();
  } catch (e) {
    appContext = null;
  }

  const user = appContext?.user || null;
  const role = appContext?.role || null;
  const isLoading = appContext?.isLoading || false;

  // Still loading user data
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // User is authenticated
  if (user) {
    // User needs to complete setup
    if (!user.is_setup && requireSetup) {
      return <Navigate to="/onboarding/profile-setup" replace />;
    }

    // User is setup, render the page
    return <>{children}</>;
  }

  // User is not authenticated
  if (requireAuth) {
    return <Navigate to="/auth/login" replace />;
  }

  // Public page, render normally
  return <>{children}</>;
}

/**
 * PublicRoute - Redirects authenticated users away from public pages
 * Used for landing, login, signup pages
 */
export function PublicRoute({ children }: { children: React.ReactNode }) {
  let appContext;
  try {
    appContext = useApp();
  } catch (e) {
    appContext = null;
  }

  const user = appContext?.user || null;
  const role = appContext?.role || null;
  const isLoading = appContext?.isLoading || false;

  // Still loading
  if (isLoading) {
    return <div>Loading...</div>;
  }

  // User is authenticated, redirect to appropriate dashboard
  if (user) {
    if (!user.is_setup) {
      return <Navigate to="/onboarding/profile-setup" replace />;
    }

    // Redirect to role-based dashboard
    if (user.role === 0) {
      return <Navigate to="/client/dashboard" replace />;
    } else if (user.role === 1) {
      return <Navigate to="/freelancer/dashboard" replace />;
    } else if (user.role === 2) {
      return <Navigate to="/admin" replace />;
    }
  }

  // Not authenticated, show public page
  return <>{children}</>;
}
