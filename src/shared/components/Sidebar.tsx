import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard, Briefcase, Search, FileText, MessageSquare,
  Bot, BarChart2, Shield, Flag,
  TrendingUp, PlusCircle, Zap, X, Bell, Bookmark,
  ChevronDown, Wallet, Banknote, Star
} from 'lucide-react';
import { useApp } from '../../app/providers/AppProvider';
import { useTranslation } from '../../hooks/useTranslation';
import { reportAPI } from '../../api/reportAPI';
import { usePremiumStatus } from '../../features/premium/hooks';
import { ADMIN_GROUPS, ADMIN_MANAGERS } from '../../features/admin/adminManagers';
import '../../features/premium/styles/premium.css';
import './styles/Sidebar.css';

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
  const label = (key: string, fallback: string) => t(key, { defaultValue: fallback });
  return ADMIN_GROUPS.map(group => {
    const managers = ADMIN_MANAGERS.filter(manager => manager.showInNavigation && manager.group === group.id);
    const parentIds = [...new Set(managers.flatMap(manager => (manager.parentId ? [manager.parentId] : [])))];
    // Root items are those without a parent group; parents and their children
    // collapse into a single expandable nav entry (e.g. Reports, Elo).
    const items = managers
      .filter(manager => !manager.parentId)
      .map(manager => ({
        id: manager.id,
        label: label(manager.labelKey, manager.fallbackLabel),
        icon: React.createElement(manager.icon, { size: 18 }),
        path: manager.path,
      } as NavItem));

    parentIds.forEach(parentId => {
      const parent = managers.find(manager => manager.id === parentId);
      if (!parent) return;
      const children = managers.filter(manager => manager.parentId === parentId);
      items.push({
        id: parent.id,
        label: label(parent.labelKey, parent.fallbackLabel),
        icon: React.createElement(parent.icon, { size: 18 }),
        path: parent.path,
        badge: parentId === 'reports' && openReportCount !== null ? openReportCount.toString() : undefined,
        badgeType: parentId === 'reports' ? 'red' : undefined,
        badgeLabel: parentId === 'reports' ? 'Open reports' : undefined,
        children: children.map(manager => ({
          id: manager.id,
          label: label(manager.labelKey, manager.fallbackLabel),
          icon: React.createElement(manager.icon, { size: 18 }),
          path: manager.path,
        })),
      });
    });

    return { title: label(group.labelKey, group.fallbackLabel), items };
  }).filter(section => section.items.length > 0);
}

function NavItemComponent({ item, isActive, isExpanded, onToggle, onNavigate, path }: any) {
  const hasChildren = item.children && item.children.length > 0;

  return (
    <>
      <button
        onClick={() => {
          // A parent that also has a path (e.g. Reports) navigates to its
          // landing screen while still expanding its child items.
          if (item.path) {
            onNavigate(item.path);
          }
          if (hasChildren) {
            onToggle(item.id || item.label);
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
              className={`sidebar-item sidebar-child-item ${path === child.path || (child.path !== '/admin/reports' && child.path && path.startsWith(`${child.path}/`)) ? 'active' : ''}`}
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
  const { role } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [openReportCount, setOpenReportCount] = useState<number | null>(null);
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

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Admin sectioned navigation */}
        {role === 2 && adminSections.map(section => (
          <div key={section.title} className="sidebar-section">
            <div className="sidebar-section-title">{section.title}</div>
            {section.items.map(item => (
              <NavItemComponent
                key={item.id || item.path || item.label}
                item={item}
                isActive={isMenuActive(item)}
                isExpanded={expandedMenus.includes(item.id || item.label) || isMenuActive(item)}
                onToggle={handleToggleMenu}
                onNavigate={handleNavigate}
                path={location.pathname}
              />
            ))}
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
