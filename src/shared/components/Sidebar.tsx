import React from 'react';
import { useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard, Briefcase, Search, FileText, MessageSquare,
  Bot, BarChart2, User, Settings, Shield, Users, Flag,
  TrendingUp, Video, PlusCircle, Zap, ChevronRight, X, Activity, Bell
} from 'lucide-react';
import { useApp } from '../../app/providers/AppProvider';
import { useTranslation } from '../../hooks/useTranslation';
import '../styles/Sidebar.css';

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  badgeType?: 'cyan' | 'purple' | 'green' | 'red';
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

function getNavItems(role: number | null, t: any): NavItem[] {
  if (role === 0) {
    return [
      { label: t('nav.dashboard'), icon: <LayoutDashboard size={18} />, path: '/client/dashboard' },
      { label: t('nav.postJob'), icon: <PlusCircle size={18} />, path: '/jobs/post', badge: 'AI', badgeType: 'cyan' },
      { label: t('nav.myJobs'), icon: <Briefcase size={18} />, path: '/jobs/my-jobs' },
      { label: t('nav.proposals'), icon: <FileText size={18} />, path: '/proposals', badge: '5', badgeType: 'purple' },
      { label: t('nav.projects'), icon: <Flag size={18} />, path: '/projects' },
      { label: t('nav.aiAssistant'), icon: <Bot size={18} />, path: '/ai-assistant', badge: 'NEW', badgeType: 'cyan' },
      { label: t('nav.marketInsights'), icon: <TrendingUp size={18} />, path: '/market-insights' },
      { label: t('nav.messages'), icon: <MessageSquare size={18} />, path: '/notifications' },
    ];
  }

  if (role === 1) {
    return [
      { label: t('nav.dashboard'), icon: <LayoutDashboard size={18} />, path: '/freelancer/dashboard' },
      { label: t('nav.browseJobs'), icon: <Search size={18} />, path: '/jobs/browse' },
      { label: t('nav.myProposals'), icon: <FileText size={18} />, path: '/proposals' },
      { label: t('nav.projects'), icon: <Flag size={18} />, path: '/projects' },
      { label: t('nav.aiAssistant'), icon: <Bot size={18} />, path: '/ai-assistant', badge: 'AI', badgeType: 'cyan' },
      { label: t('nav.marketInsights'), icon: <TrendingUp size={18} />, path: '/market-insights' },
      { label: t('nav.messages'), icon: <MessageSquare size={18} />, path: '/notifications' },
    ];
  }

  // Regular admin items (for non-sectioned view)
  return [];
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
        { label: 'Contracts', icon: <FileText size={18} />, path: '/admin/contracts' },
        { label: 'User Feedback', icon: <MessageSquare size={18} />, path: '/admin/feedback' },
        { label: 'Reports', icon: <Flag size={18} />, path: '/admin/reports', badge: '5', badgeType: 'red' },
      ],
    },
    {
      title: 'Financial',
      items: [
        { label: 'Revenue', icon: <TrendingUp size={18} />, path: '/admin/revenue' },
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

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, role } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = getNavItems(role, t);
  const adminSections = role === 2 ? getAdminNavSections() : [];
  const isActive = (path: string) => {
    // Exact match
    if (location.pathname === path) return true;
    // For admin root, only match exactly to avoid matching child routes
    if (path === '/admin') return location.pathname === '/admin';
    // For other paths, check if current path starts with the nav path
    return location.pathname.startsWith(path + '/');
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
                  key={item.path}
                  onClick={() => navigate(item.path)}
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

        {/* Regular navigation for Client/Freelancer */}
        {role !== 2 && navItems.map(item => {
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
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
      </nav>

      {/* Bottom Links */}
      <div className="sidebar-bottom">
        <button
          onClick={() => navigate('/profile/' + (role === 1 ? 'freelancer' : 'client') + '/' + user?.id)}
          className="sidebar-item w-full"
        >
          <User size={18} />
          <span>Profile</span>
        </button>
        <button onClick={() => navigate('/settings')} className="sidebar-item w-full">
          <Settings size={18} />
          <span>Settings</span>
        </button>
        {role === 2 && (
          <button onClick={() => navigate('/admin')} className="sidebar-item w-full">
            <Shield size={18} />
            <span>Admin Panel</span>
          </button>
        )}
      </div>

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