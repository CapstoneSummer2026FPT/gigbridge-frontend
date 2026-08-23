import {
  useState,
  useEffect,
  useRef,
  type ChangeEvent,
  type FormEvent,
  type MouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import {
  BriefcaseBusiness,
  ChevronDown,
  Search,
  UsersRound,
  X,
  ArrowRight,
  Clock,
  Palette,
  Code2,
  Sparkles,
  Smartphone,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import {
  TOP_NAV_SEARCH_SCOPE,
  type TopNavSearchScope,
} from '../utils/topNavSearch';
import './styles/TopNavSearch.css';

interface TopNavSearchProps {
  value: string;
  scope: TopNavSearchScope;
  isScopeSelectorEnabled: boolean;
  isScopeMenuOpen: boolean;
  onValueChange: (value: string) => void;
  onScopeChange: (scope: TopNavSearchScope) => void;
  onScopeMenuOpenChange: (isOpen: boolean) => void;
  onSubmit: () => void;
}

interface SearchScopeOption {
  value: TopNavSearchScope;
  label: string;
  description: string;
  icon: typeof UsersRound;
}

interface SmartCategory {
  title: string;
  query: string;
  subtitle: string;
  icon: typeof Code2;
  bgGradient: string;
  iconColor: string;
}

const RECENT_SEARCHES_STORAGE_KEY = 'gb_topnav_recent_searches';
const MAX_RECENT_SEARCHES = 3;

export function TopNavSearch({
  value,
  scope,
  isScopeSelectorEnabled,
  isScopeMenuOpen,
  onValueChange,
  onScopeChange,
  onScopeMenuOpenChange,
  onSubmit,
}: TopNavSearchProps) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isMac = typeof window !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

  const options: readonly SearchScopeOption[] = [
    {
      value: TOP_NAV_SEARCH_SCOPE.Talent,
      label: t('topNavSearch.talent'),
      description: t('topNavSearch.talentDescription'),
      icon: UsersRound,
    },
    {
      value: TOP_NAV_SEARCH_SCOPE.Jobs,
      label: t('topNavSearch.jobs'),
      description: t('topNavSearch.jobsDescription'),
      icon: BriefcaseBusiness,
    },
  ];

  const selectedOption = options.find(option => option.value === scope) ?? options[0];

  const categories: Record<TopNavSearchScope, SmartCategory[]> = {
    [TOP_NAV_SEARCH_SCOPE.Talent]: [
      {
        title: 'UI/UX & Product Design',
        query: 'UI/UX Designer',
        subtitle: 'Figma, Design Systems, Mobile Apps',
        icon: Palette,
        bgGradient: 'rgba(236, 72, 153, 0.12)',
        iconColor: '#ec4899',
      },
      {
        title: 'Full-Stack Development',
        query: 'Full-Stack Developer',
        subtitle: 'React, Node.js, Next.js, TypeScript',
        icon: Code2,
        bgGradient: 'rgba(99, 102, 241, 0.12)',
        iconColor: '#6366f1',
      },
      {
        title: 'AI & Machine Learning',
        query: 'AI Engineer',
        subtitle: 'Python, PyTorch, LLM, Computer Vision',
        icon: Sparkles,
        bgGradient: 'rgba(139, 92, 246, 0.12)',
        iconColor: '#8b5cf6',
      },
      {
        title: 'Mobile App Developers',
        query: 'Mobile App Developer',
        subtitle: 'Flutter, React Native, iOS, Android',
        icon: Smartphone,
        bgGradient: 'rgba(6, 182, 212, 0.12)',
        iconColor: '#06b6d4',
      },
    ],
    [TOP_NAV_SEARCH_SCOPE.Jobs]: [
      {
        title: 'Frontend & Web Apps',
        query: 'Frontend Developer',
        subtitle: 'React, Vue, Tailwind, Next.js',
        icon: Code2,
        bgGradient: 'rgba(59, 130, 246, 0.12)',
        iconColor: '#3b82f6',
      },
      {
        title: 'Smart Contracts & Web3',
        query: 'Smart Contract Developer',
        subtitle: 'Solidity, Rust, DeFi, Security',
        icon: ShieldCheck,
        bgGradient: 'rgba(16, 185, 129, 0.12)',
        iconColor: '#10b981',
      },
      {
        title: 'Backend & Cloud API',
        query: 'Backend Engineer',
        subtitle: '.NET, Node.js, AWS, Microservices',
        icon: Layers,
        bgGradient: 'rgba(99, 102, 241, 0.12)',
        iconColor: '#6366f1',
      },
      {
        title: 'Design & Branding',
        query: 'Product Designer',
        subtitle: 'Brand Identity, Web Design, 3D',
        icon: Palette,
        bgGradient: 'rgba(244, 63, 94, 0.12)',
        iconColor: '#f43f5e',
      },
    ],
  };

  const currentCategories = categories[scope] ?? categories[TOP_NAV_SEARCH_SCOPE.Talent];

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setRecentSearches(parsed.slice(0, MAX_RECENT_SEARCHES));
        }
      }
    } catch {
      // safe fallback
    }
  }, []);

  const saveRecentSearch = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== trimmed.toLowerCase());
      const updated = [trimmed, ...filtered].slice(0, MAX_RECENT_SEARCHES);
      try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // safe fallback
      }
      return updated;
    });
  };

  const removeRecentSearch = (itemToRemove: string, e: MouseEvent) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(item => item !== itemToRemove);
      try {
        localStorage.setItem(RECENT_SEARCHES_STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // safe fallback
      }
      return updated;
    });
  };

  const clearAllRecent = (e: MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_STORAGE_KEY);
    } catch {
      // safe fallback
    }
  };

  // Keyboard shortcut (Cmd+K / Ctrl+K) to focus search
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsFocused(true);
      } else if (e.key === 'Escape' && isFocused) {
        setIsFocused(false);
        onScopeMenuOpenChange(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isFocused, onScopeMenuOpenChange]);

  // Click outside detection for the whole search container
  useEffect(() => {
    const handleClickOutside = (e: globalThis.MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
        onScopeMenuOpenChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onScopeMenuOpenChange]);

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && isScopeSelectorEnabled && isFocused) {
      e.preventDefault();
      const nextScope =
        scope === TOP_NAV_SEARCH_SCOPE.Talent
          ? TOP_NAV_SEARCH_SCOPE.Jobs
          : TOP_NAV_SEARCH_SCOPE.Talent;
      onScopeChange(nextScope);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (value.trim()) {
      saveRecentSearch(value);
    }
    setIsFocused(false);
    onScopeMenuOpenChange(false);
    inputRef.current?.blur();
    onSubmit();
  };

  const handleValueChange = (event: ChangeEvent<HTMLInputElement>): void => {
    onValueChange(event.target.value);
  };

  const handleQuickSelect = (query: string) => {
    onValueChange(query);
    saveRecentSearch(query);
    setIsFocused(false);
    onScopeMenuOpenChange(false);
    inputRef.current?.blur();
    setTimeout(() => {
      onSubmit();
    }, 50);
  };

  const showFlyout = isFocused && !isScopeMenuOpen;

  return (
    <div
      ref={containerRef}
      className={`gb-search-container relative hidden min-w-0 flex-1 md:flex ${
        isFocused ? 'is-focused' : ''
      }`}
    >
      <form
        className="relative w-full"
        onSubmit={handleSubmit}
        role="search"
      >
        <div className={`gb-search-bar ${isFocused ? 'is-active' : ''}`}>
          {/* Left Glow Search Icon */}
          <div className="gb-search-icon-box" aria-hidden="true">
            <Search size={16} strokeWidth={2.2} />
          </div>

          {/* Search Input */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleValueChange}
            onKeyDown={handleInputKeyDown}
            onFocus={() => {
              setIsFocused(true);
              onScopeMenuOpenChange(false);
            }}
            placeholder={t('topNavSearch.placeholder')}
            aria-label={t('topNavSearch.inputLabel')}
            className="gb-search-input"
            autoComplete="off"
            spellCheck={false}
          />

          {/* Single Clear Button */}
          {value ? (
            <button
              type="button"
              onClick={() => {
                onValueChange('');
                inputRef.current?.focus();
              }}
              className="gb-search-clear-btn"
              aria-label="Clear search query"
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          ) : (
            /* Shortcut Key Pill */
            <kbd className="gb-search-kbd hidden lg:inline-flex">
              {isMac ? '⌘K' : 'Ctrl K'}
            </kbd>
          )}

          {/* Scope Selector Capsule Button */}
          {isScopeSelectorEnabled && (
            <button
              type="button"
              className="gb-search-scope-pill"
              aria-haspopup="menu"
              aria-expanded={isScopeMenuOpen}
              onClick={() => {
                const nextState = !isScopeMenuOpen;
                onScopeMenuOpenChange(nextState);
                if (nextState) setIsFocused(false);
              }}
            >
              <span>{selectedOption.label}</span>
              <ChevronDown
                aria-hidden="true"
                size={13}
                strokeWidth={2.5}
                className={`transition-transform duration-200 ${
                  isScopeMenuOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            className="gb-search-submit-btn"
            aria-label={t('topNavSearch.search')}
            title={t('topNavSearch.search')}
          >
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </form>

      {/* Scope Detailed Menu Dropdown */}
      {isScopeSelectorEnabled && isScopeMenuOpen && (
        <div
          className="gb-search-scope-menu"
          role="menu"
          aria-label={t('topNavSearch.scopeMenuLabel')}
        >
          {options.map(option => {
            const Icon = option.icon;
            const isSelected = option.value === scope;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                className={`gb-search-scope-option ${isSelected ? 'is-selected' : ''}`}
                onClick={() => {
                  onScopeChange(option.value);
                  onScopeMenuOpenChange(false);
                  inputRef.current?.focus();
                  setIsFocused(true);
                }}
              >
                <div className="gb-search-scope-icon">
                  <Icon aria-hidden="true" size={17} strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-primary">{option.label}</span>
                    {isSelected && (
                      <span className="flex h-1.5 w-1.5 rounded-full bg-[var(--brand,#494be7)] ring-4 ring-[rgba(73,75,231,0.2)]" />
                    )}
                  </div>
                  <p className="text-xs text-muted leading-relaxed mt-0.5">
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Spotlight Command Center Flyout Popover */}
      {showFlyout && (
        <div className="gb-search-flyout">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="mb-3">
              <div className="gb-search-section-header">
                <span className="flex items-center gap-1.5">
                  <Clock size={12} />
                  {t('topNavSearch.recentSearches')}
                </span>
                <button
                  type="button"
                  onClick={clearAllRecent}
                  className="gb-search-section-action"
                >
                  {t('topNavSearch.clearHistory')}
                </button>
              </div>

              <div className="gb-search-recent-list">
                {recentSearches.map(item => (
                  <div
                    key={item}
                    className="gb-search-recent-item group"
                    onClick={() => handleQuickSelect(item)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Clock size={13} className="text-muted group-hover:text-[var(--brand,#494be7)] shrink-0 transition-colors" />
                      <span className="truncate group-hover:text-primary transition-colors text-sm font-medium">
                        {item}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => removeRecentSearch(item, e)}
                      className="gb-search-recent-delete"
                      title="Remove"
                      aria-label="Remove item"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Smart Explore Categories Cards */}
          <div>
            <div className="gb-search-section-header">
              <span>{t('topNavSearch.quickExplore')}</span>
            </div>

            <div className="gb-search-category-grid">
              {currentCategories.map(cat => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.query}
                    type="button"
                    className="gb-search-category-item group"
                    onClick={() => handleQuickSelect(cat.query)}
                  >
                    <div
                      className="gb-search-cat-icon"
                      style={{ background: cat.bgGradient, color: cat.iconColor }}
                    >
                      <Icon size={16} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="gb-search-cat-title truncate group-hover:text-[var(--brand,#494be7)] transition-colors">
                        {cat.title}
                      </p>
                      <p className="gb-search-cat-subtitle truncate">
                        {cat.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clean Footer Shortcuts Indicator */}
          <div className="gb-search-flyout-footer">
            <span className="flex items-center">
              <kbd className="gb-search-footer-kbd">↵</kbd>
              <span>{t('topNavSearch.search')}</span>
            </span>

            {isScopeSelectorEnabled && (
              <span className="flex items-center">
                <kbd className="gb-search-footer-kbd">Tab</kbd>
                <span>{t('topNavSearch.switchScope')}</span>
              </span>
            )}

            <span className="flex items-center">
              <kbd className="gb-search-footer-kbd">Esc</kbd>
              <span>{t('topNavSearch.close')}</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
