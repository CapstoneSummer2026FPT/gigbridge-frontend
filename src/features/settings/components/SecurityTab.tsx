import { useRef, useState, type FormEvent } from 'react';
import { Lock, Eye, EyeOff, RefreshCw, ShieldCheck, KeyRound, CheckCircle, AlertTriangle } from 'lucide-react';
import { useGSAP } from '@gsap/react';
import { gsap } from 'gsap';
import { useTranslation } from '../../../hooks/useTranslation';
import { authPostAPI } from '../../../api/authAPI/POST';
import { isValidationResponse, showValidationToast } from '../../../shared/utils/validationToast';

const messageFromError = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export function SecurityTab() {
  const { t } = useTranslation();
  const cardRef = useRef<HTMLDivElement>(null);
  const strengthBarRef = useRef<HTMLDivElement>(null);
  const currentPasswordRef = useRef<HTMLInputElement>(null);
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // GSAP Entrance Animation for Bento Grid Items
  useGSAP(
    () => {
      if (cardRef.current) {
        gsap.fromTo(
          '.security-bento-card',
          { opacity: 0, y: 20, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 0.45, stagger: 0.1, ease: 'power3.out' }
        );
      }
    },
    { scope: cardRef }
  );

  // Calculate Password Strength Score (0 to 100%)
  const calculateStrength = (pwd: string) => {
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 6) score += 25;
    if (pwd.length >= 10) score += 25;
    if (/[A-Z]/.test(pwd)) score += 20;
    if (/[0-9]/.test(pwd)) score += 15;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 15;
    return score;
  };

  const strength = calculateStrength(newPassword);

  const getStrengthLabel = (score: number) => {
    if (score === 0) return { label: '', color: 'bg-gray-200' };
    if (score < 40) return { label: 'Weak', color: 'bg-red-500' };
    if (score < 75) return { label: 'Medium', color: 'bg-amber-500' };
    return { label: 'Strong', color: 'bg-emerald-500' };
  };

  const strengthInfo = getStrengthLabel(strength);

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    const validationMessages: string[] = [];
    if (!currentPassword || !newPassword || !confirmNewPassword) {
      validationMessages.push(t('settings.passwordErrorRequired'));
    }
    if (newPassword && confirmNewPassword && newPassword !== confirmNewPassword) {
      validationMessages.push(t('settings.passwordErrorMatch'));
    }
    if (validationMessages.length > 0) {
      showValidationToast(validationMessages, { fallback: t('validation.invalidFormat') });
      if (!currentPassword) currentPasswordRef.current?.focus();
      else if (!newPassword) newPasswordRef.current?.focus();
      else confirmPasswordRef.current?.focus();
      return;
    }

    setPasswordLoading(true);
    try {
      const response = await authPostAPI.changePassword({ currentPassword, newPassword });
      if (!response.success) {
        const validationMessage = response.errors && typeof response.errors === 'object'
          ? Object.values(response.errors).flat().join(', ')
          : '';
        const message = validationMessage || response.message || t('settings.passwordErrorUpdate');
        if (isValidationResponse(response)) {
          showValidationToast(response.errors ? response : message, { fallback: message });
        } else {
          setPasswordError(message);
        }
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
    <div ref={cardRef} className="space-y-6">
      {/* Bento Grid Container */}
      <div className="settings-bento-grid">
        {/* Bento Card 1: Hero Header Card */}
        <div className="settings-bento-card security-bento-card settings-bento-col-12 bg-gradient-to-r from-[var(--brand-soft,rgba(73,75,231,0.08))] to-[var(--surface,#ffffff)] border border-[var(--brand-border,rgba(73,75,231,0.25))]">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold text-[var(--brand,#494be7)] bg-[var(--brand-soft,rgba(73,75,231,0.12))]">
                <ShieldCheck size={14} />
                <span>Account Protection</span>
              </div>
              <h2 className="text-xl font-extrabold text-primary pt-1">
                {t('settings.changePassword')}
              </h2>
              <p className="text-xs text-secondary">
                {t('settings.securityDesc')}
              </p>
            </div>
            <div className="hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand,#494be7)] text-white shadow-lg shadow-[var(--brand-soft)]">
              <Lock size={24} />
            </div>
          </div>
        </div>

        {/* Bento Card 2: Password Form Box (Col-12 Full Width) */}
        <div className="settings-bento-card security-bento-card settings-bento-col-12 space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-[var(--border,#ededf0)]">
            <KeyRound size={18} className="text-[var(--brand,#494be7)]" />
            <h3 className="font-bold text-sm text-primary">{t('settings.changePassword')}</h3>
          </div>

          {passwordSuccess && (
            <div className="alert-green text-xs p-3.5 rounded-2xl flex items-center gap-2 font-semibold shadow-xs">
              <CheckCircle size={16} />
              <span>{t('settings.passwordSuccess')}</span>
            </div>
          )}

          {passwordError && (
            <div className="alert-red text-xs p-3.5 rounded-2xl flex items-center gap-2 font-semibold shadow-xs">
              <AlertTriangle size={16} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-2xl" noValidate>
            {/* Current Password */}
            <div className="settings-form-group">
              <label className="settings-form-label">{t('settings.currentPassword')}</label>
              <div className="settings-input-wrapper">
                <Lock size={16} className="settings-input-icon" />
                <input
                  ref={currentPasswordRef}
                  type={showPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={event => setCurrentPassword(event.target.value)}
                  className="settings-form-input pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(previous => !previous)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="settings-form-group">
              <label className="settings-form-label">{t('settings.newPassword')}</label>
              <div className="settings-input-wrapper">
                <Lock size={16} className="settings-input-icon" />
                <input
                  ref={newPasswordRef}
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={event => setNewPassword(event.target.value)}
                  className="settings-form-input pr-10"
                  required
                />
              </div>

              {/* Password Strength Meter */}
              {newPassword && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-secondary">Password Strength:</span>
                    <span className={`font-extrabold ${strength < 40 ? 'text-red-500' : strength < 75 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {strengthInfo.label}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--surface-muted,#f1f1f3)] rounded-full overflow-hidden">
                    <div
                      ref={strengthBarRef}
                      className={`h-full transition-all duration-300 ${strengthInfo.color}`}
                      style={{ width: `${strength}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm New Password */}
            <div className="settings-form-group">
              <label className="settings-form-label">{t('settings.confirmNewPassword')}</label>
              <div className="settings-input-wrapper">
                <Lock size={16} className="settings-input-icon" />
                <input
                  ref={confirmPasswordRef}
                  type={showPassword ? 'text' : 'password'}
                  value={confirmNewPassword}
                  onChange={event => setConfirmNewPassword(event.target.value)}
                  className="settings-form-input"
                  required
                />
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={passwordLoading}
                className="settings-submit-btn font-bold text-xs py-2.5 px-6"
              >
                {passwordLoading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>{t('settings.updatingPassword')}</span>
                  </>
                ) : (
                  <span>{t('settings.updatePassword')}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
