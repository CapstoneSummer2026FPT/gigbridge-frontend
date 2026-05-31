import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { AppProvider } from './providers/AppProvider';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

// Lazy imports for all screens
import LandingScreen from '../features/landing/screens/LandingScreenNew';
import LoginScreen from '../features/auth/screens/LoginScreen';
import SignupScreen from '../features/auth/screens/SignupScreen';
import ProfileSetupScreen from '../features/onboarding/screens/ProfileSetupScreen';
import ClientDashboardScreen from '../features/dashboard/screens/ClientDashboardScreen';
import FreelancerDashboardScreen from '../features/dashboard/screens/FreelancerDashboardScreen';
import PostJobScreen from '../features/jobs/screens/PostJobScreen';
import PostJobInterviewQuestionsScreen from '../features/jobs/screens/PostJobInterviewQuestionsScreen';
import BrowseJobsScreen from '../features/jobs/screens/BrowseJobsScreen';
import JobDetailScreen from '../features/jobs/screens/JobDetailScreen';
import FreelancerProfileScreen from '../features/profile/screens/FreelancerProfileScreen';
import ClientProfileScreen from '../features/profile/screens/ClientProfileScreen';
import ProposalsInboxScreen from '../features/proposals/screens/ProposalsInboxScreen';
import ProjectsListScreen from '../features/workspace/screens/ProjectsListScreen';
import ProjectWorkspaceScreen from '../features/workspace/screens/ProjectWorkspaceScreen';
import AIAssistantScreen from '../features/ai-assistant/screens/AIAssistantScreen';
import AIInterviewScreen from '../features/ai-interview/screens/AIInterviewScreen';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import AdminDashboardScreen from '../features/admin/screens/AdminDashboardScreen';
import AdminUsersScreen from '../features/admin/screens/AdminUsersScreen';
import AdminJobsScreen from '../features/admin/screens/AdminJobsScreen';
import AdminContractsScreen from '../features/admin/screens/AdminContractsScreen';
import AdminSystemTrackingScreen from '../features/admin/screens/AdminSystemTrackingScreen';
import AdminRevenueScreen from '../features/admin/screens/AdminRevenueScreen';
import AdminReportsScreen from '../features/admin/screens/AdminReportsScreen';
import AdminFeedbackScreen from '../features/admin/screens/AdminFeedbackScreen';
import AdminNotificationsScreen from '../features/admin/screens/AdminNotificationsScreen';
import MarketInsightsScreen from '../features/market-insights/screens/MarketInsightsScreen';
import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';
import AboutScreen from '../features/company/screens/AboutScreen';
import CareersScreen from '../features/company/screens/CareersScreen';
import FAQScreen from '../features/company/screens/FAQScreen';
import PressKitScreen from '../features/company/screens/PressKitScreen';
import GuideScreen from '../features/company/screens/GuideScreen';
import WalletDepositScreen from '../features/wallet/screens/WalletDepositScreen';
import SubscriptionScreen from '../features/wallet/screens/SubscriptionScreen';
import FinancialOverviewScreen from '../features/wallet/screens/FinancialOverviewScreen';
import WalletHistoryScreen from '../features/wallet/screens/WalletHistoryScreen';
import BuyGigcoinScreen from '../features/wallet/screens/BuyGigcoinScreen';

// Import router styles
import './styles/router.css';

function NotFound() {
  return (
    <div className="not-found-container">
      <div className="not-found-content">
        <p className="not-found-title">404</p>
        <p className="not-found-heading">Page Not Found</p>
        <p className="not-found-text">The page you're looking for doesn't exist.</p>
        <a href="/" className="not-found-button">Go Home</a>
      </div>
    </div>
  );
}

/**
 * RootLayout - Critical component that wraps all routes with AppProvider
 * 
 * This ensures AppContext is available to all child routes through React Router's Outlet.
 * Structure: RootLayout > AppProvider > Outlet > [All Screen Components]
 * 
 * ⚠️ DO NOT move AppProvider outside of router tree or context will not propagate correctly!
 */
function RootLayout() {
  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  );
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated, role } = useApp();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (role !== UserRole.Admin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // Public routes - redirect to dashboard if authenticated
      { index: true, element: <PublicRoute><LandingScreen /></PublicRoute> },
      { path: 'auth/login', element: <PublicRoute><LoginScreen /></PublicRoute> },
      { path: 'auth/signup', element: <PublicRoute><SignupScreen /></PublicRoute> },

      // Onboarding routes - requires authentication
      { path: 'onboarding/profile-setup', element: <ProtectedRoute requireAuth><ProfileSetupScreen /></ProtectedRoute> },

      // Client routes - requires authentication and setup
      { path: 'client/dashboard', element: <ProtectedRoute requireAuth requireSetup><ClientDashboardScreen /></ProtectedRoute> },

      // Freelancer routes - requires authentication and setup
      { path: 'freelancer/dashboard', element: <ProtectedRoute requireAuth requireSetup><FreelancerDashboardScreen /></ProtectedRoute> },

      // Jobs - requires authentication
      { path: 'jobs/post', element: <ProtectedRoute requireAuth requireSetup><PostJobScreen /></ProtectedRoute> },
      { path: 'jobs/post/interview-questions', element: <ProtectedRoute requireAuth requireSetup><PostJobInterviewQuestionsScreen /></ProtectedRoute> },
      { path: 'jobs/browse', element: <ProtectedRoute requireAuth><BrowseJobsScreen /></ProtectedRoute> },
      { path: 'jobs/my-jobs', element: <ProtectedRoute requireAuth requireSetup><BrowseJobsScreen /></ProtectedRoute> },
      { path: 'jobs/:id', element: <ProtectedRoute requireAuth><JobDetailScreen /></ProtectedRoute> },

      // Profiles - requires authentication
      { path: 'profile/freelancer/:id', element: <ProtectedRoute requireAuth><FreelancerProfileScreen /></ProtectedRoute> },
      { path: 'profile/client/:id', element: <ProtectedRoute requireAuth><ClientProfileScreen /></ProtectedRoute> },

      // Proposals - requires authentication and setup
      { path: 'proposals', element: <ProtectedRoute requireAuth requireSetup><ProposalsInboxScreen /></ProtectedRoute> },

      // Workspace - requires authentication and setup
      { path: 'projects', element: <ProtectedRoute requireAuth requireSetup><ProjectsListScreen /></ProtectedRoute> },
      { path: 'workspace/:id', element: <ProtectedRoute requireAuth requireSetup><ProjectWorkspaceScreen /></ProtectedRoute> },

      // AI Features - requires authentication and setup
      { path: 'ai-assistant', element: <ProtectedRoute requireAuth requireSetup><AIAssistantScreen /></ProtectedRoute> },
      { path: 'ai-interview', element: <ProtectedRoute requireAuth requireSetup><AIInterviewScreen /></ProtectedRoute> },

      // Settings - requires authentication
      { path: 'settings', element: <ProtectedRoute requireAuth><SettingsScreen /></ProtectedRoute> },

      // Wallet & Subscription - requires authentication and setup
      { path: 'wallet/deposit', element: <ProtectedRoute requireAuth requireSetup><WalletDepositScreen /></ProtectedRoute> },
      { path: 'wallet/history', element: <ProtectedRoute requireAuth requireSetup><WalletHistoryScreen /></ProtectedRoute> },
      { path: 'buy-gigcoin', element: <ProtectedRoute requireAuth requireSetup><BuyGigcoinScreen /></ProtectedRoute> },
      { path: 'subscription', element: <ProtectedRoute requireAuth requireSetup><SubscriptionScreen /></ProtectedRoute> },
      { path: 'financial-overview', element: <ProtectedRoute requireAuth requireSetup><FinancialOverviewScreen /></ProtectedRoute> },

      // Admin - requires authentication and admin role
      { path: 'admin', element: <ProtectedRoute requireAuth requireSetup><AdminDashboardScreen /></ProtectedRoute> },
      { path: 'admin/users', element: <ProtectedRoute requireAuth requireSetup><AdminUsersScreen /></ProtectedRoute> },
      { path: 'admin/jobs', element: <ProtectedRoute requireAuth requireSetup><AdminJobsScreen /></ProtectedRoute> },
      { path: 'admin/contracts', element: <ProtectedRoute requireAuth requireSetup><AdminContractsScreen /></ProtectedRoute> },
      { path: 'admin/reports', element: <ProtectedRoute requireAuth requireSetup><AdminReportsScreen /></ProtectedRoute> },
      { path: 'admin/feedback', element: <ProtectedRoute requireAuth requireSetup><AdminFeedbackScreen /></ProtectedRoute> },
      { path: 'admin/system-tracking', element: <ProtectedRoute requireAuth requireSetup><AdminSystemTrackingScreen /></ProtectedRoute> },
      { path: 'admin/revenue', element: <ProtectedRoute requireAuth requireSetup><AdminRevenueScreen /></ProtectedRoute> },
      { path: 'admin/notifications', element: <ProtectedRoute requireAuth requireSetup><AdminNotificationsScreen /></ProtectedRoute> },

      // Market Insights - public
      { path: 'market-insights', element: <MarketInsightsScreen /> },

      // Notifications - requires authentication
      { path: 'notifications', element: <ProtectedRoute requireAuth><NotificationsScreen /></ProtectedRoute> },

      // Company Pages - public
      { path: 'about', element: <AboutScreen /> },
      { path: 'careers', element: <CareersScreen /> },
      { path: 'faq', element: <FAQScreen /> },
      { path: 'press-kit', element: <PressKitScreen /> },
      { path: 'guide', element: <GuideScreen /> },

      // 404
      { path: '*', element: <NotFound /> },
    ],
  },
]);
