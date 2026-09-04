import { useRef, useState } from 'react';
import { X } from 'lucide-react';
import { adminPostAPI } from '../../../api/adminAPI/POST';
import { useTranslation } from '../../../hooks/useTranslation';
import { EloAdjustmentMode } from '../../../types/elo';
import { isValidationResponse, showValidationToast } from '../../../shared/utils/validationToast';
import '../styles/admin-elo-screen.css';

export interface AdminEloAdjustmentTarget {
  userId: string;
  fullName: string;
}

interface AdminEloAdjustmentModalProps {
  target: AdminEloAdjustmentTarget | null;
  onClose: () => void;
  onApplied: () => void;
}

/**
 * Modal used to apply a manual Elo increase/decrease to a user (FixedPoints or
 * Percentage). Sends an idempotency requestId so a retry never double-applies.
 */
export function AdminEloAdjustmentModal({ target, onClose, onApplied }: AdminEloAdjustmentModalProps) {
  const { t } = useTranslation();
  const [increase, setIncrease] = useState(true);
  const [mode, setMode] = useState<EloAdjustmentMode>(EloAdjustmentMode.FixedPoints);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const amountRef = useRef<HTMLInputElement>(null);

  if (!target) return null;

  const submit = async () => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showValidationToast(t('adminElo.adjustInvalidAmount'), { fallback: t('adminElo.adjustInvalidAmount') });
      amountRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setError('');
    const response = await adminPostAPI.applyAdminEloAdjustment({
      userId: target.userId,
      increase,
      mode,
      amount: numericAmount,
      reason: reason.trim() || null,
      requestId: crypto.randomUUID(),
    });
    setSubmitting(false);
    if (!response.success) {
      if (isValidationResponse(response)) {
        showValidationToast(response, { fallback: response.message || t('adminElo.adjustError') });
        amountRef.current?.focus();
        return;
      }
      setError(response.message || t('adminElo.adjustError'));
      return;
    }
    if (!response.data) {
      setError(t('adminElo.adjustNoChange'));
      return;
    }
    onApplied();
    onClose();
  };

  const handleBackdrop = () => { if (!submitting) onClose(); };

  return (
    <div className="admin-elo-overlay" onMouseDown={handleBackdrop}>
      <section className="admin-elo-modal" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true">
        <div className="admin-elo-modal-header">
          <div>
            <h2>{t('adminElo.adjustTitle')}</h2>
            <p>{t('adminElo.adjustHelp')}</p>
          </div>
          <button type="button" className="admin-elo-modal-close" aria-label={t('adminElo.close')} onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        <div className="admin-elo-user-mini">
          <strong>{target.fullName}</strong>
          <span>{target.userId}</span>
        </div>

        <label>
          {t('adminElo.adjustTypeIncrease')} / {t('adminElo.adjustTypeDecrease')}
          <div className="admin-elo-segmented">
            <button type="button" className={increase ? 'active' : ''} onClick={() => setIncrease(true)}>
              {t('adminElo.adjustTypeIncrease')}
            </button>
            <button type="button" className={!increase ? 'active' : ''} onClick={() => setIncrease(false)}>
              {t('adminElo.adjustTypeDecrease')}
            </button>
          </div>
        </label>

        <label>
          {t('adminElo.adjustMode')}
          <select value={mode} onChange={event => setMode(Number(event.target.value) as EloAdjustmentMode)}>
            <option value={EloAdjustmentMode.FixedPoints}>{t('adminElo.modeFixed')}</option>
            <option value={EloAdjustmentMode.Percentage}>{t('adminElo.modePercentage')}</option>
          </select>
        </label>

        <label>
          {t('adminElo.adjustAmount')}
          <input
            ref={amountRef}
            type="number"
            min="0"
            step="any"
            value={amount}
            disabled={submitting}
            aria-invalid={Boolean(error && !Number.isFinite(Number(amount)) || Number(amount) <= 0)}
            onChange={event => setAmount(event.target.value)}
          />
        </label>

        <label>
          {t('adminElo.adjustReason')}
          <textarea
            maxLength={500}
            value={reason}
            disabled={submitting}
            placeholder={t('adminElo.adjustReasonPlaceholder')}
            onChange={event => setReason(event.target.value)}
          />
          <small className="admin-elo-help">{t('adminElo.adjustReasonHelp')}</small>
        </label>

        {error && <div className="admin-elo-error">{error}</div>}

        <div className="admin-elo-modal-actions">
          <button type="button" disabled={submitting} onClick={onClose}>
            {t('adminElo.cancel')}
          </button>
          <button type="button" className="primary" disabled={submitting} onClick={() => void submit()}>
            {submitting ? t('adminElo.adjustSubmitting') : t('adminElo.adjustSubmit')}
          </button>
        </div>
      </section>
    </div>
  );
}
