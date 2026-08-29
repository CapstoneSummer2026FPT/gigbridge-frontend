import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ChevronDown, LogOut, Settings, Menu, X, CreditCard, TrendingUp, History, Banknote, Crown, RotateCw, User as UserIcon, ChevronRight, MessageSquare, Search, Bell, ArrowRight, UsersRound, BriefcaseBusiness } from 'lucide-react';
import gsap from 'gsap';
import { TiLocationArrow } from 'react-icons/ti';
import clsx from 'clsx';
import { useApp } from '../../app/providers/AppProvider';
import { walletGetAPI } from '../../api/walletAPI/GET';
import {
  messageGetAPI,
  type ConversationInboxRevisionChangedEvent,
} from '../../api/messageAPI/GET';
import { CombinedThemeLanguageSwitcher } from './LanguageSwitcher';
import { TopNavNotificationDropdown } from '../../features/notifications/components/TopNavNotificationDropdown';
import { useNotificationsContext } from '../../features/notifications/providers/NotificationsProvider';
import { onChatHubReconnected, subscribeChatHubEvent } from '../realtime/chatHubConnection';
import Button from './Button';
import { GigCoinAmount, GigCoinLogo } from './GigCoinAmount';
import { formatGigCoinNumber } from '../utils/gigcoin';
import { useTranslation } from '../../hooks/useTranslation';
import { usePremiumStatus } from '../../features/premium/hooks';
import { UserAvatar } from './UserAvatar';
import { getProfilePath } from '../hooks/useProfileNavigation';
import { TopNavSearch } from './TopNavSearch';
import { AuthInviteModal } from './AuthInviteModal';
import './styles/TopNav.css';
import {
  getTopNavSearchPath,
  TOP_NAV_SEARCH_SCOPE,
  type TopNavSearchScope,
} from '../utils/topNavSearch';

interface TopNavProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

const navItems = [
  { label: 'Find Work', path: '/public/job-posts' },
  { label: 'Hire Talent', path: '/public/freelancers' },
  { label: 'How GigBridge works', path: '#how-it-works' },
  { label: 'FAQ', path: '/faq' }
];

export function TopNav({ onMenuClick, showMenuButton = false }: TopNavProps = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [showSearchScopeMenu, setShowSearchScopeMenu] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const conversationRevisionRef = useRef(0);
  const [searchVal, setSearchVal] = useState('');
  const [searchScope, setSearchScope] = useState<TopNavSearchScope>(TOP_NAV_SEARCH_SCOPE.Jobs);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isMobileWalletExpanded, setIsMobileWalletExpanded] = useState(false);

  // Safely get app context - might be null for guest users
  let appContext;
  try {
    appContext = useApp();
  } catch (e) {
    appContext = null;
  }

  const user = appContext?.user || null;
  const role = appContext?.role ?? null;
  const theme = appContext?.theme || 'black';
  const setTheme = appContext?.setTheme || (() => { });
  const logout = appContext?.logout || (() => { });
  const isAuthenticated = appContext?.isAuthenticated || false;
  const premiumStatus = usePremiumStatus(user ? role : null);
  const premiumStatusUnavailable = Boolean(premiumStatus.error && !premiumStatus.hasResolved);

  let unreadNotificationsCount = 0;
  try {
    const notifsContext = useNotificationsContext();
    unreadNotificationsCount = notifsContext.unreadCount || 0;
  } catch {
    unreadNotificationsCount = 0;
  }

  useEffect(() => {
    if (role === 0) setSearchScope(TOP_NAV_SEARCH_SCOPE.Talent);
    else if (role === 1) setSearchScope(TOP_NAV_SEARCH_SCOPE.Jobs);
  }, [role]);

  const localizedNavItems = navItems.map(item => {
    if (item.label === 'Find Work') return { ...item, label: t('nav.findWork') };
    if (item.label === 'Hire Talent') return { ...item, label: t('nav.hireTalent') };
    if (item.label === 'How GigBridge works') return { ...item, label: t('nav.howItWorks') };
    if (item.label === 'FAQ') return { ...item, label: t('nav.faq') };
    return item;
  });

  // Wallet data

  useEffect(() => {
    let isMounted = true;

    const fetchWalletBalance = async () => {
      if (!user || role === 2) {
        setWalletBalance(0);
        return;
      }

      const response = await walletGetAPI.getMyWallet();
      if (isMounted && response.success && response.data) {
        // Toolbar shows ONLY the deposited (non-withdrawable) GigCoin pool.
        setWalletBalance(response.data.depositedGigCoin);
      }
    };

    void fetchWalletBalance();
    const intervalId = window.setInterval(fetchWalletBalance, 30000);
    window.addEventListener('gigbridge-wallet-updated', fetchWalletBalance);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('gigbridge-wallet-updated', fetchWalletBalance);
    };
  }, [location.pathname, location.search, role, user?.id]);

  // Unread messages data
  useEffect(() => {
    let isMounted = true;
    let resyncing = false;

    const fetchUnreadMessages = async () => {
      if (resyncing) return;
      if (!user) {
        setUnreadMessagesCount(0);
        conversationRevisionRef.current = 0;
        return;
      }
      resyncing = true;
      try {
        const response = await messageGetAPI.getInboxStatus();
        if (isMounted && response.success && response.data) {
          setUnreadMessagesCount(response.data.unreadCount || 0);
          conversationRevisionRef.current = response.data.revision || 0;
        }
      } catch (err) {
        // Safe fallback
      } finally {
        resyncing = false;
      }
    };

    void fetchUnreadMessages();
    const unsubscribeRevision = subscribeChatHubEvent<ConversationInboxRevisionChangedEvent>(
      'ConversationInboxRevisionChanged',
      event => {
        if (event.revision <= conversationRevisionRef.current) return;
        conversationRevisionRef.current = event.revision;
        // The event count is a delivery cache and may be stale after concurrent
        // updates from multiple API nodes. Always reconcile with the authoritative
        // participant total exposed by inbox-status.
        void fetchUnreadMessages();
      },
    );
    const unsubscribeReconnect = onChatHubReconnected(() => void fetchUnreadMessages());
    const handleVisibility = (): void => {
      if (window.document.visibilityState === 'visible') void fetchUnreadMessages();
    };
    window.addEventListener('gigbridge-messages-updated', fetchUnreadMessages);
    window.document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMounted = false;
      unsubscribeRevision();
      unsubscribeReconnect();
      window.removeEventListener('gigbridge-messages-updated', fetchUnreadMessages);
      window.document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [location.pathname, user?.id]);

  const handleSearch = (): void => {
    setShowSearchScopeMenu(false);
    navigate(getTopNavSearchPath(searchScope, searchVal));
  };

  const handleSearchScopeChange = (scope: TopNavSearchScope): void => {
    setSearchScope(scope);
    setShowSearchScopeMenu(false);
  };

  const handleSearchScopeMenuOpenChange = (isOpen: boolean): void => {
    setShowSearchScopeMenu(isOpen);
    if (isOpen) {
      setShowUserMenu(false);
      setShowNotifs(false);
      setShowWalletMenu(false);
    }
  };

  const isLandingMode = !isAuthenticated || location.pathname === '/';

  // Landing Page Audio & Scroll Visibility Logic
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isIndicatorActive, setIsIndicatorActive] = useState(false);
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const navContainerRef = useRef<HTMLDivElement>(null);
  const [currentScrollY, setCurrentScrollY] = useState(() =>
    typeof window === 'undefined' ? 0 : window.scrollY
  );
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setCurrentScrollY(window.scrollY);
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleAudioIndicator = () => {
    setIsAudioPlaying((prev) => !prev);
    setIsIndicatorActive((prev) => !prev);
  };

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaying) {
        audioElementRef.current.play().catch(() => undefined);
      } else {
        audioElementRef.current.pause();
      }
    }
  }, [isAudioPlaying]);

  useEffect(() => {
    if (!isLandingMode || !navContainerRef.current) return;

    if (currentScrollY === 0) {
      setIsNavVisible(true);
      navContainerRef.current.classList.remove('floating-nav');
    } else if (currentScrollY > lastScrollY) {
      setIsNavVisible(false);
      navContainerRef.current.classList.add('floating-nav');
    } else if (currentScrollY < lastScrollY) {
      setIsNavVisible(true);
      navContainerRef.current.classList.add('floating-nav');
    }

    setLastScrollY(currentScrollY);
  }, [currentScrollY, lastScrollY, isLandingMode]);

  useEffect(() => {
    if (!isLandingMode || !navContainerRef.current) return;
    gsap.to(navContainerRef.current, {
      y: isNavVisible ? 0 : -100,
      opacity: isNavVisible ? 1 : 0,
      duration: 0.25,
      ease: 'power2.out',
    });
  }, [isNavVisible, isLandingMode]);

  const handleCtaClick = () => {
    if (isAuthenticated) {
      const dashboardPath = role === 1 ? '/freelancer/dashboard' : '/client/dashboard';
      navigate(dashboardPath);
    } else {
      navigate('/auth/login');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // LANDING / UNAUTHENTICATED NAV BAR
  // ═══════════════════════════════════════════════════════════════
  if (isLandingMode) {
    return (
      <div
        ref={navContainerRef}
        className="top-nav-landing-container landing-nav-container"
      >
        <header className="top-nav-landing-header">
          <nav className="top-nav-landing-nav">
            {/* Logo and CTA Button */}
            <div className="top-nav-left-group">
              <div
                onClick={() => navigate('/')}
                className="top-nav-logo-wrapper"
              >
                <img
                  src="/img/logo.png"
                  alt="GigBridge Logo"
                  width={32}
                  height={32}
                  className="top-nav-logo-img"
                />
                <span className="top-nav-logo-text logo-text">
                  GigBridge
                </span>
              </div>

              <Button
                id="auth-button"
                title={isAuthenticated ? t('nav.dashboard') : t('auth.login')}
                rightIcon={<TiLocationArrow />}
                onClick={handleCtaClick}
                containerClass="top-nav-auth-btn"
              />
            </div>

            {/* Navigation Links, Hamburger & Audio Button */}
            <div className="top-nav-right-group">
              <div className="top-nav-desktop-links desktop-nav-links">
                {localizedNavItems.map((item, index) => {
                  const handleClick = (e: React.MouseEvent) => {
                    e.preventDefault();
                    if (item.path.startsWith('#')) {
                      const id = item.path.replace('#', '');
                      const el = document.getElementById(id);
                      if (el) {
                        el.scrollIntoView({ behavior: 'smooth' });
                      } else {
                        navigate('/' + item.path);
                      }
                      return;
                    }
                    navigate(item.path);
                  };

                  return (
                    <span
                      key={index}
                      onClick={handleClick}
                      className="nav-hover-btn"
                    >
                      {item.label}
                    </span>
                  );
                })}
              </div>

              <CombinedThemeLanguageSwitcher
                theme={theme}
                setTheme={setTheme}
                className="top-nav-switcher-landing"
              />

              <button
                type="button"
                onClick={toggleAudioIndicator}
                className="top-nav-audio-btn"
                aria-label="Toggle background audio"
              >
                <audio
                  ref={audioElementRef}
                  className="hidden"
                  src="/audio/loop.mp3"
                  loop
                />
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={clsx('indicator-line', {
                      active: isIndicatorActive,
                    })}
                    style={{
                      animationDelay: `${bar * 0.1}s`,
                      ['--animation-order' as any]: bar
                    }}
                  />
                ))}
              </button>

              {/* Mobile Navigation Drawer Toggle Button */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className="top-nav-drawer-toggle-btn"
                aria-label="Toggle Navigation Menu"
              >
                {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </nav>
        </header>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="top-nav-mobile-drawer">
            {/* Audio Toggle in Mobile Drawer */}
            <div className="top-nav-mobile-audio-row">
              <span className="text-xs font-semibold text-secondary">Am Thanh Nền</span>
              <button
                type="button"
                onClick={toggleAudioIndicator}
                className="top-nav-mobile-audio-button"
              >
                <span className="text-xs text-muted-foreground mr-1">{isAudioPlaying ? 'Bật' : 'Tắt'}</span>
                {[1, 2, 3, 4].map((bar) => (
                  <div
                    key={bar}
                    className={clsx('indicator-line', { active: isIndicatorActive })}
                    style={{ animationDelay: `${bar * 0.1}s`, ['--animation-order' as any]: bar }}
                  />
                ))}
              </button>
            </div>

            {localizedNavItems.map((item, index) => {
              const handleClick = (e: React.MouseEvent) => {
                e.preventDefault();
                setIsMobileMenuOpen(false);
                if (item.path.startsWith('#')) {
                  const id = item.path.replace('#', '');
                  const el = document.getElementById(id);
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                  } else {
                    navigate('/' + item.path);
                  }
                  return;
                }
                navigate(item.path);
              };

              return (
                <div
                  key={index}
                  onClick={handleClick}
                  className="top-nav-mobile-drawer-item"
                >
                  <span>{item.label}</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </div>
              );
            })}
          </div>
        )}

        {/* Backdrop for landing mobile drawer */}
        {isMobileMenuOpen && (
          <div
            className="top-nav-backdrop-overlay"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Guest Auth Invitation Modal */}
        <AuthInviteModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    );
  }

  const isAnyDropdownOpen = showUserMenu || showNotifs || showWalletMenu || showSearchScopeMenu;

  // ═══════════════════════════════════════════════════════════════
  // STANDARD APPLICATION TOP NAV
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className={`top-nav-standard-container landing-nav-container floating-nav ${isAnyDropdownOpen ? 'top-nav-menu-open z-[100]' : 'z-[45]'}`}>
      {/* Hamburger Menu Button - Show on both mobile and desktop when logged in */}
      {showMenuButton && (
        <button
          onClick={onMenuClick}
          className="top-nav-icon-btn glass-button"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} className="text-muted" />
        </button>
      )}

      {/* Logo */}
      <div className="top-nav-app-logo" onClick={() => navigate('/')}>
        <img
          src="/img/logo.png"
          alt="GigBridge Logo"
          width={32}
          height={32}
          className="top-nav-logo-img"
        />
        <span className="top-nav-app-logo-text">GigBridge</span>
      </div>

      {/* Desktop Search Bar */}
      {!isLandingMode && (
        <TopNavSearch
          value={searchVal}
          scope={searchScope}
          isScopeSelectorEnabled={Boolean(user && (role === 0 || role === 1))}
          isScopeMenuOpen={showSearchScopeMenu}
          onValueChange={setSearchVal}
          onScopeChange={handleSearchScopeChange}
          onScopeMenuOpenChange={handleSearchScopeMenuOpenChange}
          onSubmit={handleSearch}
        />
      )}

      {/* Mobile Search Button (< md) */}
      {!isLandingMode && (
        <button
          type="button"
          onClick={() => {
            setIsMobileSearchOpen(prev => !prev);
            setShowUserMenu(false);
            setShowNotifs(false);
            setShowWalletMenu(false);
            setShowSearchScopeMenu(false);
          }}
          className="top-nav-mobile-search-btn glass-button"
          aria-label="Toggle search bar"
        >
          <Search size={18} />
        </button>
      )}

      {/* Nav Links (Guest) */}
      {isLandingMode && (
        <nav className="top-nav-guest-links desktop-nav-links">
          {[
            { label: 'How It Works', path: '/guide' },
            { label: 'Browse Jobs', path: '/jobs/browse' },
          ].map(link => (
            <span key={link.path}
              className="text-sm cursor-pointer transition-colors text-secondary hover:text-cyan"
              onClick={() => navigate(link.path)}
            >
              {link.label}
            </span>
          ))}
        </nav>
      )}

      <div className="top-nav-right-tools">
        {user && role !== 2 && !premiumStatus.loading && (
          premiumStatusUnavailable ? (
            <button
              type="button"
              className="top-nav-get-premium top-nav-desktop-only"
              onClick={() => { void premiumStatus.refresh(); }}
            >
              <RotateCw size={15} />
              <span className="hidden sm:inline">Retry Status</span>
              <span className="sm:hidden">Retry</span>
            </button>
          ) : premiumStatus.isPremium ? (
            <div className="relative inline-flex items-center top-nav-desktop-only">
              <div className="top-nav-premium-conic-pill">
                <button
                  type="button"
                  className="top-nav-premium-active-btn"
                  onClick={() => {
                    navigate(role === 0 ? '/premium/client' : '/premium/freelancer');
                  }}
                >
                  <span className="hidden sm:inline">Premium Member</span>
                  <span className="sm:hidden">Premium</span>
                </button>
              </div>
              <span className="top-nav-crown-badge-corner" aria-hidden="true">
                <Crown size={10} strokeWidth={2.5} className="fill-white text-white" />
              </span>
            </div>
          ) : (
            <button
              type="button"
              className="top-nav-get-premium top-nav-desktop-only"
              onClick={() => {
                navigate(role === 0 ? '/premium/client/pricing' : '/premium/freelancer/pricing');
              }}
            >
              <Crown size={15} />
              <span className="hidden sm:inline">Get Premium Now</span>
              <span className="sm:hidden">Get PRO</span>
            </button>
          )
        )}
        {/* Wallet Balance Dropdown */}
        {user && role !== 2 && (
          <div className="relative top-nav-desktop-only">
            <button
              onClick={() => { setShowWalletMenu(!showWalletMenu); setShowNotifs(false); setShowUserMenu(false); setShowSearchScopeMenu(false); }}
              className="top-nav-wallet-trigger glass-button"
              title={t('wallet.depositedTooltip')}
              aria-label={t('wallet.depositedTooltip')}
            >
              <GigCoinLogo size={16} />
              <span className="text-primary text-sm font-semibold hidden sm:inline-flex">{formatGigCoinNumber(walletBalance)}</span>
              <ChevronDown size={14} className="text-muted" />
            </button>

            {showWalletMenu && (
              <div className="top-nav-wallet-dropdown dropdown-menu">
                <div className="px-3 py-2 mb-1">
                  <p className="text-xs text-muted">{t('wallet.depositedBalance')}</p>
                  <div className="flex items-center gap-1">
                    <GigCoinAmount amount={walletBalance} className="text-lg font-bold text-[var(--gb-amber)]" />
                  </div>
                  <p className="text-[10px] text-muted mt-0.5">{t('wallet.depositedCaption')}</p>
                </div>
                <div className="h-px mb-1 dropdown-divider" />

                <button className="top-nav-dropdown-item"
                  onClick={() => { navigate('/wallet/deposit'); setShowWalletMenu(false); }}>
                  <GigCoinLogo size={14} />
                  <span>{t('wallet.deposit')}</span>
                </button>

                {role === 1 && (
                  <button className="top-nav-dropdown-item"
                    onClick={() => { navigate('/wallet/withdrawals'); setShowWalletMenu(false); }}>
                    <Banknote size={14} />
                    <span>{t('wallet.withdraw')}</span>
                  </button>
                )}

                <button className="top-nav-dropdown-item"
                  onClick={() => { navigate(role === 1 ? '/premium/freelancer/pricing' : '/premium/client/pricing'); setShowWalletMenu(false); }}>
                  <CreditCard size={14} />
                  {t('nav.subscription')}
                </button>

                <button className="top-nav-dropdown-item"
                  onClick={() => { navigate('/financial-overview'); setShowWalletMenu(false); }}>
                  <TrendingUp size={14} />
                  {t('nav.financialOverview')}
                </button>

                <button className="top-nav-dropdown-item"
                  onClick={() => { navigate('/wallet/history'); setShowWalletMenu(false); }}>
                  <History size={14} />
                  {t('wallet.history')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Notifications Dropdown Component */}
        <div className="top-nav-desktop-only relative">
          <TopNavNotificationDropdown
            user={user}
            isOpen={showNotifs}
            onToggle={() => {
              setShowNotifs(!showNotifs);
              setShowUserMenu(false);
              setShowWalletMenu(false);
              setShowSearchScopeMenu(false);
            }}
            onClose={() => setShowNotifs(false)}
          />
        </div>

        {/* Messages Icon (Positioned immediately to the right of Notifications Bell) */}
        {user ? (
          <button
            onClick={() => { setShowNotifs(false); setShowUserMenu(false); setShowWalletMenu(false); setShowSearchScopeMenu(false); navigate('/messages'); }}
            className="top-nav-messages-btn glass-button top-nav-desktop-only"
            title={t('nav.messages', { defaultValue: 'Messages' })}
            aria-label={t('nav.messages', { defaultValue: 'Messages' })}
          >
            <MessageSquare size={16} className={unreadMessagesCount > 0 ? 'text-[var(--brand)]' : 'text-muted'} />
            {unreadMessagesCount > 0 && (
              <span className="top-nav-badge">
                {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
              </span>
            )}
          </button>
        ) : null}

        {/* User Menu / Auth Buttons */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); setShowWalletMenu(false); setShowSearchScopeMenu(false); }}
              className="top-nav-user-trigger relative"
              aria-label="User Menu"
            >
              <UserAvatar
                name={user.full_name || `${user.first_name} ${user.last_name}`}
                src={user.avatar}
                userId={user.id}
                premium={premiumStatus.isPremium}
                size="sm"
              />
              {/* Show indicator dot on avatar if there are unread notifications or unread messages */}
              {(unreadNotificationsCount > 0 || unreadMessagesCount > 0) && (
                <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-[var(--brand,#494be7)] ring-2 ring-[var(--surface,#ffffff)] animate-pulse lg:hidden" />
              )}
            </button>

            {showUserMenu && (
              <div className="top-nav-user-dropdown dropdown-menu">
                {/* User Profile Info Card */}
                <div
                  className="top-nav-user-card group"
                  onClick={() => {
                    const path = getProfilePath(user.id, role);
                    if (path) navigate(path);
                    setShowUserMenu(false);
                  }}
                >
                  <UserAvatar
                    name={user.full_name || `${user.first_name} ${user.last_name}`}
                    src={user.avatar}
                    userId={user.id}
                    premium={premiumStatus.isPremium}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-primary text-sm font-semibold truncate group-hover:text-cyan transition-colors">
                      {user.full_name || `${user.first_name} ${user.last_name}`}
                    </p>
                    <p className="text-[11px] text-secondary truncate">{user.email}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-muted uppercase tracking-wider">
                        {role === 0 ? t('projects.client') : role === 1 ? t('projects.freelancer') : t('nav.admin')}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-muted group-hover:translate-x-0.5 group-hover:text-cyan transition-all flex-shrink-0" />
                </div>

                <div className="h-px mb-1 dropdown-divider" />

                {/* Mobile / Tablet Collapsed User Tools (< 1024px) */}
                <div className="top-nav-mobile-tools">
                  {/* Wallet Balance Item with Expandable Submenu */}
                  {role !== 2 && (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        className="top-nav-dropdown-item justify-between"
                        onClick={() => setIsMobileWalletExpanded(prev => !prev)}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <GigCoinLogo size={14} />
                          <span className="truncate">{t('wallet.title', { defaultValue: 'Wallet' })}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className="text-xs font-bold text-[var(--gb-amber,#f59e0b)]">
                            {formatGigCoinNumber(walletBalance)} G
                          </span>
                          <ChevronDown
                            size={14}
                            className={clsx('text-muted transition-transform duration-200', isMobileWalletExpanded && 'rotate-180')}
                          />
                        </div>
                      </button>

                      {/* Wallet Sub-options when expanded */}
                      {isMobileWalletExpanded && (
                        <div className="flex flex-col pl-3 py-1 space-y-0.5 border-l border-white/10 ml-3 my-1">
                          <button
                            type="button"
                            className="top-nav-dropdown-item py-1.5 text-xs"
                            onClick={() => { navigate('/wallet/deposit'); setShowUserMenu(false); }}
                          >
                            <GigCoinLogo size={14} />
                            <span>{t('wallet.deposit')}</span>
                          </button>

                          {role === 1 && (
                            <button
                              type="button"
                              className="top-nav-dropdown-item py-1.5 text-xs"
                              onClick={() => { navigate('/wallet/withdrawals'); setShowUserMenu(false); }}
                            >
                              <Banknote size={14} />
                              <span>{t('wallet.withdraw')}</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="top-nav-dropdown-item py-1.5 text-xs"
                            onClick={() => { navigate(role === 1 ? '/premium/freelancer/pricing' : '/premium/client/pricing'); setShowUserMenu(false); }}
                          >
                            <CreditCard size={14} />
                            <span>{t('nav.subscription')}</span>
                          </button>

                          <button
                            type="button"
                            className="top-nav-dropdown-item py-1.5 text-xs"
                            onClick={() => { navigate('/financial-overview'); setShowUserMenu(false); }}
                          >
                            <TrendingUp size={14} />
                            <span>{t('nav.financialOverview')}</span>
                          </button>

                          <button
                            type="button"
                            className="top-nav-dropdown-item py-1.5 text-xs"
                            onClick={() => { navigate('/wallet/history'); setShowUserMenu(false); }}
                          >
                            <History size={14} />
                            <span>{t('wallet.history')}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Messages Item */}
                  <button
                    type="button"
                    className="top-nav-dropdown-item justify-between"
                    onClick={() => { navigate('/messages'); setShowUserMenu(false); }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <MessageSquare size={14} className="shrink-0" />
                      <span className="truncate">{t('nav.messages', { defaultValue: 'Messages' })}</span>
                    </div>
                    {unreadMessagesCount > 0 && (
                      <span className="top-nav-badge-inline">
                        {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Item */}
                  <button
                    type="button"
                    className="top-nav-dropdown-item justify-between"
                    onClick={() => {
                      navigate('/notifications');
                      setShowUserMenu(false);
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative flex items-center justify-center">
                        <Bell size={14} className={unreadNotificationsCount > 0 ? 'text-[var(--brand,#494be7)]' : 'shrink-0'} />
                        {unreadNotificationsCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--brand,#494be7)] animate-pulse" />
                        )}
                      </div>
                      <span className="truncate">{t('notifications.title', { defaultValue: 'Thông Báo' })}</span>
                    </div>
                    {unreadNotificationsCount > 0 && (
                      <span className="top-nav-badge-inline">
                        {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                      </span>
                    )}
                  </button>

                  {/* Get Premium / Premium Member Item */}
                  {role !== 2 && !premiumStatus.loading && (
                    <button
                      type="button"
                      className="top-nav-dropdown-item justify-between"
                      onClick={() => {
                        if (premiumStatusUnavailable) {
                          void premiumStatus.refresh();
                          return;
                        }
                        navigate(
                          role === 0
                            ? premiumStatus.isPremium ? '/premium/client' : '/premium/client/pricing'
                            : premiumStatus.isPremium ? '/premium/freelancer' : '/premium/freelancer/pricing'
                        );
                        setShowUserMenu(false);
                      }}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Crown size={14} className="shrink-0" />
                        <span className="truncate font-semibold">
                          {premiumStatus.isPremium ? 'Premium Member' : 'Get Premium Now'}
                        </span>
                      </div>
                      {!premiumStatus.isPremium && (
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 text-white shrink-0">
                          PRO
                        </span>
                      )}
                    </button>
                  )}

                  <div className="h-px my-1 dropdown-divider" />
                </div>

                {/* Profile Link Button */}
                {(role === 0 || role === 1) && (
                  <button
                    className="top-nav-dropdown-item"
                    onClick={() => {
                      const path = getProfilePath(user.id, role);
                      if (path) navigate(path);
                      setShowUserMenu(false);
                    }}
                  >
                    <UserIcon size={14} />
                    <span>{t('nav.profile', { defaultValue: 'My Profile' })}</span>
                  </button>
                )}

                <button
                  className="top-nav-dropdown-item"
                  onClick={() => { navigate('/settings'); setShowUserMenu(false); }}
                >
                  <Settings size={14} />
                  {t('nav.settings')}
                </button>

                {/* Theme and Language Switcher Capsule inside Dropdown */}
                <div className="top-nav-dropdown-switcher-wrapper">
                  <CombinedThemeLanguageSwitcher
                    theme={theme}
                    setTheme={setTheme}
                    className="w-full justify-between"
                  />
                </div>

                <div className="h-px my-1 dropdown-divider" />

                <button
                  className="top-nav-dropdown-item top-nav-logout-btn logout-button"
                  onClick={() => { logout('/'); setShowUserMenu(false); }}
                >
                  <LogOut size={14} />
                  {t('auth.signOut')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="top-nav-guest-auth-group">
            {/* Combined Theme and Language Switcher for Guest Users */}
            <CombinedThemeLanguageSwitcher
              theme={theme}
              setTheme={setTheme}
              className="flex"
            />
            <button className="btn-ghost-cyan px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm"
              onClick={() => navigate('/auth/login')}>
              {t('auth.login')}
            </button>
            <button className="btn-cyan px-2 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm"
              onClick={() => navigate('/auth/signup')}>
              {t('auth.signup')}
            </button>
          </div>
        )}
      </div>

      {/* Mobile Search Overlay Panel */}
      {!isLandingMode && isMobileSearchOpen && (
        <div className="top-nav-search-overlay">
          <div className="top-nav-search-card flex flex-col gap-3">
            {/* Header: Scope Switcher + Clean Close Action */}
            <div className="flex items-center justify-between gap-2">
              {user && (role === 0 || role === 1) ? (
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)] flex-1 max-w-[16rem]">
                  <button
                    type="button"
                    onClick={() => setSearchScope(TOP_NAV_SEARCH_SCOPE.Talent)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      searchScope === TOP_NAV_SEARCH_SCOPE.Talent
                        ? 'bg-[var(--brand)] text-white shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <UsersRound size={13} />
                    <span>{t('topNavSearch.talent')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchScope(TOP_NAV_SEARCH_SCOPE.Jobs)}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      searchScope === TOP_NAV_SEARCH_SCOPE.Jobs
                        ? 'bg-[var(--brand)] text-white shadow-sm'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <BriefcaseBusiness size={13} />
                    <span>{t('topNavSearch.jobs')}</span>
                  </button>
                </div>
              ) : (
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] px-1">
                  {t('topNavSearch.search')}
                </span>
              )}

              {/* Close Button - Clean Text Pill */}
              <button
                type="button"
                onClick={() => setIsMobileSearchOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition-colors shrink-0"
                aria-label="Close mobile search"
              >
                {t('topNavSearch.close', { defaultValue: 'Close' })}
              </button>
            </div>

            {/* Input Bar */}
            <form
              className="flex items-center gap-2 w-full"
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
                setIsMobileSearchOpen(false);
              }}
            >
              <div className="flex items-center flex-1 min-w-0 bg-[var(--surface-muted)] rounded-full px-3.5 py-2 border border-[var(--border-strong)] focus-within:border-[var(--brand)] transition-all">
                <Search size={16} className="text-[var(--brand)] shrink-0 mr-2.5" />
                <input
                  type="text"
                  value={searchVal}
                  onChange={(e) => setSearchVal(e.target.value)}
                  placeholder={t('topNavSearch.placeholder')}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full bg-transparent text-sm text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)] py-0 min-w-0"
                />
                {/* Single Clear Text Button */}
                {searchVal && (
                  <button
                    type="button"
                    onClick={() => setSearchVal('')}
                    className="w-5 h-5 rounded-full bg-[var(--surface-hover)] hover:bg-[var(--destructive)] hover:text-white text-[var(--text-muted)] flex items-center justify-center shrink-0 transition-colors"
                    aria-label="Clear text"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="gb-search-submit-btn !w-10 !h-10 shrink-0"
                aria-label={t('topNavSearch.search')}
                title={t('topNavSearch.search')}
              >
                <ArrowRight size={15} strokeWidth={2.5} />
              </button>
            </form>

            {/* Quick Category Chips on Mobile */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(searchScope === TOP_NAV_SEARCH_SCOPE.Talent
                ? ['UI/UX Designer', 'React & Next.js', 'AI Engineer', 'Mobile Flutter']
                : ['Frontend Developer', 'Smart Contracts', 'Node.js Backend', 'Product Designer']
              ).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSearchVal(tag);
                    navigate(getTopNavSearchPath(searchScope, tag));
                    setIsMobileSearchOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-[var(--surface-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--brand)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menus */}
      {(showUserMenu || showNotifs || showWalletMenu || showSearchScopeMenu || isMobileSearchOpen) && (
        <div className="top-nav-backdrop-overlay" onClick={() => { setShowUserMenu(false); setShowNotifs(false); setShowWalletMenu(false); setShowSearchScopeMenu(false); setIsMobileSearchOpen(false); }} />
      )}

      {/* Guest Auth Invitation Modal */}
      <AuthInviteModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
