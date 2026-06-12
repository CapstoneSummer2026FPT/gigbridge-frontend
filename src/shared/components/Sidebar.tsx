import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard, Briefcase, Search, FileText, MessageSquare,
  Bot, BarChart2, User, Settings, Shield, Users, Flag,
  TrendingUp, PlusCircle, Zap, ChevronRight, X, Activity, Bell, Bookmark,
  ChevronDown, Wallet, History, Coins
} from 'lucide-react';
import { useApp } from '../../app/providers/AppProvider';
import { useTranslation } from '../../hooks/useTranslation';
import '../styles/Sidebar.css';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  badge?: string;
  badgeType?: 'cyan' | 'purple' | 'green' | 'red';
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
        { label: t('nav.postJob'), icon: <PlusCircle size={18} />, path: '/jobs/post/questions', badge: 'AI', badgeType: 'cyan' },
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
      label: 'Ví',
      icon: <Wallet size={18} />,
      children: [
        { label: 'Nạp Tiền', icon: <Coins size={18} />, path: '/wallet/deposit' },
        { label: 'Lịch Sử GD', icon: <History size={18} />, path: '/wallet/history' },
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
      label: 'Ví',
      icon: <Wallet size={18} />,
      children: [
        { label: 'Nạp Tiền', icon: <Coins size={18} />, path: '/wallet/deposit' },
        { label: 'Lịch Sử GD', icon: <History size={18} />, path: '/wallet/history' },
        { label: 'Early Payout', icon: <Zap size={18} />, path: '/wallet/early-payout', badge: 'PRO', badgeType: 'purple' },
      ],
    },
  ];
}

function getAdminNavSections(): NavSection[] {
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
        { label: 'Reports', icon: <Flag size={18} />, path: '/admin/reports', badge: '5', badgeType: 'red' },
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

  const navItems = role === 0 ? getClientNavItems(t) : getFreelancerNavItems(t);
  const adminSections = role === 2 ? getAdminNavSections() : [];

  const handleToggleMenu = (label: string) => {
    setExpandedMenus(prev =>
      prev.includes(label)
        ? prev.filter(m => m !== label)
        : [...prev, label]
    );
  };

  const handleNavigate = (path: string) => {
    navigate(path);
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
                  className={`sidebar-item w-full relative ${active ? 'active' : ''}`}
                >
                  {active && <span className="sidebar-active-indicator" />}
                  <span className="ml-1">{item.icon}</span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className={`badge-${item.badgeType || 'cyan'} text-[10px] px-1.5 py-0`}>
                      {item.badge}
                    </span>
                  )}
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
    </aside>
  );
}
