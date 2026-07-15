import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  FileText,
  LoaderCircle,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react';
import { adminGetAPI, adminPatchAPI, adminPostAPI } from '../../../api/adminAPI';
import { AppLayout } from '../../../shared/components/AppLayout';
import type { AdminDisputeDetail, AdminDisputeListItem } from '../../../types/models/AdminDispute';
import { DisputeResolution, DisputeStatus, type DisputeEvidence } from '../../../types/models/Dispute';
import '../styles/admin-dispute-management-screen.css';

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

const formatSize = (bytes: number | null): string => {
  if (bytes === null) return 'Size unavailable';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const apiError = (status: number, message: string): string => {
  if (status === 401) return 'Your administrator session has expired.';
  if (status === 403) return 'Administrator access is required.';
  if (status === 404) return 'The dispute could not be found.';
  return message || 'The request could not be completed.';
};

export default function AdminDisputeManagementScreen() {
  const [disputes, setDisputes] = useState<AdminDisputeListItem[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'all' | DisputeStatus>('all');
  const [search, setSearch] = useState('');
  const [selectedDisputeId, setSelectedDisputeId] = useState('');
  const [selectedDispute, setSelectedDispute] = useState<AdminDisputeDetail | null>(null);
  const [totalItems, setTotalItems] = useState(0);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [resolution, setResolution] = useState<DisputeResolution>(DisputeResolution.ClientFavored);
  const [resolutionNote, setResolutionNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      setLoadingList(true);
      setError(null);
      const response = await adminGetAPI.getDisputes({
        page: 1,
        pageSize: 100,
        status: selectedStatus === 'all' ? undefined : selectedStatus,
        search: search.trim() || undefined,
      });
      if (cancelled) return;

      if (!response.success || !response.data) {
        setDisputes([]);
        setTotalItems(0);
        setError(apiError(response.statusCode, response.message));
        setLoadingList(false);
        return;
      }

      setDisputes(response.data.items);
      setTotalItems(response.data.totalItems);
      setSelectedDisputeId((current) =>
        response.data!.items.some((item) => item.id === current)
          ? current
          : response.data!.items[0]?.id ?? ''
      );
      setLoadingList(false);
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [selectedStatus, search, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    const loadDetail = async () => {
      if (!selectedDisputeId) {
        setSelectedDispute(null);
        return;
      }

      setLoadingDetail(true);
      const response = await adminGetAPI.getDisputeDetail(selectedDisputeId);
      if (cancelled) return;
      if (!response.success || !response.data) {
        setSelectedDispute(null);
        setError(apiError(response.statusCode, response.message));
      } else {
        setSelectedDispute(response.data);
      }
      setLoadingDetail(false);
    };

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedDisputeId]);

  const stats = useMemo(() => ({
    visible: disputes.length,
    open: disputes.filter((item) => item.status === DisputeStatus.Open).length,
    underReview: disputes.filter((item) => item.status === DisputeStatus.UnderReview).length,
    resolved: disputes.filter((item) => item.status === DisputeStatus.Resolved).length,
    closed: disputes.filter((item) => item.status === DisputeStatus.Closed).length,
  }), [disputes]);

  const applyUpdatedDetail = (detail: AdminDisputeDetail) => {
    setSelectedDispute(detail);
    setRefreshKey((value) => value + 1);
  };

  const updateStatus = async (targetStatus: DisputeStatus) => {
    if (!selectedDispute || actionLoading) return;
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    const response = await adminPatchAPI.updateDisputeStatus(selectedDispute.id, targetStatus);
    setActionLoading(false);

    if (!response.success || !response.data) {
      setError(apiError(response.statusCode, response.message));
      return;
    }

    applyUpdatedDetail(response.data);
    setSuccess(targetStatus === DisputeStatus.UnderReview
      ? 'Dispute moved to Under Review. Both contract participants were notified.'
      : 'Dispute closed. Both contract participants were notified.');
  };

  const resolveCase = async () => {
    if (!selectedDispute || actionLoading) return;
    if (!resolutionNote.trim()) {
      setError('Resolution Note is required.');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);
    const response = await adminPostAPI.resolveDispute(
      selectedDispute.id,
      resolution,
      resolutionNote.trim()
    );
    setActionLoading(false);

    if (!response.success || !response.data) {
      setError(apiError(response.statusCode, response.message));
      return;
    }

    applyUpdatedDetail(response.data);
    setShowResolveDialog(false);
    setResolutionNote('');
    setSuccess('Dispute decision recorded. Both contract participants were notified. No funds were transferred.');
  };

  const downloadEvidence = async (evidence: DisputeEvidence) => {
    if (!selectedDispute || downloadingId) return;
    setDownloadingId(evidence.id);
    setError(null);
    const response = await adminGetAPI.getDisputeEvidenceDownload(selectedDispute.id, evidence.id);
    setDownloadingId(null);
    if (!response.success || !response.data?.downloadUrl) {
      setError(apiError(response.statusCode, response.message));
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

  return (
    <AppLayout>
      <div className="admin-disputes-wrapper">
        <section className="disputes-hero">
          <div>
            <p className="disputes-kicker">Admin Arbitration</p>
            <h1>Dispute Management</h1>
            <p>Review real dispute cases, evidence, participants, and record administrative decisions.</p>
          </div>
          <div className="dispute-financial-notice">
            <ShieldAlert size={18} />
            Decisions recorded here do not transfer, release, split, or refund funds.
          </div>
        </section>

        <section className="disputes-stats">
          <div><span>Matching Cases</span><strong>{totalItems}</strong></div>
          <div><span>Visible Open</span><strong>{stats.open}</strong></div>
          <div><span>Visible Review</span><strong>{stats.underReview}</strong></div>
          <div><span>Visible Resolved</span><strong>{stats.resolved}</strong></div>
          <div><span>Visible Closed</span><strong>{stats.closed}</strong></div>
        </section>

        {error && (
          <div className="dispute-admin-message error" role="alert">
            <AlertCircle size={18} /><span>{error}</span>
            <button onClick={() => setError(null)} aria-label="Dismiss error"><X size={16} /></button>
          </div>
        )}
        {success && (
          <div className="dispute-admin-message success">
            <CheckCircle size={18} /><span>{success}</span>
            <button onClick={() => setSuccess(null)} aria-label="Dismiss message"><X size={16} /></button>
          </div>
        )}

        <section className="disputes-toolbar">
          <label>
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search case ID, contract, participant, or reason"
            />
          </label>
          <button onClick={() => setRefreshKey((value) => value + 1)} disabled={loadingList}>
            <RefreshCw size={17} className={loadingList ? 'admin-dispute-spin' : ''} /> Refresh
          </button>
        </section>

        <section className="disputes-layout">
          <div className="disputes-list-card">
            <div className="disputes-filter-row">
              {(['all', DisputeStatus.Open, DisputeStatus.UnderReview, DisputeStatus.Resolved, DisputeStatus.Closed] as const)
                .map((status) => (
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
              {loadingList ? (
                <div className="admin-dispute-empty"><LoaderCircle className="admin-dispute-spin" /> Loading disputes…</div>
              ) : disputes.length === 0 ? (
                <div className="admin-dispute-empty">No disputes match the selected filter.</div>
              ) : disputes.map((dispute) => (
                <button
                  key={dispute.id}
                  className={`dispute-list-item ${selectedDisputeId === dispute.id ? 'selected' : ''}`}
                  onClick={() => setSelectedDisputeId(dispute.id)}
                >
                  <div className="dispute-list-title">
                    <strong>{dispute.contractTitle}</strong>
                    <span className={`dispute-status status-${dispute.status}`}>{statusLabels[dispute.status]}</span>
                  </div>
                  <p>{dispute.reason}</p>
                  <div><small>{dispute.initiatorName} · {dispute.evidenceCount} evidence</small><small>{formatDate(dispute.createdAt)}</small></div>
                </button>
              ))}
            </div>
          </div>

          <div className="dispute-detail-card">
            {loadingDetail ? (
              <div className="admin-dispute-empty"><LoaderCircle className="admin-dispute-spin" /> Loading case details…</div>
            ) : !selectedDispute ? (
              <div className="admin-dispute-empty">Select a dispute to view its details.</div>
            ) : (
              <>
                <div className="detail-card-header">
                  <div><p className="disputes-kicker">Case {selectedDispute.id}</p><h2>{selectedDispute.contractTitle}</h2></div>
                  <Scale size={24} />
                </div>

                <div className="dispute-detail-grid">
                  <div><span>Status</span><strong>{statusLabels[selectedDispute.status]}</strong></div>
                  <div><span>Initiator</span><strong>{selectedDispute.initiatorName}</strong><small>{selectedDispute.initiatorRole}</small></div>
                  <div><span>Milestone</span><strong>{selectedDispute.milestoneTitle ?? 'General contract dispute'}</strong></div>
                  <div><span>Updated</span><strong>{formatDate(selectedDispute.updatedAt)}</strong></div>
                </div>

                <section className="dispute-detail-section">
                  <h3><FileText size={18} />Participants</h3>
                  <p>Client: {selectedDispute.client.fullName} ({selectedDispute.client.email})</p>
                  <p>Freelancer: {selectedDispute.freelancer
                    ? `${selectedDispute.freelancer.fullName} (${selectedDispute.freelancer.email})`
                    : 'Not assigned'}</p>
                </section>

                <section className="dispute-detail-section">
                  <h3><ShieldAlert size={18} />Reason</h3>
                  <p className="admin-dispute-prewrap">{selectedDispute.reason}</p>
                </section>

                <section className="dispute-detail-section">
                  <h3><FileText size={18} />Evidence</h3>
                  {selectedDispute.evidence.length === 0 ? <p>No evidence files attached.</p> : (
                    <div className="evidence-admin-list">
                      {selectedDispute.evidence.map((evidence) => (
                        <div key={evidence.id} className="admin-evidence-row">
                          <div><strong>{evidence.fileName}</strong><small>{formatSize(evidence.fileSize)} · {formatDate(evidence.createdAt)}</small></div>
                          <button onClick={() => void downloadEvidence(evidence)} disabled={downloadingId !== null}>
                            {downloadingId === evidence.id ? <LoaderCircle className="admin-dispute-spin" size={16} /> : <Download size={16} />}
                            Download
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {(selectedDispute.status === DisputeStatus.Resolved || selectedDispute.status === DisputeStatus.Closed) && (
                  <section className="resolved-summary">
                    <CheckCircle size={18} />
                    <div>
                      <strong>{selectedDispute.resolutionLabel ?? (selectedDispute.resolution !== null ? resolutionLabels[selectedDispute.resolution] : 'Resolved')}</strong>
                      <p className="admin-dispute-prewrap">{selectedDispute.resolutionNote}</p>
                      <small>Resolved: {formatDate(selectedDispute.resolvedAt)}</small>
                    </div>
                  </section>
                )}

                <section className="admin-dispute-actions">
                  {selectedDispute.status === DisputeStatus.Open && (
                    <button onClick={() => void updateStatus(DisputeStatus.UnderReview)} disabled={actionLoading}>
                      <Clock size={16} /> Start Review
                    </button>
                  )}
                  {selectedDispute.status === DisputeStatus.UnderReview && (
                    <button className="resolve-btn" onClick={() => setShowResolveDialog(true)} disabled={actionLoading}>
                      <CheckCircle size={16} /> Resolve Case
                    </button>
                  )}
                  {selectedDispute.status === DisputeStatus.Resolved && (
                    <button onClick={() => void updateStatus(DisputeStatus.Closed)} disabled={actionLoading}>
                      <CheckCircle size={16} /> Close Case
                    </button>
                  )}
                  {selectedDispute.status === DisputeStatus.Closed && <p>This case is closed and read-only.</p>}
                </section>
              </>
            )}
          </div>
        </section>

        {showResolveDialog && selectedDispute && (
          <div className="admin-dispute-modal-backdrop" role="presentation">
            <section className="admin-dispute-modal" role="dialog" aria-modal="true" aria-labelledby="resolve-case-title">
              <div className="admin-dispute-modal-header">
                <div><p className="disputes-kicker">Administrative Decision</p><h2 id="resolve-case-title">Resolve Case</h2></div>
                <button onClick={() => setShowResolveDialog(false)} disabled={actionLoading} aria-label="Close dialog"><X size={18} /></button>
              </div>
              <div className="dispute-financial-warning">
                <AlertCircle size={18} />
                This action records the dispute decision only and does not automatically transfer or refund funds.
              </div>
              <label>Resolution
                <select value={resolution} onChange={(event) => setResolution(Number(event.target.value) as DisputeResolution)} disabled={actionLoading}>
                  {Object.entries(resolutionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label>Resolution Note
                <textarea
                  value={resolutionNote}
                  onChange={(event) => setResolutionNote(event.target.value)}
                  rows={6}
                  placeholder="Required: explain the decision for both parties"
                  disabled={actionLoading}
                />
              </label>
              <button className="resolve-btn" onClick={() => void resolveCase()} disabled={actionLoading || !resolutionNote.trim()}>
                {actionLoading ? <LoaderCircle className="admin-dispute-spin" size={17} /> : <CheckCircle size={17} />}
                Record Resolution
              </button>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
