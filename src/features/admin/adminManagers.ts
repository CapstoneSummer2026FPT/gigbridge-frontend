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
  ShieldAlert,
  Star,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type AdminManagerGroup =
  | 'overview'
  | 'users'
  | 'marketplace'
  | 'finance'
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
  { id: 'overview', labelKey: 'adminNav.groups.overview', fallbackLabel: 'TỔNG QUAN & PHÂN TÍCH' },
  { id: 'users', labelKey: 'adminNav.groups.users', fallbackLabel: 'QUẢN LÝ NGƯỜI DÙNG' },
  { id: 'marketplace', labelKey: 'adminNav.groups.marketplace', fallbackLabel: 'SÀN GIAO DỊCH & DỰ ÁN' },
  { id: 'finance', labelKey: 'adminNav.groups.finance', fallbackLabel: 'TÀI CHÍNH & RÚT TIỀN' },
  { id: 'moderation', labelKey: 'adminNav.groups.moderation', fallbackLabel: 'KIỂM DUYỆT & TRANH CHẤP' },
  { id: 'configuration', labelKey: 'adminNav.groups.configuration', fallbackLabel: 'CẤU HÌNH HỆ THỐNG' },
  { id: 'monitoring', labelKey: 'adminNav.groups.monitoring', fallbackLabel: 'GIÁM SÁT HỆ THỐNG' },
];

export const ADMIN_MANAGERS: readonly AdminManagerDefinition[] = [
  // 1. Overview & Analytics
  { id: 'dashboard', labelKey: 'nav.dashboard', fallbackLabel: 'Bảng Điều Khiển', descriptionKey: 'adminDashboard.descriptions.dashboard', fallbackDescription: 'Administration overview and manager shortcuts', path: '/admin', icon: LayoutDashboard, group: 'overview', showInNavigation: true, showOnDashboard: false },
  { id: 'analytics', labelKey: 'nav.platformAnalytics', fallbackLabel: 'Phân Tích Platform', descriptionKey: 'adminDashboard.descriptions.analytics', fallbackDescription: 'Track platform revenue, transactions, and marketplace opportunities', path: '/admin/analytics', icon: BarChart3, group: 'overview', showInNavigation: true, showOnDashboard: true },

  // 2. User Management
  { id: 'users', labelKey: 'nav.allUsers', fallbackLabel: 'Quản Lý Người Dùng', descriptionKey: 'adminDashboard.descriptions.users', fallbackDescription: 'Review profiles, access, reports, and enforcement history', path: '/admin/users', icon: Users, group: 'users', showInNavigation: true, showOnDashboard: true },

  // 3. Marketplace Workflows (Job -> Proposal -> Contract & E-sign -> Deliverable)
  { id: 'jobs', labelKey: 'nav.jobPosts', fallbackLabel: 'Bài Đăng Việc Làm', descriptionKey: 'adminDashboard.descriptions.jobs', fallbackDescription: 'Review job posts and their moderation state', path: '/admin/jobs', icon: Briefcase, group: 'marketplace', showInNavigation: true, showOnDashboard: true },
  { id: 'proposals', labelKey: 'nav.proposals', fallbackLabel: 'Đề Xuất Ứng Tuyển', descriptionKey: 'adminDashboard.descriptions.proposals', fallbackDescription: 'Inspect proposal lifecycle and moderation records', path: '/admin/proposals', icon: FileText, group: 'marketplace', showInNavigation: true, showOnDashboard: true },
  { id: 'contracts', labelKey: 'adminNav.contractsEsign', fallbackLabel: 'Hợp Đồng & Ký Điện Tử', descriptionKey: 'adminDashboard.descriptions.contracts', fallbackDescription: 'Inspect contract, milestone, escrow, and e-sign workflows', path: '/admin/contracts', icon: FileCheck2, group: 'marketplace', showInNavigation: true, showOnDashboard: true },
  { id: 'esign', labelKey: 'adminNav.esign', fallbackLabel: 'Ký Kết Điện Tử', descriptionKey: 'adminDashboard.descriptions.esign', fallbackDescription: 'Review electronic agreement and signature state', path: '/admin/contracts/esign', icon: FileText, group: 'marketplace', showInNavigation: false, showOnDashboard: false },
  { id: 'assets', labelKey: 'adminNav.assets', fallbackLabel: 'Sản Phẩm Bàn Giao', descriptionKey: 'adminDashboard.descriptions.assets', fallbackDescription: 'Inspect platform deliverables and handoff assets', path: '/admin/assets', icon: Layers, group: 'marketplace', showInNavigation: true, showOnDashboard: true },

  // 4. Financial Operations
  { id: 'withdrawals', labelKey: 'nav.withdrawals', fallbackLabel: 'Yêu Cầu Rút Tiền', descriptionKey: 'adminDashboard.descriptions.withdrawals', fallbackDescription: 'Review and reconcile withdrawal requests', path: '/admin/withdrawals', icon: Banknote, group: 'finance', showInNavigation: true, showOnDashboard: true },

  // 5. Moderation, Disputes & Reputation
  { id: 'disputes', labelKey: 'nav.disputeManagement', fallbackLabel: 'Giải Quyết Tranh Chấp', descriptionKey: 'adminDashboard.descriptions.disputes', fallbackDescription: 'Resolve disputes using evidence and financial context', path: '/admin/disputes', icon: ShieldAlert, group: 'moderation', showInNavigation: true, showOnDashboard: true },
  { id: 'reports', labelKey: 'nav.reports', fallbackLabel: 'Báo Cáo Vi Phạm', descriptionKey: 'adminDashboard.descriptions.reports', fallbackDescription: 'Review account, job post, and review reports', path: '/admin/reports', icon: Flag, group: 'moderation', showInNavigation: true, showOnDashboard: true },
  { id: 'contract-reports', labelKey: 'adminNav.contractReports', fallbackLabel: 'Báo Cáo Hợp Đồng', descriptionKey: 'adminDashboard.descriptions.contractReports', fallbackDescription: 'Investigate contract execution reports', path: '/admin/reports/contracts', icon: Shield, group: 'moderation', showInNavigation: true, showOnDashboard: true, parentId: 'reports' },
  { id: 'reviews', labelKey: 'nav.reviewManagement', fallbackLabel: 'Quản Lý Đánh Giá', descriptionKey: 'adminDashboard.descriptions.reviews', fallbackDescription: 'Moderate platform reviews and related reports', path: '/admin/reviews', icon: Star, group: 'moderation', showInNavigation: true, showOnDashboard: true },
  { id: 'elo', labelKey: 'adminElo.nav', fallbackLabel: 'Quản Lý Điểm Elo', descriptionKey: 'adminDashboard.descriptions.elo', fallbackDescription: 'Review Elo ledgers, resolve appeals, and configure dispute penalty', path: '/admin/elo', icon: Gauge, group: 'moderation', showInNavigation: true, showOnDashboard: true },
  { id: 'elo-appeals', labelKey: 'adminElo.navAppeals', fallbackLabel: 'Khiếu Nại Điểm Elo', descriptionKey: 'adminDashboard.descriptions.eloAppeals', fallbackDescription: 'Review and resolve Elo point appeals', path: '/admin/elo/appeals', icon: FileQuestion, group: 'moderation', showInNavigation: true, showOnDashboard: true, parentId: 'elo' },
  { id: 'elo-history', labelKey: 'adminElo.navHistory', fallbackLabel: 'Lịch Sử Điểm Elo', descriptionKey: 'adminDashboard.descriptions.eloHistory', fallbackDescription: 'Inspect every Elo transaction across the platform', path: '/admin/elo/history', icon: History, group: 'moderation', showInNavigation: true, showOnDashboard: true, parentId: 'elo' },

  // 6. System Configuration
  { id: 'contract-templates', labelKey: 'nav.contractTemplates', fallbackLabel: 'Mẫu Hợp Đồng', descriptionKey: 'adminDashboard.descriptions.templates', fallbackDescription: 'Maintain reusable contract templates', path: '/admin/contract-templates', icon: Settings, group: 'configuration', showInNavigation: true, showOnDashboard: true },
  { id: 'faqs', labelKey: 'nav.faqManagement', fallbackLabel: 'Quản Lý FAQ & Trợ Giúp', descriptionKey: 'adminDashboard.descriptions.faqs', fallbackDescription: 'Maintain public help content', path: '/admin/faq-management', icon: HelpCircle, group: 'configuration', showInNavigation: true, showOnDashboard: true },

  // 7. System Monitoring & Tracking
  { id: 'notifications', labelKey: 'nav.notifications', fallbackLabel: 'Thông Báo Quản Trị', descriptionKey: 'adminDashboard.descriptions.notifications', fallbackDescription: 'Publish and review administrator notifications', path: '/admin/notifications', icon: Bell, group: 'monitoring', showInNavigation: true, showOnDashboard: true },
  { id: 'system-tracking', labelKey: 'nav.systemTracking', fallbackLabel: 'Nhật Ký & Giám Sát', descriptionKey: 'adminDashboard.descriptions.systemTracking', fallbackDescription: 'Review real administrator activity and operational availability', path: '/admin/system-tracking', icon: Activity, group: 'monitoring', showInNavigation: true, showOnDashboard: true },
] as const;

export const getAdminManager = (id: string) => ADMIN_MANAGERS.find(manager => manager.id === id);
