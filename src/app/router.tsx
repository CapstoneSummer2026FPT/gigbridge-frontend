import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { AppProvider, useApp } from './providers/AppProvider';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';

// Lazy imports for all screens
import LandingScreen from '../features/landing/screens/LandingPagePremium';
import LoginScreen from '../features/auth/screens/LoginScreen';
import SignupScreen from '../features/auth/screens/SignupScreen';
import ForgotPasswordScreen from '../features/auth/screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../features/auth/screens/ResetPasswordScreen';
import ProfileSetupScreen from '../features/onboarding/screens/ProfileSetupScreen';
import ClientDashboardScreen from '../features/dashboard/screens/ClientDashboardScreen';
import FreelancerDashboardScreen from '../features/dashboard/screens/FreelancerDashboardScreen';
import PostJobScreen from '../features/jobs/screens/PostJobScreen';
import CreateJobPostQuestionsScreen from '../features/jobs/screens/CreateJobPostQuestionsScreen';
import ManageJobPostQuestionsScreen from '../features/jobs/screens/ManageJobPostQuestionsScreen';
import CreatePostJobContractScreen from '../features/jobs/screens/CreatePostJobContractScreen';
import BrowseJobsScreen from '../features/jobs/screens/BrowseJobsScreen';
import JobDetailScreen from '../features/jobs/screens/JobDetailScreen';
import MyJobsScreen from '@/features/jobs/screens/MyJobsScreen';
import FreelancerProfileScreen from '../features/profile/screens/FreelancerProfileScreen';
import ClientProfileScreen from '../features/profile/screens/ClientProfileScreen';
import EditClientProfileScreen from '../features/profile/screens/EditClientProfileScreen';
import EditFreelancerProfileScreen from '../features/profile/screens/EditFreelancerProfileScreen';
import ManageFreelancerContentScreen from '../features/profile/screens/ManageFreelancerContentScreen';
import ProposalsInboxScreen from '../features/proposals/screens/ProposalsInboxScreen';
import CreateProposalScreen from '../features/proposals/screens/CreateProposalScreen';
import ScreenProposalAnswerQuestion from '../features/proposals/screens/ScreenProposalAnswerQuestion';
import ViewProposalAnswersScreen from '../features/proposals/screens/ViewProposalAnswersScreen';
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
import CreateReviewScreen from '../features/reviews/screens/CreateReviewScreen';
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

import {
  FreelancerRegisterContractScreen,
  ViewContractDetailsScreen,
} from '../features/contracts';

// Import router styles
import './styles/router.css';
import { UserRole } from '../types';

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
    return <Navigate to="/auth/login" replace />;
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
      { path: 'auth/forgot-password', element: <PublicRoute><ForgotPasswordScreen /></PublicRoute> },
      { path: 'auth/reset-password', element: <PublicRoute><ResetPasswordScreen /></PublicRoute> },
      { path: 'api/Auth/reset-password', element: <PublicRoute><ResetPasswordScreen /></PublicRoute> },

      // Onboarding routes - requires authentication
      { path: 'onboarding/profile-setup', element: <ProtectedRoute requireAuth><ProfileSetupScreen /></ProtectedRoute> },

      // Client routes - requires authentication and setup
      { path: 'client/dashboard', element: <ProtectedRoute requireAuth requireSetup><ClientDashboardScreen /></ProtectedRoute> },

      // Freelancer routes - requires authentication and setup
      { path: 'freelancer/dashboard', element: <ProtectedRoute requireAuth requireSetup><FreelancerDashboardScreen /></ProtectedRoute> },

      // Jobs - requires authentication
      { path: 'jobs/post/questions', element: <ProtectedRoute requireAuth requireSetup><CreateJobPostQuestionsScreen /></ProtectedRoute> },
      { path: 'jobs/post', element: <ProtectedRoute requireAuth requireSetup><PostJobScreen /></ProtectedRoute> },
      { path: 'jobs/post/interview-questions', element: <Navigate to="/jobs/post/questions" replace /> },
      { path: 'jobs/browse', element: <ProtectedRoute requireAuth><BrowseJobsScreen /></ProtectedRoute> },
      { path: 'jobs/my-jobs', element: <ProtectedRoute requireAuth requireSetup><MyJobsScreen /></ProtectedRoute> },
      { path: 'client/job-posts/:jobPostId/questions', element: <ProtectedRoute requireAuth requireSetup><ManageJobPostQuestionsScreen /></ProtectedRoute> },
      { path: 'jobs/:jobPostId/apply', element: <ProtectedRoute requireAuth requireSetup><CreateProposalScreen /></ProtectedRoute> },
      { path: 'jobs/post/contract', element: <ProtectedRoute requireAuth requireSetup><CreatePostJobContractScreen /></ProtectedRoute> },
      { path: 'jobs/:id', element: <ProtectedRoute requireAuth><JobDetailScreen /></ProtectedRoute> },

      // Profiles - requires authentication
      { path: 'profile/freelancer/:id', element: <ProtectedRoute requireAuth><FreelancerProfileScreen /></ProtectedRoute> },
      { path: 'profile/client/:id', element: <ProtectedRoute requireAuth><ClientProfileScreen /></ProtectedRoute> },
      { path: 'profile/freelancer/:id/edit', element: <ProtectedRoute requireAuth><EditFreelancerProfileScreen /></ProtectedRoute> },
      { path: 'profile/client/:id/edit', element: <ProtectedRoute requireAuth><EditClientProfileScreen /></ProtectedRoute> },
      { path: 'profile/manage-content', element: <ProtectedRoute requireAuth><ManageFreelancerContentScreen /></ProtectedRoute> },

      // Proposals - requires authentication and setup
      { path: 'proposals', element: <ProtectedRoute requireAuth requireSetup><ProposalsInboxScreen /></ProtectedRoute> },
      { path: 'proposals/create/:jobPostId', element: <ProtectedRoute requireAuth requireSetup><CreateProposalScreen /></ProtectedRoute> },
      { path: 'proposals/:proposalId/edit', element: <ProtectedRoute requireAuth requireSetup><CreateProposalScreen /></ProtectedRoute> },
      { path: 'proposals/create/:jobPostId/questions', element: <ProtectedRoute requireAuth requireSetup><ScreenProposalAnswerQuestion /></ProtectedRoute> },
      { path: 'proposals/:proposalId/answers', element: <ProtectedRoute requireAuth requireSetup><ViewProposalAnswersScreen /></ProtectedRoute> },

      // Contracts - requires authentication and setup
      { path: 'contracts/:contractId', element: <ProtectedRoute requireAuth requireSetup><ViewContractDetailsScreen /></ProtectedRoute> },

      // Workspace - requires authentication and setup
      { path: 'projects', element: <ProtectedRoute requireAuth requireSetup><ProjectsListScreen /></ProtectedRoute> },
      { path: 'workspace/:id', element: <ProtectedRoute requireAuth requireSetup><ProjectWorkspaceScreen /></ProtectedRoute> },
      { path: 'workspace/:projectId/freelancer-contract', element: <ProtectedRoute requireAuth requireSetup><FreelancerRegisterContractScreen /></ProtectedRoute> },

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
      { path: 'admin', element: <AdminRoute><AdminDashboardScreen /></AdminRoute> },
      { path: 'admin/users', element: <AdminRoute><AdminUsersScreen /></AdminRoute> },
      { path: 'admin/jobs', element: <AdminRoute><AdminJobsScreen /></AdminRoute> },
      { path: 'admin/contracts', element: <AdminRoute><AdminContractsScreen /></AdminRoute> },
      { path: 'admin/reports', element: <AdminRoute><AdminReportsScreen /></AdminRoute> },
      { path: 'admin/feedback', element: <AdminRoute><AdminFeedbackScreen /></AdminRoute> },
      { path: 'admin/system-tracking', element: <AdminRoute><AdminSystemTrackingScreen /></AdminRoute> },
      { path: 'admin/revenue', element: <AdminRoute><AdminRevenueScreen /></AdminRoute> },
      { path: 'admin/notifications', element: <AdminRoute><AdminNotificationsScreen /></AdminRoute> },

      // Market Insights - public
      { path: 'market-insights', element: <MarketInsightsScreen /> },

      // Notifications - requires authentication
      { path: 'notifications', element: <ProtectedRoute requireAuth><NotificationsScreen /></ProtectedRoute> },
      { path: 'reviews/create', element: <ProtectedRoute requireAuth requireSetup><CreateReviewScreen /></ProtectedRoute> },

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