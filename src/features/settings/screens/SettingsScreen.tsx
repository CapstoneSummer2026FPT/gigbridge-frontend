import { useState } from 'react';
import { User, Lock, CreditCard, Bell, Bot, Camera, Plus, X, Eye, EyeOff, Globe, Landmark } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { DB } from '../../../mock_backend';
import { SEED_FREELANCER_PROFILES } from '../../../mock_backend/database/seed';
import { LanguageSwitcher } from '../../../shared/components/LanguageSwitcher';
import { useTranslation } from '../../../hooks/useTranslation';
import {
  getStoredBillingConfig,
  saveStoredBillingConfig,
  type BillingEarningsConfig,
} from '../mock/data-for-BillingsEarningsSettings';

type SettingsTab = 'profile' | 'security' | 'payment' | 'billing' | 'notifications' | 'ai' | 'preferences';

export default function SettingsScreen() {
  const { user, role } = useApp();
  const { t } = useTranslation();
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeSuccess, setOptimizeSuccess] = useState(false);
  const [saved, setSaved] = useState(false);
  const [billingConfig, setBillingConfig] = useState<BillingEarningsConfig>(getStoredBillingConfig);
  const [billingError, setBillingError] = useState('');
  const [billingSaved, setBillingSaved] = useState(false);

  const profile = role === 'freelancer'
    ? SEED_FREELANCER_PROFILES.find(p => p.userId === user?.id) || SEED_FREELANCER_PROFILES[0]
    : null;

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: profile?.bio || '',
    hourlyRate: profile?.hourlyRate?.toString() || '',
    location: profile?.location || '',
    title: profile?.title || '',
  });

  const handleSave = async () => {
    await new Promise(r => setTimeout(r, 800));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAIOptimize = async () => {
    setIsOptimizing(true);
    await new Promise(r => setTimeout(r, 2000));
    setFormData(prev => ({
      ...prev,
      bio: 'Award-winning Full-Stack Developer with 7+ years of experience architecting scalable, high-performance web applications. Specialized in React, TypeScript, and Node.js ecosystems, with a proven track record of delivering projects that exceed client expectations. Passionate about clean code, test-driven development, and continuous learning. Available for complex SaaS, e-commerce, and AI-powered application development.'
    }));
    setIsOptimizing(false);
    setOptimizeSuccess(true);
    setTimeout(() => setOptimizeSuccess(false), 3000);
  };

  const handleBillingChange = (key: keyof BillingEarningsConfig, value: string | boolean) => {
    setBillingConfig(prev => ({ ...prev, [key]: value }));
    setBillingError('');
    setBillingSaved(false);
  };

  const handleBillingSave = () => {
    const bankAccountPattern = /^[0-9A-Za-z\s.-]{6,34}$/;
    const validBank = billingConfig.bankName.trim().length >= 2
      && billingConfig.bankAccountName.trim().length >= 2
      && bankAccountPattern.test(billingConfig.bankAccountNumber.trim());
    const validAddress = billingConfig.billingAddress.trim().length >= 1
      && billingConfig.billingAddress.trim().length <= 255;

    if (!validBank || !validAddress) {
      setBillingError('MSG77: Please enter valid bank information');
      setBillingSaved(false);
      return;
    }

    saveStoredBillingConfig(billingConfig);
    setBillingError('');
    setBillingSaved(true);
    window.setTimeout(() => setBillingSaved(false), 2200);
  };

  const TABS = [
    { id: 'profile', label: t('settings.general'), icon: <User size={16} /> },
    { id: 'security', label: t('settings.security'), icon: <Lock size={16} /> },
    { id: 'payment', label: 'Payment', icon: <CreditCard size={16} /> },
    { id: 'billing', label: 'Billings & Earnings', icon: <Landmark size={16} /> },
    { id: 'notifications', label: t('settings.notifications'), icon: <Bell size={16} /> },
    { id: 'preferences', label: 'Preferences', icon: <Globe size={16} /> },
    { id: 'ai', label: 'AI Settings', icon: <Bot size={16} /> },
  ];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-primary mb-1">Settings</h1>
          <p className="text-secondary">Manage your account preferences and profile</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="space-y-1">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id as SettingsTab)}
                className={`sidebar-item w-full ${tab === t.id ? 'active' : ''}`}>
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="md:col-span-3 space-y-5">

            {/* Profile Tab */}
            {tab === 'profile' && (
              <>
                {/* Avatar */}
                <div className="glass-card p-6">
                  <h2 className="text-primary font-semibold mb-5">Profile Photo</h2>
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <img src={user?.avatar} alt={user?.name} className="w-20 h-20 rounded-2xl avatar-glow" />
                      <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #0077FF, #9F4BFF)' }}>
                        <Camera size={14} style={{ color: '#0A0F1C' }} />
                      </button>
                    </div>
                    <div>
                      <p className="text-primary font-medium">{user?.name}</p>
                      <p className="text-sm mt-0.5 capitalize text-secondary">{role} · {user?.email}</p>
                      {user?.isVerified && (
                        <span className="badge-green text-xs mt-2 inline-block">✓ Verified</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="glass-card p-6">
                  <h2 className="text-primary font-semibold mb-5">Basic Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'Full Name', key: 'name', type: 'text' },
                      { label: 'Email Address', key: 'email', type: 'email' },
                      { label: 'Location', key: 'location', type: 'text' },
                      ...(role === 'freelancer' ? [
                        { label: 'Professional Title', key: 'title', type: 'text' },
                        { label: 'Hourly Rate ($)', key: 'hourlyRate', type: 'number' },
                      ] : []),
                    ].map(field => (
                      <div key={field.key}>
                        <label className="text-xs font-medium text-primary mb-2 block">{field.label}</label>
                        <input type={field.type} value={(formData as any)[field.key]}
                          onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="input-gb w-full px-4 py-3 text-sm" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bio with AI Optimizer */}
                {role === 'freelancer' && (
                  <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-primary font-semibold">Professional Bio</h2>
                      <button onClick={handleAIOptimize} disabled={isOptimizing}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(159,75,255,0.15))', border: '1px solid rgba(0,240,255,0.3)', color: '#0077FF' }}>
                        {isOptimizing ? (
                          <><div className="w-3 h-3 rounded-full border border-[#0077FF] border-t-transparent animate-spin" />Optimizing...</>
                        ) : optimizeSuccess ? (
                          '✓ Bio Optimized!'
                        ) : (
                          <><Bot size={14} />AI Optimize Bio</>
                        )}
                      </button>
                    </div>
                    <textarea value={formData.bio}
                      onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      rows={5} className="input-gb w-full px-4 py-3 resize-none text-sm leading-relaxed" />
                    <p className="text-xs mt-2 text-secondary">
                      {formData.bio.length} / 1000 characters · AI-optimized bios get 67% more profile views
                    </p>
                  </div>
                )}

                <button onClick={handleSave}
                  className={`btn-cyan px-8 py-3 text-sm transition-all ${saved ? 'bg-green-500!' : ''}`}>
                  {saved ? '✓ Saved!' : 'Save Changes'}
                </button>
              </>
            )}

            {/* Security Tab */}
            {tab === 'security' && (
              <div className="glass-card p-6">
                <h2 className="text-primary font-semibold mb-6">Password & Security</h2>
                <div className="space-y-4">
                  {['Current Password', 'New Password', 'Confirm New Password'].map(label => (
                    <div key={label}>
                      <label className="text-xs font-medium text-primary mb-2 block">{label}</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} placeholder="••••••••"
                          className="input-gb w-full px-4 py-3 pr-11 text-sm" />
                        <button onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  ))}
                  <button className="btn-cyan px-6 py-3 text-sm mt-2">Update Password</button>
                </div>

                <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <h3 className="text-primary font-semibold mb-4">Two-Factor Authentication</h3>
                  <div className="flex items-center justify-between p-4 rounded-xl"
                    style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <div>
                      <p className="text-primary font-medium text-sm">Authenticator App</p>
                      <p className="text-xs mt-0.5 text-secondary">Extra security for your account</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge-green text-xs">Enabled</span>
                      <div className="w-10 h-5 rounded-full relative cursor-pointer"
                        style={{ background: '#22C55E' }}>
                        <div className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-white" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Tab */}
            {tab === 'payment' && (
              <div className="space-y-5">
                <div className="glass-card p-6">
                  <h2 className="text-primary font-semibold mb-5">Payment Methods</h2>
                  <div className="space-y-3 mb-4">
                    {[
                      { type: 'Visa', last4: '4242', expiry: '12/27', isDefault: true },
                      { type: 'Mastercard', last4: '8891', expiry: '08/26', isDefault: false },
                    ].map(card => (
                      <div key={card.last4} className="flex items-center justify-between p-4 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.03)', border: card.isDefault ? '1px solid rgba(0,240,255,0.25)' : '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-6 rounded-md flex items-center justify-center text-xs font-bold"
                            style={{ background: 'rgba(0,240,255,0.1)', color: '#0077FF' }}>
                            {card.type.slice(0, 4)}
                          </div>
                          <div>
                            <p className="text-primary text-sm font-medium">•••• {card.last4}</p>
                            <p className="text-xs text-secondary">Expires {card.expiry}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {card.isDefault && <span className="badge-cyan text-xs">Default</span>}
                          <button className="text-xs text-red">Remove</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8892A4' }}>
                    <Plus size={14} /> Add Payment Method
                  </button>
                </div>

                <div className="glass-card p-6">
                  <h2 className="text-primary font-semibold mb-5">Withdrawal Settings</h2>
                  <div className="space-y-4">
                    {[
                      { label: 'Bank Account', value: '•••• •••• 1234', status: 'Verified' },
                      { label: 'PayPal', value: 'alex@dev.pro', status: 'Connected' },
                    ].map(method => (
                      <div key={method.label} className="flex items-center justify-between p-4 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div>
                          <p className="text-primary text-sm font-medium">{method.label}</p>
                          <p className="text-xs text-secondary">{method.value}</p>
                        </div>
                        <span className="badge-green text-xs">{method.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Billings & Earnings Tab */}
            {tab === 'billing' && (
              <div className="space-y-5">
                {billingError && (
                  <div className="alert-red text-sm font-semibold">{billingError}</div>
                )}
                {billingSaved && (
                  <div className="alert-green text-sm font-semibold">Billing information saved for future invoices and withdrawals.</div>
                )}

                <div className="glass-card p-6">
                  <h2 className="text-primary font-semibold mb-5">Bank Account Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-primary mb-2 block">Bank Name</label>
                      <input className="input-gb w-full px-4 py-3 text-sm" value={billingConfig.bankName}
                        onChange={e => handleBillingChange('bankName', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-primary mb-2 block">Account Holder Name</label>
                      <input className="input-gb w-full px-4 py-3 text-sm" value={billingConfig.bankAccountName}
                        onChange={e => handleBillingChange('bankAccountName', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-primary mb-2 block">Bank Account Number</label>
                      <input className="input-gb w-full px-4 py-3 text-sm" value={billingConfig.bankAccountNumber}
                        onChange={e => handleBillingChange('bankAccountNumber', e.target.value)}
                        placeholder="6-34 letters or digits" />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h2 className="text-primary font-semibold mb-5">Billing Address & VAT</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-primary mb-2 block">Billing Address</label>
                      <textarea className="input-gb w-full px-4 py-3 text-sm resize-none" rows={3}
                        maxLength={255}
                        value={billingConfig.billingAddress}
                        onChange={e => handleBillingChange('billingAddress', e.target.value)} />
                      <p className="text-xs text-secondary mt-1">{billingConfig.billingAddress.length}/255 characters</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-primary mb-2 block">Company Tax ID (optional)</label>
                      <input className="input-gb w-full px-4 py-3 text-sm" value={billingConfig.companyTaxId}
                        onChange={e => handleBillingChange('companyTaxId', e.target.value)}
                        placeholder="Required only for VAT invoices" />
                    </div>
                    <label className="flex items-center justify-between gap-4 p-4 rounded-xl border border-primary bg-secondary cursor-pointer">
                      <div>
                        <p className="text-sm font-semibold text-primary">Enable VAT invoice settings</p>
                        <p className="text-xs text-secondary mt-1">Tax ID is required when VAT invoices are enabled.</p>
                      </div>
                      <input type="checkbox" checked={billingConfig.vatInvoiceEnabled}
                        onChange={e => handleBillingChange('vatInvoiceEnabled', e.target.checked)} />
                    </label>
                  </div>
                </div>

                <button onClick={handleBillingSave} className="btn-cyan px-8 py-3 text-sm">
                  Save Billings & Earnings
                </button>
              </div>
            )}

            {/* Notifications Tab */}
            {tab === 'notifications' && (
              <div className="glass-card p-6">
                <h2 className="text-primary font-semibold mb-5">Notification Preferences</h2>
                <div className="space-y-4">
                  {[
                    { label: 'New proposal received', desc: 'When a freelancer submits a proposal', enabled: true },
                    { label: 'AI job matches', desc: 'High-match job opportunities found by AI', enabled: true },
                    { label: 'Milestone updates', desc: 'When a milestone is submitted or approved', enabled: true },
                    { label: 'Payment confirmations', desc: 'When payments are sent or received', enabled: true },
                    { label: 'New messages', desc: 'When you receive a message', enabled: false },
                    { label: 'Marketing emails', desc: 'Tips, updates, and platform news', enabled: false },
                  ].map(notif => (
                    <div key={notif.label} className="flex items-center justify-between py-3 border-b"
                      style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <div>
                        <p className="text-primary text-sm font-medium">{notif.label}</p>
                        <p className="text-xs mt-0.5 text-secondary">{notif.desc}</p>
                      </div>
                      <div className="w-10 h-5 rounded-full relative cursor-pointer transition-all"
                        style={{ background: notif.enabled ? '#0077FF' : 'rgba(255,255,255,0.1)' }}>
                        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                          style={{ left: notif.enabled ? '22px' : '2px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {tab === 'preferences' && (
              <div className="space-y-5">
                {/* Language Settings */}
                <div className="glass-card p-6">
                  <h2 className="text-primary font-semibold mb-5">{t('settings.language')}</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-secondary mb-2">
                        {t('settings.selectLanguage')}
                      </label>
                      <LanguageSwitcher variant="select" />
                    </div>
                    <p className="text-xs text-secondary">
                      Changes will be applied immediately across the application.
                    </p>
                  </div>
                </div>

                {/* Theme Settings */}
                <div className="glass-card p-6">
                  <h2 className="text-primary font-semibold mb-5">{t('settings.theme')}</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-secondary mb-2">
                        {t('settings.selectTheme')}
                      </label>
                      <div className="grid grid-cols-2 gap-4">
                        <button className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-cyan transition-colors">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
                            <span className="text-2xl">🌙</span>
                          </div>
                          <div className="text-left">
                            <p className="text-primary font-medium text-sm">{t('settings.darkMode')}</p>
                            <p className="text-xs text-secondary">Default theme</p>
                          </div>
                        </button>
                        <button className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-cyan transition-colors">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-white flex items-center justify-center">
                            <span className="text-2xl">☀️</span>
                          </div>
                          <div className="text-left">
                            <p className="text-primary font-medium text-sm">{t('settings.lightMode')}</p>
                            <p className="text-xs text-secondary">Light theme</p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Settings Tab */}
            {tab === 'ai' && (
              <div className="space-y-5">
                <div className="glass-card p-6"
                  style={{ background: 'linear-gradient(135deg, rgba(159,75,255,0.06), rgba(0,240,255,0.04))', border: '1px solid rgba(159,75,255,0.2)' }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Bot size={18} className="text-purple" />
                    <h2 className="text-primary font-semibold">AI Preferences</h2>
                    <span className="badge-purple text-xs ml-auto">Pro Feature</span>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'AI Job Matching', desc: 'Let AI find and rank jobs based on your profile', enabled: true },
                      { label: 'AI Proposal Suggestions', desc: 'Get AI-powered cover letter assistance', enabled: true },
                      { label: 'Smart Rate Recommendations', desc: 'AI-based hourly rate optimization', enabled: true },
                      { label: 'Auto-apply to high matches', desc: 'Automatically apply to 90%+ match jobs', enabled: false },
                    ].map(setting => (
                      <div key={setting.label} className="flex items-center justify-between py-3 border-b"
                        style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div>
                          <p className="text-primary text-sm font-medium">{setting.label}</p>
                          <p className="text-xs mt-0.5 text-secondary">{setting.desc}</p>
                        </div>
                        <div className="w-10 h-5 rounded-full relative cursor-pointer"
                          style={{ background: setting.enabled ? '#9F4BFF' : 'rgba(255,255,255,0.1)' }}>
                          <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white"
                            style={{ left: setting.enabled ? '22px' : '2px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h2 className="text-primary font-semibold mb-4">AI Profile Optimizer</h2>
                  <p className="text-sm mb-4 text-secondary">
                    Our AI analyzes top-performing profiles in your category and suggests improvements.
                  </p>
                  <button onClick={handleAIOptimize} disabled={isOptimizing}
                    className="btn-purple px-6 py-3 text-sm flex items-center gap-2">
                    {isOptimizing ? (
                      <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Analyzing...</>
                    ) : (
                      <><Bot size={16} />Run AI Profile Analysis</>
                    )}
                  </button>
                  {optimizeSuccess && (
                    <p className="text-sm mt-3 text-green">✓ Profile optimized! Your bio has been updated.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
