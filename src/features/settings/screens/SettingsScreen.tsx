import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { CreditCard, Globe, Lock, User } from 'lucide-react';
import { Link } from 'react-router';
import { AppLayout } from '../../../shared/components/AppLayout';
import { LanguageSwitcher } from '../../../shared/components/LanguageSwitcher';
import { useApp } from '../../../app/providers/AppProvider';
import { useTranslation } from '../../../hooks/useTranslation';
import { UserRole } from '../../../types/models/User';
import { CompanySize } from '../../../types/models/Profile';
import { profileGetAPI } from '../../../api/profileAPI/GET';
import { profilePutAPI } from '../../../api/profileAPI/PUT';
import { authPostAPI } from '../../../api/authAPI/POST';
import BankAccountManager from '../../wallet/components/BankAccountManager';

type SettingsTab = 'profile' | 'security' | 'payment' | 'preferences';

interface ProfileForm {
  name: string;
  email: string;
  location: string;
  title: string;
  bio: string;
  availability: number;
  majorId: string;
  categoryIds: string[];
  companyName: string;
  companyWebsite: string;
  companySize: CompanySize;
  industry: string;
  companyDescription: string;
}

const initialProfileForm = (name = '', email = ''): ProfileForm => ({
  name,
  email,
  location: '',
  title: '',
  bio: '',
  availability: 0,
  majorId: '',
  categoryIds: [],
  companyName: '',
  companyWebsite: '',
  companySize: CompanySize.Solo,
  industry: '',
  companyDescription: '',
});

const messageFromError = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function SettingsScreen() {
  const { user, role } = useApp();
  const { t } = useTranslation();
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [formData, setFormData] = useState<ProfileForm>(() =>
    initialProfileForm(user?.full_name, user?.email),
  );
  const [availabilityStatuses, setAvailabilityStatuses] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!user || role === UserRole.Admin) {
        setFormData(initialProfileForm(user?.full_name, user?.email));
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        if (role === UserRole.Freelancer) {
          const [profileResponse, availabilityResponse] = await Promise.all([
            profileGetAPI.getMyFreelancerProfile(),
            profileGetAPI.getAvailabilityStatuses(),
          ]);
          if (cancelled) return;

          if (availabilityResponse.success && availabilityResponse.data) {
            setAvailabilityStatuses(availabilityResponse.data);
          }

          if (!profileResponse.success || !profileResponse.data) {
            setErrorMessage(profileResponse.message || 'Freelancer profile could not be loaded.');
            return;
          }

          const profile = profileResponse.data;
          setFormData({
            ...initialProfileForm(user.full_name, user.email),
            location: profile.location ?? '',
            title: profile.title ?? '',
            bio: profile.bio ?? '',
            availability: profile.availability ?? 0,
            majorId: profile.majorId ?? '',
            categoryIds: profile.categories.map(category => category.categoryId),
          });
          return;
        }

        const profileResponse = await profileGetAPI.getMyClientProfile();
        if (cancelled) return;
        if (!profileResponse.success || !profileResponse.data) {
          setErrorMessage(profileResponse.message || 'Client profile could not be loaded.');
          return;
        }

        const profile = profileResponse.data;
        setFormData({
          ...initialProfileForm(user.full_name, user.email),
          location: profile.location ?? '',
          companyName: profile.companyName ?? '',
          companyWebsite: profile.companyWebsite ?? '',
          companySize: profile.companySize ?? CompanySize.Solo,
          industry: profile.industry ?? '',
          companyDescription: profile.companyDescription ?? '',
        });
      } catch (error: unknown) {
        if (!cancelled) {
          setErrorMessage(messageFromError(error, 'Profile settings could not be loaded.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [role, user]);

  const handleSave = async () => {
    setSaved(false);
    setErrorMessage(null);
    setSaving(true);

    try {
      if (role === UserRole.Freelancer) {
        if (!formData.majorId) {
          setErrorMessage('Choose a major in Edit Profile before saving these settings.');
          return;
        }

        const response = await profilePutAPI.updateFreelancerProfile({
          title: formData.title,
          bio: formData.bio,
          availability: formData.availability,
          location: formData.location,
          majorId: formData.majorId,
          categoryIds: formData.categoryIds,
        });
        if (!response.success) {
          setErrorMessage(response.message || t('profile.errors.charLimit'));
          return;
        }
      } else if (role === UserRole.Client) {
        const response = await profilePutAPI.updateClientProfile({
          companyName: formData.companyName,
          companyWebsite: formData.companyWebsite,
          companySize: formData.companySize,
          industry: formData.industry,
          companyDescription: formData.companyDescription,
          location: formData.location,
        });
        if (!response.success) {
          setErrorMessage(response.message || t('profile.errors.charLimit'));
          return;
        }
      }

      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (error: unknown) {
      setErrorMessage(messageFromError(error, t('common.error')));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      const response = await authPostAPI.changePassword({ currentPassword, newPassword });
      if (!response.success) {
        const validationMessage = response.errors && typeof response.errors === 'object'
          ? Object.values(response.errors).flat().join(', ')
          : '';
        setPasswordError(validationMessage || response.message || t('settings.passwordErrorUpdate'));
        return;
      }

      setPasswordSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error: unknown) {
      setPasswordError(messageFromError(error, t('settings.passwordErrorUpdate')));
    } finally {
      setPasswordLoading(false);
    }
  };

  const tabs: Array<{ id: SettingsTab; label: string; icon: ReactNode }> = [
    { id: 'profile', label: t('settings.general'), icon: <User size={16} /> },
    { id: 'security', label: t('settings.security'), icon: <Lock size={16} /> },
    { id: 'payment', label: t('settings.payment'), icon: <CreditCard size={16} /> },
    { id: 'preferences', label: t('settings.preferences'), icon: <Globe size={16} /> },
  ];

  const initials = `${user?.first_name?.[0] ?? ''}${user?.last_name?.[0] ?? ''}`.toUpperCase() || 'GB';

  return (
    <AppLayout>
      <div className="settings-screen mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="mb-1 text-3xl font-bold tracking-tight text-foreground">{t('nav.settings')}</h1>
          <p className="text-secondary">
            {t('settings.manageSubtitle', { defaultValue: 'Manage your account preferences and profile' })}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
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

          <div className="space-y-5 md:col-span-3">
            {tab === 'profile' && (
              <>
                <section className="glass-card p-6">
                  <h2 className="mb-5 font-semibold text-primary">
                    {t('settings.profilePhoto', { defaultValue: 'Profile' })}
                  </h2>
                  <div className="flex items-center gap-5">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--gb-cyan)]/15 text-xl font-bold text-[var(--gb-cyan)]">
                      {initials}
                    </div>
                    <div>
                      <p className="font-medium text-primary">{user?.full_name}</p>
                      <p className="mt-0.5 text-sm text-secondary">{user?.email}</p>
                      {user?.is_email_verified && (
                        <span className="badge-green mt-2 inline-block text-xs">
                          {t('settings.verified', { defaultValue: 'Verified' })}
                        </span>
                      )}
                    </div>
                  </div>
                </section>

                {loading ? (
                  <div className="glass-card flex min-h-48 items-center justify-center p-6 text-sm text-secondary">
                    {t('settings.loadingSettings')}
                  </div>
                ) : (
                  <>
                    {errorMessage && <div className="alert-red text-sm">{errorMessage}</div>}
                    <section className="glass-card space-y-5 p-6">
                      <h2 className="font-semibold text-primary">{t('settings.basicInfo')}</h2>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label className="text-xs font-medium text-primary">
                          {t('settings.fullName')}
                          <input value={formData.name} readOnly disabled className="input-gb mt-2 w-full px-4 py-3 text-sm opacity-60" />
                        </label>
                        <label className="text-xs font-medium text-primary">
                          {t('settings.emailAddress')}
                          <input value={formData.email} readOnly disabled className="input-gb mt-2 w-full px-4 py-3 text-sm opacity-60" />
                        </label>
                        <label className="text-xs font-medium text-primary">
                          {t('settings.location')}
                          <input
                            value={formData.location}
                            onChange={event => setFormData(previous => ({ ...previous, location: event.target.value }))}
                            className="input-gb mt-2 w-full px-4 py-3 text-sm"
                          />
                        </label>

                        {role === UserRole.Freelancer && (
                          <>
                            <label className="text-xs font-medium text-primary">
                              {t('settings.professionalTitle')}
                              <input
                                value={formData.title}
                                onChange={event => setFormData(previous => ({ ...previous, title: event.target.value }))}
                                className="input-gb mt-2 w-full px-4 py-3 text-sm"
                              />
                            </label>
                            <label className="text-xs font-medium text-primary">
                              {t('settings.availability')}
                              <select
                                value={formData.availability}
                                onChange={event => setFormData(previous => ({ ...previous, availability: Number(event.target.value) }))}
                                className="input-gb mt-2 w-full px-4 py-3 text-sm"
                              >
                                {availabilityStatuses.map(status => (
                                  <option key={status.id} value={status.id}>{status.name}</option>
                                ))}
                              </select>
                            </label>
                          </>
                        )}

                        {role === UserRole.Client && (
                          <>
                            <label className="text-xs font-medium text-primary">
                              {t('profile.companyName')}
                              <input
                                value={formData.companyName}
                                onChange={event => setFormData(previous => ({ ...previous, companyName: event.target.value }))}
                                className="input-gb mt-2 w-full px-4 py-3 text-sm"
                              />
                            </label>
                            <label className="text-xs font-medium text-primary">
                              {t('profile.websiteUrl')}
                              <input
                                type="url"
                                value={formData.companyWebsite}
                                onChange={event => setFormData(previous => ({ ...previous, companyWebsite: event.target.value }))}
                                className="input-gb mt-2 w-full px-4 py-3 text-sm"
                              />
                            </label>
                            <label className="text-xs font-medium text-primary">
                              {t('profile.industry')}
                              <input
                                value={formData.industry}
                                onChange={event => setFormData(previous => ({ ...previous, industry: event.target.value }))}
                                className="input-gb mt-2 w-full px-4 py-3 text-sm"
                              />
                            </label>
                            <label className="text-xs font-medium text-primary">
                              {t('settings.companySize', { defaultValue: 'Company size' })}
                              <select
                                value={formData.companySize}
                                onChange={event => setFormData(previous => ({
                                  ...previous,
                                  companySize: Number(event.target.value) as CompanySize,
                                }))}
                                className="input-gb mt-2 w-full px-4 py-3 text-sm"
                              >
                                <option value={CompanySize.Solo}>Solo</option>
                                <option value={CompanySize.Small}>Small</option>
                                <option value={CompanySize.Medium}>Medium</option>
                                <option value={CompanySize.Large}>Large</option>
                              </select>
                            </label>
                          </>
                        )}
                      </div>

                      {role === UserRole.Freelancer && (
                        <label className="block text-xs font-medium text-primary">
                          {t('settings.professionalBio')}
                          <textarea
                            value={formData.bio}
                            onChange={event => setFormData(previous => ({ ...previous, bio: event.target.value }))}
                            rows={5}
                            className="input-gb mt-2 w-full resize-none px-4 py-3 text-sm"
                          />
                        </label>
                      )}

                      {role === UserRole.Client && (
                        <label className="block text-xs font-medium text-primary">
                          {t('settings.companyDescription')}
                          <textarea
                            value={formData.companyDescription}
                            onChange={event => setFormData(previous => ({ ...previous, companyDescription: event.target.value }))}
                            rows={5}
                            className="input-gb mt-2 w-full resize-none px-4 py-3 text-sm"
                          />
                        </label>
                      )}

                      <button type="button" onClick={handleSave} disabled={saving || role === UserRole.Admin} className="btn-cyan px-8 py-3 text-sm disabled:opacity-60">
                        {saving ? t('settings.updating') : saved ? t('settings.saved') : t('settings.saveChanges')}
                      </button>
                    </section>
                  </>
                )}
              </>
            )}

            {tab === 'security' && (
              <section className="glass-card p-6">
                <h2 className="mb-6 font-semibold text-primary">{t('settings.securityDesc')}</h2>
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  {passwordError && <div className="alert-red text-sm">{passwordError}</div>}
                  {passwordSuccess && <div className="alert-green text-sm">{t('settings.passwordSuccess')}</div>}
                  {[
                    { label: t('settings.currentPassword'), value: currentPassword, setter: setCurrentPassword },
                    { label: t('settings.newPassword'), value: newPassword, setter: setNewPassword },
                    { label: t('settings.confirmNewPassword'), value: confirmNewPassword, setter: setConfirmNewPassword },
                  ].map(field => (
                    <label key={field.label} className="block text-xs font-medium text-primary">
                      {field.label}
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={field.value}
                        onChange={event => field.setter(event.target.value)}
                        required
                        className="input-gb mt-2 w-full px-4 py-3 text-sm"
                      />
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-sm text-secondary">
                    <input type="checkbox" checked={showPassword} onChange={event => setShowPassword(event.target.checked)} />
                    {t('settings.showPassword', { defaultValue: 'Show password' })}
                  </label>
                  <button type="submit" disabled={passwordLoading} className="btn-cyan px-6 py-3 text-sm disabled:opacity-60">
                    {passwordLoading ? t('settings.updating') : t('settings.updatePassword')}
                  </button>
                </form>
              </section>
            )}

            {tab === 'payment' && (
              <div className="space-y-5">
                <section className="glass-card space-y-5 p-6">
                  <div className="flex items-center gap-3">
                    <CreditCard size={18} className="text-[var(--gb-cyan)]" />
                    <div>
                      <h2 className="font-semibold text-primary">{t('settings.payment')}</h2>
                      <p className="mt-1 text-sm text-secondary">
                        Payment accounts and transactions are managed by the secured Wallet flows.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link to="/wallet/deposit" className="btn-cyan px-4 py-2 text-sm">Deposit</Link>
                    <Link to="/wallet/withdrawals" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">Withdrawal accounts</Link>
                    <Link to="/wallet/history" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">Transaction history</Link>
                  </div>
                </section>

                {role === UserRole.Freelancer && (
                  <section className="glass-card space-y-4 p-6">
                    <div>
                      <h2 className="font-semibold text-primary">{t('settings.payoutAccounts')}</h2>
                      <p className="mt-1 text-sm text-secondary">{t('settings.payoutAccountsDesc')}</p>
                    </div>
                    <BankAccountManager />
                    <div className="flex flex-wrap gap-3">
                      <Link to="/wallet/withdrawals" className="btn-cyan px-4 py-2 text-sm">{t('settings.goToWithdrawals')}</Link>
                    </div>
                  </section>
                )}

                {role !== UserRole.Freelancer && (
                  <section className="glass-card p-6">
                    <p className="text-sm text-secondary">{t('settings.payoutAccountsFreelancerOnly')}</p>
                  </section>
                )}
              </div>
            )}

            {tab === 'preferences' && (
              <section className="glass-card p-6">
                <h2 className="mb-5 font-semibold text-primary">{t('settings.language')}</h2>
                <label className="block text-sm text-secondary">
                  {t('settings.selectLanguage')}
                  <div className="mt-2 max-w-xs">
                    <LanguageSwitcher variant="select" />
                  </div>
                </label>
                <p className="mt-4 text-xs text-secondary">
                  {t('settings.languageHelpDesc', { defaultValue: 'Changes apply immediately across the application.' })}
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
