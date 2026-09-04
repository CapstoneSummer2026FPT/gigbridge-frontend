import { useRef, useState } from 'react';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import { authAPI } from '../../api/authAPI';
import { useTranslation } from '../../hooks/useTranslation';
import { isValidationResponse, showValidationToast } from '../utils/validationToast';

interface IdentityEmailVerificationProps {
  email: string;
  identityCode: string;
  verificationTicket: string | null;
  onVerified: (ticket: string | null) => void;
}

const normalizeIdentityCode = (value: string): string => value.replace(/\s+/g, '');

export function IdentityEmailVerification({
  email,
  identityCode,
  verificationTicket,
  onVerified,
}: IdentityEmailVerificationProps) {
  const { t } = useTranslation();
  const [otp, setOtp] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const normalizedIdentityCode = normalizeIdentityCode(identityCode);
  const identityIsValid = /^(?:\d{9}|\d{12})$/.test(normalizedIdentityCode);

  const sendCode = async () => {
    const validationMessages: string[] = [];
    if (!identityIsValid) validationMessages.push(t('settings:identityCodeInvalid'));
    if (!email) validationMessages.push(t('validation.emailInvalid'));
    if (validationMessages.length > 0) {
      showValidationToast(validationMessages, { fallback: t('validation.invalidFormat') });
      return;
    }
    setSending(true);
    setError(null);
    setMessage(null);
    const response = await authAPI.sendOtp({
      email,
      purpose: 'identity_verification',
    });
    setSending(false);
    if (!response.success) {
      const fallback = response.message || t('settings:identityVerificationSendError');
      if (isValidationResponse(response)) showValidationToast(response, { fallback });
      else setError(fallback);
      return;
    }
    setCodeSent(true);
    setMessage(t('settings:identityVerificationSent', { email }));
  };

  const verifyCode = async () => {
    const validationMessages: string[] = [];
    if (!identityIsValid) validationMessages.push(t('settings:identityCodeInvalid'));
    if (!/^\d{6}$/.test(otp)) validationMessages.push(t('settings:identityVerificationInvalid'));
    if (validationMessages.length > 0) {
      showValidationToast(validationMessages, { fallback: t('validation.invalidFormat') });
      otpInputRef.current?.focus();
      return;
    }
    setVerifying(true);
    setError(null);
    const response = await authAPI.verifyOtp({
      email,
      otp,
      purpose: 'identity_verification',
      identityOrTaxCode: normalizedIdentityCode,
    });
    setVerifying(false);
    const ticket = response.data?.verificationTicket;
    if (!response.success || !ticket) {
      const fallback = response.message || t('settings:identityVerificationInvalid');
      if (isValidationResponse(response)) showValidationToast(response, { fallback });
      else setError(fallback);
      return;
    }
    onVerified(ticket);
    setMessage(t('settings:identityVerificationSuccess'));
  };

  if (verificationTicket) {
    return (
      <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600" role="status">
        <CheckCircle2 size={15} /> {t('settings:identityVerificationSuccess')}
      </p>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-[var(--border,#e5e7eb)] bg-[var(--surface-muted,#f8fafc)] p-3">
      <p className="mb-2 text-xs text-secondary">{t('settings:identityVerificationRequired')}</p>
      <div className="flex flex-wrap gap-2">
        {codeSent && (
          <input
            ref={otpInputRef}
            value={otp}
            onChange={event => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-label={t('settings:identityVerificationOtp')}
            placeholder={t('settings:identityVerificationOtp')}
            className="min-w-36 flex-1 rounded-lg border border-[var(--border,#d1d5db)] bg-background px-3 py-2 text-sm"
          />
        )}
        <button
          type="button"
          onClick={() => void (codeSent ? verifyCode() : sendCode())}
          disabled={sending || verifying}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--brand,#494be7)] px-3 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending || verifying ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
          {codeSent ? t('settings:identityVerificationConfirm') : t('settings:identityVerificationSend')}
        </button>
        {codeSent && (
          <button
            type="button"
            onClick={() => void sendCode()}
            disabled={sending || verifying}
            className="px-2 py-2 text-xs font-semibold text-[var(--brand,#494be7)] disabled:opacity-50"
          >
            {t('settings:identityVerificationResend')}
          </button>
        )}
      </div>
      {message && <p className="mt-2 text-[11px] text-secondary" role="status">{message}</p>}
      {error && <p className="mt-2 text-[11px] text-red-600" role="alert">{error}</p>}
    </div>
  );
}
