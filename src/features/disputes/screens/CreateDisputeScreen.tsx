import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertCircle, ArrowLeft, FileUp, LoaderCircle, ShieldAlert, Upload, X } from 'lucide-react';
import { disputeGetAPI, disputePostAPI } from '../../../api/disputeAPI';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { AppLayout } from '../../../shared/components/AppLayout';
import { ContractStatus, type ContractDto, type Milestone } from '../../../types/models/Contract';
import { useTranslation } from '../../../hooks/useTranslation';
import '../styles/create-dispute-screen.css';
import { useApp } from '../../../app/providers/AppProvider';
import { usePremiumStatus } from '../../premium/hooks';
import { PremiumStatusBadge } from '../../premium/components/PremiumStatusBadge';
import '../../premium/styles/premium.css';

const MAX_REASON_LENGTH = 2000;
const MAX_EVIDENCE_SIZE = 100 * 1024 * 1024;
const ELIGIBLE_STATUSES = new Set<number>([
  ContractStatus.PendingEscrow,
  ContractStatus.Active,
  ContractStatus.Completed,
]);

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const errorForStatus = (status: number, fallback: string): string => {
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to open a dispute for this contract.';
  if (status === 404) return 'The contract could not be found.';
  if (status === 409) return 'An active dispute already exists for this contract.';
  return fallback || 'Unable to complete this request. Please try again.';
};

export default function CreateDisputeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const submitLockRef = useRef(false);

  const [contract, setContract] = useState<ContractDto | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [milestoneId, setMilestoneId] = useState('');
  const [reason, setReason] = useState('');
  const [evidence, setEvidence] = useState<File | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPremiumClientDispute = role === 0 && premiumStatus.isPremium;
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!contractId) {
        setError('A valid contract ID is required.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const [contractResponse, milestonesResponse, activeResponse] = await Promise.all([
        contractGetAPI.getContractById(contractId),
        contractGetAPI.getMilestonesByContract(contractId),
        disputeGetAPI.getActiveDispute(contractId),
      ]);

      if (cancelled) return;

      if (!contractResponse.success || !contractResponse.data) {
        setError(errorForStatus(contractResponse.statusCode, contractResponse.message));
        setLoading(false);
        return;
      }

      if (!activeResponse.success) {
        setError(errorForStatus(activeResponse.statusCode, activeResponse.message));
        setLoading(false);
        return;
      }

      if (activeResponse.data) {
        navigate(
          `/contracts/${contractId}/disputes/${activeResponse.data.id}`,
          { replace: true }
        );
        return;
      }

      setContract(contractResponse.data);
      setMilestones(milestonesResponse.success ? milestonesResponse.data ?? [] : []);
      if (!milestonesResponse.success) {
        setError(errorForStatus(milestonesResponse.statusCode, milestonesResponse.message));
      }
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [contractId, navigate]);

  const selectEvidence = (file: File | null) => {
    if (!file) return;
    if (file.size <= 0) {
      setError('The selected evidence file is empty.');
      return;
    }
    if (file.size > MAX_EVIDENCE_SIZE) {
      setError('Evidence must be 100 MB or smaller.');
      return;
    }
    if (file.name.length > 500) {
      setError('Evidence filename must not exceed 500 characters.');
      return;
    }
    setEvidence(file);
    setError(null);
  };

  const removeEvidence = () => {
    setEvidence(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (submitLockRef.current || !contractId || !contract) return;

    const trimmedReason = reason.trim();
    if (!ELIGIBLE_STATUSES.has(contract.status)) {
      setError('Disputes can only be opened after signing, while pending escrow, active, or completed.');
      return;
    }
    if (!trimmedReason || trimmedReason.length > MAX_REASON_LENGTH) {
      setError(`Please describe the dispute in 1-${MAX_REASON_LENGTH} characters.`);
      return;
    }
    if (evidence && evidence.size > MAX_EVIDENCE_SIZE) {
      setError('Evidence must be 100 MB or smaller.');
      return;
    }

    submitLockRef.current = true;
    setSubmitting(true);
    setError(null);
    const response = await disputePostAPI.createDispute({
      contractId,
      reason: trimmedReason,
      milestoneId: milestoneId || null,
      evidence,
      evidenceDescription: evidenceDescription.trim() || null,
    });

    if (response.success && response.data?.id) {
      navigate(`/contracts/${contractId}/disputes/${response.data.id}`, { replace: true });
      return;
    }

    submitLockRef.current = false;
    setSubmitting(false);
    setError(errorForStatus(response.statusCode, response.message));
  };

  const backPath = contractId ? `/contracts/${contractId}` : '/contracts';

  return (
    <AppLayout>
      <div className="create-dispute-wrapper">
        <button className="dispute-back-btn" onClick={() => navigate(backPath)}>
          <ArrowLeft size={18} />
          {t('contracts.viewContract')}
        </button>

        {loading ? (
          <section className="dispute-state-card">
            <LoaderCircle className="dispute-spinner" size={34} />
            <h2>Loading dispute form</h2>
            <p>Checking contract access and active disputes…</p>
          </section>
        ) : !contract ? (
          <section className="dispute-state-card dispute-state-error">
            <AlertCircle size={38} />
            <h2>Unable to open dispute</h2>
            <p>{error ?? 'The contract is unavailable.'}</p>
            <button onClick={() => navigate('/contracts')}>{t('contracts.backToContracts')}</button>
          </section>
        ) : (
          <>
            <section className="create-dispute-hero">
              <div>
                <p className="dispute-kicker">{t('contracts.formalArbitration')}</p>
                <h1>{t('contracts.openDispute')}</h1>
                <p>{contract.title}</p>
              </div>
            </section>

            {error && (
              <div className="dispute-message error" role="alert">
                <AlertCircle size={18} />
                <span>{error}</span>
                <button onClick={() => setError(null)} aria-label="Dismiss error"><X size={16} /></button>
              </div>
            )}

            {!ELIGIBLE_STATUSES.has(contract.status) ? (
              <section className="dispute-state-card dispute-state-error">
                <ShieldAlert size={38} />
                <h2>Dispute filing is not available</h2>
                <p>Disputes can be opened after the contract is fully signed, while pending escrow, active, or completed.</p>
              </section>
            ) : (
              <section className="create-dispute-grid">
                <div className="dispute-form-card">
                  <label htmlFor="dispute-milestone">Related milestone (optional)</label>
                  <select
                    id="dispute-milestone"
                    value={milestoneId}
                    onChange={(event) => setMilestoneId(event.target.value)}
                    disabled={submitting}
                  >
                    <option value="">General contract dispute</option>
                    {milestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
                    ))}
                  </select>

                  <label htmlFor="dispute-reason">{t('contracts.description')}</label>
                  <textarea
                    id="dispute-reason"
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    maxLength={MAX_REASON_LENGTH}
                    rows={10}
                    disabled={submitting}
                    placeholder={t('contracts.disputeDescPlaceholder')}
                  />
                  <div className="dispute-count">{reason.length}/{MAX_REASON_LENGTH}</div>

                  <button
                    className="dispute-submit-btn"
                    onClick={() => void handleSubmit()}
                    disabled={submitting}
                  >
                    {submitting ? <LoaderCircle className="dispute-spinner" size={18} /> : <ShieldAlert size={18} />}
                    {submitting ? 'Submitting…' : t('contracts.submitDispute')}
                  </button>
                </div>

                <div className="evidence-card">
                  <div className="evidence-header">
                    <FileUp size={22} />
                    <div>
                      <h2>{t('contracts.evidenceFiles')}</h2>
                      <p>Optional. Upload one file up to 100 MB.</p>
                    </div>
                  </div>

                  <input
                    ref={fileInputRef}
                    className="evidence-file-input"
                    type="file"
                    disabled={submitting}
                    onChange={(event) => selectEvidence(event.target.files?.[0] ?? null)}
                  />

                  {evidence ? (
                    <div className="evidence-item">
                      <span>{evidence.name}</span>
                      <strong>{formatFileSize(evidence.size)}</strong>
                      <button onClick={removeEvidence} disabled={submitting} aria-label="Remove evidence">
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <button
                      className="evidence-picker-btn"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={submitting}
                    >
                      <Upload size={18} /> Select evidence
                    </button>
                  )}

                  <label htmlFor="evidence-description">Evidence description (optional)</label>
                  <textarea
                    id="evidence-description"
                    value={evidenceDescription}
                    onChange={(event) => setEvidenceDescription(event.target.value)}
                    rows={4}
                    disabled={submitting || !evidence}
                    placeholder="Explain what this file demonstrates"
                  />
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
