import React, { useEffect, useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router';
import {
  LayoutDashboard, Briefcase, Search, FileText, MessageSquare,
  BarChart2, Shield, Flag, HelpCircle,
  TrendingUp, PlusCircle, Zap, Bookmark,
  ChevronDown, Wallet, Banknote, Star, Scale, FileCheck2, History, Send, X
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
  isPinned?: boolean;
  onTogglePin?: () => void;
}

function getClientNavItems(t: any): NavItem[] {
  return [
    {
      id: 'dashboard',
      label: t('nav.dashboard', { defaultValue: 'Dashboard' }),
      icon: <LayoutDashboard size={18} />,
      path: '/client/dashboard',
    },
    {
      id: 'jobs',
      label: t('nav.jobs', { defaultValue: 'Jobs' }),
      icon: <Briefcase size={18} />,
      children: [
        { id: 'post-job', label: t('nav.postJob', { defaultValue: 'Post a Job' }), icon: <PlusCircle size={18} />, path: '/jobs/post/guide', badge: 'AI', badgeType: 'cyan' },
        { id: 'my-jobs', label: t('nav.myJobs', { defaultValue: 'Jobs' }), icon: <Briefcase size={18} />, path: '/jobs/my-jobs' },
      ],
    },
    {
      id: 'work',
      label: t('nav.work', { defaultValue: 'Work' }),
      icon: <Flag size={18} />,
      children: [
        { id: 'proposals', label: t('nav.proposals', { defaultValue: 'Proposals' }), icon: <Send size={18} />, path: '/proposals' },
        { id: 'contracts', label: t('nav.contracts', { defaultValue: 'Contracts' }), icon: <FileText size={18} />, path: '/contracts' },
        { id: 'projects', label: t('nav.projects', { defaultValue: 'Workspace' }), icon: <Flag size={18} />, path: '/workspace' },
        { id: 'messages', label: t('nav.messages', { defaultValue: 'Messages' }), icon: <MessageSquare size={18} />, path: '/messages' },
      ],
    },
    {
      id: 'freelancers',
      label: t('nav.freelancers', { defaultValue: 'Freelancers' }),
      icon: <Search size={18} />,
      children: [
        { id: 'smart-matching', label: t('nav.smartMatching', { defaultValue: 'Smart Matching' }), icon: <Zap size={18} />, path: '/talent-matching', badge: 'PRO', badgeType: 'purple' },
        { id: 'saved-freelancers', label: t('nav.savedFreelancers', { defaultValue: 'Saved Freelancers' }), icon: <Bookmark size={18} />, path: '/talent-matching?tab=saved' },
      ],
    },
    {
      id: 'wallet',
      label: t('nav.wallet', { defaultValue: 'Wallet' }),
      icon: <Wallet size={18} />,
      children: [
        { id: 'deposit', label: t('wallet.deposit', { defaultValue: 'Deposit' }), icon: <PlusCircle size={18} />, path: '/wallet/deposit' },
        { id: 'receipts', label: t('nav.receipts', { defaultValue: 'Receipts' }), icon: <FileCheck2 size={18} />, path: '/receipts' },
        { id: 'financial-overview', label: t('nav.financialOverview', { defaultValue: 'Financial Overview' }), icon: <BarChart2 size={18} />, path: '/financial-overview' },
        { id: 'history', label: t('wallet.history', { defaultValue: 'History' }), icon: <History size={18} />, path: '/wallet/history' },
      ],
    },
    {
      id: 'support-feedback',
      label: t('nav.supportAndFeedback', { defaultValue: 'Support & Feedback' }),
      icon: <HelpCircle size={18} />,
      children: [
        { id: 'reviews', label: t('nav.reviews', { defaultValue: 'Reviews' }), icon: <Star size={18} />, path: '/reviews' },
        { id: 'my-disputes', label: t('nav.myDisputes', { defaultValue: 'Disputes' }), icon: <Scale size={18} />, path: '/disputes' },
      ],
    },
  ];
}

function getFreelancerNavItems(t: any): NavItem[] {
  return [
    {
      id: 'dashboard',
      label: t('nav.dashboard', { defaultValue: 'Dashboard' }),
      icon: <LayoutDashboard size={18} />,
      path: '/freelancer/dashboard',
    },
    {
      id: 'find-work',
      label: t('nav.findWork', { defaultValue: 'Find Work' }),
      icon: <Search size={18} />,
      children: [
        { id: 'search-jobs', label: t('nav.searchJobs', { defaultValue: 'Search Jobs' }), icon: <Search size={18} />, path: '/jobs/browse' },
        { id: 'saved-jobs', label: t('nav.savedJobs', { defaultValue: 'Saved Jobs' }), icon: <Bookmark size={18} />, path: '/jobs/saved' },
      ],
    },
    {
      id: 'my-jobs',
      label: t('nav.myWork', { defaultValue: 'Work' }),
      icon: <Briefcase size={18} />,
      children: [
        { id: 'my-proposals', label: t('nav.myProposals', { defaultValue: 'Proposals' }), icon: <Send size={18} />, path: '/proposals' },
        { id: 'my-contracts', label: t('nav.myContracts', { defaultValue: 'Contracts' }), icon: <FileText size={18} />, path: '/contracts' },
        { id: 'my-projects', label: t('nav.myProjects', { defaultValue: 'Workspace' }), icon: <Flag size={18} />, path: '/workspace' },
        { id: 'messages', label: t('nav.messages', { defaultValue: 'Messages' }), icon: <MessageSquare size={18} />, path: '/messages' },
      ],
    },
    {
      id: 'wallet',
      label: t('nav.wallet', { defaultValue: 'Wallet' }),
      icon: <Wallet size={18} />,
      children: [
        { id: 'deposit', label: t('wallet.deposit', { defaultValue: 'Deposit' }), icon: <PlusCircle size={18} />, path: '/wallet/deposit' },
        { id: 'receipts', label: t('nav.receipts', { defaultValue: 'Receipts' }), icon: <FileCheck2 size={18} />, path: '/receipts' },
        { id: 'withdraw', label: t('wallet.withdraw', { defaultValue: 'Withdraw' }), icon: <Banknote size={18} />, path: '/wallet/withdrawals' },
        { id: 'overview', label: t('nav.financialOverview', { defaultValue: 'Financial Overview' }), icon: <BarChart2 size={18} />, path: '/financial-overview' },
        { id: 'history', label: t('wallet.history', { defaultValue: 'History' }), icon: <History size={18} />, path: '/wallet/history' },
      ],
    },
    {
      id: 'support-feedback',
      label: t('nav.supportAndFeedback', { defaultValue: 'Support & Feedback' }),
      icon: <HelpCircle size={18} />,
      children: [
        { id: 'my-reviews', label: t('nav.myReviews', { defaultValue: 'Reviews' }), icon: <Star size={18} />, path: '/reviews' },
        { id: 'my-disputes', label: t('nav.myDisputes', { defaultValue: 'Disputes' }), icon: <Scale size={18} />, path: '/disputes' },
      ],
    },
  ];
}

function getAdminNavSections(t: any, openReportCount: number | null): NavSection[] {
  return ADMIN_GROUPS.map(group => {
    const itemsInGroup = ADMIN_MANAGERS.filter(m => m.group === group.id && m.showInNavigation);

    const topLevelItems = itemsInGroup.filter(m => !m.parentId);
    const childItems = itemsInGroup.filter(m => !!m.parentId);

    const navItems: NavItem[] = topLevelItems.map(item => {
      const isReportManager = item.id === 'reports';
      const badgeType: NavItem['badgeType'] = isReportManager ? 'amber' : undefined;

      const childrenOfItem = childItems.filter(c => c.parentId === item.id);

      return {
        id: item.id,
        label: t(item.labelKey, { defaultValue: item.fallbackLabel }),
        icon: React.createElement(item.icon, { size: 18 }),
        path: item.path,
        badgeLabel: isReportManager && openReportCount && openReportCount > 0 ? String(openReportCount) : undefined,
        badgeType,
        children: childrenOfItem.length > 0 ? childrenOfItem.map(child => ({
          id: child.id,
          label: t(child.labelKey, { defaultValue: child.fallbackLabel }),
          icon: React.createElement(child.icon, { size: 18 }),
          path: child.path,
        })) : undefined,
      };
    });

    return {
      title: t(group.labelKey, { defaultValue: group.fallbackLabel }),
      items: navItems,
    };
  }).filter(section => section.items.length > 0);
}

interface NavItemComponentProps {
  item: NavItem;
  isActive: boolean;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onNavigate: (path: string) => void;
  path: string;
}

function NavItemComponent({
  item,
  isActive,
  isExpanded,
  onToggle,
  onNavigate,
  path,
}: NavItemComponentProps) {
  const hasChildren = item.children && item.children.length > 0;
  const itemId = item.id || item.label;

  if (hasChildren) {
    return (
      <div className="sidebar-item-container">
        <button
          className={`sidebar-item ${isActive ? 'active' : ''}`}
          onClick={() => {
            onToggle(itemId);
            if (item.path) onNavigate(item.path);
          }}
        >
          <span className="sidebar-item-icon">{item.icon}</span>
          <span className="sidebar-item-label">{item.label}</span>
          <ChevronDown
            size={14}
            className={`sidebar-chevron ${isExpanded ? 'expanded' : ''}`}
          />
        </button>
        {isExpanded && (
          <div className="sidebar-submenu">
            {item.children!.map(child => {
              const childActive = path === child.path;
              return (
                <button
                  key={child.id || child.path || child.label}
                  className={`sidebar-subitem ${childActive ? 'active' : ''}`}
                  onClick={() => child.path && onNavigate(child.path)}
                >
                  <span className="sidebar-item-icon">{child.icon}</span>
                  <span className="sidebar-item-label">{child.label}</span>
                  {child.badge && (
                    <span className={`sidebar-badge ${child.badgeType || 'cyan'}`}>
                      {child.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      className={`sidebar-item ${isActive ? 'active' : ''}`}
      onClick={() => item.path && onNavigate(item.path)}
    >
      <span className="sidebar-item-icon">{item.icon}</span>
      <span className="sidebar-item-label">{item.label}</span>
      {item.badgeLabel ? (
        <span className={`sidebar-badge ${item.badgeType || 'cyan'}`}>
          {item.badgeLabel}
        </span>
      ) : item.badge ? (
        <span className={`sidebar-badge ${item.badgeType || 'cyan'}`}>
          {item.badge}
        </span>
      ) : null}
    </button>
  );
}

export function Sidebar({ isOpen, onClose, isPinned, onTogglePin }: SidebarProps) {
  const { role } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const sidebarRef = useRef<HTMLElement>(null);
  const helpRef = useRef<HTMLDivElement>(null);

  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [openReportCount, setOpenReportCount] = useState<number | null>(null);
  const [showPremiumTeaser, setShowPremiumTeaser] = useState(false);
  const [showToggleHelp, setShowToggleHelp] = useState(false);
  const premiumStatus = usePremiumStatus(role);
  const premiumStatusUnavailable = Boolean(premiumStatus.error && !premiumStatus.hasResolved);

  const navItems = useMemo(
    () => (role === 0 ? getClientNavItems(t) : getFreelancerNavItems(t)),
    [role, t]
  );
  const adminSections = useMemo(
    () => (role === 2 ? getAdminNavSections(t, openReportCount) : []),
    [role, t, openReportCount]
  );

  // Close help popover on click outside of helpRef
  useEffect(() => {
    if (!showToggleHelp) return;

    const handleHelpOutside = (event: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(event.target as Node)) {
        setShowToggleHelp(false);
      }
    };

    document.addEventListener('mousedown', handleHelpOutside);
    return () => {
      document.removeEventListener('mousedown', handleHelpOutside);
    };
  }, [showToggleHelp]);

  // Click Outside Listener: Automatically close sidebar when clicking outside if UNPINNED or on MOBILE
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if ((isPinned && !isMobile) || !isOpen || !onClose) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        // Exclude clicks on TopNav menu toggle button to avoid immediate re-opening
        const isMenuBtn = (event.target as HTMLElement).closest('.glass-button');
        if (!isMenuBtn) {
          onClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isPinned, onClose]);

  // Auto-expand all collapsible submenus when sidebar loads
  useEffect(() => {
    const allParentIds = role === 2
      ? adminSections.flatMap(section => section.items).filter(item => item.children && item.children.length > 0).map(item => item.id || item.label)
      : navItems.filter(item => item.children && item.children.length > 0).map(item => item.id || item.label);

    setExpandedMenus(allParentIds);
  }, [role, navItems, adminSections]);

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

    // Auto-close sidebar on navigation if on mobile (< 768px) or not pinned
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    if ((isMobile || !isPinned) && onClose) {
      onClose();
    }
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
    <aside ref={sidebarRef} className={`gb-sidebar ${isOpen ? 'open' : ''} ${isPinned ? 'pinned' : ''}`}>
      {/* Top Header Row Bar: Brand Label & Action Buttons */}
      <div className="sidebar-header-bar">
        <div className="flex items-center gap-2 px-1 text-xs font-black uppercase tracking-wider text-[var(--gb-text-muted,#64748b)]">
          <span className="h-2 w-2 rounded-full bg-[var(--brand,#494be7)]" />
          <span>{role === 2 ? 'Admin Portal' : role === 0 ? 'Client Menu' : 'Freelancer Menu'}</span>
        </div>

        <div className="sidebar-top-actions">
          <div className="relative sidebar-help-wrapper" ref={helpRef}>
            <button
              type="button"
              onClick={() => setShowToggleHelp(prev => !prev)}
              className={`sidebar-help-icon-btn ${showToggleHelp ? 'active' : ''}`}
              title={t('sidebar.toggleHelpLabel', { defaultValue: 'Xem giải thích tác dụng Sidebar' })}
              aria-label={t('sidebar.toggleHelpLabel', { defaultValue: 'Sidebar Mode Explanation' })}
            >
              <HelpCircle size={17} strokeWidth={2.2} />
            </button>

            {showToggleHelp && (
              <div className="sidebar-help-popover" role="tooltip">
                <div className="sidebar-help-title">
                  <HelpCircle size={14} className="text-[var(--brand,#494be7)] shrink-0" />
                  <span>{t('sidebar.toggleHelpTitle', { defaultValue: 'Cố định Sidebar' })}</span>
                </div>
                <p className="sidebar-help-desc">
                  {t('sidebar.toggleHelpDesc', {
                    defaultValue:
                      'Bật công tắc để giữ Sidebar cố định khi chuyển trang. Tắt công tắc để Sidebar tự đóng khi nhấp trang hoặc nhấp ra ngoài.',
                  })}
                </p>
              </div>
            )}
          </div>

          {onTogglePin && (
            <button
              type="button"
              onClick={onTogglePin}
              className={`sidebar-switch-toggle ${isPinned ? 'active' : ''}`}
              title={isPinned ? t('sidebar.pinnedTitle', { defaultValue: 'Sidebar cố định (Đang BẬT)' }) : t('sidebar.unpinnedTitle', { defaultValue: 'Sidebar tự đóng (Đang TẮT)' })}
              aria-label={isPinned ? 'Disable Persistent Sidebar' : 'Enable Persistent Sidebar'}
            >
              <span className="sidebar-switch-thumb" />
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="sidebar-mobile-close-btn"
              title={t('common.close', { defaultValue: 'Đóng' })}
              aria-label={t('common.close', { defaultValue: 'Close sidebar' })}
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

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
          <button onClick={() => handleNavigate('/admin')} className="sidebar-item w-full">
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
