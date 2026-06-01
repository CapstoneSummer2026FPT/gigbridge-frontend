import image_Frame_1_1 from '@/imports/Frame_1-1.png'
import image_Frame_1 from '@/imports/Frame_1.png'
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { Bell, Search, ChevronDown, LogOut, Settings, User, Zap, Menu, Wallet, DollarSign, CreditCard, TrendingUp, History, Moon, Sun, Coins } from 'lucide-react';
import { useApp, AppTheme } from '../../app/providers/AppProvider';
import { DB } from '../../mock_backend';
import { ImageWithFallback } from '../../app/components/figma/ImageWithFallback';
import { CompactLanguageSwitcher, CombinedThemeLanguageSwitcher } from './LanguageSwitcher';
import { useTranslation } from '../../hooks/useTranslation';

interface TopNavProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

export function TopNav({ onMenuClick, showMenuButton = false }: TopNavProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  // Safely get app context - might be null for guest users
  let appContext;
  try {
    appContext = useApp();
  } catch (e) {
    appContext = null;
  }

  const user = appContext?.user || null;
  const role = appContext?.role || null;
  const theme = appContext?.theme || 'black';
  const setTheme = appContext?.setTheme || (() => {});
  const logout = appContext?.logout || (() => {});
  
  // Wallet and notification data
  const walletBalance = user?.gigcoin_balance || 0;
  const unreadCount = 0; // TODO: Get from notifications service
  const notifications: any[] = []; // TODO: Get from notifications service

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) navigate(`/jobs/browse?q=${encodeURIComponent(searchVal.trim())}`);
  };

  const isLanding = location.pathname === '/';

  return (
    <header className="glass-nav fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-4 md:px-6 gap-4">
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
        <ImageWithFallback
          src={image_Frame_1_1}
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
          {['How It Works', 'Browse Jobs', 'Market Insights'].map(link => (
            <span key={link}
              className="text-sm cursor-pointer transition-colors text-secondary hover:text-cyan"
              onClick={() => {
                if (link === 'Browse Jobs') navigate('/jobs/browse');
                if (link === 'Market Insights') navigate('/market-insights');
              }}
            >
              {link}
            </span>
          ))}
        </nav>
      )}

      <div className="flex items-center gap-2 ml-auto">
        {/* Wallet Balance Dropdown */}
        {user && (
          <div className="relative">
            <button
              onClick={() => { setShowWalletMenu(!showWalletMenu); setShowNotifs(false); setShowUserMenu(false); }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all glass-button"
            >
              <Coins size={16} className="text-amber-400" />
              <span className="text-primary text-sm font-semibold hidden sm:block">{walletBalance.toLocaleString()}</span>
              <ChevronDown size={14} className="text-muted" />
            </button>

            {showWalletMenu && (
              <div className="absolute right-0 top-12 w-56 rounded-2xl p-2 z-50 dropdown-menu">
                <div className="px-3 py-2 mb-1">
                  <p className="text-xs text-muted">Gig Coin Balance</p>
                  <div className="flex items-center gap-1">
                    <Coins className="text-amber-400" size={18} />
                    <p className="text-lg font-bold text-amber-400">{walletBalance.toLocaleString()}</p>
                  </div>
                </div>
                <div className="h-px mb-1 dropdown-divider" />

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary"
                  onClick={() => { navigate('/wallet/deposit'); setShowWalletMenu(false); }}>
                  <Coins size={14} className="text-amber-400" />
                  <span>Deposit Gig Coin</span>
                </button>

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary"
                  onClick={() => { navigate('/subscription'); setShowWalletMenu(false); }}>
                  <CreditCard size={14} />
                  Subscription
                </button>

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary"
                  onClick={() => { navigate('/financial-overview'); setShowWalletMenu(false); }}>
                  <TrendingUp size={14} />
                  Financial Overview
                </button>

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-white/5 text-secondary"
                  onClick={() => { navigate('/wallet/history'); setShowWalletMenu(false); }}>
                  <History size={14} />
                  History
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
                  <p className="text-primary font-semibold text-sm">Notifications</p>
                  <button onClick={() => navigate('/notifications')} className="text-xs text-cyan">See all</button>
                </div>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {notifications.slice(0, 5).map(n => (
                    <div key={n.id} className={`p-3 rounded-xl cursor-pointer transition-all ${n.isRead ? '' : 'notification-unread'}`}
                      onClick={() => { setShowNotifs(false); navigate(n.actionUrl || '/notifications'); }}>
                      <p className="text-primary text-xs font-medium">{n.title}</p>
                      <p className="text-xs mt-0.5 line-clamp-2 text-secondary">{n.body}</p>
                    </div>
                  ))}
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
              <div className="w-7 h-7 rounded-full avatar-glow flex items-center justify-center text-xs font-bold avatar-gradient">
                {user.first_name.charAt(0)}{user.last_name.charAt(0)}
              </div>
              <span className="text-primary text-sm font-medium hidden md:block">{user.first_name}</span>
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
                  Settings
                </button>

                <div className="px-3 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Moon size={14} className="text-muted" />
                      <span className="text-sm text-secondary">Theme</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTheme('black')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        theme === 'black'
                          ? 'bg-cyan/15 text-cyan border border-cyan/40'
                          : 'glass-button text-secondary hover:bg-white/5'
                      }`}
                    >
                      ⚫ Black
                    </button>
                    <button
                      onClick={() => setTheme('white')}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                        theme === 'white'
                          ? 'bg-cyan/15 text-cyan border border-cyan/40'
                          : 'glass-button text-secondary hover:bg-white/5'
                      }`}
                    >
                      ⚪ White
                    </button>
                  </div>
                </div>

                <div className="h-px my-1 dropdown-divider" />

                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all hover:bg-red-500/10 logout-button"
                  onClick={() => { logout(); navigate('/'); setShowUserMenu(false); }}>
                  <LogOut size={14} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            {/* Combined Theme and Language Switcher for Guest Users */}
            <CombinedThemeLanguageSwitcher
              theme={theme}
              setTheme={setTheme}
              className="hidden sm:flex"
            />
            <button className="btn-ghost-cyan px-4 py-2 text-sm"
              onClick={() => navigate('/auth/login')}>
              Log In
            </button>
            <button className="btn-cyan px-4 py-2 text-sm"
              onClick={() => navigate('/auth/signup')}>
              Sign Up
            </button>
          </div>
        )}
      </div>

      {/* Click outside to close menus */}
      {(showUserMenu || showNotifs || showWalletMenu) && (
        <div className="fixed inset-0 z-40" onClick={() => { setShowUserMenu(false); setShowNotifs(false); setShowWalletMenu(false); }} />
      )}
    </header>
  );
}