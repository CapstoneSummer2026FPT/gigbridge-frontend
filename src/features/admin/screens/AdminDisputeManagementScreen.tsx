import { useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Scale,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { AppLayout } from '../../../shared/components/AppLayout';
import {
  MOCK_DISPUTES_FOR_SCREENS,
  type DisputeOutcome,
  type DisputeRecord,
  type DisputeStatus,
} from '../../disputes/mock/data-for-DisputeScreens';
import '../styles/admin-dispute-management-screen.css';

const statusLabels: Record<DisputeStatus, string> = {
  opened: 'Opened',
  under_review: 'Under Review',
  resolved: 'Resolved',
};

const outcomeLabels: Record<DisputeOutcome, string> = {
  full_refund: 'Full refund',
  partial_refund: 'Partial refund',
  full_payment_to_freelancer: 'Full payment to Freelancer',
};

export default function AdminDisputeManagementScreen() {
  const [disputes, setDisputes] = useState<DisputeRecord[]>(MOCK_DISPUTES_FOR_SCREENS);
  const [selectedStatus, setSelectedStatus] = useState<'all' | DisputeStatus>('all');
  const [selectedDisputeId, setSelectedDisputeId] = useState(disputes[0]?.id || '');
  const [outcome, setOutcome] = useState<DisputeOutcome>('partial_refund');
  const [refundAmount, setRefundAmount] = useState('0');
  const [resolutionSummary, setResolutionSummary] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const sortedDisputes = useMemo(() => {
    return [...disputes]
      .filter(dispute => selectedStatus === 'all' || dispute.status === selectedStatus)
      .sort((a, b) => {
        if (a.isPremiumClient !== b.isPremiumClient) return a.isPremiumClient ? -1 : 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [disputes, selectedStatus]);

  const selectedDispute = disputes.find(dispute => dispute.id === selectedDisputeId) || sortedDisputes[0];

  const stats = useMemo(() => ({
    total: disputes.length,
    opened: disputes.filter(dispute => dispute.status === 'opened').length,
    underReview: disputes.filter(dispute => dispute.status === 'under_review').length,
    resolved: disputes.filter(dispute => dispute.status === 'resolved').length,
    vip: disputes.filter(dispute => dispute.isPremiumClient && dispute.status !== 'resolved').length,
  }), [disputes]);

  const handleStartReview = (disputeId: string) => {
    setDisputes(current =>
      current.map(dispute =>
        dispute.id === disputeId && dispute.status === 'opened'
          ? { ...dispute, status: 'under_review' }
          : dispute
      )
    );
  };

  const handleResolve = () => {
    if (!selectedDispute) return;
    setError(null);
    setSuccess(null);

    if (!resolutionSummary.trim()) {
      setError('MSG68: Please provide a resolution summary before closing');
      return;
    }

    const parsedRefund = Number(refundAmount || 0);
    if (parsedRefund > selectedDispute.escrowBalance) {
      setError('MSG61: Escrow balance insufficient for this resolution');
      return;
    }

    setDisputes(current =>
      current.map(dispute =>
        dispute.id === selectedDispute.id
          ? {
              ...dispute,
              status: 'resolved',
              outcome,
              refundAmount: parsedRefund,
              resolutionSummary,
            }
          : dispute
      )
    );
    setSuccess('Dispute resolved. Escrow redistribution executed and both parties were notified.');
    setResolutionSummary('');
    setRefundAmount('0');
  };

  return (
    <AppLayout>
      <div className="admin-disputes-wrapper">
        <section className="disputes-hero">
          <div>
            <p className="disputes-kicker">Admin Arbitration</p>
            <h1>Dispute Management</h1>
            <p>Track active financial disputes, review evidence, resolve escrow outcomes, and prioritize premium client VIP cases.</p>
          </div>
          <div className="vip-policy">
            <Sparkles size={18} />
            VIP disputes are sorted first and target resolution within 24 hours.
          </div>
        </section>

        <section className="disputes-stats">
          <div><span>Total</span><strong>{stats.total}</strong></div>
          <div><span>Opened</span><strong>{stats.opened}</strong></div>
          <div><span>Under Review</span><strong>{stats.underReview}</strong></div>
          <div><span>Resolved</span><strong>{stats.resolved}</strong></div>
          <div><span>VIP Queue</span><strong>{stats.vip}</strong></div>
        </section>

        {error && (
          <div className="dispute-admin-message error">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => setError(null)}><X size={16} /></button>
          </div>
        )}
        {success && (
          <div className="dispute-admin-message success">
            <CheckCircle size={18} />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)}><X size={16} /></button>
          </div>
        )}

        <section className="disputes-layout">
          <div className="disputes-list-card">
            <div className="disputes-filter-row">
              {(['all', 'opened', 'under_review', 'resolved'] as Array<'all' | DisputeStatus>).map(status => (
                <button
                  key={status}
                  className={selectedStatus === status ? 'active' : ''}
                  onClick={() => setSelectedStatus(status)}
                >
                  {status === 'all' ? 'All' : statusLabels[status]}
                </button>
              ))}
            </div>

            <div className="disputes-list">
              {sortedDisputes.map(dispute => (
                <button
                  key={dispute.id}
                  className={`dispute-list-item ${selectedDispute?.id === dispute.id ? 'selected' : ''}`}
                  onClick={() => setSelectedDisputeId(dispute.id)}
                >
                  <div className="dispute-list-title">
                    <strong>{dispute.contractTitle}</strong>
                    {dispute.isPremiumClient && <span className="vip-badge">VIP</span>}
                  </div>
                  <p>{dispute.description}</p>
                  <div>
                    <span className={`dispute-status ${dispute.status}`}>{statusLabels[dispute.status]}</span>
                    <small>{new Date(dispute.createdAt).toLocaleString()}</small>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {selectedDispute && (
            <div className="dispute-detail-card">
              <div className="detail-card-header">
                <div>
                  <p className="disputes-kicker">Dispute Details</p>
                  <h2>{selectedDispute.contractTitle}</h2>
                </div>
                <Scale size={24} />
              </div>

              <div className="dispute-detail-grid">
                <div><span>Status</span><strong>{statusLabels[selectedDispute.status]}</strong></div>
                <div><span>Opened By</span><strong>{selectedDispute.openedByName}</strong></div>
                <div><span>Escrow Balance</span><strong>${selectedDispute.escrowBalance.toLocaleString()}</strong></div>
                <div><span>Priority</span><strong>{selectedDispute.isPremiumClient ? 'VIP Fast-Track' : 'Standard'}</strong></div>
              </div>

              <section className="dispute-detail-section">
                <h3><ShieldAlert size={18} />Reason</h3>
                <p>{selectedDispute.description}</p>
              </section>

              <section className="dispute-detail-section">
                <h3><FileText size={18} />Evidence</h3>
                {selectedDispute.evidenceFiles.length > 0 ? (
                  <div className="evidence-admin-list">
                    {selectedDispute.evidenceFiles.map(file => (
                      <a key={file.id} href={file.fileUrl}>{file.fileName} ({file.fileSizeMb} MB)</a>
                    ))}
                  </div>
                ) : (
                  <p>No evidence files attached.</p>
                )}
              </section>

              {selectedDispute.isPremiumClient && (
                <section className="ai-dispute-box">
                  <Sparkles size={18} />
                  <div>
                    <strong>AI-assisted resolution proposal</strong>
                    <p>{selectedDispute.aiSuggestion || 'AI analysis unavailable. Dispute remains in VIP priority queue.'}</p>
                  </div>
                </section>
              )}

              {selectedDispute.status !== 'resolved' ? (
                <section className="resolve-panel">
                  <div className="resolve-row">
                    <button onClick={() => handleStartReview(selectedDispute.id)} disabled={selectedDispute.status !== 'opened'}>
                      <Clock size={16} />
                      Mark Under Review
                    </button>
                    <select value={outcome} onChange={(event) => setOutcome(event.target.value as DisputeOutcome)}>
                      {Object.entries(outcomeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    <input value={refundAmount} onChange={(event) => setRefundAmount(event.target.value)} type="number" min="0" placeholder="Refund amount" />
                  </div>
                  <textarea
                    value={resolutionSummary}
                    onChange={(event) => setResolutionSummary(event.target.value)}
                    rows={5}
                    placeholder="Resolution summary required before closing..."
                  />
                  <button className="resolve-btn" onClick={handleResolve}>
                    <CheckCircle size={16} />
                    Resolve Dispute
                  </button>
                </section>
              ) : (
                <section className="resolved-summary">
                  <CheckCircle size={18} />
                  <div>
                    <strong>{selectedDispute.outcome ? outcomeLabels[selectedDispute.outcome] : 'Resolved'}</strong>
                    <p>{selectedDispute.resolutionSummary}</p>
                  </div>
                </section>
              )}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
