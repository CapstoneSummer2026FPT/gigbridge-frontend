import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Bell, Search, ChevronDown, LogOut, Settings, Menu, CreditCard, TrendingUp, History, Banknote, Crown } from 'lucide-react';
import gsap from 'gsap';
import { TiLocationArrow } from 'react-icons/ti';
import clsx from 'clsx';
import { useApp } from '../../app/providers/AppProvider';
import { walletGetAPI } from '../../api/walletAPI/GET';
import { CombinedThemeLanguageSwitcher } from './LanguageSwitcher';
import { useUserNotifications } from '../../features/notifications/hooks/useUserNotifications';
import Button from './Button';
import { GigCoinAmount, GigCoinLogo } from './GigCoinAmount';
import { formatGigCoinNumber } from '../utils/gigcoin';
import { useTranslation } from '../../hooks/useTranslation';
import { usePremiumStatus } from '../../features/premium/hooks';

interface TopNavProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

const navItems = [
  { label: 'Browse Jobs', path: '/jobs/browse' },
  { label: 'About', path: '/about' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Contact', path: '#contact' }
];

export function TopNav({ onMenuClick, showMenuButton = false }: TopNavProps = {}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [searchVal, setSearchVal] = useState('');

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

  const localizedNavItems = navItems.map(item => {
    if (item.label === 'Browse Jobs') return { ...item, label: t('nav.browseJobs') };
    if (item.label === 'About') return { ...item, label: t('nav.about') };
    if (item.label === 'FAQ') return { ...item, label: t('nav.faq') };
    if (item.label === 'Contact') return { ...item, label: t('nav.contact') };
    return item;
  });

  // Wallet and notification data
  const notificationUser = location.pathname === '/notifications' ? null : user;
  const { notifications, unreadCount, markAsRead } = useUserNotifications(notificationUser, {
    pageSize: 8,
    pollMs: 45000,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchWalletBalance = async () => {
      if (!user || role === 2) {
        setWalletBalance(0);
        return;
      }

      const response = await walletGetAPI.getMyWallet();
      if (isMounted && response.success && response.data) {
        setWalletBalance(response.data.availableTokens);
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) navigate(`/jobs/browse?q=${encodeURIComponent(searchVal.trim())}`);
  };

  const isLanding = location.pathname === '/';

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
    if (!isLanding || !navContainerRef.current) return;

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
  }, [currentScrollY, lastScrollY, isLanding]);

  useEffect(() => {
    if (!isLanding || !navContainerRef.current) return;
    gsap.to(navContainerRef.current, {
      y: isNavVisible ? 0 : -100,
      opacity: isNavVisible ? 1 : 0,
      duration: 0.2,
    });
  }, [isNavVisible, isLanding]);

  const handleCtaClick = () => {
    if (isAuthenticated) {
      const dashboardPath = role === 1 ? '/freelancer/dashboard' : '/client/dashboard';
      navigate(dashboardPath);
    } else {
      navigate('/auth/login');
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // LANDING PAGE CUSTOM NAV BAR
  // ═══════════════════════════════════════════════════════════════
  if (isLanding) {
    return (
      <div
        ref={navContainerRef}
        className="fixed inset-x-3 sm:inset-x-6 top-3 sm:top-4 z-50 h-16 border-none transition-all duration-700 landing-nav-container"
      >
        <header className="absolute top-1/2 w-full -translate-y-1/2">
          <nav className="flex size-full items-center justify-between p-4">
            {/* Logo and CTA Button */}
            <div className="flex items-center gap-3 sm:gap-7">
              <div
                onClick={() => navigate('/')}
                className="flex items-center gap-2 cursor-pointer select-none"
              >
                <img
                  src="/img/logo.png"
                  alt="GigBridge Logo"
                  className="w-8 h-8 rounded-lg object-cover"
                />
                <span className="text-xl font-bold tracking-tight logo-text hidden sm:block">
                  GIGBRIDGE
                </span>
              </div>

              <Button
                id="auth-button"
                title={isAuthenticated ? t('nav.dashboard') : t('auth.login')}
                rightIcon={<TiLocationArrow />}
                onClick={handleCtaClick}
                containerClass="bg-blue-50 flex items-center justify-center gap-1 !px-4 !py-2 sm:!px-7 sm:!py-3"
              />
            </div>

            {/* Navigation Links and Audio Button */}
            <div className="flex h-full items-center">
              <div className="hidden md:block">
                {localizedNavItems.map((item, index) => {
                  if (item.path.startsWith('#')) {
                    return (
                      <a
                        key={index}
                        href={item.path}
                        className="nav-hover-btn"
                      >
                        {item.label}
                      </a>
                    );
                  }
                  return (
                    <span
                      key={index}
                      onClick={() => navigate(item.path)}
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
                className="ml-3 sm:ml-10 flex"
              />

              <button
                onClick={toggleAudioIndicator}
                className="ml-3 sm:ml-10 flex items-center space-x-0.5"
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
            </div>
          </nav>
        </header>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // STANDARD APPLICATION TOP NAV
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="fixed inset-x-3 sm:inset-x-6 top-3 sm:top-4 z-50 h-16 border-none landing-nav-container floating-nav flex items-center px-4 md:px-6 gap-4 transition-all duration-300">
      {/* Hamburger Menu Button - Show on both mobile and desktop when logged in */}
      {showMenuButton && (
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg transition-all hover:bg-white/10 glass-button"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} className="text-muted" />
        </button>
      )}

      {/* Logo */}
      <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => navigate('/')}>
        <img
          src="/img/logo.png"
          alt="GigBridge Logo"
          className="w-8 h-8 rounded-lg object-cover"
        />
        <span className="text-primary font-bold text-lg hidden sm:block">GigBridge</span>
      </div>

      {/* Search Bar */}
      {!isLanding && (
        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:flex">
          <div className="relative w-full">
            <Search size={16} className="absolute top-1/2 -translate-y-1/2 text-muted nav-search-icon" />
            <input
              type="text"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Search jobs, freelancers, skills..."
              className="input-gb nav-search-input w-full py-2 text-sm"
            />
          </div>
        </form>
      )}

      {/* Nav Links (Guest) */}
      {isLanding && (
        <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
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

      <div className="flex items-center gap-2 ml-auto">
        {user && role !== 2 && !premiumStatus.loading && (
          <button
            type="button"
            className="become-premium-button"
            onClick={() => navigate(role === 0
              ? premiumStatus.isPremium ? '/premium/client' : '/premium/client/pricing'
              : premiumStatus.isPremium ? '/premium/freelancer' : '/premium/freelancer/pricing')}
          >
            <Crown size={15} />
            <span className="hidden sm:inline">{premiumStatus.isPremium ? 'Premium active' : 'Become Premium'}</span>
            <span className="sm:hidden">Premium</span>
          </button>
        )}
        {/* Wallet Balance Dropdown */}
        {user && role !== 2 && (
          <div className="relative">
            <button
              onClick={() => { setShowWalletMenu(!showWalletMenu); setShowNotifs(false); setShowUserMenu(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all glass-button"
            >
              <GigCoinLogo size={16} />
              <span className="text-primary text-sm font-semibold hidden sm:inline-flex">{formatGigCoinNumber(walletBalance)}</span>
              <ChevronDown size={14} className="text-muted" />
            </button>

            {showWalletMenu && (
              <div className="absolute right-0 top-12 w-56 rounded-2xl p-2 z-50 dropdown-menu">
                <div className="px-3 py-2 mb-1">
                  <p className="text-xs text-muted">{t('wallet.balance')}</p>
                  <div className="flex items-center gap-1">
                    <GigCoinAmount amount={walletBalance} className="text-lg font-bold text-[var(--gb-amber)]" />
                  </div>
                </div>
                <div className="h-px mb-1 dropdown-divider" />

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary"
                  onClick={() => { navigate('/wallet/deposit'); setShowWalletMenu(false); }}>
                  <GigCoinLogo size={14} />
                  <span>{t('wallet.deposit')}</span>
                </button>

                {role === 1 && (
                  <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary"
                    onClick={() => { navigate('/wallet/withdrawals'); setShowWalletMenu(false); }}>
                    <Banknote size={14} />
                    <span>{t('wallet.withdraw')}</span>
                  </button>
                )}

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary"
                  onClick={() => { navigate(role === 1 ? '/premium/freelancer/pricing' : '/premium/client/pricing'); setShowWalletMenu(false); }}>
                  <CreditCard size={14} />
                  {t('nav.subscription')}
                </button>

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary"
                  onClick={() => { navigate('/financial-overview'); setShowWalletMenu(false); }}>
                  <TrendingUp size={14} />
                  {t('nav.financialOverview')}
                </button>

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary"
                  onClick={() => { navigate('/wallet/history'); setShowWalletMenu(false); }}>
                  <History size={14} />
                  {t('wallet.history')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Notifications */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => { setShowNotifs(!showNotifs); setShowUserMenu(false); setShowWalletMenu(false); }}
              className="p-2 rounded-lg transition-all relative glass-button"
            >
              <Bell size={16} className="text-muted" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center notification-badge">
                  {unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-12 w-80 rounded-2xl p-3 z-50 dropdown-menu">
                <div className="flex items-center justify-between mb-3 px-2">
                  <p className="text-primary font-semibold text-sm">{t('notifications.title')}</p>
                  <button
                    onClick={() => { setShowNotifs(false); navigate('/notifications'); }}
                    className="text-xs text-cyan"
                  >
                    {t('notifications.seeAll')}
                  </button>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 5).map(n => (
                       <div key={n.id} className={`p-3 rounded-xl cursor-pointer transition-all ${n.isRead ? '' : 'notification-unread'}`}
                        onClick={() => {
                          void markAsRead(n.id);
                          setShowNotifs(false);
                          navigate(n.actionUrl || '/notifications');
                        }}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-primary text-xs font-medium">{n.title}</p>
                          {!n.isRead && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-cyan flex-shrink-0" />}
                        </div>
                        {n.body && <p className="text-xs mt-0.5 line-clamp-2 text-secondary">{n.body}</p>}
                        {n.schedule && <p className="text-[10px] mt-1 text-cyan">{new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(n.schedule.scheduledAtUtc))} ICT · {n.schedule.actorName}</p>}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-primary text-sm font-medium">{t('notifications.noNotifications')}</p>
                      <p className="text-xs text-secondary mt-1">{t('notifications.caughtUp')}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : null}



        {/* User Menu / Auth Buttons */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifs(false); setShowWalletMenu(false); }}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-all glass-button"
            >
              <div className={`w-7 h-7 rounded-full avatar-glow flex items-center justify-center text-xs font-bold avatar-gradient ${premiumStatus.isPremium ? 'premium-avatar-ring' : ''}`} aria-label={premiumStatus.isPremium ? 'Premium account' : undefined}>
                {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                {premiumStatus.isPremium && <Crown size={11} className="premium-avatar-crown" />}
              </div>
              <span className={`text-primary text-sm font-medium hidden md:block ${premiumStatus.isPremium ? 'premium-user-name' : ''}`}>{user.first_name}</span>
              <ChevronDown size={14} className="text-muted" />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 top-12 w-56 rounded-2xl p-2 z-50 dropdown-menu">
                <div className="px-3 py-2 mb-1">
                  <p className="text-primary text-sm font-semibold">{user.full_name}</p>
                  <p className="text-xs text-secondary">{user.email}</p>
                </div>
                <div className="h-px mb-1 dropdown-divider" />

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary"
                  onClick={() => { navigate('/settings'); setShowUserMenu(false); }}>
                  <Settings size={14} />
                  {t('nav.settings')}
                </button>

                {/* Theme and Language Switcher Capsule inside Dropdown */}
                <div className="px-3 py-2 flex justify-center">
                  <CombinedThemeLanguageSwitcher
                    theme={theme}
                    setTheme={setTheme}
                    className="w-full justify-between"
                  />
                </div>

                <div className="h-px my-1 dropdown-divider" />



                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-red-500/10 logout-button"
                  onClick={() => { logout('/'); setShowUserMenu(false); }}>
                  <LogOut size={14} />
                  {t('auth.signOut')}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2">
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

      {/* Click outside to close menus */}
      {(showUserMenu || showNotifs || showWalletMenu) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowUserMenu(false); setShowNotifs(false); setShowWalletMenu(false); }} />
      )}
    </div>
  );
}
