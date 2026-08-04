import { useState, type FormEvent } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import { authPostAPI } from '../../../api/authAPI/POST';

const messageFromError = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function SecurityTab() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

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

  return (
    <section className="glass-card p-6">
      <h2 className="mb-5 font-semibold text-primary">{t('settings.changePassword')}</h2>

      {passwordSuccess && (
        <div className="alert-green mb-4 text-sm">{t('settings.passwordSuccess')}</div>
      )}
      {passwordError && (
        <div className="alert-red mb-4 text-sm">{passwordError}</div>
      )}

      <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-xl">
        <div className="settings-form-group">
          <label className="settings-form-label">{t('settings.currentPassword')}</label>
          <div className="settings-input-wrapper">
            <Lock size={16} className="settings-input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={event => setCurrentPassword(event.target.value)}
              className="settings-form-input pr-10"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(previous => !previous)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="settings-form-group">
          <label className="settings-form-label">{t('settings.newPassword')}</label>
          <div className="settings-input-wrapper">
            <Lock size={16} className="settings-input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={event => setNewPassword(event.target.value)}
              className="settings-form-input"
              required
            />
          </div>
        </div>

        <div className="settings-form-group">
          <label className="settings-form-label">{t('settings.confirmNewPassword')}</label>
          <div className="settings-input-wrapper">
            <Lock size={16} className="settings-input-icon" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmNewPassword}
              onChange={event => setConfirmNewPassword(event.target.value)}
              className="settings-form-input"
              required
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={passwordLoading}
            className="btn-gb-primary px-6 py-2.5 text-sm font-medium"
          >
            {passwordLoading ? t('settings.updatingPassword') : t('settings.updatePassword')}
          </button>
        </div>
      </form>
    </section>
  );
}
