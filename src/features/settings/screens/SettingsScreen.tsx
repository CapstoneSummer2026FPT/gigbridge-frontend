import { useRef, useState, type ReactNode } from 'react';
import { CreditCard, Globe, Lock, User, Sparkles } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useTranslation } from '../../../hooks/useTranslation';
import { GeneralTab } from '../components/GeneralTab';
import { SecurityTab } from '../components/SecurityTab';
import { PaymentTab } from '../components/PaymentTab';
import { PreferencesTab } from '../components/PreferencesTab';
import '../styles/settings-screen.css';

type SettingsTab = 'profile' | 'security' | 'payment' | 'preferences';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<SettingsTab>('profile');
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const tabs: Array<{ id: SettingsTab; label: string; icon: ReactNode }> = [
    { id: 'profile', label: t('settings.general'), icon: <User size={18} /> },
    { id: 'security', label: t('settings.security'), icon: <Lock size={18} /> },
    { id: 'payment', label: t('settings.payment'), icon: <CreditCard size={18} /> },
    { id: 'preferences', label: t('settings.preferences'), icon: <Globe size={18} /> },
  ];

  // GSAP Entrance Animations
  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        '.settings-header',
        { opacity: 0, y: -25 },
        { opacity: 1, y: 0, duration: 0.5 }
      )
        .fromTo(
          '.settings-sidebar-item',
          { opacity: 0, x: -20 },
          { opacity: 1, x: 0, duration: 0.4, stagger: 0.08 },
          '-=0.3'
        )
        .fromTo(
          '.settings-tab-panel',
          { opacity: 0, y: 20, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.5 },
          '-=0.3'
        );
    },
    { scope: containerRef }
  );

  // GSAP Tab Change Transition
  useGSAP(
    () => {
      if (panelRef.current) {
        gsap.fromTo(
          panelRef.current,
          { opacity: 0, y: 15, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
        );
      }
    },
    { dependencies: [tab], scope: containerRef }
  );

  return (
    <AppLayout>
      <div ref={containerRef} className="settings-screen-wrapper mx-auto max-w-5xl px-4 py-6">
        {/* Header Title Section */}
        <div className="settings-header mb-8 flex items-center justify-between">
          <div>
            <h1 className="mb-1 text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
              {t('nav.settings')}
              <Sparkles size={22} className="text-[var(--brand)] animate-pulse" />
            </h1>
            <p className="text-secondary text-sm">
              {t('settings.manageSubtitle', { defaultValue: 'Manage your account preferences and profile' })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {/* Settings Sidebar Tabs */}
          <nav className="settings-sidebar-nav space-y-1" aria-label="Settings sections">
            {tabs.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`settings-sidebar-item ${tab === item.id ? 'active' : ''}`}
              >
                <span className="settings-sidebar-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Active Tab Panel */}
          <div ref={panelRef} className="settings-tab-panel space-y-5 md:col-span-3">
            {tab === 'profile' && <GeneralTab />}
            {tab === 'security' && <SecurityTab />}
            {tab === 'payment' && <PaymentTab />}
            {tab === 'preferences' && <PreferencesTab />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
