import { AlertTriangle, Loader2, MessageSquare, ShieldAlert, X } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';

interface DisputeEscalationModalProps {
  isOpen: boolean;
  isEscalating: boolean;
  error?: string | null;
  onClose: () => void;
  onEscalate: () => void;
}

export function DisputeEscalationModal({
  isOpen,
  isEscalating,
  error,
  onClose,
  onEscalate,
}: DisputeEscalationModalProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="rc-escalation-backdrop" role="presentation" onClick={onClose}>
      <section
        className="rc-escalation-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="rc-escalation-title"
        onClick={event => event.stopPropagation()}
      >
        <button className="rc-icon-button rc-escalation-close" type="button" onClick={onClose} disabled={isEscalating}>
          <X size={18} />
        </button>
        <div className="rc-escalation-icon"><AlertTriangle size={28} /></div>
        <h3 id="rc-escalation-title">{t('workspace.disputeEscalationTitle')}</h3>
        <p>{t('workspace.disputeEscalationDescription')}</p>
        <div className="rc-escalation-warning">
          <ShieldAlert size={18} />
          <span>{t('workspace.disputeEscalationWarning')}</span>
        </div>
        {error && <div className="rc-error" role="alert">{error}</div>}
        <div className="rc-escalation-actions">
          <button type="button" className="rc-secondary" onClick={onClose} disabled={isEscalating}>
            <MessageSquare size={16} /> {t('workspace.continueNegotiation')}
          </button>
          <button type="button" className="rc-primary" onClick={onEscalate} disabled={isEscalating}>
            {isEscalating ? <Loader2 size={16} className="rc-spin" /> : <ShieldAlert size={16} />}
            {isEscalating ? t('workspace.creatingDispute') : t('workspace.createDispute')}
          </button>
        </div>
      </section>
    </div>
  );
}
