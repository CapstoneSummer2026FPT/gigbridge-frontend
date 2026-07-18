import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Download,
  FileText,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  User,
} from 'lucide-react';
import { disputeGetAPI } from '../../../api/disputeAPI';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { AppLayout } from '../../../shared/components/AppLayout';
import type { ContractDto } from '../../../types/models/Contract';
import {
  DisputeResolution,
  DisputeStatus,
  type Dispute,
  type DisputeEvidence,
} from '../../../types/models/Dispute';
import '../styles/dispute-detail-screen.css';
import { DisputeChat } from '../components/DisputeChat';

const statusLabels: Record<DisputeStatus, string> = {
  [DisputeStatus.Open]: 'Open',
  [DisputeStatus.UnderReview]: 'Under Review',
  [DisputeStatus.Resolved]: 'Resolved',
  [DisputeStatus.Closed]: 'Closed',
};

const resolutionLabels: Record<DisputeResolution, string> = {
  [DisputeResolution.ClientFavored]: 'Client Favored',
  [DisputeResolution.FreelancerFavored]: 'Freelancer Favored',
  [DisputeResolution.Split]: 'Split',
  [DisputeResolution.Dismissed]: 'Dismissed',
};

const formatDate = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const formatSize = (value: number | null): string => {
  if (value === null) return 'Size unavailable';
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const errorTitle = (status: number): string => {
  if (status === 401) return 'Authentication required';
  if (status === 403) return 'Access denied';
  if (status === 404) return 'Dispute not found';
  return 'Unable to load dispute';
};

export default function DisputeDetailScreen() {
  const navigate = useNavigate();
  const { contractId, disputeId } = useParams<{ contractId: string; disputeId: string }>();
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [contract, setContract] = useState<ContractDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!contractId || !disputeId) {
        setError({ status: 404, message: 'A valid contract and dispute ID are required.' });
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      const [disputeResponse, contractResponse] = await Promise.all([
        disputeGetAPI.getDisputeById(contractId, disputeId),
        contractGetAPI.getContractById(contractId),
      ]);
      if (cancelled) return;

      if (!disputeResponse.success || !disputeResponse.data) {
        setError({
          status: disputeResponse.statusCode,
          message: disputeResponse.message || 'The dispute could not be loaded.',
        });
        setLoading(false);
        return;
      }
      if (!contractResponse.success || !contractResponse.data) {
        setError({
          status: contractResponse.statusCode,
          message: contractResponse.message || 'The related contract could not be loaded.',
        });
        setLoading(false);
        return;
      }

      setDispute(disputeResponse.data);
      setContract(contractResponse.data);
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [contractId, disputeId, reloadKey]);

  const downloadEvidence = async (evidence: DisputeEvidence) => {
    if (!contractId || !disputeId || downloadingId) return;
    setDownloadingId(evidence.id);
    setDownloadError(null);
    const response = await disputeGetAPI.getEvidenceDownload(contractId, disputeId, evidence.id);
    setDownloadingId(null);

    if (!response.success || !response.data?.downloadUrl) {
      setDownloadError(response.message || 'Unable to download this evidence file.');
      return;
    }

    const anchor = document.createElement('a');
    anchor.href = response.data.downloadUrl;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.download = response.data.fileName || evidence.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const backPath = contractId ? `/contracts/${contractId}` : '/contracts';

  return (
    <AppLayout>
      <main className="dispute-detail-wrapper">
        <button className="dispute-detail-back" onClick={() => navigate(backPath)}>
          <ArrowLeft size={18} /> Back to contract
        </button>

        {loading ? (
          <section className="dispute-detail-state">
            <LoaderCircle className="dispute-detail-spinner" size={38} />
            <h1>Loading dispute case</h1>
            <p>Retrieving the authorized case record…</p>
          </section>
        ) : error || !dispute || !contract ? (
          <section className="dispute-detail-state dispute-detail-error">
            <AlertCircle size={42} />
            <h1>{errorTitle(error?.status ?? 500)}</h1>
            <p>{error?.message ?? 'The dispute is unavailable.'}</p>
            <div className="dispute-detail-state-actions">
              <button onClick={() => setReloadKey((value) => value + 1)}>
                <RefreshCw size={17} /> Retry
              </button>
              <button onClick={() => navigate('/contracts')}>View contracts</button>
            </div>
          </section>
        ) : (
          <>
            <header className="dispute-detail-hero">
              <div>
                <p className="dispute-detail-kicker">Dispute case</p>
                <h1>{dispute.title || contract.title}</h1>
                <p className="dispute-detail-case-id">Case ID: {dispute.id}</p>
              </div>
              <span className={`dispute-status dispute-status-${dispute.status}`}>
                {statusLabels[dispute.status] ?? `Status ${dispute.status}`}
              </span>
            </header>

            <section className="dispute-detail-grid">
              <article className="dispute-detail-card dispute-detail-main">
                <div className="dispute-detail-section-title">
                  <ShieldAlert size={21} />
                  <h2>Reason</h2>
                </div>
                <p className="dispute-reason-text">{dispute.reason}</p>
                {dispute.description && <p className="dispute-description-text">{dispute.description}</p>}

                {(dispute.requestedResolution || dispute.claimedAmount !== null) && (
                  <div className="dispute-request-block">
                    {dispute.requestedResolution && <p><strong>Requested resolution:</strong> {dispute.requestedResolution}</p>}
                    {dispute.claimedAmount !== null && <p><strong>Claimed amount:</strong> {dispute.claimedAmount.toLocaleString()}</p>}
                  </div>
                )}

                <div className="dispute-detail-meta-grid">
                  <div>
                    <User size={17} />
                    <span>Initiator</span>
                    <strong>{dispute.initiator.name ?? 'Name unavailable'}</strong>
                    <small>{dispute.initiator.role ?? 'Role unavailable'}</small>
                  </div>
                  <div>
                    <FileText size={17} />
                    <span>Milestone</span>
                    <strong>{dispute.milestone?.title ?? 'General contract dispute'}</strong>
                    {dispute.milestone && <small>{dispute.milestone.id}</small>}
                  </div>
                  <div>
                    <Calendar size={17} />
                    <span>Created</span>
                    <strong>{formatDate(dispute.createdAt)}</strong>
                    <small>Updated: {formatDate(dispute.updatedAt)}</small>
                  </div>
                </div>
              </article>

              <aside className="dispute-detail-card">
                <h2>Resolution</h2>
                {dispute.resolution === null ? (
                  <p className="dispute-detail-muted">This case has not been resolved.</p>
                ) : (
                  <div className="dispute-resolution-block">
                    <strong>
                      {dispute.resolutionLabel ?? resolutionLabels[dispute.resolution]}
                    </strong>
                    {dispute.resolutionNote && <p>{dispute.resolutionNote}</p>}
                    <small>Resolved: {formatDate(dispute.resolvedAt)}</small>
                  </div>
                )}
              </aside>
            </section>

            <section className="dispute-detail-card dispute-evidence-section">
              <div className="dispute-detail-section-title">
                <FileText size={21} />
                <h2>Evidence</h2>
              </div>
              {downloadError && (
                <div className="dispute-download-error" role="alert">
                  <AlertCircle size={17} /> {downloadError}
                </div>
              )}
              {dispute.evidence.length === 0 ? (
                <p className="dispute-detail-muted">No evidence files were submitted.</p>
              ) : (
                <div className="dispute-evidence-list">
                  {dispute.evidence.map((evidence) => (
                    <div className="dispute-evidence-row" key={evidence.id}>
                      <FileText size={21} />
                      <div>
                        <strong>{evidence.fileName}</strong>
                        <span>{formatSize(evidence.fileSize)} · {formatDate(evidence.createdAt)}</span>
                        {evidence.description && <p>{evidence.description}</p>}
                      </div>
                      <button
                        onClick={() => void downloadEvidence(evidence)}
                        disabled={downloadingId !== null}
                      >
                        {downloadingId === evidence.id
                          ? <LoaderCircle className="dispute-detail-spinner" size={17} />
                          : <Download size={17} />}
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <DisputeChat disputeId={dispute.id} />
          </>
        )}
      </main>
    </AppLayout>
  );
}
