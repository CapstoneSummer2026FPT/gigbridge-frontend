/**
 * Language Switcher Component
 *
 * A responsive, reusable component for switching between supported languages.
 * Features:
 * - Dropdown UI for language selection
 * - Persistent language preference via localStorage
 * - Smooth transitions without page reload
 * - Accessible and keyboard-friendly
 *
 * @module components/LanguageSwitcher
 */

import { useState, useRef, useEffect } from 'react';
import { Globe, Check, Moon, Sun } from 'lucide-react';
import { useLanguage } from '../../hooks/useTranslation';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import type { SupportedLanguage } from '../../i18n';

interface LanguageSwitcherProps {
  /**
   * Display variant
   * - 'dropdown': Full dropdown with button
   * - 'select': Native select element (for settings pages)
   */
  variant?: 'dropdown' | 'select';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Show language label next to icon
   */
  showLabel?: boolean;
}

/**
 * Language Switcher Component
 *
 * @example Dropdown variant (for navbar)
 * ```tsx
 * <LanguageSwitcher variant="dropdown" showLabel />
 * ```
 *
 * @example Select variant (for settings)
 * ```tsx
 * <LanguageSwitcher variant="select" />
 * ```
 */
export function LanguageSwitcher({
  variant = 'dropdown',
  className = '',
  showLabel = false,
}: LanguageSwitcherProps) {
  const { currentLanguage, changeLanguage, availableLanguages, isLanguageActive } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  /**
   * Handle language change
   */
  const handleLanguageChange = async (lng: SupportedLanguage) => {
    await changeLanguage(lng);
    setIsOpen(false);
  };

  /**
   * Render select variant (for settings pages)
   */
  if (variant === 'select') {
    return (
      <div className={`relative ${className}`}>
        <select
          value={currentLanguage}
          onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
          className="w-full px-4 py-3 bg-surface border border-border rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-cyan appearance-none cursor-pointer"
        >
          {availableLanguages.map((lng) => (
            <option key={lng} value={lng}>
              {SUPPORTED_LANGUAGES[lng]}
            </option>
          ))}
        </select>
        <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary pointer-events-none" />
      </div>
    );
  }

  /**
   * Render dropdown variant (for navbar)
   */
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface transition-colors text-secondary hover:text-primary"
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <Globe className="w-5 h-5" />
        {showLabel && (
          <span className="text-sm font-medium">
            {SUPPORTED_LANGUAGES[currentLanguage]}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-background/70 backdrop-blur-xl border border-border/50 rounded-xl p-2 z-50 shadow-xl">
          {availableLanguages.map((lng) => (
            <button
              key={lng}
              type="button"
              onClick={() => handleLanguageChange(lng)}
              className={`
                w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm
                transition-colors cursor-pointer
                ${
                  isLanguageActive(lng)
                    ? 'bg-brand/10 text-brand'
                    : 'text-primary hover:bg-brand/10 hover:text-brand'
                }
              `}
            >
              <span className="font-medium">{SUPPORTED_LANGUAGES[lng]}</span>
              {isLanguageActive(lng) && <Check className="w-4 h-4" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Combined Theme and Language Switcher
 *
 * A compact component that combines theme selection and language selection
 * with hover dropdowns for each option.
 *
 * @example
 * ```tsx
 * <CombinedThemeLanguageSwitcher />
 * ```
 */
export function CombinedThemeLanguageSwitcher({
  theme,
  setTheme,
  className = '',
}: {
  theme: 'black' | 'white';
  setTheme: (theme: 'black' | 'white') => void;
  className?: string;
}) {
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowLangDropdown(false);
      }
    }
    if (showLangDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showLangDropdown]);

  const toggleTheme = () => {
    setTheme(theme === 'black' ? 'white' : 'black');
  };

  const otherLanguages = availableLanguages.filter((lng) => lng !== currentLanguage);

  return (
    <div
      ref={dropdownRef}
      className={`flex items-center gap-1.5 p-1 rounded-full bg-background/50 backdrop-blur-md border border-border/50 shadow-sm transition-all duration-300 ${className}`}
    >
      {/* Theme Toggle Button */}
      <button
        type="button"
        onClick={toggleTheme}
        className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-300 cursor-pointer flex items-center justify-center group active:scale-95"
        title={`Switch to ${theme === 'black' ? 'Light' : 'Dark'} Mode`}
      >
        <span className="transition-transform duration-500 group-hover:rotate-45 flex items-center justify-center">
          {theme === 'black' ? (
            <Sun size={15} className="text-amber-500 fill-amber-500/10" />
          ) : (
            <Moon size={15} className="text-violet-500 fill-violet-500/10" />
          )}
        </span>
      </button>

      {/* Vertical Divider */}
      <div className="w-px h-4 bg-border/60 self-center" />

      {/* Language Selection Button */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowLangDropdown(!showLangDropdown)}
          className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all duration-200 cursor-pointer flex items-center gap-1 active:scale-95"
          title="Select Language"
        >
          <span>{currentLanguage}</span>
          <Globe size={11} className="opacity-60" />
        </button>

        {/* Language Dropdown Menu */}
        {showLangDropdown && otherLanguages.length > 0 && (
          <div className="absolute right-0 top-full mt-2 w-32 rounded-xl bg-background/70 backdrop-blur-xl border border-border/50 shadow-lg p-1 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
            {availableLanguages.map((lng) => (
              <button
                key={lng}
                type="button"
                onClick={() => {
                  changeLanguage(lng);
                  setShowLangDropdown(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                  currentLanguage === lng
                    ? 'bg-brand text-white'
                    : 'text-muted-foreground hover:bg-brand/10 hover:text-brand'
                }`}
              >
                <span>{lng === 'en' ? 'English' : 'Tiếng Việt'}</span>
                {currentLanguage === lng && <Check size={12} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
