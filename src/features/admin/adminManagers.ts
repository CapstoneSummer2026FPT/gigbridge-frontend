import {
  Activity,
  Banknote,
  BarChart3,
  Bell,
  Briefcase,
  FileCheck2,
  FileQuestion,
  FileText,
  Flag,
  Gauge,
  HelpCircle,
  History,
  Layers,
  LayoutDashboard,
  Settings,
  Shield,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type AdminManagerGroup =
  | 'overview'
  | 'users'
  | 'content'
  | 'contracts'
  | 'moderation'
  | 'configuration'
  | 'monitoring';

export interface AdminManagerDefinition {
  id: string;
  labelKey: string;
  fallbackLabel: string;
  descriptionKey: string;
  fallbackDescription: string;
  path: string;
  icon: LucideIcon;
  group: AdminManagerGroup;
  showInNavigation: boolean;
  showOnDashboard: boolean;
  parentId?: 'reports' | 'elo';
}

export const ADMIN_GROUPS: ReadonlyArray<{
  id: AdminManagerGroup;
  labelKey: string;
  fallbackLabel: string;
}> = [
  { id: 'overview', labelKey: 'adminNav.groups.overview', fallbackLabel: 'Overview' },
  { id: 'users', labelKey: 'adminNav.groups.users', fallbackLabel: 'User Management' },
  { id: 'content', labelKey: 'adminNav.groups.content', fallbackLabel: 'Content Management' },
  { id: 'contracts', labelKey: 'adminNav.groups.contracts', fallbackLabel: 'Contracts & Finance' },
  { id: 'moderation', labelKey: 'adminNav.groups.moderation', fallbackLabel: 'Moderation & Disputes' },
  { id: 'configuration', labelKey: 'adminNav.groups.configuration', fallbackLabel: 'Configuration' },
  { id: 'monitoring', labelKey: 'adminNav.groups.monitoring', fallbackLabel: 'System & Monitoring' },
];

export const ADMIN_MANAGERS: readonly AdminManagerDefinition[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard', fallbackLabel: 'Dashboard', descriptionKey: 'adminDashboard.descriptions.dashboard', fallbackDescription: 'Administration overview and manager shortcuts', path: '/admin', icon: LayoutDashboard, group: 'overview', showInNavigation: true, showOnDashboard: false },
  { id: 'users', labelKey: 'nav.allUsers', fallbackLabel: 'Users', descriptionKey: 'adminDashboard.descriptions.users', fallbackDescription: 'Review profiles, access, reports, and enforcement history', path: '/admin/users', icon: Users, group: 'users', showInNavigation: true, showOnDashboard: true },
  { id: 'jobs', labelKey: 'nav.jobPosts', fallbackLabel: 'Job Posts', descriptionKey: 'adminDashboard.descriptions.jobs', fallbackDescription: 'Review job posts and their moderation state', path: '/admin/jobs', icon: Briefcase, group: 'content', showInNavigation: true, showOnDashboard: true },
  { id: 'proposals', labelKey: 'nav.proposals', fallbackLabel: 'Proposals', descriptionKey: 'adminDashboard.descriptions.proposals', fallbackDescription: 'Inspect proposal lifecycle and moderation records', path: '/admin/proposals', icon: FileText, group: 'content', showInNavigation: true, showOnDashboard: true },
  { id: 'reports', labelKey: 'nav.reports', fallbackLabel: 'Reports', descriptionKey: 'adminDashboard.descriptions.reports', fallbackDescription: 'Review account, job post, and review reports', path: '/admin/reports', icon: Flag, group: 'content', showInNavigation: true, showOnDashboard: true, parentId: 'reports' },
  { id: 'contract-reports', labelKey: 'adminNav.contractReports', fallbackLabel: 'Contract Reports', descriptionKey: 'adminDashboard.descriptions.contractReports', fallbackDescription: 'Investigate contract execution reports', path: '/admin/reports/contracts', icon: Shield, group: 'content', showInNavigation: true, showOnDashboard: true, parentId: 'reports' },
  { id: 'reviews', labelKey: 'nav.reviewManagement', fallbackLabel: 'Reviews', descriptionKey: 'adminDashboard.descriptions.reviews', fallbackDescription: 'Moderate platform reviews and related reports', path: '/admin/reviews', icon: Star, group: 'content', showInNavigation: true, showOnDashboard: true },
  { id: 'assets', labelKey: 'adminNav.assets', fallbackLabel: 'Assets & Handoffs', descriptionKey: 'adminDashboard.descriptions.assets', fallbackDescription: 'Inspect platform deliverables and handoff assets', path: '/admin/assets', icon: Layers, group: 'content', showInNavigation: true, showOnDashboard: true },
  { id: 'contracts', labelKey: 'nav.contractsCompliance', fallbackLabel: 'Contracts', descriptionKey: 'adminDashboard.descriptions.contracts', fallbackDescription: 'Inspect contract, milestone, and escrow workflows', path: '/admin/contracts', icon: FileCheck2, group: 'contracts', showInNavigation: true, showOnDashboard: true },
  { id: 'esign', labelKey: 'adminNav.esign', fallbackLabel: 'E-sign Agreements', descriptionKey: 'adminDashboard.descriptions.esign', fallbackDescription: 'Review electronic agreement and signature state', path: '/admin/contracts/esign', icon: FileText, group: 'contracts', showInNavigation: true, showOnDashboard: true },
  { id: 'analytics', labelKey: 'nav.platformAnalytics', fallbackLabel: 'Platform Analytics', descriptionKey: 'adminDashboard.descriptions.analytics', fallbackDescription: 'Track platform revenue, transactions, and marketplace opportunities', path: '/admin/analytics', icon: BarChart3, group: 'contracts', showInNavigation: true, showOnDashboard: true },
  { id: 'withdrawals', labelKey: 'nav.withdrawals', fallbackLabel: 'Withdrawals', descriptionKey: 'adminDashboard.descriptions.withdrawals', fallbackDescription: 'Review and reconcile withdrawal requests', path: '/admin/withdrawals', icon: Banknote, group: 'contracts', showInNavigation: true, showOnDashboard: true },
  { id: 'disputes', labelKey: 'nav.disputeManagement', fallbackLabel: 'Disputes', descriptionKey: 'adminDashboard.descriptions.disputes', fallbackDescription: 'Resolve disputes using evidence and financial context', path: '/admin/disputes', icon: Shield, group: 'moderation', showInNavigation: true, showOnDashboard: true },
  { id: 'elo', labelKey: 'adminElo.nav', fallbackLabel: 'Elo Management', descriptionKey: 'adminDashboard.descriptions.elo', fallbackDescription: 'Review Elo ledgers, resolve appeals, and configure the dispute penalty', path: '/admin/elo', icon: Gauge, group: 'moderation', showInNavigation: true, showOnDashboard: true, parentId: 'elo' },
  { id: 'elo-history', labelKey: 'adminElo.navHistory', fallbackLabel: 'Elo History', descriptionKey: 'adminDashboard.descriptions.eloHistory', fallbackDescription: 'Inspect every Elo transaction across the platform', path: '/admin/elo/history', icon: History, group: 'moderation', showInNavigation: true, showOnDashboard: true, parentId: 'elo' },
  { id: 'elo-appeals', labelKey: 'adminElo.navAppeals', fallbackLabel: 'Elo Appeals', descriptionKey: 'adminDashboard.descriptions.eloAppeals', fallbackDescription: 'Review and resolve Elo point appeals', path: '/admin/elo/appeals', icon: FileQuestion, group: 'moderation', showInNavigation: true, showOnDashboard: true, parentId: 'elo' },
  { id: 'faqs', labelKey: 'nav.faqManagement', fallbackLabel: 'FAQ Management', descriptionKey: 'adminDashboard.descriptions.faqs', fallbackDescription: 'Maintain public help content', path: '/admin/faq-management', icon: HelpCircle, group: 'configuration', showInNavigation: true, showOnDashboard: true },
  { id: 'contract-templates', labelKey: 'nav.contractTemplates', fallbackLabel: 'Contract Templates', descriptionKey: 'adminDashboard.descriptions.templates', fallbackDescription: 'Maintain reusable contract templates', path: '/admin/contract-templates', icon: Settings, group: 'configuration', showInNavigation: true, showOnDashboard: true },
  { id: 'notifications', labelKey: 'nav.notifications', fallbackLabel: 'Notifications', descriptionKey: 'adminDashboard.descriptions.notifications', fallbackDescription: 'Publish and review administrator notifications', path: '/admin/notifications', icon: Bell, group: 'monitoring', showInNavigation: true, showOnDashboard: true },
  { id: 'system-tracking', labelKey: 'nav.systemTracking', fallbackLabel: 'System Tracking', descriptionKey: 'adminDashboard.descriptions.systemTracking', fallbackDescription: 'Review real administrator activity and operational availability', path: '/admin/system-tracking', icon: Activity, group: 'monitoring', showInNavigation: true, showOnDashboard: true },
] as const;

export const getAdminManager = (id: string) => ADMIN_MANAGERS.find(manager => manager.id === id);
