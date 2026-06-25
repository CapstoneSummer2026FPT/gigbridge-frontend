import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AlertCircle, ArrowLeft, FileUp, ShieldAlert, Sparkles, Upload, X } from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import { ContractStatus } from '../../../types/models/Contract';
import { MOCK_CONTRACTS_FOR_SCREENS } from '../../contracts/mock/data-for-ContractScreens';
import type { DisputeCategory } from '../mock/data-for-DisputeScreens';
import '../styles/create-dispute-screen.css';

interface EvidenceDraft {
  id: string;
  fileName: string;
  fileSizeMb: number;
}

const DISPUTE_CATEGORIES: Array<{ value: DisputeCategory; label: string }> = [
  { value: 'deliverable_quality', label: 'Deliverable Quality' },
  { value: 'payment', label: 'Payment' },
  { value: 'scope', label: 'Scope' },
  { value: 'communication', label: 'Communication' },
  { value: 'other', label: 'Other' },
];

export default function CreateDisputeScreen() {
  const navigate = useNavigate();
  const { contractId } = useParams<{ contractId: string }>();
  const [category, setCategory] = useState<DisputeCategory>('deliverable_quality');
  const [description, setDescription] = useState('');
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceDraft[]>([
    { id: 'ev_draft_1', fileName: 'delivery-screenshot.png', fileSizeMb: 1.8 },
  ]);
  const [manualFileName, setManualFileName] = useState('');
  const [manualFileSize, setManualFileSize] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const contract = useMemo(
    () => MOCK_CONTRACTS_FOR_SCREENS.find(item => item.contractsId === contractId),
    [contractId]
  );

  const isPremiumClientDispute = contract?.clientProfilesId === 'demo_client_001';

  const handleAddEvidence = () => {
    const fileSizeMb = Number(manualFileSize || 0);

    if (fileSizeMb > 10) {
      setError('File must be under 10MB');
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
      setError('Only active contracts can open a dispute.');
      return;
    }

    if (!description.trim() || description.length > 2000) {
      setError('Please describe your dispute reason (1-2000 characters)');
      return;
    }

    if (evidenceFiles.some(file => file.fileSizeMb > 10)) {
      setError('File must be under 10MB');
      return;
    }

    setSubmitted(true);
  };

  return (
    <AppLayout>
      <div className="create-dispute-wrapper">
        <button className="dispute-back-btn" onClick={() => navigate(`/contracts/${contractId}`)}>
          <ArrowLeft size={18} />
          Back to Contract
        </button>

        <section className="create-dispute-hero">
          <div>
            <p className="dispute-kicker">Formal Arbitration</p>
            <h1>Open Dispute</h1>
            <p>Submit the dispute reason and evidence. Escrow funds are frozen during dispute resolution.</p>
          </div>
          {isPremiumClientDispute && (
            <div className="vip-dispute-chip">
              <Sparkles size={18} />
              Premium client dispute enters VIP 24h arbitration queue with AI-assisted analysis.
            </div>
          )}
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
            <h2>Dispute Created</h2>
            <p>Contract status is now Disputed. Admin and the other party have been notified. Escrow funds are frozen.</p>
            <button onClick={() => navigate('/contracts')}>Back to Contracts</button>
          </section>
        ) : (
          <section className="create-dispute-grid">
            <div className="dispute-form-card">
              <label>Reason / Category</label>
              <select value={category} onChange={(event) => setCategory(event.target.value as DisputeCategory)}>
                {DISPUTE_CATEGORIES.map(item => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>

              <label>Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={2000}
                rows={10}
                placeholder="Describe the conflict, affected milestone, expected outcome, and any payment or scope concern."
              />
              <div className="dispute-count">{description.length}/2000</div>

              <button className="dispute-submit-btn" onClick={handleSubmit}>
                <ShieldAlert size={18} />
                Submit Dispute
              </button>
            </div>

            <div className="evidence-card">
              <div className="evidence-header">
                <FileUp size={22} />
                <div>
                  <h2>Evidence Files</h2>
                  <p>Each evidence file must be 10MB or less.</p>
                </div>
              </div>

              <div className="evidence-add-row">
                <input value={manualFileName} onChange={(event) => setManualFileName(event.target.value)} placeholder="file-name.pdf" />
                <input type="number" value={manualFileSize} onChange={(event) => setManualFileSize(event.target.value)} placeholder="MB" />
                <button onClick={handleAddEvidence}><Upload size={16} />Add</button>
              </div>

              <div className="evidence-list">
                {evidenceFiles.map(file => (
                  <div key={file.id} className="evidence-item">
                    <span>{file.fileName}</span>
                    <strong>{file.fileSizeMb} MB</strong>
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
