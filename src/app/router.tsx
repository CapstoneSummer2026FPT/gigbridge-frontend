import type { ReactNode } from 'react';
import { createBrowserRouter, Navigate, Outlet, useParams } from 'react-router';
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
import PostJobPreGuideScreen from '../features/jobs/screens/PostJobPreGuideScreen';
import CreatePostJobContractScreen from '../features/jobs/screens/CreatePostJobContractScreen';
import CreatePostJobEsignScreen from '../features/jobs/screens/CreatePostJobEsignScreen';
import BrowseJobsScreen from '../features/jobs/screens/BrowseJobsScreen';
import JobDetailScreen from '../features/jobs/screens/JobDetailScreen';
import MyJobsScreen from '../features/jobs/screens/MyJobsScreen';
import ManageJobPostQuestionsScreen from '../features/jobs/screens/ManageJobPostQuestionsScreen';
import EditJobPostScreen from '../features/jobs/screens/EditJobPostScreen';
import SavedJobsScreen from '../features/jobs/screens/SavedJobsScreen';
import JobInvitationsScreen from '../features/jobs/screens/JobInvitationsScreen';
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
import MessagesScreen from '../features/messages/screens/MessagesScreen';
import AIInterviewScreen from '../features/ai-interview/screens/AIInterviewScreen';
import SettingsScreen from '../features/settings/screens/SettingsScreen';
import AdminDashboardScreen from '../features/admin/screens/AdminDashboardScreen';
import AdminUsersScreen from '../features/admin/screens/AdminUsersScreen';
import AdminCheatingManagementScreen from '../features/admin/screens/AdminCheatingManagementScreen';
import AdminJobsScreen from '../features/admin/screens/AdminJobsScreen';
import AdminSystemTrackingScreen from '../features/admin/screens/AdminSystemTrackingScreen';
import AdminRevenueScreen from '../features/admin/screens/AdminRevenueScreen';
import AdminWithdrawalsScreen from '../features/admin/screens/AdminWithdrawalsScreen';
import AdminReportsScreen from '../features/admin/screens/AdminReportsScreen';
import AdminFeedbackScreen from '../features/admin/screens/AdminFeedbackScreen';
import AdminNotificationsScreen from '../features/admin/screens/AdminNotificationsScreen';
import AdminContractAuditScreen from '../features/admin/screens/AdminContractAuditScreen';
import AdminContractTemplatesScreen from '../features/admin/screens/AdminContractTemplatesScreen';
import AdminAssetsScreen from '../features/admin/screens/AdminAssetsScreen';
import AdminFAQManagementScreen from '../features/admin/screens/AdminFAQManagementScreen';
import AdminAdsPackagesScreen from '../features/admin/screens/AdminAdsPackagesScreen';
import AdminDisputeManagementScreen from '../features/admin/screens/AdminDisputeManagementScreen';
import CreateDisputeScreen from '../features/disputes/screens/CreateDisputeScreen';
import DisputeDetailScreen from '../features/disputes/screens/DisputeDetailScreen';
import MarketInsightsScreen from '../features/market-insights/screens/MarketInsightsScreen';
import NotificationsScreen from '../features/notifications/screens/NotificationsScreen';
import CreateReviewScreen from '../features/reviews/screens/CreateReviewScreen';
import SmartTalentMatchingScreen from '../features/talent-matching/screens/SmartTalentMatchingScreen';
import AboutScreen from '../features/company/screens/AboutScreen';
import CareersScreen from '../features/company/screens/CareersScreen';
import FAQScreen from '../features/company/screens/FAQScreen';
import PressKitScreen from '../features/company/screens/PressKitScreen';
import GuideScreen from '../features/company/screens/GuideScreen';
import PolicyScreen from '../features/company/screens/PolicyScreen';
import WalletDepositScreen from '../features/wallet/screens/WalletDepositScreen';
import FreelancerPremiumScreen from '../features/premium/screens/FreelancerPremiumScreen';
import FreelancerPricingScreen from '../features/premium/screens/FreelancerPricingScreen';
import ClientPremiumScreen from '../features/premium/screens/ClientPremiumScreen';
import ClientPricingScreen from '../features/premium/screens/ClientPricingScreen';
import FinancialOverviewScreen from '../features/wallet/screens/FinancialOverviewScreen';
import WalletHistoryScreen from '../features/wallet/screens/WalletHistoryScreen';
import WalletMockCheckoutScreen from '../features/wallet/screens/WalletMockCheckoutScreen';
import BuyGigcoinScreen from '../features/wallet/screens/BuyGigcoinScreen';
import UploadPaymentProofScreen from '../features/wallet/screens/UploadPaymentProofScreen';
import EarlyPayoutScreen from '../features/wallet/screens/EarlyPayoutScreen';
import GoogleMeetOAuthCallbackScreen from '../features/integrations/screens/GoogleMeetOAuthCallbackScreen';
import {
  ApproveMilestoneScreen,
  CreateEsignContractScreen,
  ESignContractsScreen,
  EsignDocumentSigningScreen,
  FreelancerContractScreen,
  ManageContractScreen,
  ManageMilestonesScreen,
  SignatureWorkflowScreen,
  SubmitMilestoneDeliverableScreen,
  ViewContractDetailsScreen,
} from '../features/contracts';

// Import router styles
import './styles/router.css';
import { UserRole } from '../types';
import { getProposalCreatePath } from '../features/proposals/utils/proposalRoutes';

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

function OwnProfileEditRoute({ expectedRole, children }: { expectedRole: UserRole; children: ReactNode }) {
  const { user, isLoading } = useApp();
  const { id } = useParams<{ id: string }>();

  if (isLoading || !user) {
    return null;
  }

  if (user.role === UserRole.Admin) {
    return <Navigate to="/admin" replace />;
  }

  const roleSegment = user.role === UserRole.Freelancer ? 'freelancer' : 'client';
  const ownEditPath = `/profile/${roleSegment}/${user.id}/edit`;

  if (user.role !== expectedRole || id?.toLowerCase() !== user.id.toLowerCase()) {
    return <Navigate to={ownEditPath} replace />;
  }

  return <>{children}</>;
}

function ContractListRoute() {
  const { role } = useApp();
  return role === UserRole.Freelancer ? <FreelancerContractScreen /> : <ManageContractScreen />;
}

function FreelancerPremiumRoute() {
  const { role } = useApp();
  return role === UserRole.Freelancer
    ? <FreelancerPremiumScreen />
    : <Navigate to="/subscription" replace />;
}

function FreelancerOnly({ children }: { children: ReactNode }) {
  const { role } = useApp();
  return role === UserRole.Freelancer ? <>{children}</> : <Navigate to="/subscription" replace />;
}

function ClientOnly({ children }: { children: ReactNode }) {
  const { role } = useApp();
  return role === UserRole.Client ? <>{children}</> : <Navigate to="/premium/freelancer/pricing" replace />;
}

function SubscriptionRoute() {
  const { role } = useApp();
  return role === UserRole.Freelancer
    ? <Navigate to="/premium/freelancer/pricing" replace />
    : <Navigate to="/premium/client/pricing" replace />;
}

function NavigateToProposalCreate() {
  const { jobPostId } = useParams<{ jobPostId: string }>();
  return <Navigate to={getProposalCreatePath(jobPostId || '')} replace />;
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
      { path: 'freelancer/premium', element: <ProtectedRoute requireAuth requireSetup><Navigate to="/premium/freelancer" replace /></ProtectedRoute> },
      { path: 'premium/freelancer', element: <ProtectedRoute requireAuth requireSetup><FreelancerPremiumRoute /></ProtectedRoute> },
      { path: 'premium/freelancer/pricing', element: <ProtectedRoute requireAuth requireSetup><FreelancerOnly><FreelancerPricingScreen /></FreelancerOnly></ProtectedRoute> },
      { path: 'premium/freelancer/points', element: <ProtectedRoute requireAuth requireSetup><FreelancerOnly><FreelancerPremiumScreen initialTab="points" /></FreelancerOnly></ProtectedRoute> },
      { path: 'premium/freelancer/rank-protection', element: <ProtectedRoute requireAuth requireSetup><FreelancerOnly><FreelancerPremiumScreen initialTab="vacation" /></FreelancerOnly></ProtectedRoute> },
      { path: 'premium/freelancer/promotions', element: <ProtectedRoute requireAuth requireSetup><FreelancerOnly><FreelancerPremiumScreen initialTab="promotions" /></FreelancerOnly></ProtectedRoute> },
      { path: 'premium/freelancer/history', element: <ProtectedRoute requireAuth requireSetup><FreelancerOnly><FreelancerPremiumScreen initialTab="history" /></FreelancerOnly></ProtectedRoute> },
      { path: 'premium/client', element: <ProtectedRoute requireAuth requireSetup><ClientOnly><ClientPremiumScreen /></ClientOnly></ProtectedRoute> },
      { path: 'premium/client/pricing', element: <ProtectedRoute requireAuth requireSetup><ClientOnly><ClientPricingScreen /></ClientOnly></ProtectedRoute> },

      // Jobs - requires authentication
      { path: 'jobs/post/guide', element: <ProtectedRoute requireAuth requireSetup><PostJobPreGuideScreen /></ProtectedRoute> },
      { path: 'jobs/post', element: <ProtectedRoute requireAuth requireSetup><PostJobScreen /></ProtectedRoute> },
      { path: 'jobs/post/contract', element: <ProtectedRoute requireAuth requireSetup><CreatePostJobContractScreen /></ProtectedRoute> },
      { path: 'jobs/post/esign', element: <ProtectedRoute requireAuth requireSetup><CreatePostJobEsignScreen /></ProtectedRoute> },
      { path: 'jobs/post/contract/esign', element: <ProtectedRoute requireAuth requireSetup><CreatePostJobEsignScreen /></ProtectedRoute> },
      { path: 'jobs/browse', element: <ProtectedRoute requireAuth><BrowseJobsScreen /></ProtectedRoute> },
      { path: 'jobs/saved', element: <ProtectedRoute requireAuth><SavedJobsScreen /></ProtectedRoute> },
      { path: 'jobs/invitations', element: <ProtectedRoute requireAuth requireSetup><JobInvitationsScreen /></ProtectedRoute> },
      { path: 'jobs/my-jobs', element: <ProtectedRoute requireAuth requireSetup><MyJobsScreen /></ProtectedRoute> },
      { path: 'jobs/my-jobs/:jobPostId', element: <ProtectedRoute requireAuth requireSetup><JobDetailScreen /></ProtectedRoute> },
      { path: 'jobs/:id', element: <ProtectedRoute requireAuth><JobDetailScreen /></ProtectedRoute> },
      { path: 'jobs/:id/edit', element: <ProtectedRoute requireAuth requireSetup><EditJobPostScreen /></ProtectedRoute> },
      { path: 'client/job-posts/:jobPostId/questions', element: <ProtectedRoute requireAuth requireSetup><ManageJobPostQuestionsScreen /></ProtectedRoute> },

      // Profiles - requires authentication
      { path: 'profile/freelancer/:id', element: <ProtectedRoute requireAuth><FreelancerProfileScreen /></ProtectedRoute> },
      { path: 'profile/client/:id', element: <ProtectedRoute requireAuth><ClientProfileScreen /></ProtectedRoute> },
      { path: 'profile/freelancer/:id/edit', element: <ProtectedRoute requireAuth><OwnProfileEditRoute expectedRole={UserRole.Freelancer}><EditFreelancerProfileScreen /></OwnProfileEditRoute></ProtectedRoute> },
      { path: 'profile/client/:id/edit', element: <ProtectedRoute requireAuth><OwnProfileEditRoute expectedRole={UserRole.Client}><EditClientProfileScreen /></OwnProfileEditRoute></ProtectedRoute> },
      { path: 'profile/manage-content', element: <ProtectedRoute requireAuth><ManageFreelancerContentScreen /></ProtectedRoute> },

      // Proposals - requires authentication and setup
      { path: 'proposals', element: <ProtectedRoute requireAuth requireSetup><ProposalsInboxScreen /></ProtectedRoute> },
      { path: 'proposals/create/:jobPostId', element: <ProtectedRoute requireAuth requireSetup><CreateProposalScreen /></ProtectedRoute> },
      { path: 'jobs/:jobPostId/apply', element: <ProtectedRoute requireAuth requireSetup><NavigateToProposalCreate /></ProtectedRoute> },
      { path: 'proposals/:proposalId/edit', element: <ProtectedRoute requireAuth requireSetup><CreateProposalScreen /></ProtectedRoute> },
      { path: 'proposals/create/:jobPostId/questions', element: <ProtectedRoute requireAuth requireSetup><ScreenProposalAnswerQuestion /></ProtectedRoute> },
      { path: 'proposals/:proposalId/answers', element: <ProtectedRoute requireAuth requireSetup><ViewProposalAnswersScreen /></ProtectedRoute> },

      // Contracts - requires authentication and setup
      { path: 'contracts', element: <ProtectedRoute requireAuth requireSetup><ContractListRoute /></ProtectedRoute> },
      { path: 'contracts/esign', element: <ProtectedRoute requireAuth requireSetup><ESignContractsScreen /></ProtectedRoute> },
      { path: 'contracts/create/:proposalId', element: <ProtectedRoute requireAuth requireSetup><CreateEsignContractScreen /></ProtectedRoute> },
      { path: 'contracts/:contractId', element: <ProtectedRoute requireAuth requireSetup><ViewContractDetailsScreen /></ProtectedRoute> },
      { path: 'contracts/:contractId/disputes/create', element: <ProtectedRoute requireAuth requireSetup><CreateDisputeScreen /></ProtectedRoute> },
      { path: 'contracts/:contractId/disputes/:disputeId', element: <ProtectedRoute requireAuth requireSetup><DisputeDetailScreen /></ProtectedRoute> },
      { path: 'contracts/:contractId/sign', element: <ProtectedRoute requireAuth requireSetup><SignatureWorkflowScreen /></ProtectedRoute> },
      { path: 'contracts/:contractId/documents/:documentId/sign', element: <ProtectedRoute requireAuth requireSetup><EsignDocumentSigningScreen /></ProtectedRoute> },
      { path: 'contracts/:contractId/milestones', element: <ProtectedRoute requireAuth requireSetup><ManageMilestonesScreen /></ProtectedRoute> },
      { path: 'contracts/:contractId/milestones/:milestoneId/approve', element: <ProtectedRoute requireAuth requireSetup><ApproveMilestoneScreen /></ProtectedRoute> },
      { path: 'contracts/:contractId/deliverables/:milestoneId', element: <ProtectedRoute requireAuth requireSetup><SubmitMilestoneDeliverableScreen /></ProtectedRoute> },

      // Messages - requires authentication and setup
      { path: 'messages', element: <ProtectedRoute requireAuth requireSetup><MessagesScreen /></ProtectedRoute> },

      // Workspace - requires authentication and setup
      { path: 'projects', element: <ProtectedRoute requireAuth requireSetup><ProjectsListScreen /></ProtectedRoute> },
      { path: 'workspace/:contractId', element: <ProtectedRoute requireAuth requireSetup><ProjectWorkspaceScreen /></ProtectedRoute> },

      { path: 'ai-assistant', element: <Navigate to="/" replace state={{ openAIAssistant: true }} /> },
      { path: 'ai-interview', element: <ProtectedRoute requireAuth requireSetup><AIInterviewScreen /></ProtectedRoute> },
      { path: 'ai-interview/:jobPostId', element: <ProtectedRoute requireAuth requireSetup><AIInterviewScreen /></ProtectedRoute> },
      { path: 'talent-matching', element: <ProtectedRoute requireAuth requireSetup><SmartTalentMatchingScreen /></ProtectedRoute> },

      // Settings - requires authentication
      { path: 'settings', element: <ProtectedRoute requireAuth><SettingsScreen /></ProtectedRoute> },

      // Wallet & Subscription - requires authentication and setup
      { path: 'wallet/deposit', element: <ProtectedRoute requireAuth requireSetup><WalletDepositScreen /></ProtectedRoute> },
      { path: 'wallet/mock-checkout', element: <ProtectedRoute requireAuth requireSetup><WalletMockCheckoutScreen /></ProtectedRoute> },
      { path: 'wallet/history', element: <ProtectedRoute requireAuth requireSetup><WalletHistoryScreen /></ProtectedRoute> },
      { path: 'wallet/payment-proof/:transactionId', element: <ProtectedRoute requireAuth requireSetup><UploadPaymentProofScreen /></ProtectedRoute> },
      { path: 'wallet/withdrawals', element: <ProtectedRoute requireAuth requireSetup><EarlyPayoutScreen /></ProtectedRoute> },
      { path: 'wallet/early-payout', element: <ProtectedRoute requireAuth requireSetup><Navigate to="/wallet/withdrawals" replace /></ProtectedRoute> },
      { path: 'buy-gigcoin', element: <ProtectedRoute requireAuth requireSetup><BuyGigcoinScreen /></ProtectedRoute> },
      { path: 'subscription', element: <ProtectedRoute requireAuth requireSetup><SubscriptionRoute /></ProtectedRoute> },
      { path: 'financial-overview', element: <ProtectedRoute requireAuth requireSetup><FinancialOverviewScreen /></ProtectedRoute> },

      // Admin - requires authentication and admin role
      { path: 'admin', element: <AdminRoute><AdminDashboardScreen /></AdminRoute> },
      { path: 'admin/users', element: <AdminRoute><AdminUsersScreen /></AdminRoute> },
      { path: 'admin/jobs', element: <AdminRoute><AdminJobsScreen /></AdminRoute> },
      { path: 'admin/contracts', element: <AdminRoute><AdminContractAuditScreen /></AdminRoute> },
      { path: 'admin/contracts/esign', element: <AdminRoute><ESignContractsScreen /></AdminRoute> },
      { path: 'admin/assets', element: <AdminRoute><AdminAssetsScreen /></AdminRoute> },
      { path: 'admin/contract-audit', element: <AdminRoute><Navigate to="/admin/contracts" replace /></AdminRoute> },
      { path: 'admin/contract-templates', element: <AdminRoute><AdminContractTemplatesScreen /></AdminRoute> },
      { path: 'admin/faq-management', element: <AdminRoute><AdminFAQManagementScreen /></AdminRoute> },
      { path: 'admin/ads-packages', element: <AdminRoute><AdminAdsPackagesScreen /></AdminRoute> },
      { path: 'admin/disputes', element: <AdminRoute><AdminDisputeManagementScreen /></AdminRoute> },
      { path: 'admin/reports', element: <AdminRoute><AdminReportsScreen /></AdminRoute> },
      { path: 'admin/feedback', element: <AdminRoute><AdminFeedbackScreen /></AdminRoute> },
      { path: 'admin/system-tracking', element: <AdminRoute><AdminSystemTrackingScreen /></AdminRoute> },
      { path: 'admin/revenue', element: <AdminRoute><AdminRevenueScreen /></AdminRoute> },
      { path: 'admin/system-finance', element: <AdminRoute><AdminRevenueScreen /></AdminRoute> },
      { path: 'admin/withdrawals', element: <AdminRoute><AdminWithdrawalsScreen /></AdminRoute> },
      { path: 'admin/notifications', element: <AdminRoute><AdminNotificationsScreen /></AdminRoute> },
      { path: 'admin/cheating', element: <AdminRoute><AdminCheatingManagementScreen /></AdminRoute> },

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
      { path: 'policies', element: <PolicyScreen /> },
      { path: 'terms', element: <PolicyScreen /> },
      { path: 'privacy', element: <PolicyScreen /> },
      { path: 'integrations/google-meet/callback', element: <GoogleMeetOAuthCallbackScreen /> },

      // 404
      { path: '*', element: <NotFound /> },
    ],
  },
]);
