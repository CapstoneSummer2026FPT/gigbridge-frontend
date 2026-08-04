import { useState, type ReactNode } from 'react';
import { CreditCard, Globe, Lock, User } from 'lucide-react';
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

  const tabs: Array<{ id: SettingsTab; label: string; icon: ReactNode }> = [
    { id: 'profile', label: t('settings.general'), icon: <User size={16} /> },
    { id: 'security', label: t('settings.security'), icon: <Lock size={16} /> },
    { id: 'payment', label: t('settings.payment'), icon: <CreditCard size={16} /> },
    { id: 'preferences', label: t('settings.preferences'), icon: <Globe size={16} /> },
  ];

  return (
    <AppLayout>
      <div className="settings-screen mx-auto max-w-5xl px-4 py-6">
        <div className="mb-8">
          <h1 className="mb-1 text-3xl font-bold tracking-tight text-foreground">{t('nav.settings')}</h1>
          <p className="text-secondary">
            {t('settings.manageSubtitle', { defaultValue: 'Manage your account preferences and profile' })}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {/* Settings Sidebar Tabs */}
          <nav className="space-y-1" aria-label="Settings sections">
            {tabs.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`sidebar-item w-full ${tab === item.id ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Active Tab Panel */}
          <div className="space-y-5 md:col-span-3">
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
