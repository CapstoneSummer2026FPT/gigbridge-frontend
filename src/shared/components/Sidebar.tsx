import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard, Briefcase, Search, FileText, MessageSquare,
  Bot, BarChart2, Settings, Shield, Users, Flag,
  TrendingUp, PlusCircle, Zap, ChevronRight, X, Activity, Bell, Bookmark,
  ChevronDown, Wallet
} from 'lucide-react';
import { useApp } from '../../app/providers/AppProvider';
import { useTranslation } from '../../hooks/useTranslation';
import { reportAPI } from '../../api/reportAPI';
import '../styles/Sidebar.css';

interface NavItem {
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
      label: t('nav.dashboard'),
      icon: <LayoutDashboard size={18} />,
      path: '/client/dashboard',
    },
    {
      label: 'Jobs',
      icon: <Briefcase size={18} />,
      children: [
        { label: t('nav.postJob'), icon: <PlusCircle size={18} />, path: '/jobs/post/guide', badge: 'AI', badgeType: 'cyan' },
        { label: 'My Jobs', icon: <Briefcase size={18} />, path: '/jobs/my-jobs' },
      ],
    },
    {
      label: 'Freelancers',
      icon: <Search size={18} />,
      children: [
        { label: 'Smart Matching', icon: <Zap size={18} />, path: '/talent-matching', badge: 'PRO', badgeType: 'purple' },
        { label: 'Saved Freelancers', icon: <Bookmark size={18} />, path: '/talent-matching?tab=saved' },
      ],
    },
    {
      label: 'Work',
      icon: <Flag size={18} />,
      children: [
        { label: t('nav.proposals'), icon: <FileText size={18} />, path: '/proposals', badge: '5', badgeType: 'purple' },
        { label: 'Contracts', icon: <FileText size={18} />, path: '/contracts' },
        { label: t('nav.projects'), icon: <Flag size={18} />, path: '/projects' },
      ],
    },
    {
      label: 'Messages',
      icon: <MessageSquare size={18} />,
      path: '/messages',
      badge: '3',
      badgeType: 'cyan',
    },
    {
      label: t('nav.aiAssistant'),
      icon: <Bot size={18} />,
      path: '/ai-assistant',
      badge: 'NEW',
      badgeType: 'cyan',
    },

    {
      label: t('nav.marketInsights'),
      icon: <TrendingUp size={18} />,
      path: '/market-insights',
    },
    {
      label: t('nav.wallet'),
      icon: <Wallet size={18} />,
      children: [
        { label: t('wallet.deposit'), icon: <PlusCircle size={18} />, path: '/wallet/deposit' },
        { label: t('wallet.history'), icon: <BarChart2 size={18} />, path: '/wallet/history' },
      ],
    },
    {
      label: 'Financial Overview',
      icon: <BarChart2 size={18} />,
      path: '/financial-overview',
    },
  ];
}

function getFreelancerNavItems(t: any): NavItem[] {
  return [
    {
      label: t('nav.dashboard'),
      icon: <LayoutDashboard size={18} />,
      path: '/freelancer/dashboard',
    },
    {
      label: 'Jobs',
      icon: <Search size={18} />,
      children: [
        { label: t('nav.browseJobs'), icon: <Search size={18} />, path: '/jobs/browse' },
        { label: 'Saved Jobs', icon: <Bookmark size={18} />, path: '/jobs/saved' },
        { label: 'Job Invitations', icon: <Bell size={18} />, path: '/jobs/invitations' },
      ],
    },
    {
      label: 'Work',
      icon: <Flag size={18} />,
      children: [
        { label: t('nav.myProposals'), icon: <FileText size={18} />, path: '/proposals' },
        { label: 'Contracts', icon: <FileText size={18} />, path: '/contracts' },
        { label: t('nav.projects'), icon: <Flag size={18} />, path: '/projects' },
      ],
    },
    {
      label: 'Messages',
      icon: <MessageSquare size={18} />,
      path: '/messages',
      badge: '1',
      badgeType: 'cyan',
    },
    {
      label: t('nav.aiAssistant'),
      icon: <Bot size={18} />,
      path: '/ai-assistant',
      badge: 'AI',
      badgeType: 'cyan',
    },
    {
      label: t('nav.marketInsights'),
      icon: <TrendingUp size={18} />,
      path: '/market-insights',
    },
    {
      label: t('nav.wallet'),
      icon: <Wallet size={18} />,
      children: [
        { label: t('wallet.deposit'), icon: <PlusCircle size={18} />, path: '/wallet/deposit' },
        { label: t('wallet.history'), icon: <BarChart2 size={18} />, path: '/wallet/history' },
      ],
    },
    {
      label: 'Early Payout',
      icon: <Zap size={18} />,
      path: '/wallet/early-payout',
      badge: 'PRO',
      badgeType: 'purple',
    },
  ];
}

function getAdminNavSections(openReportCount: number | null): NavSection[] {
  return [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', icon: <LayoutDashboard size={18} />, path: '/admin' },
        { label: 'Analytics', icon: <BarChart2 size={18} />, path: '/admin/analytics' },
      ],
    },
    {
      title: 'User Management',
      items: [
        { label: 'All Users', icon: <Users size={18} />, path: '/admin/users' },
      ],
    },
    {
      title: 'Content Management',
      items: [
        { label: 'Job Posts', icon: <Briefcase size={18} />, path: '/admin/jobs' },
        { label: 'Contracts & Compliance', icon: <Shield size={18} />, path: '/admin/contracts' },
        { label: 'Dispute Management', icon: <Flag size={18} />, path: '/admin/disputes' },
        { label: 'FAQ Management', icon: <FileText size={18} />, path: '/admin/faq-management' },
        { label: 'Ads & Packages', icon: <Zap size={18} />, path: '/admin/ads-packages' },
        { label: 'User Feedback', icon: <MessageSquare size={18} />, path: '/admin/feedback' },
        {
          label: 'Reports',
          icon: <Flag size={18} />,
          path: '/admin/reports',
          badge: openReportCount === null ? undefined : openReportCount.toString(),
          badgeType: 'red',
          badgeLabel: 'Open reports',
        },
      ],
    },
    {
      title: 'Configuration',
      items: [
        { label: 'Contract Templates', icon: <Settings size={18} />, path: '/admin/contract-templates' },
      ],
    },
    {
      title: 'Financial',
      items: [
        { label: 'Revenue', icon: <TrendingUp size={18} />, path: '/admin/revenue' },
        { label: 'System Finance', icon: <BarChart2 size={18} />, path: '/admin/system-finance' },
      ],
    },
    {
      title: 'System & Monitoring',
      items: [
        { label: 'System Tracking', icon: <Activity size={18} />, path: '/admin/system-tracking', badge: 'LIVE', badgeType: 'green' },
        { label: 'Notifications', icon: <Bell size={18} />, path: '/admin/notifications' },
      ],
    },
    {
      title: 'Insights',
      items: [
        { label: 'Market Insights', icon: <TrendingUp size={18} />, path: '/market-insights' },
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
            onToggle(item.label);
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
              key={child.path || child.label}
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

  const navItems = role === 0 ? getClientNavItems(t) : getFreelancerNavItems(t);
  const adminSections = role === 2 ? getAdminNavSections(openReportCount) : [];

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

  const handleToggleMenu = (label: string) => {
    setExpandedMenus(prev =>
      prev.includes(label)
        ? prev.filter(m => m !== label)
        : [...prev, label]
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
            <p className="sidebar-profile-role">{role === 0 ? 'Client' : role === 1 ? 'Freelancer' : 'Admin'}</p>
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
            key={item.label}
            item={item}
            isActive={isMenuActive(item)}
            isExpanded={expandedMenus.includes(item.label)}
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
            <span>Admin Panel</span>
          </button>
        </div>
      )}

      {/* AI Pro Badge */}
      {role !== 2 && (
        <div className="sidebar-pro-badge">
          <div className="sidebar-pro-header">
            <Zap size={14} className="sidebar-pro-icon" />
            <span className="sidebar-pro-title">GigBridge Pro</span>
          </div>
          <p className="sidebar-pro-desc">Unlock AI features, priority matching & more</p>
          <button className="btn-cyan sidebar-pro-button">Upgrade</button>
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
    </aside>
  );
}
