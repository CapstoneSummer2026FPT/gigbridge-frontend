import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Paperclip,
  FileText,
  LoaderCircle,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  X,
  Briefcase,
  History,
  Landmark,
  MessageSquare,
} from 'lucide-react';
import { adminGetAPI, adminPatchAPI, adminPostAPI } from '../../../api/adminAPI';
import type { AdminResolveDisputePayload } from '../../../api/adminAPI/POST';
import { AppLayout } from '../../../shared/components/AppLayout';
import type { AdminDisputeDetail, AdminDisputeListItem } from '../../../types/models/AdminDispute';
import { DisputeMilestoneOutcome, DisputeResolution, DisputeStatus, EvidenceRequestTarget, type DisputeEvidence } from '../../../types/models/Dispute';
import type { ConversationMessageResponse } from '../../../api/messageAPI/GET';
import { MilestoneStatus } from '../../../types/models/Contract';
import '../styles/admin-dispute-management-screen.css';

const statusLabels: Record<DisputeStatus, string> = {
  [DisputeStatus.Open]: 'Open',
  [DisputeStatus.WaitingAdmin]: 'Waiting Admin',
  [DisputeStatus.UnderReview]: 'Under Review',
  [DisputeStatus.WaitingEvidence]: 'Waiting Evidence',
  [DisputeStatus.DecisionPending]: 'Decision Pending',
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

const STATUS_FILTERS: ('all' | DisputeStatus)[] = [
  'all',
  DisputeStatus.Open,
  DisputeStatus.WaitingAdmin,
  DisputeStatus.UnderReview,
  DisputeStatus.WaitingEvidence,
  DisputeStatus.DecisionPending,
  DisputeStatus.Resolved,
  DisputeStatus.Closed,
];

interface EvidenceRequestState {
  reason: string;
  deadline: string;
  target: EvidenceRequestTarget;
}

type InvestigationTab = 'dispute' | 'contract' | 'milestones' | 'workspace' | 'conversation' | 'evidence' | 'audit';

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
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  const [evidenceRequest, setEvidenceRequest] = useState<EvidenceRequestState>({ reason: '', deadline: '', target: EvidenceRequestTarget.Both });
  const [activeTab, setActiveTab] = useState<InvestigationTab>('dispute');
  const [workspaceMessages, setWorkspaceMessages] = useState<ConversationMessageResponse[]>([]);
  const [disputeMessages, setDisputeMessages] = useState<ConversationMessageResponse[]>([]);
  const [adminMessage, setAdminMessage] = useState('');
  const [adminMessageFiles, setAdminMessageFiles] = useState<File[]>([]);
  const [milestoneDecisions, setMilestoneDecisions] = useState<Record<string, { outcome: DisputeMilestoneOutcome; release: string; refund: string }>>({});

  // Resolve dialog fields
  const [resolution, setResolution] = useState<DisputeResolution>(DisputeResolution.ClientFavored);
  const [resolutionNote, setResolutionNote] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [contractAction, setContractAction] = useState<number>(0);

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

  useEffect(() => {
    if (!selectedDispute) return;
    const load = async (conversationId: string | null, setter: (items: ConversationMessageResponse[]) => void) => {
      if (!conversationId) { setter([]); return; }
      const response = await adminGetAPI.getDisputeConversationMessages(selectedDispute.id, conversationId);
      setter(response.success ? response.data ?? [] : []);
    };
    void load(selectedDispute.conversations.workspaceConversationId, setWorkspaceMessages);
    void load(selectedDispute.conversations.disputeConversationId, setDisputeMessages);
  }, [selectedDispute]);

  const stats = useMemo(() => ({
    visible: disputes.length,
    open: disputes.filter((item) => item.status === DisputeStatus.Open).length,
    waitingAdmin: disputes.filter((item) => item.status === DisputeStatus.WaitingAdmin).length,
    underReview: disputes.filter((item) => item.status === DisputeStatus.UnderReview).length,
    waitingEvidence: disputes.filter((item) => item.status === DisputeStatus.WaitingEvidence).length,
    decisionPending: disputes.filter((item) => item.status === DisputeStatus.DecisionPending).length,
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
    setSuccess(`Dispute moved to ${statusLabels[targetStatus]}.`);
  };

  const requestEvidenceSubmit = async () => {
    if (!selectedDispute || actionLoading) return;
    if (!evidenceRequest.reason.trim()) {
      setError('Evidence request reason is required.');
      return;
    }

    setActionLoading(true);
    setError(null);
    setSuccess(null);
    const response = await adminPostAPI.requestEvidence(
      selectedDispute.id,
      evidenceRequest.reason.trim(),
      evidenceRequest.deadline || null,
      evidenceRequest.target,
    );
    setActionLoading(false);

    if (!response.success || !response.data) {
      setError(apiError(response.statusCode, response.message));
      return;
    }

    applyUpdatedDetail(response.data);
    setShowEvidenceDialog(false);
    setEvidenceRequest({ reason: '', deadline: '', target: EvidenceRequestTarget.Both });
    setSuccess('Evidence requested. Participants were notified.');
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

    const payload: AdminResolveDisputePayload = {
      resolution,
      resolutionNote: resolutionNote.trim(),
      internalNotes: internalNotes.trim() || undefined,
      milestoneDecisions: Object.entries(milestoneDecisions).map(([milestoneId, decision]) => ({
        milestoneId,
        outcome: decision.outcome,
        additionalReleaseToFreelancer: Number(decision.release || 0),
        refundToClient: Number(decision.refund || 0),
      })),
      contractAction,
    };

    const response = await adminPostAPI.resolveDispute(selectedDispute.id, payload);
    setActionLoading(false);

    if (!response.success || !response.data) {
      setError(apiError(response.statusCode, response.message));
      return;
    }

    applyUpdatedDetail(response.data);
    setShowResolveDialog(false);
    setResolutionNote('');
    setInternalNotes('');
    setMilestoneDecisions({});
    setContractAction(0);
    setSuccess('Dispute resolved. Financial transactions and contract actions were executed.');
  };

  const openResolveDialog = () => {
    if (!selectedDispute) return;
    setMilestoneDecisions(Object.fromEntries(selectedDispute.milestones
      .filter(milestone => milestone.allocatableAmount > 0 &&
        (milestone.status === MilestoneStatus.Disputed || milestone.milestoneId === selectedDispute.milestoneId))
      .map(milestone => [milestone.milestoneId, {
        outcome: DisputeMilestoneOutcome.PartiallyAccepted,
        release: (milestone.allocatableAmount / 2).toFixed(2),
        refund: (milestone.allocatableAmount - milestone.allocatableAmount / 2).toFixed(2),
      }])));
    setShowResolveDialog(true);
  };

  const changeContractAction = (action: number) => {
    if (!selectedDispute) return;
    setContractAction(action);
    setMilestoneDecisions(Object.fromEntries(selectedDispute.milestones
      .filter(milestone => milestone.allocatableAmount > 0 &&
        (action === 1 || milestone.status === MilestoneStatus.Disputed || milestone.milestoneId === selectedDispute.milestoneId))
      .map(milestone => {
        const existing = milestoneDecisions[milestone.milestoneId];
        return [milestone.milestoneId, existing ?? {
          outcome: DisputeMilestoneOutcome.PartiallyAccepted,
          release: (milestone.allocatableAmount / 2).toFixed(2),
          refund: (milestone.allocatableAmount - milestone.allocatableAmount / 2).toFixed(2),
        }];
      })));
  };

  const sendAdminMessage = async () => {
    if (!selectedDispute?.conversations.disputeConversationId || (!adminMessage.trim() && adminMessageFiles.length === 0)) return;
    const response = await adminPostAPI.sendDisputeMessage(
      selectedDispute.id,
      selectedDispute.conversations.disputeConversationId,
      adminMessage,
      adminMessageFiles,
    );
    if (response.success && response.data) {
      setDisputeMessages(items => [...items, response.data!]);
      setAdminMessage('');
      setAdminMessageFiles([]);
    } else setError(response.message || 'Unable to send administrative message.');
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
    anchor.download = response.data.fileName || evidence.fileName || 'evidence';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const reviewEvidence = async (evidence: DisputeEvidence) => {
    if (!selectedDispute || actionLoading || !evidence.fileName) return;
    const reviewNote = window.prompt('Optional review note') ?? '';
    setActionLoading(true);
    const response = await adminPostAPI.reviewDisputeEvidence(selectedDispute.id, evidence.id, reviewNote);
    setActionLoading(false);
    if (!response.success || !response.data) {
      setError(apiError(response.statusCode, response.message));
      return;
    }
    setSelectedDispute(current => current ? { ...current, evidence: current.evidence.map(item => item.id === evidence.id ? response.data! : item) } : current);
    setSuccess('Evidence marked as reviewed.');
  };

  const resetResolveDialog = () => {
    setShowResolveDialog(false);
    setResolution(DisputeResolution.ClientFavored);
    setResolutionNote('');
    setInternalNotes('');
    setMilestoneDecisions({});
    setContractAction(0);
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
        </section>

        <section className="disputes-stats">
          <div><span>Total Cases</span><strong>{totalItems}</strong></div>
          <div><span>Open</span><strong>{stats.open}</strong></div>
          <div><span>Waiting</span><strong>{stats.waitingAdmin}</strong></div>
          <div><span>Review</span><strong>{stats.underReview}</strong></div>
          <div><span>Evidence</span><strong>{stats.waitingEvidence}</strong></div>
          <div><span>Pending</span><strong>{stats.decisionPending}</strong></div>
          <div><span>Resolved</span><strong>{stats.resolved}</strong></div>
          <div><span>Closed</span><strong>{stats.closed}</strong></div>
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
              {STATUS_FILTERS.map((status) => (
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
                  <div><p className="disputes-kicker">Case {selectedDispute.id.slice(0, 8)}</p><h2>{selectedDispute.contractTitle}</h2></div>
                  <Scale size={24} />
                </div>

                <nav className="admin-dispute-tabs" aria-label="Investigation sections">
                  {([
                    ['dispute', 'Dispute', ShieldAlert], ['contract', 'Contract & Job', Briefcase],
                    ['milestones', 'Milestones & Escrow', Landmark], ['workspace', 'Workspace', MessageSquare],
                    ['conversation', 'Dispute Chat', MessageSquare], ['evidence', 'Evidence', FileText],
                    ['audit', 'Audit', History],
                  ] as const).map(([tab, label, Icon]) => (
                    <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}><Icon size={15} />{label}</button>
                  ))}
                </nav>

                {activeTab === 'contract' && (
                  <section className="dispute-detail-section admin-investigation-panel">
                    <h3><Briefcase size={18} />Contract Summary</h3>
                    <div className="dispute-detail-grid">
                      <div><span>Budget</span><strong>{selectedDispute.contract.totalBudget.toLocaleString()} GigCoin</strong></div>
                      <div><span>Progress</span><strong>{selectedDispute.contract.progressPercentage}%</strong></div>
                      <div><span>Started</span><strong>{formatDate(selectedDispute.contract.startDate)}</strong></div>
                      <div><span>Expected completion</span><strong>{formatDate(selectedDispute.contract.endDate)}</strong></div>
                    </div>
                    <h3>Original Job Post</h3>
                    <h4>{selectedDispute.originalJob.title}</h4><p className="admin-dispute-prewrap">{selectedDispute.originalJob.description}</p>
                    <p><strong>Category:</strong> {selectedDispute.originalJob.category ?? 'Not specified'}</p>
                    <p><strong>Skills:</strong> {selectedDispute.originalJob.skills.join(', ') || 'None specified'}</p>
                    <p><strong>Budget:</strong> {selectedDispute.originalJob.budgetMin?.toLocaleString() ?? '—'}–{selectedDispute.originalJob.budgetMax?.toLocaleString() ?? '—'} {selectedDispute.originalJob.currency}</p>
                    <p><strong>Accepted proposal:</strong> {selectedDispute.originalJob.proposalAmount?.toLocaleString() ?? '—'} · {selectedDispute.originalJob.proposalDuration ?? 'Duration unavailable'}</p>
                    {selectedDispute.originalJob.questions.map((item, index) => <div className="admin-evidence-row" key={index}><div><strong>{item.question}</strong><small>{item.acceptedAnswer ?? 'No accepted answer'}</small></div></div>)}
                  </section>
                )}

                {activeTab === 'milestones' && (
                  <section className="dispute-detail-section admin-investigation-panel">
                    <h3><Landmark size={18} />Escrow Summary</h3>
                    <div className="dispute-detail-grid">
                      <div><span>Original escrow</span><strong>{selectedDispute.escrow.originalEscrow.toLocaleString()}</strong></div>
                      <div><span>Released</span><strong>{selectedDispute.escrow.releasedAmount.toLocaleString()}</strong></div>
                      <div><span>Refunded</span><strong>{selectedDispute.escrow.refundedAmount.toLocaleString()}</strong></div>
                      <div><span>Service fees</span><strong>{selectedDispute.escrow.serviceFeeAmount.toLocaleString()}</strong></div>
                      <div><span>Remaining</span><strong>{selectedDispute.escrow.remainingAmount.toLocaleString()}</strong></div>
                    </div>
                    {selectedDispute.milestones.map((milestone, index) => <article className="admin-milestone-card" key={milestone.milestoneId}>
                      <h4>Milestone {index + 1}: {milestone.title}</h4>
                      <p>{milestone.description}</p>
                      <div className="dispute-detail-grid"><div><span>Amount</span><strong>{milestone.amount}</strong></div><div><span>Released</span><strong>{milestone.releasedAmount}</strong></div><div><span>Remaining</span><strong>{milestone.allocatableAmount}</strong></div><div><span>Status</span><strong>{milestone.status}</strong></div></div>
                      <p><strong>Deliverables:</strong> {milestone.deliverables ?? 'Not specified'}</p><p><strong>Submission:</strong> {milestone.submissionDescription ?? 'Not submitted'}</p>
                    </article>)}
                  </section>
                )}

                {activeTab === 'workspace' && <section className="dispute-detail-section admin-investigation-panel"><h3>Workspace Conversation · Read only</h3><div className="admin-conversation-history">{workspaceMessages.map(message => <div key={message.messageId} className="admin-conversation-message"><p>{message.content}</p><small>{formatDate(message.sentAt)}</small></div>)}</div></section>}

                {activeTab === 'conversation' && <section className="dispute-detail-section admin-investigation-panel"><h3>Dispute Conversation</h3><div className="admin-conversation-history">{disputeMessages.map(message => <div key={message.messageId} className={message.messageType === 10 ? 'admin-official-message' : 'admin-conversation-message'}><strong>{message.messageType === 10 ? 'Administrator' : 'Participant'}</strong><p>{message.content}</p>{message.attachments.map(attachment => <a key={attachment.messageAttachmentId} href={attachment.fileUrl} target="_blank" rel="noreferrer"><Paperclip size={13} /> {attachment.fileName}</a>)}<small>{formatDate(message.sentAt)}</small></div>)}</div><div className="admin-message-composer"><textarea value={adminMessage} onChange={event => setAdminMessage(event.target.value)} placeholder="Write an official administrative message. Use @Reporter or @Respondent to mention a party." rows={3} /><label className="admin-message-file-picker"><Paperclip size={16} />Attach files<input type="file" multiple onChange={event => setAdminMessageFiles(Array.from(event.target.files ?? []).slice(0, 5))} /></label>{adminMessageFiles.length > 0 && <small>{adminMessageFiles.map(file => file.name).join(', ')}</small>}<button onClick={() => void sendAdminMessage()} disabled={!adminMessage.trim() && adminMessageFiles.length === 0}>Send</button></div></section>}

                {activeTab === 'evidence' && <section className="dispute-detail-section admin-investigation-panel"><h3>Evidence Review</h3>{selectedDispute.evidence.map(evidence => <div className="admin-evidence-row" key={evidence.id}><div><strong>{evidence.fileName ?? `Pending request: ${evidence.description}`}</strong><small>{evidence.isRequestedByAdmin ? `Requested · ${evidence.isRequestFulfilled ? 'Fulfilled' : 'Pending'} · deadline ${formatDate(evidence.deadline)}` : `Additional evidence · ${formatDate(evidence.createdAt)}`}</small>{evidence.reviewNote && <p>{evidence.reviewNote}</p>}</div><div>{evidence.fileName && <button onClick={() => void downloadEvidence(evidence)}><Download size={15} />Download</button>}{evidence.fileName && !evidence.reviewedAt && <button onClick={() => void reviewEvidence(evidence)}>Mark reviewed</button>}</div></div>)}</section>}

                {activeTab === 'audit' && <section className="dispute-detail-section admin-investigation-panel"><h3><History size={18} />Administrative Audit Trail</h3>{selectedDispute.auditTrail.map(event => <div className="admin-evidence-row" key={event.auditId}><div><strong>{event.action}</strong><small>{formatDate(event.createdAt)} · Admin {event.adminId.slice(0, 8)}</small><p>{event.newValues}</p></div></div>)}</section>}

                {activeTab === 'dispute' && <>
                <div className="dispute-detail-grid">
                  <div><span>Title</span><strong>{selectedDispute.title ?? selectedDispute.contractTitle}</strong></div>
                  <div><span>Status</span><strong>{statusLabels[selectedDispute.status]}</strong></div>
                  <div><span>Initiator</span><strong>{selectedDispute.initiatorName}</strong><small>{selectedDispute.initiatorRole}</small></div>
                  <div><span>Respondent</span><strong>{selectedDispute.respondentName ?? 'Not available'}</strong></div>
                  <div><span>Dispute Type</span><strong>{selectedDispute.relatedReport?.issueType ?? 'Legacy dispute'}</strong></div>
                  <div><span>Claimed Amount</span><strong>{selectedDispute.claimedAmount?.toLocaleString() ?? 'Not specified'}</strong></div>
                  <div><span>Urgency</span><strong>{['Normal', 'High', 'Critical'][selectedDispute.urgency] ?? selectedDispute.urgency}</strong></div>
                  <div><span>Milestone</span><strong>{selectedDispute.milestoneTitle ?? 'General contract dispute'}</strong></div>
                  <div><span>Updated</span><strong>{formatDate(selectedDispute.updatedAt)}</strong></div>
                  {selectedDispute.assignedAdminId && (
                    <div><span>Assigned Admin</span><strong>{selectedDispute.assignedAdminId.slice(0, 8)}</strong><small>{formatDate(selectedDispute.assignedAt)}</small></div>
                  )}
                </div>

                <section className="dispute-detail-section">
                  <h3><FileText size={18} />Participants</h3>
                  <p>Client: {selectedDispute.client.fullName} ({selectedDispute.client.email})</p>
                  <p>Freelancer: {selectedDispute.freelancer
                    ? `${selectedDispute.freelancer.fullName} (${selectedDispute.freelancer.email})`
                    : 'Not assigned'}</p>
                </section>

                <section className="dispute-detail-section">
                  <h3><ShieldAlert size={18} />Description</h3>
                  <p className="admin-dispute-prewrap">{selectedDispute.description ?? selectedDispute.reason}</p>
                  <h4>Requested Resolution</h4>
                  <p className="admin-dispute-prewrap">{selectedDispute.requestedResolution ?? 'Not specified'}</p>
                  {selectedDispute.relatedReport && <p><strong>Related report:</strong> {selectedDispute.relatedReport.reportId.slice(0, 8)} · {selectedDispute.relatedReport.description}</p>}
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

                </>}

                <section className="admin-dispute-actions">
                  {selectedDispute.status === DisputeStatus.Open && (
                    <button onClick={() => void updateStatus(DisputeStatus.WaitingAdmin)} disabled={actionLoading}>
                      <Clock size={16} /> Move to Waiting
                    </button>
                  )}
                  {selectedDispute.status === DisputeStatus.WaitingAdmin && (
                    <button onClick={() => void updateStatus(DisputeStatus.UnderReview)} disabled={actionLoading}>
                      <Clock size={16} /> Assign & Start Review
                    </button>
                  )}
                  {selectedDispute.status === DisputeStatus.UnderReview && (
                    <>
                      <button onClick={() => setShowEvidenceDialog(true)} disabled={actionLoading}>
                        <Clock size={16} /> Request Evidence
                      </button>
                      <button onClick={() => void updateStatus(DisputeStatus.DecisionPending)} disabled={actionLoading}>
                        <Clock size={16} /> Decision Pending
                      </button>
                      <button className="resolve-btn" onClick={openResolveDialog} disabled={actionLoading}>
                        <CheckCircle size={16} /> Resolve Case
                      </button>
                    </>
                  )}
                  {selectedDispute.status === DisputeStatus.WaitingEvidence && (
                    <>
                      <button onClick={() => setShowEvidenceDialog(true)} disabled={actionLoading}>
                        <Clock size={16} /> Request More Evidence
                      </button>
                      <button onClick={() => void updateStatus(DisputeStatus.UnderReview)} disabled={actionLoading}>
                        <Clock size={16} /> Return to Review
                      </button>
                      <button className="resolve-btn" onClick={openResolveDialog} disabled={actionLoading}>
                        <CheckCircle size={16} /> Resolve Case
                      </button>
                    </>
                  )}
                  {selectedDispute.status === DisputeStatus.DecisionPending && (
                    <button className="resolve-btn" onClick={openResolveDialog} disabled={actionLoading}>
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

        {/* Evidence Request Dialog */}
        {showEvidenceDialog && selectedDispute && (
          <div className="admin-dispute-modal-backdrop" role="presentation">
            <section className="admin-dispute-modal" role="dialog" aria-modal="true">
              <div className="admin-dispute-modal-header">
                <div><p className="disputes-kicker">Request Additional Evidence</p><h2>Request Evidence</h2></div>
                <button onClick={() => setShowEvidenceDialog(false)} disabled={actionLoading} aria-label="Close"><X size={18} /></button>
              </div>
              <label>Reason
                <textarea
                  value={evidenceRequest.reason}
                  onChange={(e) => setEvidenceRequest((prev) => ({ ...prev, reason: e.target.value }))}
                  rows={4}
                  placeholder="Explain why additional evidence is needed"
                  disabled={actionLoading}
                />
              </label>
              <label>Deadline (optional)
                <input
                  type="date"
                  value={evidenceRequest.deadline}
                  onChange={(e) => setEvidenceRequest((prev) => ({ ...prev, deadline: e.target.value }))}
                  disabled={actionLoading}
                />
              </label>
              <label>Target
                <select value={evidenceRequest.target} onChange={(event) => setEvidenceRequest(previous => ({ ...previous, target: Number(event.target.value) as EvidenceRequestTarget }))} disabled={actionLoading}>
                  <option value={EvidenceRequestTarget.Reporter}>Reporter</option>
                  <option value={EvidenceRequestTarget.Respondent}>Respondent</option>
                  <option value={EvidenceRequestTarget.Both}>Both</option>
                </select>
              </label>
              <button onClick={() => void requestEvidenceSubmit()} disabled={actionLoading || !evidenceRequest.reason.trim()}>
                {actionLoading ? <LoaderCircle className="admin-dispute-spin" size={17} /> : null}
                Request Evidence
              </button>
            </section>
          </div>
        )}

        {/* Resolve Dialog */}
        {showResolveDialog && selectedDispute && (
          <div className="admin-dispute-modal-backdrop" role="presentation" onClick={resetResolveDialog}>
            <section className="admin-dispute-modal admin-dispute-modal-wide" role="dialog" aria-modal="true" aria-labelledby="resolve-case-title"
              onClick={(e) => e.stopPropagation()}>
              <div className="admin-dispute-modal-header">
                <div><p className="disputes-kicker">Administrative Decision</p><h2 id="resolve-case-title">Resolve Case</h2></div>
                <button onClick={resetResolveDialog} disabled={actionLoading} aria-label="Close dialog"><X size={18} /></button>
              </div>

              <div className="resolve-dialog-grid">
                <div className="resolve-column">
                  <label>Resolution
                    <select value={resolution} onChange={(event) => setResolution(Number(event.target.value) as DisputeResolution)} disabled={actionLoading}>
                      {Object.entries(resolutionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>

                  <label>Contract Action
                    <select value={contractAction} onChange={(e) => changeContractAction(Number(e.target.value))} disabled={actionLoading}>
                      <option value={0}>Resume Contract</option>
                      <option value={1}>Terminate Contract</option>
                    </select>
                  </label>
                </div>

                <div className="resolve-column">
                  <label>Resolution Note
                    <textarea
                      value={resolutionNote}
                      onChange={(event) => setResolutionNote(event.target.value)}
                      rows={6}
                      placeholder="Required: explain the decision for both parties"
                      disabled={actionLoading}
                    />
                  </label>
                  <label>Internal Notes (optional)
                    <textarea
                      value={internalNotes}
                      onChange={(event) => setInternalNotes(event.target.value)}
                      rows={3}
                      placeholder="Private notes (not visible to participants)"
                      disabled={actionLoading}
                    />
                  </label>
                </div>
              </div>

              <section className="admin-resolution-milestones">
                <h3>Milestone Financial Decisions</h3>
                <p>Previously released funds are final. Allocate each milestone's remaining escrow between the freelancer and client.</p>
                {selectedDispute.milestones.filter(milestone => milestoneDecisions[milestone.milestoneId]).map((milestone) => {
                  const decision = milestoneDecisions[milestone.milestoneId];
                  if (!decision) return null;
                  const total = Number(decision.release || 0) + Number(decision.refund || 0);
                  return <article className="admin-resolution-milestone" key={milestone.milestoneId}>
                    <header><strong>{milestone.title}</strong><span>Amount {milestone.amount.toLocaleString()} · already released {milestone.releasedAmount.toLocaleString()} · allocatable {milestone.allocatableAmount.toLocaleString()}</span></header>
                    <div className="resolve-dialog-grid">
                      <label>Outcome
                        <select value={decision.outcome} onChange={event => {
                          const outcome = Number(event.target.value) as DisputeMilestoneOutcome;
                          const release = outcome === DisputeMilestoneOutcome.Accepted
                            ? milestone.allocatableAmount.toFixed(2)
                            : outcome === DisputeMilestoneOutcome.Rejected || outcome === DisputeMilestoneOutcome.Cancelled
                              ? '0.00'
                              : decision.release;
                          const refund = outcome === DisputeMilestoneOutcome.Accepted
                            ? '0.00'
                            : outcome === DisputeMilestoneOutcome.Rejected || outcome === DisputeMilestoneOutcome.Cancelled
                              ? milestone.allocatableAmount.toFixed(2)
                              : decision.refund;
                          setMilestoneDecisions(current => ({ ...current, [milestone.milestoneId]: { outcome, release, refund } }));
                        }}>
                          <option value={DisputeMilestoneOutcome.Accepted}>Accepted</option>
                          <option value={DisputeMilestoneOutcome.Rejected}>Rejected</option>
                          <option value={DisputeMilestoneOutcome.PartiallyAccepted}>Partially Accepted</option>
                          <option value={DisputeMilestoneOutcome.Cancelled}>Cancelled</option>
                        </select>
                      </label>
                      <label>Additional release
                        <input type="number" min="0" max={milestone.allocatableAmount} step="0.01" value={decision.release} onChange={event => setMilestoneDecisions(current => ({ ...current, [milestone.milestoneId]: { ...decision, release: event.target.value } }))} />
                      </label>
                      <label>Refund to client
                        <input type="number" min="0" max={milestone.allocatableAmount} step="0.01" value={decision.refund} onChange={event => setMilestoneDecisions(current => ({ ...current, [milestone.milestoneId]: { ...decision, refund: event.target.value } }))} />
                      </label>
                    </div>
                    <small className={Math.abs(total - milestone.allocatableAmount) < 0.01 ? 'allocation-valid' : 'allocation-invalid'}>Allocated {total.toLocaleString()} of {milestone.allocatableAmount.toLocaleString()} GigCoin</small>
                  </article>;
                })}
              </section>

              <section className="admin-resolution-summary">
                <h3>Decision Summary</h3>
                <p><strong>{resolutionLabels[resolution]}</strong> · {contractAction === 0 ? 'Resume contract' : 'Terminate contract'}</p>
                <p>Release {Object.values(milestoneDecisions).reduce((sum, decision) => sum + Number(decision.release || 0), 0).toLocaleString()} · Refund {Object.values(milestoneDecisions).reduce((sum, decision) => sum + Number(decision.refund || 0), 0).toLocaleString()} GigCoin</p>
              </section>

              <button className="resolve-btn" onClick={() => void resolveCase()} disabled={actionLoading || !resolutionNote.trim() || Object.entries(milestoneDecisions).some(([milestoneId, decision]) => { const milestone = selectedDispute.milestones.find(item => item.milestoneId === milestoneId); return !milestone || Math.abs(Number(decision.release || 0) + Number(decision.refund || 0) - milestone.allocatableAmount) >= 0.01; })}>
                {actionLoading ? <LoaderCircle className="admin-dispute-spin" size={17} /> : <CheckCircle size={17} />}
                Execute Resolution
              </button>
            </section>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
