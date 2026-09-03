import React, { useMemo } from 'react';
import { Check, ShieldCheck } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';

export interface PasswordRequirementsChecklistProps {
  password: string;
  className?: string;
  showMeter?: boolean;
}

export interface PasswordCriterion {
  key: 'length' | 'uppercase' | 'lowercase' | 'number' | 'specialChar';
  label: string;
  met: boolean;
}

export function checkPasswordRequirements(password: string) {
  const hasMinLength = password.length >= 8 && !/\s/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[^a-zA-Z0-9]/.test(password);

  const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
  const metCount = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecialChar].filter(Boolean).length;

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    isValid,
    metCount,
  };
}

export function PasswordRequirementsChecklist({
  password,
  className = '',
  showMeter = true,
}: PasswordRequirementsChecklistProps) {
  const { t } = useTranslation();

  const {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    isValid,
    metCount,
  } = useMemo(() => checkPasswordRequirements(password), [password]);

  const criteria: PasswordCriterion[] = useMemo(
    () => [
      {
        key: 'length',
        label: t('auth.passwordRequirements.length', { defaultValue: 'At least 8 characters' }),
        met: hasMinLength,
      },
      {
        key: 'uppercase',
        label: t('auth.passwordRequirements.uppercase', { defaultValue: 'One uppercase letter (A-Z)' }),
        met: hasUppercase,
      },
      {
        key: 'lowercase',
        label: t('auth.passwordRequirements.lowercase', { defaultValue: 'One lowercase letter (a-z)' }),
        met: hasLowercase,
      },
      {
        key: 'number',
        label: t('auth.passwordRequirements.number', { defaultValue: 'One number (0-9)' }),
        met: hasNumber,
      },
      {
        key: 'specialChar',
        label: t('auth.passwordRequirements.specialChar', { defaultValue: 'One special character (!@#$...)' }),
        met: hasSpecialChar,
      },
    ],
    [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecialChar, t]
  );

  const strengthColor = useMemo(() => {
    if (metCount <= 2) return 'bg-rose-500';
    if (metCount <= 4) return 'bg-amber-500';
    return 'bg-emerald-500';
  }, [metCount]);

  const strengthLabel = useMemo(() => {
    if (metCount <= 2) return t('auth.passwordRequirements.strengthWeak', { defaultValue: 'Weak' });
    if (metCount <= 4) return t('auth.passwordRequirements.strengthMedium', { defaultValue: 'Medium' });
    return t('auth.passwordRequirements.strengthStrong', { defaultValue: 'Strong' });
  }, [metCount, t]);

  const strengthTextColor = useMemo(() => {
    if (metCount <= 2) return 'text-rose-500 dark:text-rose-400';
    if (metCount <= 4) return 'text-amber-500 dark:text-amber-400';
    return 'text-emerald-500 dark:text-emerald-400';
  }, [metCount]);

  return (
    <div
      className={`rounded-2xl p-3.5 border transition-all duration-300 bg-[var(--gb-bg-secondary)] border-[var(--gb-border)] ${
        isValid
          ? 'border-emerald-500/40 bg-emerald-500/5 shadow-xs shadow-emerald-500/5'
          : 'shadow-xs'
      } ${className}`}
      aria-live="polite"
    >
      {/* Header & Mini Strength Meter */}
      {showMeter && (
        <div className="mb-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[var(--gb-text-primary)] flex items-center gap-1.5">
              <ShieldCheck
                size={14}
                className={isValid ? 'text-emerald-500' : 'text-[var(--gb-cyan,#0077ff)]'}
              />
              {t('auth.passwordRequirements.title', { defaultValue: 'Password requirements' })}
            </span>
            {password.length > 0 && (
              <span className={`text-[11px] font-bold ${strengthTextColor}`}>
                {strengthLabel} ({metCount}/5)
              </span>
            )}
          </div>

          {/* 5-segment Strength Bar */}
          <div className="grid grid-cols-5 gap-1.5 w-full h-1.5">
            {[1, 2, 3, 4, 5].map(step => {
              const isFilled = password.length > 0 && metCount >= step;
              return (
                <div
                  key={step}
                  className={`h-full rounded-full transition-all duration-300 ${
                    isFilled ? strengthColor : 'bg-[var(--gb-border,#e4e4e7)] dark:bg-white/10'
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Checklist grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
        {criteria.map(item => (
          <div
            key={item.key}
            className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
              item.met
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-[var(--gb-text-muted,#71717a)]'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                item.met
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 scale-105'
                  : 'bg-[var(--gb-bg-tertiary,rgba(0,0,0,0.05))] dark:bg-white/5 text-[var(--gb-text-muted,#a1a1aa)]'
              }`}
            >
              {item.met ? (
                <Check size={10} className="stroke-[3]" />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
              )}
            </div>
            <span className="truncate leading-none select-none">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
