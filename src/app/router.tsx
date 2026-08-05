import { lazy, type ReactNode } from 'react';
import { createBrowserRouter, Navigate, useLocation, useParams } from 'react-router';
import { useApp } from './providers/AppProvider';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { RootLayout } from './layouts/RootLayout';

const LandingScreen = lazy(() => import('../features/landing/screens/LandingPagePremium'));
const LoginScreen = lazy(() => import('../features/auth/screens/LoginScreen'));
const SignupScreen = lazy(() => import('../features/auth/screens/SignupScreen'));
const ForgotPasswordScreen = lazy(() => import('../features/auth/screens/ForgotPasswordScreen'));
const ResetPasswordScreen = lazy(() => import('../features/auth/screens/ResetPasswordScreen'));
const ProfileSetupScreen = lazy(() => import('../features/onboarding/screens/ProfileSetupScreen'));
const ClientDashboardScreen = lazy(() => import('../features/dashboard/screens/ClientDashboardScreen'));
const FreelancerDashboardScreen = lazy(() => import('../features/dashboard/screens/FreelancerDashboardScreen'));
const PostJobStepBasicInfo = lazy(() => import('../features/jobs/screens/PostJobStepBasicInfo'));
const PostJobMilestonesScreen = lazy(() => import('../features/jobs/screens/PostJobMilestonesScreen'));
const PostJobPreGuideScreen = lazy(() => import('../features/jobs/screens/PostJobPreGuideScreen'));
const PostJobReviewScreen = lazy(() => import('../features/jobs/screens/PostJobReviewScreen'));
const CreatePostJobContractScreen = lazy(() => import('../features/jobs/screens/CreatePostJobContractScreen'));
const CreatePostJobEsignScreen = lazy(() => import('../features/jobs/screens/CreatePostJobEsignScreen'));
const BrowseJobsScreen = lazy(() => import('../features/jobs/screens/BrowseJobsScreen'));
const JobDetailScreen = lazy(() => import('../features/jobs/screens/JobDetailScreen'));
const MyJobsScreen = lazy(() => import('../features/jobs/screens/MyJobsScreen'));
const ManageJobPostQuestionsScreen = lazy(() => import('../features/jobs/screens/ManageJobPostQuestionsScreen'));
const EditJobPostScreen = lazy(() => import('../features/jobs/screens/EditJobPostScreen'));
const SavedJobsScreen = lazy(() => import('../features/jobs/screens/SavedJobsScreen'));
const JobInvitationsScreen = lazy(() => import('../features/jobs/screens/JobInvitationsScreen'));
const FreelancerProfileScreen = lazy(() => import('../features/profile/screens/FreelancerProfileScreen'));
const ClientProfileScreen = lazy(() => import('../features/profile/screens/ClientProfileScreen'));
const ProposalsInboxScreen = lazy(() => import('../features/proposals/screens/ProposalsInboxScreen'));
const CreateProposalScreen = lazy(() => import('../features/proposals/screens/CreateProposalScreen'));
const ScreenProposalAnswerQuestion = lazy(() => import('../features/proposals/screens/ScreenProposalAnswerQuestion'));
const ViewProposalAnswersScreen = lazy(() => import('../features/proposals/screens/ViewProposalAnswersScreen'));
const ProjectsListScreen = lazy(() => import('../features/workspace/screens/ProjectsListScreen'));
const ProjectWorkspaceScreen = lazy(() => import('../features/workspace/screens/ProjectWorkspaceScreen'));
const MessagesScreen = lazy(() => import('../features/messages/screens/MessagesScreen'));
const AIInterviewScreen = lazy(() => import('../features/ai-interview/screens/AIInterviewScreen'));
const SettingsScreen = lazy(() => import('../features/settings/screens/SettingsScreen'));
const AdminDashboardScreen = lazy(() => import('../features/admin/screens/AdminDashboardScreen'));
const AdminUsersScreen = lazy(() => import('../features/admin/screens/AdminUsersScreen'));
const AdminJobsScreen = lazy(() => import('../features/admin/screens/AdminJobsScreen'));
const AdminProposalsScreen = lazy(() => import('../features/admin/screens/AdminProposalsScreen'));
const AdminProposalDetailScreen = lazy(() => import('../features/admin/screens/AdminProposalDetailScreen'));
const AdminAccountReportDetailScreen = lazy(() => import('../features/admin/screens/AdminAccountReportDetailScreen'));
const AdminContractReportsScreen = lazy(() => import('../features/admin/screens/AdminContractReportsScreen'));
const AdminContractReportDetailScreen = lazy(() => import('../features/admin/screens/AdminContractReportDetailScreen'));
const AdminSystemTrackingScreen = lazy(() => import('../features/admin/screens/AdminSystemTrackingScreen'));
const AdminWithdrawalsScreen = lazy(() => import('../features/admin/screens/AdminWithdrawalsScreen'));
const AdminAnalyticsScreen = lazy(() => import('../features/admin/screens/AdminAnalyticsScreen'));
const AdminReportsScreen = lazy(() => import('../features/admin/screens/AdminReportsScreen'));
const AdminReviewsScreen = lazy(() => import('../features/admin/screens/AdminReviewsScreen'));
const AdminNotificationsScreen = lazy(() => import('../features/admin/screens/AdminNotificationsScreen'));
const AdminContractAuditScreen = lazy(() => import('../features/admin/screens/AdminContractAuditScreen'));
const AdminContractTemplatesScreen = lazy(() => import('../features/admin/screens/AdminContractTemplatesScreen'));
const AdminAssetsScreen = lazy(() => import('../features/admin/screens/AdminAssetsScreen'));
const AdminFAQManagementScreen = lazy(() => import('../features/admin/screens/AdminFAQManagementScreen'));
const AdminDisputeManagementScreen = lazy(() => import('../features/admin/screens/AdminDisputeManagementScreen'));
const AdminEloOverviewScreen = lazy(() => import('../features/admin/screens/AdminEloOverviewScreen'));
const AdminEloHistoryScreen = lazy(() => import('../features/admin/screens/AdminEloHistoryScreen'));
const AdminEloAppealsScreen = lazy(() => import('../features/admin/screens/AdminEloAppealsScreen'));
const AdminEloAppealDetailScreen = lazy(() => import('../features/admin/screens/AdminEloAppealDetailScreen'));
const DisputeDetailScreen = lazy(() => import('../features/disputes/screens/DisputeDetailScreen'));
const NotificationsScreen = lazy(() => import('../features/notifications/screens/NotificationsScreen'));
const CreateReviewScreen = lazy(() => import('../features/reviews/screens/CreateReviewScreen'));
const MyReviewsScreen = lazy(() => import('../features/reviews/screens/MyReviewsScreen'));
const SmartTalentMatchingScreen = lazy(() => import('../features/talent-matching/screens/SmartTalentMatchingScreen'));
const AboutScreen = lazy(() => import('../features/company/screens/AboutScreen'));
const CareersScreen = lazy(() => import('../features/company/screens/CareersScreen'));
const FAQScreen = lazy(() => import('../features/company/screens/FAQScreen'));
const PressKitScreen = lazy(() => import('../features/company/screens/PressKitScreen'));
const GuideScreen = lazy(() => import('../features/company/screens/GuideScreen'));
const PolicyScreen = lazy(() => import('../features/company/screens/PolicyScreen'));
const WalletDepositScreen = lazy(() => import('../features/wallet/screens/WalletDepositScreen'));
const FreelancerPremiumScreen = lazy(() => import('../features/premium/screens/FreelancerPremiumScreen'));
const FreelancerPricingScreen = lazy(() => import('../features/premium/screens/FreelancerPricingScreen'));
const ClientPremiumScreen = lazy(() => import('../features/premium/screens/ClientPremiumScreen'));
const ClientPricingScreen = lazy(() => import('../features/premium/screens/ClientPricingScreen'));
const FinancialOverviewScreen = lazy(() => import('../features/wallet/screens/FinancialOverviewScreen'));
const WalletHistoryScreen = lazy(() => import('../features/wallet/screens/WalletHistoryScreen'));
const BuyGigcoinScreen = lazy(() => import('../features/wallet/screens/BuyGigcoinScreen'));
const EarlyPayoutScreen = lazy(() => import('../features/wallet/screens/EarlyPayoutScreen'));
const GoogleMeetOAuthCallbackScreen = lazy(() => import('../features/integrations/screens/GoogleMeetOAuthCallbackScreen'));
const ApproveMilestoneScreen = lazy(() => import('../features/contracts/screens/ApproveMilestoneScreen'));
const CreateEsignContractScreen = lazy(() => import('../features/contracts/screens/CreateEsignContractScreen'));
const ESignContractsScreen = lazy(() => import('../features/contracts/screens/ESignContractsScreen'));
const EsignDocumentSigningScreen = lazy(() => import('../features/contracts/screens/EsignDocumentSigningScreen'));
const FreelancerContractScreen = lazy(() => import('../features/contracts/screens/FreelancerContractScreen'));
const ManageContractScreen = lazy(() => import('../features/contracts/screens/ManageContractScreen'));
const ManageMilestonesScreen = lazy(() => import('../features/contracts/screens/ManageMilestonesScreen'));
const SignatureWorkflowScreen = lazy(() => import('../features/contracts/screens/SignatureWorkflowScreen'));
const SubmitMilestoneDeliverableScreen = lazy(() => import('../features/contracts/screens/SubmitMilestoneDeliverableScreen'));
const ViewContractDetailsScreen = lazy(() => import('../features/contracts/screens/ViewContractDetailsScreen'));
const EloHistoryScreen = lazy(() => import('../features/elo/screens/EloHistoryScreen'));

// Import router styles
import './styles/router.css';
import { UserRole } from '../types';
import { getProposalCreatePath } from '../features/proposals/utils/proposalRoutes';

const CLIENT_ONLY_ROLES = [UserRole.Client] as const;
const FREELANCER_ONLY_ROLES = [UserRole.Freelancer] as const;
const PARTICIPANT_ROLES = [UserRole.Client, UserRole.Freelancer] as const;

function LegacyJobPostRedirect({ to }: { to: '/jobs/post' | '/jobs/post/plan' }) {
  const location = useLocation();
  return <Navigate to={to} replace state={location.state} />;
}

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

function LegacyAdminUserDetailRedirect() {
  const { userId = '' } = useParams<{ userId: string }>();
  return <Navigate to={`/admin/users?preview=${encodeURIComponent(userId)}`} replace />;
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

      // Onboarding routes - requires authentication
      { path: 'onboarding/profile-setup', element: <ProtectedRoute requireAuth><ProfileSetupScreen /></ProtectedRoute> },

      // Client routes - requires authentication and setup
      { path: 'client/dashboard', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><ClientDashboardScreen /></ProtectedRoute> },

      // Freelancer routes - requires authentication and setup
      { path: 'freelancer/dashboard', element: <ProtectedRoute requireAuth requireSetup allowedRoles={FREELANCER_ONLY_ROLES}><FreelancerDashboardScreen /></ProtectedRoute> },
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
      { path: 'jobs/post/guide', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><PostJobPreGuideScreen /></ProtectedRoute> },
      { path: 'jobs/post', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><PostJobStepBasicInfo /></ProtectedRoute> },
      { path: 'jobs/post/plan', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><PostJobMilestonesScreen /></ProtectedRoute> },
      { path: 'jobs/post/scope', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><LegacyJobPostRedirect to="/jobs/post" /></ProtectedRoute> },
      { path: 'jobs/post/questions', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><LegacyJobPostRedirect to="/jobs/post/plan" /></ProtectedRoute> },
      { path: 'jobs/post/milestones', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><LegacyJobPostRedirect to="/jobs/post/plan" /></ProtectedRoute> },
      { path: 'jobs/post/review', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><PostJobReviewScreen /></ProtectedRoute> },
      { path: 'jobs/post/contract', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><CreatePostJobContractScreen /></ProtectedRoute> },
      { path: 'jobs/post/esign', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><CreatePostJobEsignScreen /></ProtectedRoute> },
      { path: 'jobs/post/contract/esign', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><CreatePostJobEsignScreen /></ProtectedRoute> },
      { path: 'jobs/browse', element: <ProtectedRoute requireAuth><BrowseJobsScreen /></ProtectedRoute> },
      { path: 'jobs/saved', element: <ProtectedRoute requireAuth><SavedJobsScreen /></ProtectedRoute> },
      { path: 'jobs/invitations', element: <ProtectedRoute requireAuth requireSetup><JobInvitationsScreen /></ProtectedRoute> },
      { path: 'jobs/my-jobs', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><MyJobsScreen /></ProtectedRoute> },
      { path: 'jobs/my-jobs/:jobPostId', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><JobDetailScreen /></ProtectedRoute> },
      { path: 'jobs/:id', element: <ProtectedRoute requireAuth><JobDetailScreen /></ProtectedRoute> },
      { path: 'jobs/:id/edit', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><EditJobPostScreen /></ProtectedRoute> },
      { path: 'client/job-posts/:jobPostId/questions', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><ManageJobPostQuestionsScreen /></ProtectedRoute> },

      // Profiles - requires authentication
      { path: 'profile/freelancer/:id', element: <ProtectedRoute requireAuth><FreelancerProfileScreen /></ProtectedRoute> },
      { path: 'profile/client/:id', element: <ProtectedRoute requireAuth><ClientProfileScreen /></ProtectedRoute> },
      { path: 'profile/freelancer/:id/edit', element: <Navigate to="/settings" replace /> },
      { path: 'profile/client/:id/edit', element: <Navigate to="/settings" replace /> },

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
      { path: 'contracts/:contractId/disputes/:disputeId', element: <ProtectedRoute requireAuth requireSetup><DisputeDetailScreen /></ProtectedRoute> },
      { path: 'contracts/:contractId/sign', element: <ProtectedRoute requireAuth requireSetup><SignatureWorkflowScreen /></ProtectedRoute> },
      { path: 'contracts/:contractId/documents/:documentId/sign', element: <ProtectedRoute requireAuth requireSetup><EsignDocumentSigningScreen /></ProtectedRoute> },
      { path: 'contracts/:contractId/milestones', element: <ProtectedRoute requireAuth requireSetup allowedRoles={PARTICIPANT_ROLES}><ManageMilestonesScreen /></ProtectedRoute> },
      { path: 'contracts/:contractId/milestones/:milestoneId/approve', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><ApproveMilestoneScreen /></ProtectedRoute> },
      { path: 'contracts/:contractId/deliverables/:milestoneId', element: <ProtectedRoute requireAuth requireSetup allowedRoles={FREELANCER_ONLY_ROLES}><SubmitMilestoneDeliverableScreen /></ProtectedRoute> },

      // Messages - requires authentication and setup
      { path: 'messages', element: <ProtectedRoute requireAuth requireSetup><MessagesScreen /></ProtectedRoute> },

      // Workspace - requires authentication and setup
      { path: 'projects', element: <ProtectedRoute requireAuth requireSetup><ProjectsListScreen /></ProtectedRoute> },
      { path: 'workspace/:contractId', element: <ProtectedRoute requireAuth requireSetup><ProjectWorkspaceScreen /></ProtectedRoute> },

      { path: 'ai-assistant', element: <Navigate to="/" replace state={{ openAIAssistant: true }} /> },
      { path: 'ai-interview', element: <ProtectedRoute requireAuth requireSetup><AIInterviewScreen /></ProtectedRoute> },
      { path: 'ai-interview/:jobPostId', element: <ProtectedRoute requireAuth requireSetup><AIInterviewScreen /></ProtectedRoute> },
      { path: 'talent-matching', element: <ProtectedRoute requireAuth requireSetup allowedRoles={CLIENT_ONLY_ROLES}><SmartTalentMatchingScreen /></ProtectedRoute> },

      // Settings - requires authentication
      { path: 'settings', element: <ProtectedRoute requireAuth><SettingsScreen /></ProtectedRoute> },

      // Wallet & Subscription - requires authentication and setup
      { path: 'wallet/deposit', element: <ProtectedRoute requireAuth requireSetup><WalletDepositScreen /></ProtectedRoute> },
      { path: 'wallet/history', element: <ProtectedRoute requireAuth requireSetup><WalletHistoryScreen /></ProtectedRoute> },
      { path: 'wallet/withdrawals', element: <ProtectedRoute requireAuth requireSetup><EarlyPayoutScreen /></ProtectedRoute> },
      { path: 'wallet/early-payout', element: <ProtectedRoute requireAuth requireSetup><Navigate to="/wallet/withdrawals" replace /></ProtectedRoute> },
      { path: 'buy-gigcoin', element: <ProtectedRoute requireAuth requireSetup><BuyGigcoinScreen /></ProtectedRoute> },
      { path: 'subscription', element: <ProtectedRoute requireAuth requireSetup><SubscriptionRoute /></ProtectedRoute> },
      { path: 'financial-overview', element: <ProtectedRoute requireAuth requireSetup><FinancialOverviewScreen /></ProtectedRoute> },

      // Admin - requires authentication and admin role
      { path: 'admin', element: <AdminRoute><AdminDashboardScreen /></AdminRoute> },
      { path: 'admin/users', element: <AdminRoute><AdminUsersScreen /></AdminRoute> },
      { path: 'admin/users/:userId', element: <AdminRoute><LegacyAdminUserDetailRedirect /></AdminRoute> },
      { path: 'admin/jobs', element: <AdminRoute><AdminJobsScreen /></AdminRoute> },
      { path: 'admin/proposals', element: <AdminRoute><AdminProposalsScreen /></AdminRoute> },
      { path: 'admin/proposals/:proposalId', element: <AdminRoute><AdminProposalDetailScreen /></AdminRoute> },
      { path: 'admin/contracts', element: <AdminRoute><AdminContractAuditScreen /></AdminRoute> },
      { path: 'admin/contracts/esign', element: <AdminRoute><ESignContractsScreen /></AdminRoute> },
      { path: 'admin/assets', element: <AdminRoute><AdminAssetsScreen /></AdminRoute> },
      { path: 'admin/contract-audit', element: <AdminRoute><Navigate to="/admin/contracts" replace /></AdminRoute> },
      { path: 'admin/contract-templates', element: <AdminRoute><AdminContractTemplatesScreen /></AdminRoute> },
      { path: 'admin/faq-management', element: <AdminRoute><AdminFAQManagementScreen /></AdminRoute> },
      { path: 'admin/disputes', element: <AdminRoute><AdminDisputeManagementScreen /></AdminRoute> },
      { path: 'admin/reports', element: <AdminRoute><AdminReportsScreen /></AdminRoute> },
      { path: 'admin/reports/accounts', element: <AdminRoute><Navigate to="/admin/reports?reportedEntityType=User" replace /></AdminRoute> },
      { path: 'admin/reports/accounts/:reportId', element: <AdminRoute><AdminAccountReportDetailScreen /></AdminRoute> },
      { path: 'admin/reports/contracts', element: <AdminRoute><AdminContractReportsScreen /></AdminRoute> },
      { path: 'admin/reports/contracts/:reportId', element: <AdminRoute><AdminContractReportDetailScreen /></AdminRoute> },
      { path: 'admin/reviews', element: <AdminRoute><AdminReviewsScreen /></AdminRoute> },
      { path: 'admin/audit-logs', element: <AdminRoute><Navigate to="/admin/system-tracking" replace /></AdminRoute> },
      { path: 'admin/system-tracking', element: <AdminRoute><AdminSystemTrackingScreen /></AdminRoute> },
      { path: 'admin/withdrawals', element: <AdminRoute><AdminWithdrawalsScreen /></AdminRoute> },
      { path: 'admin/analytics', element: <AdminRoute><AdminAnalyticsScreen /></AdminRoute> },
      { path: 'admin/notifications', element: <AdminRoute><AdminNotificationsScreen /></AdminRoute> },
      { path: 'admin/elo', element: <AdminRoute><AdminEloOverviewScreen /></AdminRoute> },
      { path: 'admin/elo/history', element: <AdminRoute><AdminEloHistoryScreen /></AdminRoute> },
      { path: 'admin/elo/appeals', element: <AdminRoute><AdminEloAppealsScreen /></AdminRoute> },
      { path: 'admin/elo/appeals/:appealId', element: <AdminRoute><AdminEloAppealDetailScreen /></AdminRoute> },

      // Notifications - requires authentication
      { path: 'notifications', element: <ProtectedRoute requireAuth><NotificationsScreen /></ProtectedRoute> },
      { path: 'elo', element: <ProtectedRoute requireAuth><EloHistoryScreen /></ProtectedRoute> },
      { path: 'reviews/create', element: <ProtectedRoute requireAuth requireSetup><CreateReviewScreen /></ProtectedRoute> },
      { path: 'reviews', element: <ProtectedRoute requireAuth requireSetup allowedRoles={PARTICIPANT_ROLES}><MyReviewsScreen /></ProtectedRoute> },

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
