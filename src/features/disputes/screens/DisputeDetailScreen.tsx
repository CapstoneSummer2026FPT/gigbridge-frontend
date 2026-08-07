import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  AlertCircle, Archive, ArrowLeft, CheckCircle2, Download, FileText, Film,
  Image, LoaderCircle, RefreshCw, ShieldAlert, ShieldCheck, User, Users,
  Clock, Award, DollarSign
} from 'lucide-react';
import { disputeGetAPI } from '../../../api/disputeAPI';
import { contractGetAPI } from '../../../api/contractAPI/GET';
import { AppLayout } from '../../../shared/components/AppLayout';
import { UserProfileLink } from '../../../shared/components/UserProfileLink';
import { UserAvatar } from '../../../shared/components/UserAvatar';
import type { ContractDto } from '../../../types/models/Contract';
import { ContractReportIssueType } from '../../../types/models/ReportContract';
import {
  DisputeResolution, DisputeStatus, DisputeUrgency,
  type Dispute, type DisputeEvidence,
} from '../../../types/models/Dispute';
import { DisputeChat } from '../components/DisputeChat';
import { DisputeEvidenceUploader } from '../components/DisputeEvidenceUploader';
import { useApp } from '../../../app/providers/AppProvider';
import '../styles/dispute-detail-screen.css';

const statusLabels: Record<DisputeStatus, string> = {
  [DisputeStatus.Open]: 'Waiting Admin',
  [DisputeStatus.WaitingAdmin]: 'Waiting Admin',
  [DisputeStatus.UnderReview]: 'In Progress',
  [DisputeStatus.WaitingEvidence]: 'In Progress',
  [DisputeStatus.DecisionPending]: 'In Progress',
  [DisputeStatus.Resolved]: 'Resolved',
  [DisputeStatus.Closed]: 'Closed',
};

const resolutionLabels: Record<DisputeResolution, string> = {
  [DisputeResolution.ClientFavored]: 'Client Favored',
  [DisputeResolution.FreelancerFavored]: 'Freelancer Favored',
  [DisputeResolution.Split]: 'Split',
  [DisputeResolution.Dismissed]: 'Dismissed',
};

const issueLabels: Record<number, string> = {
  [ContractReportIssueType.PaymentIssue]: 'Payment Issue',
  [ContractReportIssueType.MilestoneIssue]: 'Milestone Issue',
  [ContractReportIssueType.Delay]: 'Delay',
  [ContractReportIssueType.PoorQuality]: 'Poor Quality',
  [ContractReportIssueType.CommunicationProblem]: 'Communication Problem',
  [ContractReportIssueType.ScopeChange]: 'Scope Change',
  [ContractReportIssueType.Other]: 'Other',
};

const urgencyLabels: Record<DisputeUrgency, string> = {
  [DisputeUrgency.Normal]: 'Normal',
  [DisputeUrgency.High]: 'High',
  [DisputeUrgency.Critical]: 'Critical',
};

const formatDate = (value: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const formatSize = (value: number | null): string => {
  if (value === null) return 'Size unavailable';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const evidenceIcon = (fileName: string | null) => {
  if (!fileName) return <FileText size={20} />;
  const extension = fileName.split('.').pop()?.toLowerCase() ?? '';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) return <Image size={20} />;
  if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(extension)) return <Film size={20} />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) return <Archive size={20} />;
  return <FileText size={20} />;
};

const errorTitle = (status: number): string => {
  if (status === 401) return 'Authentication required';
  if (status === 403) return 'Access denied';
  if (status === 404) return 'Dispute not found';
  return 'Unable to load dispute';
};

export default function DisputeDetailScreen() {
  const { user } = useApp();
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
        setError({ status: disputeResponse.statusCode, message: disputeResponse.message || 'The dispute could not be loaded.' });
        setLoading(false);
        return;
      }
      if (!contractResponse.success || !contractResponse.data) {
        setError({ status: contractResponse.statusCode, message: contractResponse.message || 'The related contract could not be loaded.' });
        setLoading(false);
        return;
      }
      setDispute(disputeResponse.data);
      setContract(contractResponse.data);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
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
    anchor.download = response.data.fileName || evidence.fileName || 'evidence';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const backPath = contractId ? `/contracts/${contractId}` : '/contracts';

  const getStatusStepIndex = (status: DisputeStatus) => {
    switch (status) {
      case DisputeStatus.Open: return 0;
      case DisputeStatus.WaitingAdmin: return 1;
      case DisputeStatus.UnderReview: return 2;
      case DisputeStatus.WaitingEvidence: return 2;
      case DisputeStatus.DecisionPending: return 3;
      case DisputeStatus.Resolved: return 4;
      case DisputeStatus.Closed: return 4;
      default: return 0;
    }
  };

  return (
    <AppLayout>
      <main className="dispute-detail-wrapper">
        <button className="dispute-detail-back" onClick={() => navigate(backPath)}>
          <ArrowLeft size={16} /> Back to contract
        </button>

        {loading ? (
          <section className="dispute-detail-state">
            <LoaderCircle className="dispute-detail-spinner" size={38} />
            <h1>Loading dispute case</h1>
            <p>Gathering evidence, contract terms, and conversation history...</p>
          </section>
        ) : error || !dispute || !contract || !contractId || !disputeId ? (
          <section className="dispute-detail-state dispute-detail-error">
            <AlertCircle size={42} />
            <h1>{errorTitle(error?.status ?? 500)}</h1>
            <p>{error?.message ?? 'The dispute is unavailable.'}</p>
            <div className="dispute-detail-state-actions">
              <button onClick={() => setReloadKey(value => value + 1)}>
                <RefreshCw size={17} /> Retry
              </button>
              <button onClick={() => navigate('/contracts')}>View contracts</button>
            </div>
          </section>
        ) : (
          <>
            {/* Case Header Hero */}
            <header className="dispute-detail-hero">
              <div className="dispute-hero-info">
                <div className="dispute-hero-badges">
                  <span className="dispute-detail-kicker">Dispute Resolution Workspace</span>
                  <span className={`dispute-status dispute-status-${dispute.status}`}>
                    {statusLabels[dispute.status] ?? `Status ${dispute.status}`}
                  </span>
                </div>
                <h1>{dispute.title || contract.title}</h1>
                <div className="dispute-hero-meta">
                  <span><strong>Case ID:</strong> {dispute.id}</span>
                  <span>•</span>
                  <span><strong>Contract:</strong> {contract.title}</span>
                  <span>•</span>
                  <span><strong>Opened:</strong> {formatDate(dispute.createdAt)}</span>
                </div>
              </div>
            </header>

            {/* Stepper Progress Bar */}
            <section className="dispute-progress-stepper">
              {[
                { label: 'Dispute Filed', step: 0 },
                { label: 'Waiting Admin', step: 1 },
                { label: 'Under Review', step: 2 },
                { label: 'Verdict Pending', step: 3 },
                { label: 'Resolved & Closed', step: 4 },
              ].map((item) => {
                const currentStep = getStatusStepIndex(dispute.status);
                const isCompleted = currentStep > item.step || dispute.status === DisputeStatus.Resolved || dispute.status === DisputeStatus.Closed;
                const isCurrent = currentStep === item.step && dispute.status !== DisputeStatus.Resolved && dispute.status !== DisputeStatus.Closed;
                return (
                  <div key={item.step} className={`stepper-item ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                    <div className="stepper-circle">
                      {isCompleted ? <CheckCircle2 size={16} /> : <span>{item.step + 1}</span>}
                    </div>
                    <span className="stepper-label">{item.label}</span>
                  </div>
                );
              })}
            </section>

            {/* Main Layout Grid */}
            <section className="dispute-detail-grid">
              {/* Main Content Area */}
              <div className="dispute-main-column">
                {/* Dispute Overview Card */}
                <article className="dispute-detail-card">
                  <div className="dispute-detail-section-title">
                    <ShieldAlert size={20} className="text-cyan-500" />
                    <h2>Dispute Overview & Claims</h2>
                  </div>

                  <p className="dispute-reason-text">{dispute.description || dispute.reason}</p>

                  <div className="dispute-request-block">
                    <div className="dispute-request-item">
                      <strong className="dispute-request-label">Requested Resolution:</strong>
                      <span>{dispute.requestedResolution ?? 'No resolution specified'}</span>
                    </div>
                    {dispute.claimedAmount !== null && dispute.claimedAmount !== undefined && (
                      <div className="dispute-claimed-amount-badge">
                        <DollarSign size={16} />
                        <span>Claimed Amount: <strong>{dispute.claimedAmount.toLocaleString()} GigCoin</strong></span>
                      </div>
                    )}
                  </div>

                  <div className="dispute-detail-meta-grid">
                    <div>
                      <ShieldAlert size={16} />
                      <span>Issue Type</span>
                      <strong>{dispute.issueType === null ? 'Legacy Dispute' : issueLabels[dispute.issueType]}</strong>
                    </div>
                    <div>
                      <Clock size={16} />
                      <span>Urgency Level</span>
                      <strong className={`urgency-${dispute.urgency}`}>{urgencyLabels[dispute.urgency]}</strong>
                    </div>
                    <div>
                      <User size={16} />
                      <span>Initiated By</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <UserAvatar
                          name={dispute.initiator.name ?? 'Participant'}
                          userId={dispute.initiator.id}
                          size="sm"
                        />
                        <div>
                          <strong>
                            <UserProfileLink userId={dispute.initiator.id} role={dispute.initiator.role ?? undefined}>
                              {dispute.initiator.name ?? 'Participant'}
                            </UserProfileLink>
                          </strong>
                          <small className="block text-xs text-muted">{dispute.initiator.role ?? 'Party'}</small>
                        </div>
                      </div>
                    </div>
                    <div>
                      <FileText size={16} />
                      <span>Milestone Scope</span>
                      <strong>{dispute.milestone?.title ?? 'Entire Contract'}</strong>
                    </div>
                  </div>
                </article>

                {/* Participants Card */}
                <article className="dispute-detail-card">
                  <div className="dispute-detail-section-title">
                    <Users size={20} className="text-purple-500" />
                    <h2>Dispute Participants</h2>
                  </div>

                  <div className="dispute-participants-grid">
                    {(() => {
                      const isClientInitiator = dispute.initiator.role === 'Client';
                      const clientUserId = isClientInitiator ? dispute.initiator.id : dispute.respondent?.id;
                      const clientName = isClientInitiator ? dispute.initiator.name : dispute.respondent?.name || 'Client';
                      const freelancerUserId = !isClientInitiator ? dispute.initiator.id : dispute.respondent?.id;
                      const freelancerName = !isClientInitiator ? dispute.initiator.name : dispute.respondent?.name || 'Freelancer';

                      return (
                        <>
                          <div className="participant-card client">
                            <UserAvatar
                              name={clientName ?? 'Client'}
                              userId={clientUserId}
                              size="md"
                            />
                            <div className="participant-info">
                              <span className="participant-badge-role">Client</span>
                              <strong>
                                <UserProfileLink userId={clientUserId} role="Client">
                                  {clientName}
                                </UserProfileLink>
                              </strong>
                              <span>Contract Owner</span>
                            </div>
                          </div>

                          <div className="participant-card freelancer">
                            <UserAvatar
                              name={freelancerName ?? 'Freelancer'}
                              userId={freelancerUserId}
                              size="md"
                            />
                            <div className="participant-info">
                              <span className="participant-badge-role">Freelancer</span>
                              <strong>
                                <UserProfileLink userId={freelancerUserId} role="Freelancer">
                                  {freelancerName}
                                </UserProfileLink>
                              </strong>
                              <span>Contract Service Provider</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </article>

                {/* Evidence Section */}
                <section className="dispute-detail-card dispute-evidence-section">
                  <div className="dispute-detail-section-title">
                    <FileText size={20} className="text-blue-500" />
                    <h2>Evidence & Documentation ({dispute.evidence.length})</h2>
                  </div>

                  {downloadError && (
                    <div className="dispute-download-error" role="alert">
                      <AlertCircle size={16} /> {downloadError}
                    </div>
                  )}

                  <DisputeEvidenceUploader
                    contractId={contractId}
                    disputeId={disputeId}
                    disabled={!([DisputeStatus.Open, DisputeStatus.WaitingAdmin, DisputeStatus.UnderReview, DisputeStatus.WaitingEvidence, DisputeStatus.DecisionPending] as DisputeStatus[]).includes(dispute.status)}
                    onUploaded={evidence => setDispute(current => current ? { ...current, evidence: [...current.evidence, ...evidence] } : current)}
                  />

                  {/* Requested Evidence Notices */}
                  {dispute.evidence.filter(item => item.isRequestedByAdmin && item.requestedByAdminId).map(request => {
                    const targetParty = request.requestTarget === 0 ? dispute.initiator : dispute.respondent;
                    const groupFiles = dispute.evidence.filter(item =>
                      item.requestGroupId === request.requestGroupId && item.uploadedById === targetParty?.id && item.fileName
                    );
                    return (
                      <section className="dispute-evidence-group dispute-request-block" key={request.id}>
                        <div className="dispute-request-header">
                          <h3>Administrative Evidence Request • {request.requestTarget === 0 ? 'Reporter' : 'Respondent'}</h3>
                          <span className={`request-status-pill ${request.isRequestFulfilled ? 'fulfilled' : 'pending'}`}>
                            {request.isRequestFulfilled ? 'Fulfilled' : 'Pending Upload'}
                          </span>
                        </div>
                        <p>{request.description}</p>
                        <div className="request-deadline-info">
                          <span>Deadline: {formatDate(request.deadline)}</span>
                        </div>

                        {!request.isRequestFulfilled && targetParty?.id === user?.id && (
                          <DisputeEvidenceUploader
                            contractId={contractId}
                            disputeId={disputeId}
                            requestEvidenceId={request.id}
                            title="Submit requested evidence"
                            disabled={false}
                            onUploaded={items => setDispute(current => current ? {
                              ...current,
                              evidence: current.evidence
                                .map(existing => items.find(item => item.id === existing.id) ?? existing)
                                .concat(items.filter(item => !current.evidence.some(existing => existing.id === item.id))),
                            } : current)}
                          />
                        )}

                        {groupFiles.map(file => (
                          <div className="dispute-evidence-row" key={file.id}>
                            {evidenceIcon(file.fileName)}
                            <div>
                              <strong>{file.fileName}</strong>
                              <span>{formatSize(file.fileSize)} • {formatDate(file.createdAt)}</span>
                              {file.reviewedAt && <span className="reviewed-badge">Reviewed {formatDate(file.reviewedAt)}</span>}
                            </div>
                            <button onClick={() => void downloadEvidence(file)} disabled={downloadingId !== null}>
                              <Download size={15} /> Download
                            </button>
                          </div>
                        ))}
                      </section>
                    );
                  })}

                  {/* General Evidence Items */}
                  {dispute.evidence.length === 0 ? (
                    <p className="dispute-detail-muted">No evidence files have been submitted yet.</p>
                  ) : (
                    <div className="dispute-evidence-groups">
                      {(['Client', 'Freelancer'] as const).map(role => {
                        const party = dispute.initiator.role === role ? dispute.initiator : dispute.respondent?.role === role ? dispute.respondent : null;
                        const evidenceItems = dispute.evidence
                          .filter(evidence => !evidence.isRequestedByAdmin && party?.id === evidence.uploadedById)
                          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
                        return (
                          <section className="dispute-evidence-group" key={role}>
                            <h3>Submitted by {role}</h3>
                            {evidenceItems.length === 0 ? (
                              <p className="dispute-detail-muted">No evidence submitted by {role.toLowerCase()}.</p>
                            ) : evidenceItems.map(evidence => (
                              <div className="dispute-evidence-row" key={evidence.id}>
                                {evidenceIcon(evidence.fileName)}
                                <div>
                                  <strong>{evidence.fileName}</strong>
                                  <span>{formatSize(evidence.fileSize)} • {formatDate(evidence.createdAt)}</span>
                                  <span>
                                    Uploaded by {party ? (
                                      <UserProfileLink userId={party.id} role={party.role ?? undefined}>
                                        {party.name ?? role}
                                      </UserProfileLink>
                                    ) : role}
                                  </span>
                                  {evidence.description && <p className="evidence-desc">{evidence.description}</p>}
                                </div>
                                <button onClick={() => void downloadEvidence(evidence)} disabled={downloadingId !== null}>
                                  {downloadingId === evidence.id ? <LoaderCircle className="dispute-detail-spinner" size={15} /> : <Download size={15} />}
                                  Download
                                </button>
                              </div>
                            ))}
                          </section>
                        );
                      })}
                    </div>
                  )}
                </section>
              </div>

              {/* Sidebar Column */}
              <aside className="dispute-sidebar-column">
                {/* Resolution Verdict Card */}
                <article className="dispute-detail-card dispute-resolution-card">
                  <div className="dispute-detail-section-title">
                    <Award size={20} className="text-amber-500" />
                    <h2>Resolution Verdict</h2>
                  </div>

                  {dispute.resolution === null ? (
                    <div className="dispute-pending-verdict">
                      <Clock size={28} />
                      <p>Arbitration in Progress</p>
                      <small>An administrator will issue an official resolution verdict once all evidence and arguments have been evaluated.</small>
                    </div>
                  ) : (
                    <div className="dispute-resolution-block">
                      <div className="resolution-label-badge">
                        <ShieldCheck size={18} />
                        <strong>{dispute.resolutionLabel ?? resolutionLabels[dispute.resolution]}</strong>
                      </div>
                      {dispute.resolutionNote && (
                        <div className="resolution-note-box">
                          <p>{dispute.resolutionNote}</p>
                        </div>
                      )}
                      <small className="resolution-date">Resolved: {formatDate(dispute.resolvedAt)}</small>
                    </div>
                  )}
                </article>

                {/* Case Info Sidebar */}
                <article className="dispute-detail-card">
                  <h2>Case Metadata</h2>
                  <div className="sidebar-meta-list">
                    <div className="sidebar-meta-item">
                      <span>Case ID</span>
                      <code className="case-id-code">{dispute.id}</code>
                    </div>
                    <div className="sidebar-meta-item">
                      <span>Created Date</span>
                      <strong>{formatDate(dispute.createdAt)}</strong>
                    </div>
                    <div className="sidebar-meta-item">
                      <span>Last Activity</span>
                      <strong>{formatDate(dispute.updatedAt)}</strong>
                    </div>
                    {dispute.resolvedAt && (
                      <div className="sidebar-meta-item">
                        <span>Resolution Date</span>
                        <strong>{formatDate(dispute.resolvedAt)}</strong>
                      </div>
                    )}
                  </div>
                </article>
              </aside>
            </section>

            {/* Dispute Chat Section */}
            <DisputeChat disputeId={dispute.id} />
          </>
        )}
      </main>
    </AppLayout>
  );
}
