import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertCircle, ArrowLeft, FileUp, ShieldAlert, Sparkles, Upload, X } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { ContractStatus } from '../../../types/models/Contract';
import { MOCK_CONTRACTS_FOR_SCREENS } from '../../contracts/mock/data-for-ContractScreens';
import type { DisputeCategory } from '../mock/data-for-DisputeScreens';
import { useTranslation } from '../../../hooks/useTranslation';
import '../styles/create-dispute-screen.css';
import { useApp } from '../../../app/providers/AppProvider';
import { usePremiumStatus } from '../../premium/hooks';
import { PremiumStatusBadge } from '../../premium/components/PremiumStatusBadge';
import '../../premium/styles/premium.css';

interface EvidenceDraft {
  id: string;
  fileName: string;
  fileSizeMb: number;
}

export default function CreateDisputeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const { role } = useApp();
  const premiumStatus = usePremiumStatus(role);
  const [category, setCategory] = useState<DisputeCategory>('deliverable_quality');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceDraft[]>([
    { id: 'ev_draft_1', fileName: 'delivery-screenshot.png', fileSizeMb: 1.8 },
  ]);
  const [manualFileName, setManualFileName] = useState('');
  const [manualFileSize, setManualFileSize] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const DISPUTE_CATEGORIES = useMemo(() => [
    { value: 'deliverable_quality' as DisputeCategory, label: t('contracts.deliverableQuality') },
    { value: 'payment' as DisputeCategory, label: t('contracts.payment') },
    { value: 'scope' as DisputeCategory, label: t('contracts.scope') },
    { value: 'communication' as DisputeCategory, label: t('contracts.communication') },
    { value: 'other' as DisputeCategory, label: t('contracts.other') },
  ], [t]);

  const contract = useMemo(
    () => MOCK_CONTRACTS_FOR_SCREENS.find(item => item.contractsId === contractId),
    [contractId]
  );

  const isPremiumClientDispute = role === 0 && premiumStatus.isPremium;

  const handleAddEvidence = () => {
    const fileSizeMb = Number(manualFileSize || 0);

    if (fileSizeMb > 10) {
      setError(t('contracts.evidenceFilesDesc'));
      return;
    }

    if (!manualFileName.trim()) return;

    setEvidenceFiles(current => [
      ...current,
      { id: `ev_${Date.now()}`, fileName: manualFileName.trim(), fileSizeMb },
    ]);
    setManualFileName('');
    setManualFileSize('');
    setError(null);
  };

  const handleSubmit = () => {
    setError(null);

    if (!contract || contract.status !== ContractStatus.Active) {
      setError(t('contracts.disputeActiveOnly', { defaultValue: 'Only active contracts can open a dispute.' }));
      return;
    }

    if (!description.trim() || description.length > 2000) {
      setError(t('contracts.disputeDescError', { defaultValue: 'Please describe your dispute reason (1-2000 characters)' }));
      return;
    }

    if (evidenceFiles.some(file => file.fileSizeMb > 10)) {
      setError(t('contracts.evidenceFilesDesc'));
      return;
    }

    setSubmitted(true);
  };

  return (
    <AppLayout>
      <div className="create-dispute-wrapper">
        <button className="dispute-back-btn" onClick={() => navigate(`/contracts/${contractId}`)}>
          <ArrowLeft size={18} />
          {t('contracts.viewContract')}
        </button>

        <section className="create-dispute-hero">
          <div>
            <p className="dispute-kicker">{t('contracts.formalArbitration')}</p>
            <h1>{t('contracts.openDispute')}</h1>
            <p>{t('contracts.disputeKicker')}</p>
          </div>
          {role === 0 && !premiumStatus.loading && <div>
            <PremiumStatusBadge active={isPremiumClientDispute} />
            {isPremiumClientDispute && <div className="vip-dispute-chip" style={{ marginTop: 8 }}><Sparkles size={18} />{t('contracts.vipDisputeChip')}</div>}
          </div>}
        </section>

        {error && (
          <div className="dispute-message error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => setError(null)}><X size={16} /></button>
          </div>
        )}

        {submitted ? (
          <section className="dispute-success-card">
            <ShieldAlert size={42} />
            <h2>{t('contracts.disputeCreated')}</h2>
            <p>{t('contracts.disputeCreatedDesc')}</p>
            <button onClick={() => navigate('/contracts')}>{t('contracts.backToContracts')}</button>
          </section>
        ) : (
          <section className="create-dispute-grid">
            <div className="dispute-form-card">
              <label>{t('contracts.reasonCategory')}</label>
              <select value={category} onChange={(event) => setCategory(event.target.value as DisputeCategory)}>
                {DISPUTE_CATEGORIES.map(item => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>

              <label>{t('contracts.description')}</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
                rows={10}
                placeholder={t('contracts.disputeDescPlaceholder')}
              />
              <div className="dispute-count">{description.length}/2000</div>

              <button className="dispute-submit-btn" onClick={handleSubmit}>
                <ShieldAlert size={18} />
                {t('contracts.submitDispute')}
              </button>
            </div>

            <div className="evidence-card">
              <div className="evidence-header">
                <FileUp size={22} />
                <div>
                  <h2>{t('contracts.evidenceFiles')}</h2>
                  <p>{t('contracts.evidenceFilesDesc')}</p>
                </div>
              </div>

              <div className="evidence-add-row">
                <input value={manualFileName} onChange={(event) => setManualFileName(event.target.value)} placeholder={t('contracts.fileNamePlaceholder')} />
                <input type="number" value={manualFileSize} onChange={(event) => setManualFileSize(event.target.value)} placeholder={t('contracts.mb')} />
                <button onClick={handleAddEvidence}><Upload size={16} />{t('contracts.add')}</button>
              </div>

              <div className="evidence-list">
                {evidenceFiles.map(file => (
                  <div key={file.id} className="evidence-item">
                    <span>{file.fileName}</span>
                    <strong>{file.fileSizeMb} {t('contracts.mb')}</strong>
                    <button onClick={() => setEvidenceFiles(current => current.filter(item => item.id !== file.id))}>
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </AppLayout>
  );
}
