import { AlertCircle, FileText, Loader2, ShieldAlert, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import type { EscalateReportToDisputeInput } from '../../../types/models/Dispute';
import { DisputeUrgency } from '../../../types/models/Dispute';
import {
  ContractReportIssueType,
  type ReportContract,
} from '../../../types/models/ReportContract';
import { DisputeEvidenceFilePicker } from '../../disputes/components/DisputeEvidenceFilePicker';

const ISSUE_KEYS: Record<number, string> = {
  [ContractReportIssueType.PaymentIssue]: 'workspace.reportIssueTypePaymentIssue',
  [ContractReportIssueType.MilestoneIssue]: 'workspace.reportIssueTypeMilestoneIssue',
  [ContractReportIssueType.Delay]: 'workspace.reportIssueTypeDelay',
  [ContractReportIssueType.PoorQuality]: 'workspace.reportIssueTypePoorQuality',
  [ContractReportIssueType.CommunicationProblem]: 'workspace.reportIssueTypeCommunicationProblem',
  [ContractReportIssueType.ScopeChange]: 'workspace.reportIssueTypeScopeChange',
  [ContractReportIssueType.Other]: 'workspace.reportIssueTypeOther',
};

interface DisputeCreationModalProps {
  isOpen: boolean;
  report: ReportContract;
  contractTitle: string;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (input: EscalateReportToDisputeInput) => Promise<{
    success: boolean;
    message?: string;
    disputeId?: string;
  }>;
  onCreated: (disputeId: string) => void;
}

export function DisputeCreationModal({
  isOpen,
  report,
  contractTitle,
  isSubmitting,
  onClose,
  onSubmit,
  onCreated,
}: DisputeCreationModalProps) {
  const { t } = useTranslation();
  const defaultTitle = `${t('workspace.disputeTitlePrefix')}: ${contractTitle}`;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [claimedAmount, setClaimedAmount] = useState('');
  const [requestedResolution, setRequestedResolution] = useState('');
  const [urgency, setUrgency] = useState('');
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTitle(defaultTitle);
    setDescription(report.description);
    setClaimedAmount('');
    setRequestedResolution(report.desiredResolution);
    setUrgency('');
    setDeclarationAccepted(false);
    setEvidenceFiles([]);
    setError(null);
  }, [defaultTitle, isOpen, report.description, report.desiredResolution, report.id]);

  if (!isOpen) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const amount = Number(claimedAmount);
    const requiresPositiveAmount = report.issueType === ContractReportIssueType.PaymentIssue ||
      report.issueType === ContractReportIssueType.MilestoneIssue;

    if (!title.trim()) return setError(t('workspace.disputeTitleRequired'));
    if (!description.trim()) return setError(t('workspace.disputeDescriptionRequired'));
    if (!claimedAmount.trim() || !Number.isFinite(amount) || amount < 0) {
      return setError(t('workspace.disputeClaimedAmountRequired'));
    }
    if (requiresPositiveAmount && amount <= 0) {
      return setError(t('workspace.disputeClaimedAmountPositive'));
    }
    if (!requestedResolution.trim()) return setError(t('workspace.disputeRequestedResolutionRequired'));
    if (urgency === '') return setError(t('workspace.disputeUrgencyRequired'));
    if (!declarationAccepted) return setError(t('workspace.disputeDeclarationRequired'));

    setError(null);
    const result = await onSubmit({
      title: title.trim(),
      description: description.trim(),
      claimedAmount: amount,
      requestedResolution: requestedResolution.trim(),
      urgency: Number(urgency) as DisputeUrgency,
      declarationAccepted,
      evidenceFiles,
    });
    if (!result.success || !result.disputeId) {
      setError(result.message || t('workspace.disputeEscalationFailed'));
      return;
    }
    onCreated(result.disputeId);
  };

  return (
    <div className="rc-escalation-backdrop" role="presentation" onClick={onClose}>
      <section
        className="rc-dispute-creation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rc-dispute-creation-title"
        onClick={event => event.stopPropagation()}
      >
        <header className="rc-dispute-creation-header">
          <div>
            <span>{t('workspace.disputeCreationKicker')}</span>
            <h3 id="rc-dispute-creation-title">{t('workspace.disputeCreationTitle')}</h3>
          </div>
          <button type="button" className="rc-icon-button" onClick={onClose} disabled={isSubmitting}>
            <X size={18} />
          </button>
        </header>

        <form className="rc-dispute-creation-form" onSubmit={submit}>
          <div className="rc-dispute-summary-grid">
            <div><span>{t('workspace.disputeContract')}</span><strong>{contractTitle}</strong></div>
            <div><span>{t('workspace.disputeRelatedReport')}</span><strong>{report.id}</strong></div>
            <div><span>{t('workspace.reportReporter')}</span><strong>{report.reporter.name}</strong></div>
            <div><span>{t('workspace.reportRespondent')}</span><strong>{report.respondent?.name ?? t('common.unknown')}</strong></div>
            <div><span>{t('workspace.reportMilestone')}</span><strong>{report.milestone?.title ?? t('workspace.reportMilestoneNone')}</strong></div>
            <div><span>{t('workspace.disputeType')}</span><strong>{t(ISSUE_KEYS[report.issueType])}</strong></div>
          </div>

          <label className="rc-field">
            <span>{t('workspace.disputeTitle')} *</span>
            <input value={title} maxLength={200} disabled={isSubmitting} onChange={event => setTitle(event.target.value)} />
          </label>
          <label className="rc-field">
            <span>{t('workspace.disputeDescription')} *</span>
            <textarea value={description} maxLength={5000} rows={5} disabled={isSubmitting} onChange={event => setDescription(event.target.value)} />
          </label>

          <div className="rc-dispute-form-grid">
            <label className="rc-field">
              <span>{t('workspace.disputeClaimedAmount')} *</span>
              <input type="number" min="0" step="0.01" value={claimedAmount} disabled={isSubmitting} onChange={event => setClaimedAmount(event.target.value)} />
            </label>
            <label className="rc-field">
              <span>{t('workspace.disputeUrgency')} *</span>
              <select value={urgency} disabled={isSubmitting} onChange={event => setUrgency(event.target.value)}>
                <option value="">{t('workspace.disputeSelectUrgency')}</option>
                <option value={DisputeUrgency.Normal}>{t('workspace.disputeUrgencyNormal')}</option>
                <option value={DisputeUrgency.High}>{t('workspace.disputeUrgencyHigh')}</option>
                <option value={DisputeUrgency.Critical}>{t('workspace.disputeUrgencyCritical')}</option>
              </select>
            </label>
          </div>

          <label className="rc-field">
            <span>{t('workspace.disputeRequestedResolution')} *</span>
            <textarea value={requestedResolution} maxLength={2000} rows={4} disabled={isSubmitting} onChange={event => setRequestedResolution(event.target.value)} />
          </label>

          {report.attachments.length > 0 && (
            <section className="rc-dispute-existing-evidence">
              <h4><FileText size={17} /> {t('workspace.disputeExistingEvidence')}</h4>
              <p>{t('workspace.disputeExistingEvidenceHint')}</p>
              {report.attachments.map(attachment => (
                <div key={attachment.reportContractAttachmentId}>
                  <FileText size={16} />
                  <span>{attachment.fileName}</span>
                  <small>{(attachment.fileSize / 1024).toFixed(1)} KB</small>
                </div>
              ))}
            </section>
          )}

          <section className="rc-dispute-additional-evidence">
            <h4>{t('workspace.disputeAdditionalEvidence')}</h4>
            <DisputeEvidenceFilePicker
              files={evidenceFiles}
              disabled={isSubmitting}
              onChange={setEvidenceFiles}
              onError={setError}
            />
          </section>

          <label className="rc-dispute-declaration">
            <input type="checkbox" checked={declarationAccepted} disabled={isSubmitting} onChange={event => setDeclarationAccepted(event.target.checked)} />
            <span>{t('workspace.disputeDeclaration')}</span>
          </label>

          {error && <div className="rc-error" role="alert"><AlertCircle size={17} /> {error}</div>}

          <div className="rc-escalation-actions">
            <button type="button" className="rc-secondary" onClick={onClose} disabled={isSubmitting}>{t('common.cancel')}</button>
            <button type="submit" className="rc-primary" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={17} className="rc-spin" /> : <ShieldAlert size={17} />}
              {isSubmitting ? t('workspace.creatingDispute') : t('workspace.submitDispute')}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
