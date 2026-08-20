import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { ChevronDown, LogOut, Settings, Menu, X, CreditCard, TrendingUp, History, Banknote, Crown, RotateCw, User as UserIcon, ChevronRight, MessageSquare, Search, Bell } from 'lucide-react';
import gsap from 'gsap';
import { TiLocationArrow } from 'react-icons/ti';
import clsx from 'clsx';
import { useApp } from '../../app/providers/AppProvider';
import { walletGetAPI } from '../../api/walletAPI/GET';
import { messageGetAPI } from '../../api/messageAPI/GET';
import { CombinedThemeLanguageSwitcher } from './LanguageSwitcher';
import { TopNavNotificationDropdown } from '../../features/notifications/components/TopNavNotificationDropdown';
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

    const fetchUnreadMessages = async () => {
      if (!user) {
        setUnreadMessagesCount(0);
        return;
      }
      try {
        const response = await messageGetAPI.getMyConversations();
        if (isMounted && response.success && Array.isArray(response.data)) {
          const totalUnread = response.data.reduce((acc, conv) => acc + (conv.unreadCount || 0), 0);
          setUnreadMessagesCount(totalUnread);
        }
      } catch (err) {
        // Safe fallback
      }
    };

    void fetchUnreadMessages();
    const intervalId = window.setInterval(fetchUnreadMessages, 15000);
    window.addEventListener('gigbridge-messages-updated', fetchUnreadMessages);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      window.removeEventListener('gigbridge-messages-updated', fetchUnreadMessages);
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
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
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
      duration: 0.2,
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
              className="top-nav-user-trigger"
              aria-label="User Menu"
            >
              <UserAvatar
                name={user.full_name || `${user.first_name} ${user.last_name}`}
                src={user.avatar}
                userId={user.id}
                premium={premiumStatus.isPremium}
                size="sm"
              />
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
                      setShowNotifs(true);
                      setShowUserMenu(false);
                    }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Bell size={14} className="shrink-0" />
                      <span className="truncate">{t('notifications.title', { defaultValue: 'Notifications' })}</span>
                    </div>
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
          <div className="top-nav-search-card glass-card">
            <form
              className="flex-1 flex items-center gap-2 min-w-0"
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
                setIsMobileSearchOpen(false);
              }}
            >
              <Search size={16} className="text-muted shrink-0 ml-2" />
              <input
                type="search"
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                placeholder={t('topNavSearch.placeholder')}
                autoFocus
                className="w-full bg-transparent text-sm text-primary focus:outline-none placeholder:text-muted py-1.5 min-w-0"
              />
              <button type="submit" className="btn-cyan text-xs px-3 py-1.5 rounded-lg shrink-0 font-medium">
                {t('common.search', { defaultValue: 'Search' })}
              </button>
            </form>
            <button
              type="button"
              onClick={() => setIsMobileSearchOpen(false)}
              className="p-1.5 text-muted hover:text-primary rounded-lg shrink-0"
              aria-label="Close mobile search"
            >
              <X size={16} />
            </button>
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
