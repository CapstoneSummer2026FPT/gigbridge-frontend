import { useState, useEffect } from 'react';
import { User, Lock, CreditCard, Bell, Bot, Camera, Plus, X, Eye, EyeOff, Globe, Landmark } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { useApp } from '../../../app/providers/AppProvider';
import { LanguageSwitcher } from '../../../shared/components/LanguageSwitcher';
import { useTranslation } from '../../../hooks/useTranslation';
import { UserRole } from '../../../types/models/User';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { profilePutAPI } from '../../../api/profileAPI/PUT';
import { CompanySize } from '../../../types/models/Profile';
import { authPostAPI } from '../../../api/authAPI/POST';
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
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [availabilityStatuses, setAvailabilityStatuses] = useState<{ id: number; name: string }[]>([]);
  const [billingConfig, setBillingConfig] = useState<BillingEarningsConfig>(getStoredBillingConfig);
  const [billingError, setBillingError] = useState('');
  const [billingSaved, setBillingSaved] = useState(false);

  const profile = null;

  const [formData, setFormData] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    location: '',
    // Freelancer-specific fields
    title: '',
    bio: '',
    availability: 0,
    // Client-specific fields
    companyName: '',
    companyWebsite: '',
    companySize: CompanySize.Solo,
    industry: '',
    companyDescription: '',
  });

  useEffect(() => {
    const loadProfileData = async () => {
      if (!user) return;
      setLoading(true);
      setErrorMessage(null);
      try {
        if (role === UserRole.Freelancer) {
          const [profileRes, availRes] = await Promise.all([
            profileGetAPI.getMyFreelancerProfile(),
            profileGetAPI.getAvailabilityStatuses()
          ]);
          if (availRes.success && availRes.data) {
            setAvailabilityStatuses(availRes.data);
          }
          if (profileRes.success && profileRes.data) {
            setFormData(prev => ({
              ...prev,
              name: user.full_name || '',
              email: user.email || '',
              location: profileRes.data.location || '',
              title: profileRes.data.title || '',
              bio: profileRes.data.bio || '',
              availability: profileRes.data.availability !== undefined && profileRes.data.availability !== null ? profileRes.data.availability : 0,
            }));
          }
        } else if (role === UserRole.Client) {
          const profileRes = await profileGetAPI.getMyClientProfile();
          if (profileRes.success && profileRes.data) {
            setFormData(prev => ({
              ...prev,
              name: user.full_name || '',
              email: user.email || '',
              location: profileRes.data.location || '',
              companyName: profileRes.data.companyName || '',
              companyWebsite: profileRes.data.companyWebsite || '',
              companySize: profileRes.data.companySize !== undefined && profileRes.data.companySize !== null ? profileRes.data.companySize : CompanySize.Solo,
              industry: profileRes.data.industry || '',
              companyDescription: profileRes.data.companyDescription || '',
            }));
          }
        }
      } catch (err: any) {
        console.error('Error loading profile:', err);
        // If 404, we don't treat it as a hard error because the profile might just not be created yet.
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [user, role]);

  const handleSave = async () => {
    setSaved(false);
    setErrorMessage(null);
    try {
      if (role === UserRole.Freelancer) {
        const res = await profilePutAPI.updateFreelancerProfile({
          title: formData.title,
          bio: formData.bio,
          availability: formData.availability,
          location: formData.location,
        });

        if (res.success) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } else {
          setErrorMessage(res.message || t('profile.errors.charLimit'));
        }
      } else if (role === UserRole.Client) {
        const res = await profilePutAPI.updateClientProfile({
          CompanyName: formData.companyName,
          CompanyWebsite: formData.companyWebsite,
          CompanySize: formData.companySize,
          Industry: formData.industry,
          CompanyDescription: formData.companyDescription,
          Location: formData.location,
        });

        if (res.success) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } else {
          setErrorMessage(res.message || t('profile.errors.charLimit'));
        }
      }
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setErrorMessage(err.message || t('common.error'));
    }
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

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordError(t('settings.passwordErrorRequired'));
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError(t('settings.passwordErrorMatch'));
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await authPostAPI.changePassword({
        currentPassword,
        newPassword
      });

      if (res.success) {
        setPasswordSuccess(true);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        if (res.errors && typeof res.errors === 'object') {
          const errorMsgs = Object.values(res.errors).flat().join(', ');
          setPasswordError(errorMsgs || res.message || t('settings.passwordErrorUpdate'));
        } else {
          setPasswordError(res.message || t('settings.passwordErrorUpdate'));
        }
      }
    } catch (err: any) {
      setPasswordError(err.message || t('settings.passwordErrorUpdate'));
    } finally {
      setPasswordLoading(false);
    }
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
      setBillingError(t('settings.billingError'));
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
    { id: 'payment', label: t('settings.payment'), icon: <CreditCard size={16} /> },
    { id: 'billing', label: t('settings.billing'), icon: <Landmark size={16} /> },
    { id: 'notifications', label: t('settings.notifications'), icon: <Bell size={16} /> },
    { id: 'preferences', label: t('settings.preferences'), icon: <Globe size={16} /> },
    { id: 'ai', label: t('settings.ai'), icon: <Bot size={16} /> },
  ];

  return (
    <AppLayout>
      <div className="settings-screen max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
            {t('nav.settings')}
          </h1>
          <p className="text-secondary">{t('settings.manageSubtitle', { defaultValue: 'Manage your account preferences and profile' })}</p>
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
                  <h2 className="text-primary font-semibold mb-5">{t('settings.profilePhoto', { defaultValue: 'Profile Photo' })}</h2>
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <img src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} alt={user?.full_name} className="w-20 h-20 rounded-2xl avatar-glow" />
                      <button className="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: 'linear-gradient(135deg, #0077FF, #9F4BFF)' }}>
                        <Camera size={14} style={{ color: '#0A0F1C' }} />
                      </button>
                    </div>
                    <div>
                      <p className="text-primary font-medium">{user?.full_name}</p>
                      <p className="text-sm mt-0.5 capitalize text-secondary">{role === UserRole.Client ? t('marketInsights.clients') : t('marketInsights.freelancers')} · {user?.email}</p>
                      {user?.is_email_verified && (
                        <span className="badge-green text-xs mt-2 inline-block">✓ {t('settings.verified', { defaultValue: 'Verified' })}</span>
                      )}
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="glass-card p-6 flex flex-col items-center justify-center min-h-[200px]">
                    <div className="w-8 h-8 rounded-full border-2 border-cyan border-t-transparent animate-spin mb-2" />
                    <p className="text-sm text-secondary">{t('settings.loadingSettings')}</p>
                  </div>
                ) : (
                  <>
                    {errorMessage && (
                      <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                        {errorMessage}
                      </div>
                    )}

                    {/* Basic Info */}
                    <div className="glass-card p-6">
                      <h2 className="text-primary font-semibold mb-5">{t('settings.basicInfo')}</h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-primary mb-2 block">{t('settings.fullName')}</label>
                          <input type="text" value={formData.name} readOnly disabled
                            className="input-gb w-full px-4 py-3 text-sm opacity-60 cursor-not-allowed" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-primary mb-2 block">{t('settings.emailAddress')}</label>
                          <input type="email" value={formData.email} readOnly disabled
                            className="input-gb w-full px-4 py-3 text-sm opacity-60 cursor-not-allowed" />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-primary mb-2 block">{t('settings.location')}</label>
                          <input type="text" value={formData.location}
                            onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                            className="input-gb w-full px-4 py-3 text-sm" />
                        </div>

                        {role === UserRole.Freelancer && (
                          <>
                            <div>
                              <label className="text-xs font-medium text-primary mb-2 block">{t('settings.professionalTitle')}</label>
                              <input type="text" value={formData.title}
                                onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                className="input-gb w-full px-4 py-3 text-sm" />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-primary mb-2 block">{t('settings.availability')}</label>
                              <select value={formData.availability}
                                onChange={e => setFormData(prev => ({ ...prev, availability: parseInt(e.target.value) || 0 }))}
                                className="input-gb w-full px-4 py-3 text-sm bg-black"
                                style={{ colorScheme: 'dark' }}>
                                {availabilityStatuses.map(status => (
                                  <option key={status.id} value={status.id}>{status.name}</option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}

                        {role === UserRole.Client && (
                          <>
                            <div>
                              <label className="text-xs font-medium text-primary mb-2 block">{t('profile.companyName')}</label>
                              <input type="text" value={formData.companyName}
                                onChange={e => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                                className="input-gb w-full px-4 py-3 text-sm" />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-primary mb-2 block">{t('profile.websiteUrl')}</label>
                              <input type="url" value={formData.companyWebsite}
                                onChange={e => setFormData(prev => ({ ...prev, companyWebsite: e.target.value }))}
                                className="input-gb w-full px-4 py-3 text-sm" />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-primary mb-2 block">{t('profile.industry')}</label>
                              <input type="text" list="industry-list" value={formData.industry}
                                onChange={e => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                                className="input-gb w-full px-4 py-3 text-sm" placeholder="Select or type an industry" />
                              <datalist id="industry-list">
                                <option value="Technology" />
                                <option value="Finance" />
                                <option value="Healthcare" />
                                <option value="E-commerce" />
                                <option value="Education" />
                                <option value="Marketing" />
                                <option value="Real Estate" />
                                <option value="Entertainment" />
                                <option value="Manufacturing" />
                                <option value="Other" />
                              </datalist>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-primary mb-2 block">{t('settings.companySize', { defaultValue: 'Company Size' })}</label>
                              <select value={formData.companySize}
                                onChange={e => setFormData(prev => ({ ...prev, companySize: parseInt(e.target.value) || 0 }))}
                                className="input-gb w-full px-4 py-3 text-sm bg-black"
                                style={{ colorScheme: 'dark' }}>
                                <option value={0}>Solo (1-9 employees)</option>
                                <option value={1}>Small (10-49 employees)</option>
                                <option value={2}>Medium (50-249 employees)</option>
                                <option value={3}>Large (250+ employees)</option>
                              </select>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Bio or Company Description */}
                    {role === UserRole.Freelancer && (
                      <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-primary font-semibold">{t('settings.professionalBio')}</h2>
                          <button onClick={handleAIOptimize} disabled={isOptimizing}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, rgba(0,240,255,0.15), rgba(159,75,255,0.15))', border: '1px solid rgba(0,240,255,0.3)', color: '#0077FF' }}>
                            {isOptimizing ? (
                              <><div className="w-3 h-3 rounded-full border border-[#0077FF] border-t-transparent animate-spin" />{t('settings.aiOptimizeRunning')}</>
                            ) : optimizeSuccess ? (
                              t('settings.aiOptimizeSuccess')
                            ) : (
                              <><Bot size={14} />{t('settings.aiOptimize')}</>
                            )}
                          </button>
                        </div>
                        <textarea value={formData.bio}
                          onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                          rows={5} className="input-gb w-full px-4 py-3 resize-none text-sm leading-relaxed" />
                        <p className="text-xs mt-2 text-secondary">
                          {t('settings.charCountDesc', { count: formData.bio.length })}
                        </p>
                      </div>
                    )}

                    {role === UserRole.Client && (
                      <div className="glass-card p-6">
                        <h2 className="text-primary font-semibold mb-4">{t('settings.companyDescription')}</h2>
                        <textarea value={formData.companyDescription}
                          onChange={e => setFormData(prev => ({ ...prev, companyDescription: e.target.value }))}
                          rows={5} className="input-gb w-full px-4 py-3 resize-none text-sm leading-relaxed" />
                        <p className="text-xs mt-2 text-secondary">
                          {t('settings.charCountDescClient', { count: formData.companyDescription.length })}
                        </p>
                      </div>
                    )}

                    <button onClick={handleSave}
                      className={`btn-cyan px-8 py-3 text-sm transition-all ${saved ? 'bg-green-500!' : ''}`}>
                      {saved ? t('settings.saved') : t('settings.saveChanges')}
                    </button>
                  </>
                )}
              </>
            )}

            {/* Security Tab */}
            {tab === 'security' && (
              <div className="glass-card p-6">
                <h2 className="text-primary font-semibold mb-6">{t('settings.securityDesc')}</h2>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  {passwordError && (
                    <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}>
                      {passwordError}
                    </div>
                  )}

                  {passwordSuccess && (
                    <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#10B981' }}>
                      {t('settings.passwordSuccess')}
                    </div>
                  )}

                  {/* Current Password */}
                  <div>
                    <label className="text-xs font-medium text-primary mb-2 block">{t('settings.currentPassword')}</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        className="input-gb w-full px-4 py-3 pr-11 text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="text-xs font-medium text-primary mb-2 block">{t('settings.newPassword')}</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        className="input-gb w-full px-4 py-3 pr-11 text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="text-xs font-medium text-primary mb-2 block">{t('settings.confirmNewPassword')}</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={confirmNewPassword}
                        onChange={e => setConfirmNewPassword(e.target.value)}
                        className="input-gb w-full px-4 py-3 pr-11 text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="btn-cyan px-6 py-3 text-sm mt-2 flex items-center gap-2"
                  >
                    {passwordLoading ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                        {t('settings.updating')}
                      </>
                    ) : (
                      t('settings.updatePassword')
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Payment Tab */}
            {tab === 'payment' && (
              <div className="space-y-5">
                <div className="glass-card p-6">
                  <h2 className="text-primary font-semibold mb-5">{t('settings.payment')}</h2>
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
                          {card.isDefault && <span className="badge-cyan text-xs">{t('settings.default')}</span>}
                          <button className="text-xs text-red">{t('settings.remove')}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8892A4' }}>
                    <Plus size={14} /> {t('settings.addPaymentMethod')}
                  </button>
                </div>

                <div className="glass-card p-6">
                  <h2 className="text-primary font-semibold mb-5">{t('settings.withdrawalSettings')}</h2>
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
                        <span className="badge-green text-xs">
                          {method.status === 'Verified' ? t('settings.verified', { defaultValue: 'Verified' }) : method.status}
                        </span>
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
                  <div className="alert-green text-sm font-semibold">{t('settings.billingSaved')}</div>
                )}

                <div className="glass-card p-6">
                  <h2 className="text-primary font-semibold mb-5">{t('settings.bankDetails')}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-primary mb-2 block">{t('settings.bankName')}</label>
                      <input className="input-gb w-full px-4 py-3 text-sm" value={billingConfig.bankName}
                        onChange={e => handleBillingChange('bankName', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-primary mb-2 block">{t('settings.bankAccountName')}</label>
                      <input className="input-gb w-full px-4 py-3 text-sm" value={billingConfig.bankAccountName}
                        onChange={e => handleBillingChange('bankAccountName', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-primary mb-2 block">{t('settings.bankAccountNumber')}</label>
                      <input className="input-gb w-full px-4 py-3 text-sm" value={billingConfig.bankAccountNumber}
                        onChange={e => handleBillingChange('bankAccountNumber', e.target.value)}
                        placeholder={t('settings.bankAccountPlaceholder')} />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-6">
                  <h2 className="text-primary font-semibold mb-5">{t('settings.vat')}</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-medium text-primary mb-2 block">{t('settings.billingAddress')}</label>
                      <textarea className="input-gb w-full px-4 py-3 text-sm resize-none" rows={3}
                        maxLength={255}
                        value={billingConfig.billingAddress}
                        onChange={e => handleBillingChange('billingAddress', e.target.value)} />
                      <p className="text-xs text-secondary mt-1">{t('settings.billingAddressCharCount', { count: billingConfig.billingAddress.length })}</p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-primary mb-2 block">{t('settings.taxId')}</label>
                      <input className="input-gb w-full px-4 py-3 text-sm" value={billingConfig.companyTaxId}
                        onChange={e => handleBillingChange('companyTaxId', e.target.value)}
                        placeholder={t('settings.taxIdPlaceholder')} />
                    </div>
                    <label className="flex items-center justify-between gap-4 p-4 rounded-xl border border-primary bg-secondary cursor-pointer">
                      <div>
                        <p className="text-sm font-semibold text-primary">{t('settings.vatInvoiceEnabled')}</p>
                        <p className="text-xs text-secondary mt-1">{t('settings.vatInvoiceDesc')}</p>
                      </div>
                      <input type="checkbox" checked={billingConfig.vatInvoiceEnabled}
                        onChange={e => handleBillingChange('vatInvoiceEnabled', e.target.checked)} />
                    </label>
                  </div>
                </div>

                <button onClick={handleBillingSave} className="btn-cyan px-8 py-3 text-sm">
                  {t('settings.saveBilling')}
                </button>
              </div>
            )}

            {/* Notifications Tab */}
            {tab === 'notifications' && (
              <div className="glass-card p-6">
                <h2 className="text-primary font-semibold mb-5">{t('settings.notifications')}</h2>
                <div className="space-y-4">
                  {[
                    { label: t('settings.notifProposalTitle', { defaultValue: 'New proposal received' }), desc: t('settings.notifProposalDesc', { defaultValue: 'When a freelancer submits a proposal' }), enabled: true },
                    { label: t('settings.notifAiTitle', { defaultValue: 'AI job matches' }), desc: t('settings.notifAiDesc', { defaultValue: 'High-match job opportunities found by AI' }), enabled: true },
                    { label: t('settings.notifMilestoneTitle', { defaultValue: 'Milestone updates' }), desc: t('settings.notifMilestoneDesc', { defaultValue: 'When a milestone is submitted or approved' }), enabled: true },
                    { label: t('settings.notifPaymentTitle', { defaultValue: 'Payment confirmations' }), desc: t('settings.notifPaymentDesc', { defaultValue: 'When payments are sent or received' }), enabled: true },
                    { label: t('settings.notifMsgTitle', { defaultValue: 'New messages' }), desc: t('settings.notifMsgDesc', { defaultValue: 'When you receive a message' }), enabled: false },
                    { label: t('settings.notifPromoTitle', { defaultValue: 'Marketing emails' }), desc: t('settings.notifPromoDesc', { defaultValue: 'Tips, updates, and platform news' }), enabled: false },
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
                      {t('settings.languageHelpDesc', { defaultValue: 'Changes will be applied immediately across the application.' })}
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
                            <p className="text-xs text-secondary">{t('settings.defaultTheme', { defaultValue: 'Default theme' })}</p>
                          </div>
                        </button>
                        <button className="flex items-center gap-3 p-4 rounded-xl border-2 border-border hover:border-cyan transition-colors">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-100 to-white flex items-center justify-center">
                            <span className="text-2xl">☀️</span>
                          </div>
                          <div className="text-left">
                            <p className="text-primary font-medium text-sm">{t('settings.lightMode')}</p>
                            <p className="text-xs text-secondary">{t('settings.lightTheme', { defaultValue: 'Light theme' })}</p>
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
                    <h2 className="text-primary font-semibold">{t('settings.ai', { defaultValue: 'AI Preferences' })}</h2>
                    <span className="badge-purple text-xs ml-auto">{t('settings.proFeature', { defaultValue: 'Pro Feature' })}</span>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: t('settings.aiMatchingTitle', { defaultValue: 'AI Job Matching' }), desc: t('settings.aiMatchingDesc', { defaultValue: 'Let AI find and rank jobs based on your profile' }), enabled: true },
                      { label: t('settings.aiProposalTitle', { defaultValue: 'AI Proposal Suggestions' }), desc: t('settings.aiProposalDesc', { defaultValue: 'Get AI-powered cover letter assistance' }), enabled: true },
                      { label: t('settings.aiBudgetTitle', { defaultValue: 'Smart Budget Recommendations' }), desc: t('settings.aiBudgetDesc', { defaultValue: 'AI-based fixed-price budget guidance' }), enabled: true },
                      { label: t('settings.aiAutoApplyTitle', { defaultValue: 'Auto-apply to high matches' }), desc: t('settings.aiAutoApplyDesc', { defaultValue: 'Automatically apply to 90%+ match jobs' }), enabled: false },
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
                  <h2 className="text-primary font-semibold mb-4">{t('settings.aiProfileOptimizer')}</h2>
                  <p className="text-sm mb-4 text-secondary">
                    {t('settings.aiOptimizerDesc')}
                  </p>
                  <button onClick={handleAIOptimize} disabled={isOptimizing}
                    className="btn-purple px-6 py-3 text-sm flex items-center gap-2">
                    {isOptimizing ? (
                      <><div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />{t('settings.aiOptimizerAnalyzing')}</>
                    ) : (
                      <><Bot size={16} />{t('settings.aiOptimizerRun')}</>
                    )}
                  </button>
                  {optimizeSuccess && (
                    <p className="text-sm mt-3 text-green">{t('settings.aiOptimizerSuccessMessage')}</p>
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
