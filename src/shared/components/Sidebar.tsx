import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard, Briefcase, Search, FileText, MessageSquare,
  Bot, BarChart2, Settings, Shield, Users, Flag,
  TrendingUp, PlusCircle, Zap, ChevronRight, X, Activity, Bell, Bookmark,
  ChevronDown, Wallet, Layers, Banknote, Star
} from 'lucide-react';
import { useApp } from '../../app/providers/AppProvider';
import { useTranslation } from '../../hooks/useTranslation';
import { reportAPI } from '../../api/reportAPI';
import { usePremiumStatus } from '../../features/premium/hooks';
import { PremiumStatusBadge } from '../../features/premium/components/PremiumStatusBadge';
import '../../features/premium/styles/premium.css';
import '../styles/Sidebar.css';

interface NavItem {
  id?: string;
  label: string;
  icon: React.ReactNode;
  path?: string;
  badge?: string;
  badgeType?: 'cyan' | 'purple' | 'green' | 'red' | 'amber';
  badgeLabel?: string;
  children?: NavItem[];
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function getClientNavItems(t: any): NavItem[] {
  return [
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      icon: <LayoutDashboard size={18} />,
      path: '/client/dashboard',
    },
    {
      id: 'jobs',
      label: t('nav.jobs'),
      icon: <Briefcase size={18} />,
      children: [
        { id: 'post-job', label: t('nav.postJob'), icon: <PlusCircle size={18} />, path: '/jobs/post/guide', badge: 'AI', badgeType: 'cyan' },
        { id: 'my-jobs', label: t('nav.myJobs'), icon: <Briefcase size={18} />, path: '/jobs/my-jobs' },
      ],
    },
    {
      id: 'work',
      label: t('nav.work'),
      icon: <Flag size={18} />,
      children: [
        { id: 'proposals', label: t('nav.proposals'), icon: <FileText size={18} />, path: '/proposals' },
        { id: 'contracts', label: t('nav.contracts'), icon: <FileText size={18} />, path: '/contracts' },
        { id: 'projects', label: t('nav.projects'), icon: <Flag size={18} />, path: '/projects' },
        { id: 'reviews', label: t('nav.reviews'), icon: <Star size={18} />, path: '/reviews' },
      ],
    },
    {
      id: 'freelancers',
      label: t('nav.freelancers'),
      icon: <Search size={18} />,
      children: [
        { id: 'smart-matching', label: t('nav.smartMatching'), icon: <Zap size={18} />, path: '/talent-matching', badge: 'PRO', badgeType: 'purple' },
        { id: 'saved-freelancers', label: t('nav.savedFreelancers'), icon: <Bookmark size={18} />, path: '/talent-matching?tab=saved' },
      ],
    },
    {
      id: 'messages',
      label: t('nav.messages'),
      icon: <MessageSquare size={18} />,
      path: '/messages',
    },
    {
      id: 'ai-assistant',
      label: t('nav.aiAssistant'),
      icon: <Bot size={18} />,
      path: '/ai-assistant',
      badge: 'NEW',
      badgeType: 'cyan',
    },
    {
      id: 'wallet',
      label: t('nav.wallet'),
      icon: <Wallet size={18} />,
      children: [
        { id: 'deposit', label: t('wallet.deposit'), icon: <PlusCircle size={18} />, path: '/wallet/deposit' },
        { id: 'history', label: t('wallet.history'), icon: <BarChart2 size={18} />, path: '/wallet/history' },
        { id: 'financial-overview', label: t('nav.financialOverview'), icon: <BarChart2 size={18} />, path: '/financial-overview' },
      ],
    },
  ];
}

function getFreelancerNavItems(t: any): NavItem[] {
  return [
    {
      id: 'dashboard',
      label: t('nav.dashboard'),
      icon: <LayoutDashboard size={18} />,
      path: '/freelancer/dashboard',
    },
    {
      id: 'jobs',
      label: t('nav.jobs'),
      icon: <Search size={18} />,
      children: [
        { id: 'browse-jobs', label: t('nav.browseJobs'), icon: <Search size={18} />, path: '/jobs/browse' },
        { id: 'saved-jobs', label: t('nav.savedJobs'), icon: <Bookmark size={18} />, path: '/jobs/saved' },
        { id: 'job-invitations', label: t('nav.jobInvitations'), icon: <Bell size={18} />, path: '/jobs/invitations' },
      ],
    },
    {
      id: 'work',
      label: t('nav.work'),
      icon: <Flag size={18} />,
      children: [
        { id: 'my-proposals', label: t('nav.myProposals'), icon: <FileText size={18} />, path: '/proposals' },
        { id: 'contracts', label: t('nav.contracts'), icon: <FileText size={18} />, path: '/contracts' },
        { id: 'projects', label: t('nav.projects'), icon: <Flag size={18} />, path: '/projects' },
        { id: 'reviews', label: t('nav.reviews'), icon: <Star size={18} />, path: '/reviews' },
      ],
    },
    {
      id: 'messages',
      label: t('nav.messages'),
      icon: <MessageSquare size={18} />,
      path: '/messages',
    },
    {
      id: 'ai-assistant',
      label: t('nav.aiAssistant'),
      icon: <Bot size={18} />,
      path: '/ai-assistant',
      badge: 'AI',
      badgeType: 'cyan',
    },
    {
      id: 'wallet',
      label: t('nav.wallet'),
      icon: <Wallet size={18} />,
      children: [
        { id: 'deposit', label: t('wallet.deposit'), icon: <PlusCircle size={18} />, path: '/wallet/deposit' },
        { id: 'withdrawals', label: t('wallet.withdraw'), icon: <Banknote size={18} />, path: '/wallet/withdrawals' },
        { id: 'history', label: t('wallet.history'), icon: <BarChart2 size={18} />, path: '/wallet/history' },
      ],
    },
  ];
}

function getAdminNavSections(t: any, openReportCount: number | null): NavSection[] {
  return [
    {
      title: t('dashboard.overview') || 'Overview',
      items: [
        { label: t('nav.dashboard'), icon: <LayoutDashboard size={18} />, path: '/admin' },
      ],
    },
    {
      title: t('nav.userManagement') || 'User Management',
      items: [
        { label: t('nav.allUsers') || 'All Users', icon: <Users size={18} />, path: '/admin/users' },
      ],
    },
    {
      title: t('nav.contentManagement') || 'Content Management',
      items: [
        { label: t('nav.jobPosts') || 'Job Posts', icon: <Briefcase size={18} />, path: '/admin/jobs' },
        { label: t('nav.proposals') || 'Proposals', icon: <FileText size={18} />, path: '/admin/proposals' },
        { label: t('nav.contractsCompliance') || 'Contracts & Compliance', icon: <Shield size={18} />, path: '/admin/contracts' },
        { label: 'Assets Library', icon: <Layers size={18} />, path: '/admin/assets' },
        { label: t('nav.disputeManagement') || 'Dispute Management', icon: <Flag size={18} />, path: '/admin/disputes' },
        { label: t('nav.faqManagement') || 'FAQ Management', icon: <FileText size={18} />, path: '/admin/faq-management' },
        { label: t('nav.reviewManagement') || 'Review Management', icon: <Star size={18} />, path: '/admin/reviews' },
        {
          label: t('nav.reports') || 'Reports',
          icon: <Flag size={18} />,
          path: '/admin/reports',
          badge: openReportCount === null ? undefined : openReportCount.toString(),
          badgeType: 'red',
          badgeLabel: 'Open reports',
        },
      ],
    },
    {
      title: t('nav.configuration') || 'Configuration',
      items: [
        { label: t('nav.contractTemplates') || 'Contract Templates', icon: <Settings size={18} />, path: '/admin/contract-templates' },
      ],
    },
    {
      title: t('nav.financial') || 'Financial',
      items: [
        { label: t('nav.withdrawals') || 'Withdrawals', icon: <Banknote size={18} />, path: '/admin/withdrawals' },
      ],
    },
    {
      title: t('nav.systemMonitoring') || 'System & Monitoring',
      items: [
        { label: 'Account Reports', icon: <Flag size={18} />, path: '/admin/reports/accounts' },
        { label: 'Contract Reports', icon: <Shield size={18} />, path: '/admin/reports/contracts' },
        { label: 'Audit Logs', icon: <Activity size={18} />, path: '/admin/audit-logs' },
        { label: t('nav.notifications'), icon: <Bell size={18} />, path: '/admin/notifications' },
      ],
    },
  ];
}

function NavItemComponent({ item, isActive, isExpanded, onToggle, onNavigate, path }: any) {
  const hasChildren = item.children && item.children.length > 0;

  return (
    <>
      <button
        onClick={() => {
          if (hasChildren) {
            onToggle(item.id || item.label);
          } else if (item.path) {
            onNavigate(item.path);
          }
        }}
        className={`sidebar-item w-full relative ${isActive ? 'active' : ''}`}
      >
        {isActive && <span className="sidebar-active-indicator" />}
        <span className="ml-1">{item.icon}</span>
        <span className="flex-1 text-left">{item.label}</span>
        <div className="sidebar-item-actions">
          {item.badge && (
            <span className={`badge-${item.badgeType || 'cyan'} text-[10px] px-1.5 py-0`}>
              {item.badge}
            </span>
          )}
          {hasChildren && (
            <ChevronDown
              size={16}
              className={`sidebar-item-chevron ${isExpanded ? 'expanded' : ''}`}
            />
          )}
        </div>
      </button>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="sidebar-children">
          {item.children?.map((child: NavItem) => (
            <button
              key={child.id || child.path || child.label}
              onClick={() => {
                if (child.path) {
                  onNavigate(child.path);
                }
              }}
              className={`sidebar-item sidebar-child-item ${path === child.path ? 'active' : ''}`}
            >
              <span className="ml-1">{child.icon}</span>
              <span className="flex-1 text-left">{child.label}</span>
              {child.badge && (
                <span className={`badge-${child.badgeType || 'cyan'} text-[10px] px-1.5 py-0`}>
                  {child.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, role } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [openReportCount, setOpenReportCount] = useState<number | null>(null);
  const [pendingReportCount, setPendingReportCount] = useState<number | null>(null);
  const [reviewingReportCount, setReviewingReportCount] = useState<number | null>(null);
  const [reportHoverPosition, setReportHoverPosition] = useState<{ left: number; top: number } | null>(null);
  const [showPremiumTeaser, setShowPremiumTeaser] = useState(false);
  const premiumStatus = usePremiumStatus(role);
  const premiumStatusUnavailable = Boolean(premiumStatus.error && !premiumStatus.hasResolved);

  const navItems = role === 0 ? getClientNavItems(t) : getFreelancerNavItems(t);
  const adminSections = role === 2 ? getAdminNavSections(t, openReportCount) : [];

  useEffect(() => {
    if (role !== 2) return;
    let active = true;
    void reportAPI.getAdminSummary().then((response) => {
      if (active && response.success && response.data) {
        setOpenReportCount(response.data.open);
        setPendingReportCount(response.data.pending);
        setReviewingReportCount(response.data.reviewing);
      }
    });
    return () => { active = false; };
  }, [role, location.pathname]);

  const handleToggleMenu = (id: string) => {
    setExpandedMenus(prev =>
      prev.includes(id)
        ? prev.filter(m => m !== id)
        : [...prev, id]
    );
  };

  const handleNavigate = (path: string) => {
    if (path === '/ai-assistant') {
      window.dispatchEvent(new CustomEvent('toggle-ai-assistant', { detail: { open: true } }));
    } else {
      navigate(path);
    }
    if (onClose) onClose();
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    if (location.pathname === path) return true;
    if (path === '/admin') return location.pathname === '/admin';
    return location.pathname.startsWith(path + '/');
  };

  const isMenuActive = (item: NavItem) => {
    if (item.path) return isActive(item.path);
    if (item.children) {
      return item.children.some(child => isActive(child.path));
    }
    return false;
  };

  return (
    <aside className={`gb-sidebar ${isOpen ? 'open' : ''}`}>

      {/* User Profile Mini */}
      {user && (
        <div className="sidebar-profile-mini"
          onClick={() => navigate(role === 1 ? `/profile/freelancer/${user.id}` : `/profile/client/${user.id}`)}>
          <div className="sidebar-profile-avatar">
            {user.first_name.charAt(0)}{user.last_name.charAt(0)}
          </div>
          <div className="sidebar-profile-info">
            <p className="sidebar-profile-name">{user.first_name}</p>
            <p className="sidebar-profile-role">{role === 0 ? t('projects.client') : role === 1 ? t('projects.freelancer') : t('nav.admin')}</p>
            {(role === 0 || role === 1) && !premiumStatus.loading && !premiumStatusUnavailable && (
              <PremiumStatusBadge active={premiumStatus.isPremium} compact />
            )}
          </div>
          <ChevronRight size={14} className="sidebar-profile-chevron" />
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Admin sectioned navigation */}
        {role === 2 && adminSections.map(section => (
          <div key={section.title} className="sidebar-section">
            <div className="sidebar-section-title">{section.title}</div>
            {section.items.map(item => {
              const active = isActive(item.path);
              return (
                <button
                  key={item.path || item.label}
                  onClick={() => {
                    if (item.path) {
                      handleNavigate(item.path);
                    }
                  }}
                  onMouseEnter={(event) => {
                    if (item.path !== '/admin/reports') return;
                    const rect = event.currentTarget.getBoundingClientRect();
                    const popoverWidth = 176;
                    const left = rect.right + 10 + popoverWidth <= window.innerWidth
                      ? rect.right + 10
                      : Math.max(8, rect.left - popoverWidth - 10);
                    setReportHoverPosition({ left, top: Math.max(8, rect.top) });
                  }}
                  onMouseLeave={() => {
                    if (item.path === '/admin/reports') setReportHoverPosition(null);
                  }}
                  className={`sidebar-item w-full relative ${active ? 'active' : ''}`}
                >
                  {active && <span className="sidebar-active-indicator" />}
                  <span className="ml-1">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  <span className="flex items-center gap-1">
                    {item.badge && (
                      <span
                        className={`badge-${item.badgeType || 'cyan'} text-[10px] px-1.5 py-0`}
                        title={item.badgeLabel}
                      >
                        {item.badge}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        ))}

        {/* Client/Freelancer hierarchical navigation */}
        {role !== 2 && navItems.map(item => (
          <NavItemComponent
            key={item.id || item.label}
            item={item}
            isActive={isMenuActive(item)}
            isExpanded={expandedMenus.includes(item.id || item.label)}
            onToggle={handleToggleMenu}
            onNavigate={handleNavigate}
            path={location.pathname}
          />
        ))}
      </nav>

      {/* Bottom Links */}
      {role === 2 && (
        <div className="sidebar-bottom">
          <button onClick={() => navigate('/admin')} className="sidebar-item w-full">
            <Shield size={18} />
            <span>{t('nav.adminPanel')}</span>
          </button>
        </div>
      )}

      {/* AI Pro Badge */}
      {role !== 2 && (
        <div className="sidebar-pro-badge">
          <div className="sidebar-pro-header">
            <Zap size={14} className="sidebar-pro-icon" />
            <span className="sidebar-pro-title">
              {t(premiumStatusUnavailable
                ? 'nav.premiumUnavailable'
                : premiumStatus.isPremium
                  ? 'nav.premiumActive'
                  : role === 0
                    ? 'nav.clientPremium'
                    : 'nav.freelancerPremium')}
            </span>
          </div>
          <p className="sidebar-pro-desc">{t(premiumStatusUnavailable ? 'nav.premiumUnavailableDesc' : 'nav.proBadgeDesc')}</p>
          <button className="btn-cyan sidebar-pro-button" disabled={premiumStatus.loading} onClick={() => {
            if (premiumStatusUnavailable) {
              void premiumStatus.refresh();
              return;
            }
            if (role === 0) handleNavigate(premiumStatus.isPremium ? '/premium/client' : '/premium/client/pricing');
            else if (premiumStatus.isPremium) handleNavigate('/premium/freelancer');
            else setShowPremiumTeaser(true);
          }}>{t(premiumStatusUnavailable ? 'nav.retryPremium' : premiumStatus.isPremium ? 'nav.openHub' : 'nav.upgrade')}</button>
        </div>
      )}

      {/* Close Button */}
      {onClose && (
        <button className="sidebar-close-button" onClick={onClose}>
          <X size={18} />
        </button>
      )}

      {reportHoverPosition && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed w-44 rounded-xl p-3 pointer-events-none"
          style={{
            left: reportHoverPosition.left,
            top: reportHoverPosition.top,
            zIndex: 9999,
            background: 'var(--card)',
            border: '1px solid var(--gb-border)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.22)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-primary">Open reports</span>
            <span className="badge-red text-[10px] px-1.5 py-0">{openReportCount ?? 0}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary">Pending</span>
              <span className="badge-red text-[10px] px-1.5 py-0">{pendingReportCount ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-secondary">Reviewing</span>
              <span className="badge-amber text-[10px] px-1.5 py-0">{reviewingReportCount ?? 0}</span>
            </div>
          </div>
        </div>,
        document.body,
      )}
      {showPremiumTeaser && typeof document !== 'undefined' && createPortal(
        <div className="premium-modal" onClick={() => setShowPremiumTeaser(false)}>
          <div className="premium-modal-box" onClick={event => event.stopPropagation()}>
            <div className="premium-eyebrow"><Zap size={16} /> GigBridge Premium</div>
            <h2 className="text-2xl font-black text-primary mt-2">{t('nav.premiumTeaserTitle')}</h2>
            <p className="premium-muted mt-2">{t('nav.premiumTeaserDesc')}</p>
            <div className="premium-grid mt-4">
              <div className="premium-card"><Shield size={20} /><strong>{t('nav.protectRank')}</strong></div>
              <div className="premium-card"><TrendingUp size={20} /><strong>{t('nav.boostVisibility')}</strong></div>
            </div>
            <div className="flex gap-3 mt-5">
              <button className="premium-button secondary" onClick={() => setShowPremiumTeaser(false)}>{t('nav.notNow')}</button>
              <button className="premium-button" onClick={() => { setShowPremiumTeaser(false); handleNavigate('/premium/freelancer/pricing'); }}>
                {t('nav.viewFreelancerPlans')}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </aside>
  );
}
