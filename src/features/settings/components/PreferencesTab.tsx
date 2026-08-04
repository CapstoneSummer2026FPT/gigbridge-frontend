import { useRef } from 'react';
import { Globe, Sun, Moon, Check, Sparkles } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';

export function PreferencesTab() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);

  // GSAP Entrance Animations for Bento Cards
  useGSAP(
    () => {
      if (containerRef.current) {
        gsap.fromTo(
          '.settings-bento-card',
          { opacity: 0, y: 25, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.1, ease: 'power3.out' }
        );
      }
    },
    { scope: containerRef }
  );

  // Language Switch Handler
  const handleLanguageChange = (lang: 'vi' | 'en') => {
    void i18n.changeLanguage(lang);
  };

  // Theme Switch Handler using AppProvider's setTheme
  const handleThemeChange = (mode: 'white' | 'black', cardEl: HTMLDivElement | null) => {
    if (cardEl) {
      gsap.fromTo(cardEl, { scale: 0.94 }, { scale: 1, duration: 0.35, ease: 'back.out(2)' });
    }
    setTheme(mode);
  };

  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'vi';

  return (
    <div ref={containerRef} className="space-y-6">
      {/* Bento Grid Layout */}
      <div className="settings-bento-grid">
        {/* Bento Hero Header Card */}
        <div className="settings-bento-card settings-bento-col-12 bg-gradient-to-r from-[var(--brand-soft,rgba(73,75,231,0.08))] to-[var(--surface,#ffffff)] border border-[var(--brand-border,rgba(73,75,231,0.25))]">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-[var(--brand,#494be7)] bg-[var(--brand-soft,rgba(73,75,231,0.12))]">
                <Sparkles size={13} />
                <span>System Preferences</span>
              </div>
              <h2 className="text-xl font-extrabold text-primary pt-1">
                {t('settings.languageTheme')}
              </h2>
              <p className="text-xs text-secondary">
                {t('settings.manageSubtitle')}
              </p>
            </div>
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand,#494be7)] text-white shadow-lg shadow-[var(--brand-soft)]">
              <Globe size={24} />
            </div>
          </div>
        </div>

        {/* Bento Box 1: Interactive Language Switch Segment (Col-6) */}
        <div className="settings-bento-card settings-bento-col-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-[var(--brand,#494be7)]" />
              <h3 className="font-bold text-sm text-primary">{t('settings.selectLanguage')}</h3>
            </div>
            <span className="text-xs font-extrabold text-[var(--brand,#494be7)]">
              {currentLang === 'vi' ? 'Tiếng Việt 🇻🇳' : 'English 🇬🇧'}
            </span>
          </div>

          {/* Interactive Sliding Switch Pill */}
          <div className="relative flex items-center p-1.5 rounded-2xl bg-[var(--surface-muted,#f1f1f3)] border border-[var(--border,#ededf0)]">
            {/* Sliding Pill Background */}
            <div
              className={`absolute top-1.5 bottom-1.5 w-[calc(50%-0.375rem)] rounded-xl bg-[var(--brand,#494be7)] shadow-md transition-all duration-300 ease-out ${
                currentLang === 'en' ? 'left-[calc(50%+0.1875rem)]' : 'left-1.5'
              }`}
            />

            <button
              type="button"
              onClick={() => handleLanguageChange('vi')}
              className={`relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold transition-all duration-300 z-10 ${
                currentLang === 'vi' ? 'text-white' : 'text-secondary hover:text-primary'
              }`}
            >
              <span className="text-base">🇻🇳</span>
              <span>Tiếng Việt</span>
            </button>

            <button
              type="button"
              onClick={() => handleLanguageChange('en')}
              className={`relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-extrabold transition-all duration-300 z-10 ${
                currentLang === 'en' ? 'text-white' : 'text-secondary hover:text-primary'
              }`}
            >
              <span className="text-base">🇬🇧</span>
              <span>English</span>
            </button>
          </div>
        </div>

        {/* Bento Box 2: Theme Selection Cards (Col-6) */}
        <div className="settings-bento-card settings-bento-col-6 space-y-4">
          <div className="flex items-center gap-2">
            <Sun size={18} className="text-[var(--brand,#494be7)]" />
            <h3 className="font-bold text-sm text-primary">{t('settings.selectTheme')}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Light Mode Card */}
            <div
              onClick={e => handleThemeChange('white', e.currentTarget)}
              className={`settings-bento-card settings-bento-card-interactive p-4 border rounded-2xl flex flex-col justify-between space-y-3 transition-all ${
                theme === 'white'
                  ? 'border-[var(--brand,#494be7)] bg-[var(--brand-soft,rgba(73,75,231,0.08))] shadow-md'
                  : 'border-[var(--border,#ededf0)] hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <Sun size={22} className="text-amber-500" />
                {theme === 'white' && (
                  <span className="h-5 w-5 rounded-full bg-[var(--brand,#494be7)] text-white flex items-center justify-center">
                    <Check size={12} />
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-primary">{t('settings.lightMode')}</p>
                <p className="text-[11px] text-secondary">Clean & Bright</p>
              </div>
            </div>

            {/* Dark Mode Card */}
            <div
              onClick={e => handleThemeChange('black', e.currentTarget)}
              className={`settings-bento-card settings-bento-card-interactive p-4 border rounded-2xl flex flex-col justify-between space-y-3 transition-all ${
                theme === 'black'
                  ? 'border-[var(--brand,#494be7)] bg-[var(--brand-soft,rgba(73,75,231,0.08))] shadow-md'
                  : 'border-[var(--border,#ededf0)] hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <Moon size={22} className="text-indigo-400" />
                {theme === 'black' && (
                  <span className="h-5 w-5 rounded-full bg-[var(--brand,#494be7)] text-white flex items-center justify-center">
                    <Check size={12} />
                  </span>
                )}
              </div>
              <div>
                <p className="font-bold text-sm text-primary">{t('settings.darkMode')}</p>
                <p className="text-[11px] text-secondary">Sleek & Deep</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
